#!/usr/bin/env node
// gen-theme-preview.mjs — theme-init Step 5.5
//
// 새 테마의 "디자인 시스템 쇼케이스 + 샘플 슬라이드"를 한 장의 자기완결 HTML로 조립한다.
// src/index.css THEME 토큰 + references/<theme>/colors_and_type.css + patterns/*.html + _slide.css 를 읽어
// CSS·@font-face·패턴 마크업을 전부 인라인 → output/_theme-preview/index.html (어디서 열어도 동일 렌더).
//
// 사용법:
//   node .codex/skills/theme-init/scripts/gen-theme-preview.mjs <theme>
//   node .codex/skills/theme-init/scripts/gen-theme-preview.mjs <theme> --all
//   node .codex/skills/theme-init/scripts/gen-theme-preview.mjs <theme> --patterns 01-title.html,12-closing.html
//
// node 빌트인만 사용 (fs/path/url) — 크로스플랫폼, POSIX 의존 없음.

import { readFileSync, existsSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const theme = args.find((a) => !a.startsWith('--'));
const useAll = args.includes('--all');
const patternsArg = (() => {
  const i = args.indexOf('--patterns');
  return i >= 0 && args[i + 1] ? args[i + 1].split(',').map((s) => s.trim()).filter(Boolean) : null;
})();

if (!theme) {
  console.error('Usage: node gen-theme-preview.mjs <theme> [--all] [--patterns a.html,b.html]');
  process.exit(1);
}

const themeDir = resolve(ROOT, '.codex/skills/slide/references', theme);
const cssTokensPath = join(themeDir, 'colors_and_type.css');
const patternsDir = join(themeDir, 'patterns');
const slideCssPath = join(patternsDir, '_slide.css');
const indexCssPath = resolve(ROOT, 'src/index.css');
const outDir = resolve(ROOT, 'output/_theme-preview');
const outFile = join(outDir, 'index.html');

function read(p) {
  return existsSync(p) ? readFileSync(p, 'utf8') : '';
}

// colors_and_type.css 는 Step 4 #6 (gen-colors-and-type.mjs) 산출물 — 미리보기 렌더 패리티의 SSOT.
const tokenCss = read(cssTokensPath);
if (!tokenCss) {
  console.error(`[gen-theme-preview] colors_and_type.css 누락: ${cssTokensPath}`);
  console.error('  → 먼저 Step 4 #6 (gen-colors-and-type.mjs <theme>) 로 생성하세요.');
  process.exit(1);
}

// _slide.css 인라인 시 colors_and_type.css 의 @import 는 제거 (이미 위에서 인라인하므로 경로 재해석 방지).
let slideCss = read(slideCssPath).replace(
  /@import\s+url\(\s*['"]?[^)]*colors_and_type\.css[^)]*['"]?\s*\)\s*;?/gi,
  '/* colors_and_type.css inlined by gen-theme-preview */'
);

// --- 토큰 파싱: 스와치·타이포 표 생성용. colors_and_type 우선, 비면 src/index.css THEME 블록 폴백. ---
function themeBlock(css) {
  const m = css.match(/THEME:START[\s\S]*?THEME:END/);
  return m ? m[0] : css;
}
const tokenSource = tokenCss.includes('--') ? tokenCss : themeBlock(read(indexCssPath));
const tokens = new Map();
for (const m of tokenSource.matchAll(/--([\w-]+)\s*:\s*([^;{}]+);/g)) {
  const name = m[1].trim();
  const value = m[2].trim();
  if (!tokens.has(name)) tokens.set(name, value);
}

const isColor = (v) => /^#([0-9a-f]{3,8})$/i.test(v) || /^(rgb|hsl)a?\(/i.test(v);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// 레이아웃 토큰(Step 4.5 additive)과 코어 팔레트를 분리해 두 그룹으로 표시.
const isLayoutToken = (n) => /(navy|cta|spectrum|on-dark|^link$|brand|band|hero)/i.test(n);

const colorEntries = [...tokens].filter(([, v]) => isColor(v));
const coreColors = colorEntries.filter(([n]) => !isLayoutToken(n));
const layoutColors = colorEntries.filter(([n]) => isLayoutToken(n));
const typeTokens = [...tokens].filter(([n]) => /^(font|fs|fw)-/.test(n) || n === 'font-sans' || n === 'font-mono');

function swatch([name, value]) {
  return `<div class="tp-swatch">
    <div class="tp-chip" style="background: var(--${name});"></div>
    <div class="tp-swatch-meta"><code>--${name}</code><span>${esc(value)}</span></div>
  </div>`;
}

function swatchGroup(title, entries) {
  if (!entries.length) return '';
  return `<h3 class="tp-h3">${esc(title)}</h3><div class="tp-swatches">${entries.map(swatch).join('')}</div>`;
}

const typeRows = typeTokens
  .map(([n, v]) => `<tr><td><code>--${n}</code></td><td>${esc(v)}</td></tr>`)
  .join('');

// 시맨틱 타이포 클래스 실렌더 (v1 컨트랙트 7종). 클래스가 없으면 무스타일로 보이지만 무해.
const typeSamples = [
  ['display', 'Display 56 — 커버·섹션 타이틀'],
  ['display-sm', 'Display-sm 40 — KPI 큰 숫자'],
  ['headline', 'Headline 32 — 콘텐츠 헤딩'],
  ['title', 'Title — 카드 제목'],
  ['body', 'Body — 본문 텍스트입니다. 한 줄로 개념을 충분히 설명하는 길이.'],
  ['caption', 'Caption — 메타 / Governing Message'],
  ['label-caption', 'LABEL-CAPTION — 카테고리 라벨'],
]
  .map(([cls, txt]) => `<div class="${cls}">${esc(txt)}</div>`)
  .join('');

// 카드 3종 — 토큰 폴백 체인으로 테마 무관 렌더.
function card(label, style) {
  return `<div class="tp-card" style="${style}">
    <div class="title">${esc(label)}</div>
    <div class="body">카드 본문 — surface/border/accent 토큰이 올바르게 적용되는지 확인하는 샘플 텍스트입니다.</div>
  </div>`;
}
const cards = [
  card('Card — default', 'background: var(--card-bg, var(--surface)); border: 1px solid var(--card-border-color, var(--border));'),
  card('Card — alt', 'background: var(--surface-alt); border: 1px solid var(--border);'),
  card('Card — accent', 'background: var(--accent-soft); border: 1px solid var(--accent);'),
].join('');

const primitives = `
  <span class="tp-pill">PILL · 카테고리</span>
  <span class="tp-badge">1</span>
  <span class="tp-badge tp-badge-accent">A</span>
  <span class="tp-text-accent">accent 텍스트</span>
  <div class="tp-rule"></div>
`;

// --- 샘플 슬라이드: 패턴 HTML body 추출 후 인라인 ---
function listPatterns() {
  if (patternsArg) return patternsArg;
  let files = [];
  try {
    files = readdirSync(patternsDir).filter((f) => f.endsWith('.html') && !f.startsWith('_'));
  } catch {
    return [];
  }
  if (useAll) return files.sort();
  // 기본 큐레이션: 시그니처(cover/feature-board/closing) + 대표 콘텐츠. 존재하는 것만.
  const preferred = [
    '01-title.html', '13-cover-vertical.html',
    '04b-four-point.html', '20-kpi-dashboard.html',
    '02-agenda.html', '14-overview-split.html',
    '12-closing.html', '21-closing-big.html',
  ];
  const picked = preferred.filter((f) => files.includes(f));
  // 큐레이션이 3장 미만이면 디렉토리에서 채운다.
  for (const f of files.sort()) {
    if (picked.length >= 6) break;
    if (!picked.includes(f)) picked.push(f);
  }
  return picked.length ? picked : files.sort();
}

function bodyInner(html) {
  const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (m) return m[1];
  // body 태그가 없으면 doctype/html/head 제거 후 사용
  return html.replace(/<!DOCTYPE[^>]*>/i, '').replace(/<\/?html[^>]*>/gi, '').replace(/<head[\s\S]*?<\/head>/i, '');
}

const patternFiles = listPatterns();
const slidesHtml = patternFiles
  .map((f) => {
    const p = join(patternsDir, f);
    if (!existsSync(p)) return '';
    return `<figure class="tp-slide-wrap">
      <figcaption class="tp-slide-label">${esc(f)}</figcaption>
      <div class="tp-slide-frame">${bodyInner(read(p))}</div>
    </figure>`;
  })
  .filter(Boolean)
  .join('\n');

const slidesNote = patternFiles.length
  ? `${patternFiles.length}개 패턴`
  : '패턴 없음 — patterns/ 디렉토리를 확인하세요';

// --- 프리뷰 크롬 CSS (tp- 네임스페이스로 테마 클래스와 충돌 방지) ---
const chromeCss = `
  .tp-body { margin: 0; background: var(--bg, #f4f4f5); color: var(--text, #18181b); font-family: var(--font-sans, system-ui, sans-serif); }
  .tp-wrap { max-width: 1360px; margin: 0 auto; padding: 32px 40px 96px; }
  .tp-banner { background: var(--surface, #fff); border: 1px solid var(--border, #e4e4e7); border-radius: 12px; padding: 20px 24px; margin-bottom: 32px; }
  .tp-banner h1 { margin: 0 0 4px; font-size: 22px; }
  .tp-banner p { margin: 0; color: var(--text-secondary, #71717a); font-size: 13px; }
  .tp-section { margin-bottom: 48px; }
  .tp-section > h2 { font-size: 13px; letter-spacing: .08em; text-transform: uppercase; color: var(--text-secondary, #71717a); border-bottom: 1px solid var(--border, #e4e4e7); padding-bottom: 8px; margin: 0 0 20px; }
  .tp-h3 { font-size: 13px; margin: 20px 0 10px; color: var(--text-secondary, #71717a); }
  .tp-swatches { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
  .tp-swatch { display: flex; align-items: center; gap: 10px; }
  .tp-chip { width: 40px; height: 40px; border-radius: 8px; border: 1px solid rgba(0,0,0,.12); flex: none; }
  .tp-swatch-meta { display: flex; flex-direction: column; min-width: 0; }
  .tp-swatch-meta code { font-size: 12px; }
  .tp-swatch-meta span { font-size: 11px; color: var(--text-secondary, #71717a); }
  .tp-type-stack > * { margin: 6px 0; }
  .tp-table { border-collapse: collapse; font-size: 12px; }
  .tp-table td { border: 1px solid var(--border, #e4e4e7); padding: 4px 10px; }
  .tp-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .tp-card { border-radius: var(--card-radius, 12px); padding: var(--card-padding, 24px); }
  .tp-primitives { display: flex; align-items: center; flex-wrap: wrap; gap: 16px; }
  .tp-pill { display: inline-flex; align-items: center; height: 24px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--border, #e4e4e7); font-size: 12px; }
  .tp-badge { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 999px; background: var(--surface-alt, #f4f4f5); border: 1px solid var(--border, #e4e4e7); font-size: 13px; font-weight: 700; }
  .tp-badge-accent { background: var(--accent-soft, #eee); border-color: var(--accent, #888); color: var(--accent, #444); }
  .tp-text-accent { color: var(--accent, #444); font-weight: 600; }
  .tp-rule { flex: 1 1 120px; height: 2px; background: var(--accent, #888); border-radius: 2px; }
  .tp-slide-wrap { margin: 0 0 28px; }
  .tp-slide-label { font-size: 12px; color: var(--text-secondary, #71717a); margin-bottom: 6px; font-family: monospace; }
  .tp-slide-frame { width: 1280px; height: 720px; overflow: hidden; border: 1px solid var(--border, #e4e4e7); border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.08); position: relative; }
  .tp-slide-scroll { overflow-x: auto; }
`;

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Theme Preview — ${esc(theme)}</title>
<style>
/* ===== colors_and_type.css (inlined — 미리보기=빌드 렌더 패리티) ===== */
${tokenCss}
/* ===== _slide.css (inlined, colors_and_type @import 제거됨) ===== */
${slideCss}
/* ===== preview chrome ===== */
${chromeCss}
</style>
</head>
<body class="tp-body">
<div class="tp-wrap">
  <div class="tp-banner">
    <h1>테마 미리보기 — ${esc(theme)}</h1>
    <p>커밋 전 최종 승인용 (theme-init Step 5.5). 쇼케이스 + 샘플 슬라이드(${esc(slidesNote)}). 토큰/패턴 수정 후 이 스크립트를 재실행하면 갱신됩니다.</p>
  </div>

  <section class="tp-section">
    <h2>① 디자인 시스템 쇼케이스</h2>
    ${swatchGroup('코어 팔레트', coreColors)}
    ${swatchGroup('레이아웃 토큰 (Step 4.5)', layoutColors)}

    <h3 class="tp-h3">타이포 스케일 (시맨틱 클래스 실렌더)</h3>
    <div class="tp-type-stack">${typeSamples}</div>
    ${typeRows ? `<h3 class="tp-h3">타이포 토큰</h3><table class="tp-table"><tbody>${typeRows}</tbody></table>` : ''}

    <h3 class="tp-h3">카드 3종</h3>
    <div class="tp-cards">${cards}</div>

    <h3 class="tp-h3">프리미티브</h3>
    <div class="tp-primitives">${primitives}</div>
  </section>

  <section class="tp-section tp-slide-scroll">
    <h2>② 샘플 슬라이드 (1280×720)</h2>
    ${slidesHtml || '<p>표시할 패턴이 없습니다.</p>'}
  </section>
</div>
</body>
</html>
`;

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, html, 'utf8');

console.log(`[gen-theme-preview] 작성: ${outFile}`);
console.log(`  - 컬러 스와치: ${colorEntries.length}개 (코어 ${coreColors.length} / 레이아웃 ${layoutColors.length})`);
console.log(`  - 샘플 슬라이드: ${patternFiles.length}개 (${patternFiles.join(', ') || '없음'})`);
console.log('  → 브라우저로 열어 확인 후 승인하세요.');
