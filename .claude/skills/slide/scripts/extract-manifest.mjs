#!/usr/bin/env node
// extract-manifest.mjs
// ---------------------------------------------------------------------------
// 빌드된 슬라이드 HTML(dist/index.html 사본)을 Playwright로 렌더해서
// 각 슬라이드(#slides-root 직계 자식)의 DOM을 순회하고, 실측 좌표
// (getBoundingClientRect)와 computed style로 convert.js 호환 매니페스트를
// 기계 생성한다.
//
// 왜: 매니페스트 핸드크래프트(LLM이 TSX를 읽고 좌표를 손으로 계산)는
// 겹침/오버플로우의 근본 원인이었다. 브라우저가 이미 계산한 레이아웃을
// 그대로 추출하면 좌표 정확도가 100%가 되고, pptx-build.md의 w/h 휴리스틱
// 대부분이 불필요해진다. 핸드크래프트는 fallback 경로로만 유지.
//
// Usage:
//   node extract-manifest.mjs <deck.html> [--out <manifest.json>] [--title "..."]
//   --out 생략 시 <deck>-manifest.json (같은 디렉토리)
//
// DOM contract (pptx-compare.js와 동일):
//   - #slides-root의 직계 자식 각각이 1280×720 슬라이드
// 추출 규칙:
//   - 배경색/보더를 가진 요소 → rect (border-radius가 높이의 절반 이상이면
//     pill=cornerRadius 999, 정원이면 ellipse)
//   - 직접 텍스트 노드를 가진 요소 → text (인라인 span의 색/굵기 차이는 runs로)
//   - <img> → image (단일 파일 빌드라 src는 data URI)
//   - <svg> → 직렬화 후 data URI image (이후 rasterize-svg-images.mjs가 PNG화)
//   - 비표시(display:none / visibility:hidden / opacity:0 / 0크기) 요소 skip
//   - z-order는 문서 순서(부모 → 자식) — back-to-front와 일치
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') args.out = argv[++i];
    else if (argv[i] === '--title') args.title = argv[++i];
    else if (argv[i] === '--pad-scale') args.padScale = parseFloat(argv[++i]);
    else if (!argv[i].startsWith('--')) args._.push(argv[i]);
  }
  return args;
}

async function extract(page, padScale = 1) {
  return page.evaluate((padScale) => {
    const SLIDE_W = 1280;
    const SLIDE_H = 720;

    // canvas fillStyle 정규화로 oklch()/color() 등 모든 CSS 색을 hex로 변환
    const colorCanvas = document.createElement('canvas');
    const colorCtx = colorCanvas.getContext('2d', { willReadFrequently: true });
    function cssColorToHexAlpha(cssColor) {
      if (!cssColor || cssColor === 'transparent') return null;
      const m = cssColor.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)$/);
      let r, g, b, a = 1;
      if (m) {
        r = Math.round(+m[1]); g = Math.round(+m[2]); b = Math.round(+m[3]);
        if (m[4] !== undefined) a = m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
      } else {
        // canvas로 정규화 (oklch 등). 1px에 그려서 픽셀을 읽는다.
        colorCtx.clearRect(0, 0, 1, 1);
        colorCtx.fillStyle = '#000';
        colorCtx.fillStyle = cssColor;
        colorCtx.fillRect(0, 0, 1, 1);
        const d = colorCtx.getImageData(0, 0, 1, 1).data;
        r = d[0]; g = d[1]; b = d[2]; a = d[3] / 255;
      }
      if (a < 0.02) return null;
      const hex = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
      return { hex, alpha: a };
    }

    function isHidden(el, style) {
      if (style.display === 'none' || style.visibility === 'hidden') return true;
      if (parseFloat(style.opacity) === 0) return true;
      return false;
    }

    const usedFonts = new Set();
    function firstFontFamily(style) {
      // 모노 계열(SF Mono/Menlo/monospace 등)은 PPT-safe한 Courier New로 매핑
      if (/mono|menlo|consolas|courier/i.test(style.fontFamily)) {
        usedFonts.add('Courier New');
        return 'Courier New';
      }
      const fam = style.fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, '');
      if (fam) usedFonts.add(fam);
      return fam || null;
    }

    // 인라인 span은 부모 text 요소의 runs로 흡수된다 — 자식 순회에서 중복 방출 금지
    function isConsumedAsRun(node, cs) {
      return cs.display === 'inline' && !node.querySelector('img,svg');
    }

    function mapAlign(textAlign) {
      if (textAlign === 'center') return 'center';
      if (textAlign === 'right' || textAlign === 'end') return 'right';
      return 'left';
    }

    // 직접 텍스트 노드 + 인라인 자식만으로 구성된 "텍스트 조각"을 runs로 수집.
    // 인라인이 아닌 자식(별도 박스)은 walk에서 독립적으로 처리되므로 제외.
    // <br>는 직전 run에 breakLine 마킹 — PPT에서 동일 지점 줄바꿈 보존.
    function collectRuns(el, baseStyle) {
      const runs = [];
      for (const node of el.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent.replace(/\s+/g, ' ');
          if (text.trim()) runs.push({ text, node, style: baseStyle });
          else if (text && runs.length > 0 && !/\s$/.test(runs[runs.length - 1].text)) {
            // 순수 공백 노드(JSX {' '} 등)는 직전 run에 공백으로 귀속 — 드롭 시 단어가 붙는다
            runs[runs.length - 1].text += ' ';
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const cs = getComputedStyle(node);
          if (node.tagName === 'BR') {
            if (runs.length > 0) runs[runs.length - 1].breakLine = true;
            continue;
          }
          if (isHidden(node, cs)) continue;
          if (isConsumedAsRun(node, cs)) {
            // 중첩 인라인은 1단계로 평탄화
            const text = node.textContent.replace(/\s+/g, ' ');
            if (text.trim()) runs.push({ text, node, style: cs });
          }
        }
      }
      return runs;
    }

    function rangeRectOf(runs) {
      let union = null;
      for (const run of runs) {
        const range = document.createRange();
        if (run.node.nodeType === Node.TEXT_NODE) range.selectNodeContents(run.node);
        else range.selectNode(run.node);
        for (const r of range.getClientRects()) {
          if (r.width < 0.5 || r.height < 0.5) continue;
          if (!union) union = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
          else {
            union.left = Math.min(union.left, r.left);
            union.top = Math.min(union.top, r.top);
            union.right = Math.max(union.right, r.right);
            union.bottom = Math.max(union.bottom, r.bottom);
          }
        }
      }
      return union;
    }

    // ── 라인 락 (line-lock) ───────────────────────────────────────────────
    // 브라우저가 실제로 그린 줄바꿈 지점을 문자 단위 Range로 측정해서
    // run을 라인 세그먼트로 분할한다. PPT에는 breakLine + wrap:false로
    // 전달되어 재줄바꿈(re-wrap)이 원천 차단된다 — 겹침/오버플로우의
    // 근본 원인(브라우저 vs PPT 폰트 메트릭 차이) 제거.
    function textNodesUnder(node) {
      if (node.nodeType === Node.TEXT_NODE) return [node];
      const out = [];
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      let cur;
      while ((cur = walker.nextNode())) out.push(cur);
      return out;
    }

    // runs 전체를 라인 락: 문자 단위 단일 패스 상태 머신.
    // 세그먼트는 (라인 변경) 또는 (스타일/run 변경)에서 분리되고,
    // 라인 경계의 직전 세그먼트에 breakLine을 마킹한다.
    // 공백은 pendingSpace로 이월 — run 경계를 넘어도 같은 라인이면 보존,
    // 라인 경계에서는 소거(브라우저 collapse 동작과 동일).
    function lineLockRuns(runs, fontSize) {
      const lineTolerance = Math.max(4, fontSize * 0.6);
      const locked = [];
      let current = null; // { text, style, top, breakLine? }
      let pendingSpace = false;
      const range = document.createRange();

      for (const run of runs) {
        // 명시적 <br>는 collectRuns가 이미 마킹 — 라인 락에서도 경계로 취급
        const explicitBreak = run.breakLine === true;
        for (const textNode of textNodesUnder(run.node)) {
          const content = textNode.textContent;
          for (let i = 0; i < content.length; i++) {
            const ch = content[i];
            if (/\s/.test(ch)) {
              pendingSpace = true;
              continue;
            }
            range.setStart(textNode, i);
            range.setEnd(textNode, i + 1);
            const r = range.getClientRects()[0];
            if (!r || r.width < 0.1) continue;

            const sameLine = current !== null && Math.abs(r.top - current.top) <= lineTolerance;
            const sameStyle = current !== null && current.style === run.style;

            if (sameLine && sameStyle) {
              if (pendingSpace) current.text += ' ';
              current.text += ch;
            } else {
              if (current) {
                if (!sameLine) current.breakLine = true; // 라인 경계 — 공백은 collapse
                else if (pendingSpace) current.text += ' '; // 스타일 경계 공백은 직전에 귀속
                locked.push(current);
              }
              current = { text: ch, style: run.style, top: r.top };
            }
            pendingSpace = false;
          }
        }
        if (explicitBreak && current) {
          current.breakLine = true;
          locked.push(current);
          current = null;
          pendingSpace = false;
        }
      }
      if (current) locked.push(current);
      // 마지막 세그먼트의 breakLine은 불필요 — 제거
      if (locked.length > 0) delete locked[locked.length - 1].breakLine;
      return locked;
    }

    function nearestOpaqueBg(el) {
      let cur = el.parentElement;
      while (cur) {
        const c = cssColorToHexAlpha(getComputedStyle(cur).backgroundColor);
        if (c && c.alpha > 0.9) return c.hex;
        cur = cur.parentElement;
      }
      return '#FFFFFF';
    }

    function serializeSvg(svg, rect, style) {
      const clone = svg.cloneNode(true);
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('width', String(Math.round(rect.width)));
      clone.setAttribute('height', String(Math.round(rect.height)));
      // currentColor 해석을 위해 computed color를 명시
      clone.setAttribute('style', `color: ${style.color}`);
      let xml = new XMLSerializer().serializeToString(clone);
      // var(--*) 참조를 computed 값으로 해석 — 래스터화는 페이지 CSS 컨텍스트
      // 밖(standalone)에서 일어나므로 미해석 변수는 검정/무시로 렌더된다.
      const svgStyle = getComputedStyle(svg);
      xml = xml.replace(/var\((--[A-Za-z0-9-]+)\)/g, (match, name) => {
        const value = svgStyle.getPropertyValue(name).trim();
        return value || match;
      });
      return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml)));
    }

    const root = document.getElementById('slides-root');
    if (!root) throw new Error('#slides-root not found');

    const bodyFont = firstFontFamily(getComputedStyle(document.body)) || 'Arial';
    const slides = [];
    const stats = [];

    for (const slideEl of root.children) {
      const slideRect = slideEl.getBoundingClientRect();
      const sx = slideRect.left;
      const sy = slideRect.top;
      const rel = (r) => ({
        x: Math.round((r.left - sx) * 10) / 10,
        y: Math.round((r.top - sy) * 10) / 10,
        w: Math.round(r.width * 10) / 10,
        h: Math.round(r.height * 10) / 10,
      });

      const slideStyle = getComputedStyle(slideEl);
      const slideBg = cssColorToHexAlpha(slideStyle.backgroundColor);
      const elements = [];

      function visit(el) {
        const style = getComputedStyle(el);
        if (isHidden(el, style)) return;
        const rect = el.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) return;
        // 슬라이드 영역을 완전히 벗어난 요소는 skip
        if (rect.right < sx || rect.left > sx + SLIDE_W || rect.bottom < sy || rect.top > sy + SLIDE_H) return;

        const tag = el.tagName.toLowerCase();

        if (tag === 'img') {
          const src = el.currentSrc || el.src;
          if (src) elements.push({ type: 'image', src, ...rel(rect) });
          return;
        }
        if (tag === 'svg') {
          elements.push({ type: 'image', src: serializeSvg(el, rect, style), ...rel(rect) });
          return; // 내부는 직렬화에 포함됨 — 더 내려가지 않는다
        }

        // 1) 박스 (배경 또는 보더)
        if (el !== slideEl) {
          const bg = cssColorToHexAlpha(style.backgroundColor);
          const bw = parseFloat(style.borderTopWidth) || 0;
          const borderColor = bw > 0 && style.borderTopStyle !== 'none'
            ? cssColorToHexAlpha(style.borderTopColor) : null;
          if (bg || borderColor) {
            const radius = parseFloat(style.borderTopLeftRadius) || 0;
            const box = rel(rect);
            const isCircle = radius >= Math.min(rect.width, rect.height) / 2 - 0.5 &&
              Math.abs(rect.width - rect.height) < 2;
            const fill = bg ? bg.hex : nearestOpaqueBg(el);
            if (isCircle) {
              const ellipse = { type: 'ellipse', ...box, fill };
              if (borderColor) { ellipse.stroke = borderColor.hex; ellipse.strokeWidth = bw; }
              elements.push(ellipse);
            } else {
              const rectEl = { type: 'rect', ...box, fill };
              if (radius > 0) {
                rectEl.cornerRadius = radius >= rect.height / 2 - 0.5 ? 999 : Math.round(radius);
              }
              if (borderColor) { rectEl.stroke = borderColor.hex; rectEl.strokeWidth = bw; }
              elements.push(rectEl);
            }
          }
        }

        // 2) 직접 텍스트 (인라인 runs 포함)
        const runs = collectRuns(el, style);
        if (runs.length > 0) {
          const textRect = rangeRectOf(runs);
          if (textRect) {
            const lineHeight = parseFloat(style.lineHeight);
            const fontSize = parseFloat(style.fontSize);
            const boxH = textRect.bottom - textRect.top;
            const isSingleLine = boxH < fontSize * 1.9;
            const box = rel({
              left: textRect.left, top: textRect.top,
              width: textRect.right - textRect.left,
              height: boxH,
            });
            // 모든 텍스트는 wrap:false (라인 락) — 줄바꿈은 측정된 지점의
            // breakLine으로만 발생한다. 헤드룸은 폰트 메트릭 미세 차이 흡수용.
            let { x, y, w, h } = box;
            const pad = Math.max(6, w * 0.06) * padScale;
            const align = mapAlign(style.textAlign);
            if (align === 'center') x -= pad / 2;
            else if (align === 'right') x -= pad;
            w += pad;
            h += 6;

            const baseColor = cssColorToHexAlpha(style.color);
            const textEl = {
              type: 'text',
              ...{ x, y, w, h },
              fontSize: Math.round(fontSize * 10) / 10,
              fontWeight: style.fontWeight,
              fontFamily: firstFontFamily(style) || bodyFont,
              color: baseColor ? baseColor.hex : '#000000',
              align,
              valign: 'top',
              margin: 0,
              wrap: false,
            };
            if (lineHeight && fontSize) {
              textEl.lineSpacing = Math.round((lineHeight / fontSize) * 100) / 100;
            }

            // 멀티라인이면 라인 락으로 세그먼트 재구성, 단일행이면 원 runs 사용
            const sourceRuns = isSingleLine ? runs : lineLockRuns(runs, fontSize);
            const styledRuns = sourceRuns.map((run) => {
              const r = { text: run.text };
              if (run.style !== style) {
                const c = cssColorToHexAlpha(run.style.color);
                if (c && c.hex !== textEl.color) r.color = c.hex;
                if (run.style.fontWeight !== style.fontWeight) r.fontWeight = run.style.fontWeight;
                const rfs = parseFloat(run.style.fontSize);
                if (Math.abs(rfs - fontSize) > 0.5) r.fontSize = Math.round(rfs * 10) / 10;
              }
              if (run.breakLine) r.breakLine = true;
              return r;
            });
            if (styledRuns.length === 0) return;
            const hasStyledRun = styledRuns.some((r) => r.color || r.fontWeight || r.fontSize || r.breakLine);
            if (hasStyledRun) textEl.runs = styledRuns;
            else {
              const content = styledRuns.map((r) => r.text).join('').replace(/\s+/g, ' ').trim();
              if (!content) return;
              textEl.content = content;
            }
            elements.push(textEl);
          }
        }

        // 3) 자식 순회 (svg/img 제외는 위에서 return,
        //    runs로 흡수된 인라인 자식은 중복 방출 방지를 위해 skip)
        for (const child of el.children) {
          const childStyle = getComputedStyle(child);
          if (isConsumedAsRun(child, childStyle)) continue;
          visit(child);
        }
      }

      visit(slideEl);
      slides.push({
        background: slideBg ? slideBg.hex : '#FFFFFF',
        elements,
      });
      stats.push({
        elements: elements.length,
        texts: elements.filter((e) => e.type === 'text').length,
        rects: elements.filter((e) => e.type === 'rect').length,
        images: elements.filter((e) => e.type === 'image').length,
      });
    }

    // 본문 폰트를 fonts[0]으로 (convert.js의 기본 폴백), 나머지 사용 폰트를 뒤에
    const fonts = [bodyFont, ...[...usedFonts].filter((f) => f !== bodyFont)];
    return { fonts, slides, stats, slideCount: root.children.length };
  }, padScale);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const htmlPath = args._[0];
  if (!htmlPath) {
    console.error('Usage: node extract-manifest.mjs <deck.html> [--out <manifest.json>] [--title "..."]');
    process.exit(1);
  }
  const resolved = path.resolve(htmlPath);
  if (!fs.existsSync(resolved)) {
    console.error('HTML not found: ' + resolved);
    process.exit(1);
  }
  const outPath = path.resolve(
    args.out || resolved.replace(/\.html$/i, '') + '-manifest.json',
  );
  const title = args.title || path.basename(resolved, '.html');

  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto('file://' + resolved.replace(/\\/g, '/'));
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);

    const { fonts, slides, stats, slideCount } = await extract(page, args.padScale || 1);
    // generator 필드: check-manifest.js가 실측 좌표 기반임을 알고
    // 텍스트 w/h 휴리스틱 검사를 WARN으로 완화하는 데 사용
    const manifest = { title, fonts, generator: 'extract-manifest', slides };
    fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));

    console.log(`Extracted manifest: ${outPath}`);
    console.log(`  Slides: ${slideCount}, font: ${fonts[0]}`);
    stats.forEach((s, i) => {
      console.log(`  S${i + 1}: ${s.elements} elements (text ${s.texts} / rect ${s.rects} / image ${s.images})`);
    });
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('Extraction failed:', err.message);
  process.exit(1);
});
