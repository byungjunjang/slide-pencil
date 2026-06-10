#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { exportPptxScreenshots } from './pptx-screenshot.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function findPptxForHtml(htmlPath) {
  var pptxPath = htmlPath.replace(/\.html$/i, '.pptx');
  return fs.existsSync(pptxPath) ? pptxPath : null;
}

function parseIndexList(rawValue) {
  if (!rawValue) return null;
  var parsed = rawValue
    .split(',')
    .map(function(item) { return parseInt(item.trim(), 10); })
    .filter(function(item) { return Number.isInteger(item) && item >= 0; });
  return parsed.length > 0 ? Array.from(new Set(parsed)).sort(function(a, b) { return a - b; }) : null;
}

async function detectSlideCount(page) {
  return page.evaluate(function() {
    var root = document.getElementById('slides-root');
    if (!root) return 1;
    return root.children.length > 0 ? root.children.length : 1;
  });
}

function buildScreenshotIndices(totalSlides) {
  return Array.from({ length: totalSlides }, function(_, i) { return i; });
}

async function captureHtmlScreenshots(page, screenshotsDir, indices) {
  ensureDir(screenshotsDir);
  for (var existing of fs.readdirSync(screenshotsDir)) {
    if (existing.toLowerCase().endsWith('.png')) {
      fs.rmSync(path.join(screenshotsDir, existing), { force: true });
    }
  }

  var slideCount = await detectSlideCount(page);
  var saved = [];
  for (var idx of indices) {
    if (idx >= slideCount) {
      continue;
    }

    var slide = page.locator('#slides-root > *').nth(idx);
    await slide.scrollIntoViewIfNeeded();
    var fileName = 'slide-' + idx + '.png';
    await slide.screenshot({ path: path.join(screenshotsDir, fileName) });
    saved.push(fileName);
  }
  return saved;
}

function makeSlug(htmlPath) {
  return path.basename(htmlPath, path.extname(htmlPath));
}

function pngToDataUri(filePath) {
  return 'data:image/png;base64,' + fs.readFileSync(filePath).toString('base64');
}

// HTML 옆의 추출 매니페스트(<slug>-manifest.json)에서 슬라이드별 콘텐츠 bbox를 읽는다.
// 마스킹 대상 = 렌더러가 합법적으로 다르게 그리는 영역:
//   - text: 글리프 안티앨리어싱·굵기 차이 (정상 렌더에서도 diff 7%대 노이즈)
//   - image: 동일 PNG의 리샘플링/디더링 노이즈
// 마스크 밖에 남는 것은 배경·카드 chrome·룰라인 — 정상 변환이면 거의 동일해야
// 하므로, 여기서의 diff = 박스를 탈출한 텍스트 오버플로우·요소 이동(순수 레이아웃 신호).
function loadElementMasks(htmlPath) {
  var manifestPath = htmlPath.replace(/\.html$/i, '') + '-manifest.json';
  if (!fs.existsSync(manifestPath)) return null;
  try {
    var manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    return (manifest.slides || []).map(function(slide) {
      return (slide.elements || [])
        .filter(function(el) { return el.type === 'image' || el.type === 'text'; })
        .map(function(el) { return { x: el.x, y: el.y, w: el.w, h: el.h, type: el.type }; });
    });
  } catch (err) {
    return null;
  }
}

// 게이트 상수 — 2026-06-10 캘리브레이션 (클린 3덱 + 결함 주입 2종):
//   max cell density: 클린 ≤ 0.18 / 오버플로우 결함 0.36
//   ink ratio: 진성 이동·누락 0.00~0.05 / 최악 양성(모노폰트 치환 글리프 차이) 0.296
var HOT_CELL_DENSITY = 0.3;   // 셀 diff 밀도 임계 (이웃 허용 diff 기준)
var INK_COLLAPSE_RATIO = 0.2; // text bbox 잉크 에너지가 상대의 20% 미만이면 이동/누락

// HTML 캡처 vs PPTX 렌더의 픽셀 diff 비율을 계산한다 (0~1).
// 320×180으로 다운스케일해 폰트 안티앨리어싱/서브픽셀 차이를 흡수하고,
// RGB 채널 합 차이가 90 초과인 픽셀의 비율을 반환.
// masks가 있으면 image bbox를 제외한 영역으로 maskedDiffRatio도 계산한다.
async function computePairDiffs(browser, pairsAbs, masksBySlide) {
  var context = await browser.newContext();
  var page = await context.newPage();
  var results = [];
  try {
    for (var pair of pairsAbs) {
      var masks = masksBySlide ? (masksBySlide[pair.index] || []) : null;
      var r = await page.evaluate(async function(args) {
        function load(src) {
          return new Promise(function(res, rej) {
            var img = new Image();
            img.onload = function() { res(img); };
            img.onerror = rej;
            img.src = src;
          });
        }
        var imgs = await Promise.all([load(args.a), load(args.b)]);
        var W = 320, H = 180;
        var SRC_W = 1280, SRC_H = 720;
        function pixels(img) {
          var c = document.createElement('canvas');
          c.width = W; c.height = H;
          var ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0, W, H);
          return ctx.getImageData(0, 0, W, H).data;
        }
        // 콘텐츠 bbox 마스크 — image 4px / text 2px 패딩.
        // 텍스트 패딩을 작게 유지해야 박스를 *탈출한* 오버플로우가 마스크 밖에 잡힌다.
        var mask = null;
        if (args.masks) {
          mask = new Uint8Array(W * H);
          var sx = W / SRC_W, sy = H / SRC_H;
          for (var m = 0; m < args.masks.length; m++) {
            var b = args.masks[m];
            var padPx = b.type === 'image' ? 4 : 2;
            var x0 = Math.max(0, Math.floor((b.x - padPx) * sx));
            var y0 = Math.max(0, Math.floor((b.y - padPx) * sy));
            var x1 = Math.min(W, Math.ceil((b.x + b.w + padPx) * sx));
            var y1 = Math.min(H, Math.ceil((b.y + b.h + padPx) * sy));
            for (var yy = y0; yy < y1; yy++) {
              for (var xx = x0; xx < x1; xx++) mask[yy * W + xx] = 1;
            }
          }
        }
        var da = pixels(imgs[0]);
        var db = pixels(imgs[1]);

        // 1px 이웃 허용 diff (pixelmatch 방식): 픽셀이 상대 이미지의 3×3 이웃
        // 어딘가와 색이 맞으면(양방향) 1px 렌더 시프트로 보고 용서한다.
        // 룰라인·바·카드 보더의 서브픽셀 이동 노이즈를 제거하고,
        // 진짜 결함(수십 px 이동·오버플로우)만 남긴다.
        var THRESH = 90;
        function dist(buf1, p1, buf2, p2) {
          var o1 = p1 * 4, o2 = p2 * 4;
          return Math.abs(buf1[o1] - buf2[o2]) + Math.abs(buf1[o1 + 1] - buf2[o2 + 1]) + Math.abs(buf1[o1 + 2] - buf2[o2 + 2]);
        }
        function matchesNeighborhood(src, sp, dst) {
          var x = sp % W, y = (sp / W) | 0;
          for (var dy = -1; dy <= 1; dy++) {
            for (var dx = -1; dx <= 1; dx++) {
              var nx = x + dx, ny = y + dy;
              if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
              if (dist(src, sp, dst, ny * W + nx) <= THRESH) return true;
            }
          }
          return false;
        }

        // 핫셀 검출용 그리드: 20×20px 셀 (16×9). 국소 결함(요소 이동·박스 탈출
        // 오버플로우)은 전역 비율로는 1~2%로 희석되지만, 결함 지점의 셀은
        // diff 밀도가 치솟는다 — 밀도로 잡는다.
        var CELL = 20;
        var CW2 = Math.ceil(W / CELL), CH2 = Math.ceil(H / CELL);
        var cellDiff = new Float64Array(CW2 * CH2);
        var cellUnmasked = new Float64Array(CW2 * CH2);
        var diff = 0, maskedDiff = 0, unmaskedCount = 0;
        for (var p = 0; p < W * H; p++) {
          var isDiff = dist(da, p, db, p) > THRESH &&
            !(matchesNeighborhood(da, p, db) && matchesNeighborhood(db, p, da));
          if (isDiff) diff++;
          if (!mask || !mask[p]) {
            unmaskedCount++;
            if (isDiff) maskedDiff++;
            var px = p % W, py = (p / W) | 0;
            var ci = ((py / CELL) | 0) * CW2 + ((px / CELL) | 0);
            cellUnmasked[ci]++;
            if (isDiff) cellDiff[ci]++;
          }
        }
        // 핫셀: 셀의 마스크 밖 픽셀이 충분히 있고(≥25% of cell) diff 밀도가 임계 초과
        var hotCells = 0;
        var maxCellDensity = 0;
        if (mask) {
          for (var c2 = 0; c2 < cellDiff.length; c2++) {
            if (cellUnmasked[c2] >= CELL * CELL * 0.25) {
              var density = cellDiff[c2] / cellUnmasked[c2];
              if (density > maxCellDensity) maxCellDensity = density;
              if (density > args.hotCellDensity) hotCells++;
            }
          }
        }

        // 잉크 에너지 검사: 각 text bbox 내부의 텍스처 에너지(bbox 평균색 대비
        // 평균 편차)를 양쪽에서 비교한다. 한쪽엔 텍스트가 있는데 다른 쪽이
        // 비어 있으면(요소가 예측 위치에 안 그려짐 — 이동/누락) 에너지가 붕괴한다.
        // 글리프 AA 차이는 에너지에 거의 영향 없음 (같은 텍스트면 비율 ~1).
        var inkFails = [];
        if (args.masks) {
          var sx2 = W / SRC_W, sy2 = H / SRC_H;
          function inkEnergy(buf, bx0, by0, bx1, by1) {
            var n = 0, mr = 0, mg = 0, mb = 0;
            for (var y = by0; y < by1; y++) {
              for (var x = bx0; x < bx1; x++) {
                var o = (y * W + x) * 4;
                mr += buf[o]; mg += buf[o + 1]; mb += buf[o + 2]; n++;
              }
            }
            if (n === 0) return 0;
            mr /= n; mg /= n; mb /= n;
            var e = 0;
            for (var y2 = by0; y2 < by1; y2++) {
              for (var x2 = bx0; x2 < bx1; x2++) {
                var o2 = (y2 * W + x2) * 4;
                e += Math.abs(buf[o2] - mr) + Math.abs(buf[o2 + 1] - mg) + Math.abs(buf[o2 + 2] - mb);
              }
            }
            return e / n;
          }
          for (var mi = 0; mi < args.masks.length; mi++) {
            var tb = args.masks[mi];
            if (tb.type !== 'text') continue;
            var bx0 = Math.max(0, Math.round(tb.x * sx2));
            var by0 = Math.max(0, Math.round(tb.y * sy2));
            var bx1 = Math.min(W, Math.round((tb.x + tb.w) * sx2));
            var by1 = Math.min(H, Math.round((tb.y + tb.h) * sy2));
            if ((bx1 - bx0) * (by1 - by0) < 8) continue; // 너무 작은 박스는 노이즈
            var eA = inkEnergy(da, bx0, by0, bx1, by1);
            var eB = inkEnergy(db, bx0, by0, bx1, by1);
            var hi = Math.max(eA, eB), lo = Math.min(eA, eB);
            if (hi > 25 && lo < hi * args.inkRatio) {
              inkFails.push({ x: tb.x, y: tb.y, eHtml: Math.round(eA), ePptx: Math.round(eB) });
            }
          }
        }
        return {
          full: diff / (W * H),
          // 마스크 후 잔여 영역이 슬라이드의 10% 미만이면(풀블리드 이미지 등)
          // 분모가 너무 작아 노이즈 — full로 폴백
          masked: mask && unmaskedCount >= W * H * 0.1 ? maskedDiff / unmaskedCount : null,
          hotCells: mask ? hotCells : null,
          maxCellDensity: mask ? maxCellDensity : null,
          inkFails: args.masks ? inkFails : null,
        };
      }, { a: pngToDataUri(pair.htmlAbs), b: pngToDataUri(pair.pptxAbs), masks: masks, hotCellDensity: HOT_CELL_DENSITY, inkRatio: INK_COLLAPSE_RATIO });
      results.push({
        diffRatio: Math.round(r.full * 1000) / 1000,
        maskedDiffRatio: r.masked === null ? null : Math.round(r.masked * 1000) / 1000,
        hotCells: r.hotCells,
        maxCellDensity: r.maxCellDensity === null ? null : Math.round(r.maxCellDensity * 1000) / 1000,
        inkFails: r.inkFails,
      });
    }
  } finally {
    await context.close();
  }
  return results;
}

function relativePosix(fromDir, toPath) {
  return path.relative(fromDir, toPath).split(path.sep).join('/');
}

function writeComparisonIndex(outputDir, decks) {
  var rows = [];
  for (var deck of decks) {
    rows.push('<section class="deck">');
    rows.push('<h2>' + deck.slug + '</h2>');
    rows.push('<p class="meta">HTML: ' + deck.htmlSlideCount + ' slides | PPTX: ' + deck.pptxSlideCount + ' slides</p>');

    for (var pair of deck.pairs) {
      var gateVal = pair.gateRatio != null ? pair.gateRatio : pair.diffRatio;
      var diffLabel = gateVal != null
        ? ' <span class="diff' + (gateVal > (deck.maxDiff || 0.08) ? ' diff-bad' : '') + '">' +
          (pair.gateMetric === 'masked' ? 'masked ' : '') + 'diff ' + Math.round(gateVal * 100) + '%' +
          (pair.gateMetric === 'masked' && pair.diffRatio != null ? ' <span style="opacity:.6">(full ' + Math.round(pair.diffRatio * 100) + '%)</span>' : '') +
          '</span>'
        : '';
      rows.push('<div class="pair">');
      rows.push('<div class="cell"><div class="label">HTML slide ' + pair.index + diffLabel + '</div><img src="' + pair.htmlRel + '" alt="HTML slide ' + pair.index + '"></div>');
      rows.push('<div class="cell"><div class="label">PPTX slide ' + pair.index + '</div><img src="' + pair.pptxRel + '" alt="PPTX slide ' + pair.index + '"></div>');
      rows.push('</div>');
    }

    if (deck.missingIndices.length > 0) {
      rows.push('<p class="warning">Missing PPTX renders for slide indices: ' + deck.missingIndices.join(', ') + '</p>');
    }
    rows.push('</section>');
  }

  var html = [
    '<!doctype html>',
    '<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>PPTX Compare</title>',
    '<style>',
    'body { font-family: Arial, sans-serif; margin: 24px; color: #111; background: #f6f6f8; }',
    'h1, h2 { margin: 0 0 12px; }',
    '.deck { margin-bottom: 40px; padding: 20px; background: #fff; border: 1px solid #ddd; border-radius: 12px; }',
    '.meta { margin: 0 0 16px; color: #555; }',
    '.pair { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }',
    '.cell { background: #fafafa; border: 1px solid #e4e4e7; border-radius: 10px; padding: 12px; }',
    '.label { margin-bottom: 8px; font-size: 13px; font-weight: 700; color: #4633E3; }',
    '.diff { color: #555; font-weight: 400; } .diff-bad { color: #b91c1c; font-weight: 700; }',
    'img { display: block; width: 100%; height: auto; border-radius: 8px; background: #fff; }',
    '.warning { color: #a16207; font-weight: 700; }',
    '@media (max-width: 1000px) { .pair { grid-template-columns: 1fr; } }',
    '</style></head><body>',
    '<h1>PPTX Compare</h1>',
    rows.join('\\n'),
    '</body></html>',
  ].join('\\n');

  fs.writeFileSync(path.join(outputDir, 'index.html'), html);
}

async function processDeck(browser, htmlPath, outputRoot, explicitIndices) {
  var slug = makeSlug(htmlPath);
  var deckDir = path.join(outputRoot, slug);
  var htmlDir = path.join(deckDir, 'html');
  var pptxDir = path.join(deckDir, 'pptx');
  ensureDir(htmlDir);
  ensureDir(pptxDir);

  var pptxPath = findPptxForHtml(htmlPath);
  if (!pptxPath) throw new Error('No PPTX found alongside ' + htmlPath);

  var context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  var page = await context.newPage();

  try {
    await page.goto('file:///' + path.resolve(htmlPath).replace(/\\\\/g, '/'));
    await page.waitForLoadState('networkidle');

    var totalSlides = await detectSlideCount(page);
    var indices = explicitIndices || buildScreenshotIndices(totalSlides);
    var htmlShots = await captureHtmlScreenshots(page, htmlDir, indices);
    var pptxShots = exportPptxScreenshots({
      inputPath: pptxPath,
      outputDir: pptxDir,
      indices: indices,
    });

    var pptxSet = new Set(pptxShots.screenshots);
    var pairs = [];
    var missingIndices = [];

    for (var htmlFile of htmlShots) {
      var index = parseInt(htmlFile.replace(/^slide-/, '').replace(/\\.png$/i, ''), 10);
      var pptxFile = 'slide-' + index + '.png';
      if (!pptxSet.has(pptxFile)) {
        missingIndices.push(index);
        continue;
      }
      pairs.push({
        index,
        htmlRel: relativePosix(outputRoot, path.join(htmlDir, htmlFile)),
        pptxRel: relativePosix(outputRoot, path.join(pptxDir, pptxFile)),
        htmlAbs: path.join(htmlDir, htmlFile),
        pptxAbs: path.join(pptxDir, pptxFile),
      });
    }

    // 자동 diff 판정: 페어별 픽셀 diff 비율 계산 (text+image bbox 마스킹 포함)
    var masksBySlide = loadElementMasks(path.resolve(htmlPath));
    var diffResults = await computePairDiffs(browser, pairs, masksBySlide);
    pairs.forEach(function(pair, i) {
      pair.diffRatio = diffResults[i].diffRatio;
      pair.maskedDiffRatio = diffResults[i].maskedDiffRatio;
      pair.hotCells = diffResults[i].hotCells;
      pair.maxCellDensity = diffResults[i].maxCellDensity;
      pair.inkFails = diffResults[i].inkFails;
      // 게이트에 쓰는 점수: 마스킹 가능하면 masked(텍스트·도형 레이아웃 신호), 아니면 full
      pair.gateRatio = pair.maskedDiffRatio !== null && pair.maskedDiffRatio !== undefined
        ? pair.maskedDiffRatio
        : pair.diffRatio;
      pair.gateMetric = pair.gateRatio === pair.maskedDiffRatio ? 'masked' : 'full';
      delete pair.htmlAbs;
      delete pair.pptxAbs;
    });

    var diffValues = pairs.map(function(p) { return p.gateRatio; });
    var manifest = {
      slug,
      htmlPath: path.resolve(htmlPath),
      pptxPath: path.resolve(pptxPath),
      htmlSlideCount: totalSlides,
      pptxSlideCount: pptxShots.totalSlides,
      selectedIndices: indices,
      htmlScreenshots: htmlShots,
      pptxScreenshots: pptxShots.screenshots,
      missingIndices,
      pairs,
      maxDiffRatio: diffValues.length ? Math.max.apply(null, diffValues) : null,
      meanDiffRatio: diffValues.length
        ? Math.round((diffValues.reduce(function(a, b) { return a + b; }, 0) / diffValues.length) * 1000) / 1000
        : null,
    };

    fs.writeFileSync(path.join(deckDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    return manifest;
  } finally {
    await context.close();
  }
}

async function main() {
  var { values } = parseArgs({
    options: {
      input: { type: 'string', short: 'i' },
      'output-dir': { type: 'string', short: 'o' },
      indices: { type: 'string' },
      'max-diff': { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: false,
  });

  if (values.help || !values.input) {
    console.log(`
Usage:
  node pptx-compare.js --input ../../output/<slug>/<slug>.html [--output-dir ../pptx-compare] [--max-diff 0.08]

  --max-diff: 슬라이드별 diff 비율 허용 한계. 초과 슬라이드가 있으면 exit 1.
              기본값: 매니페스트가 옆에 있으면 0.08 (image bbox 마스킹된
              텍스트·도형 diff 기준), 없으면 0.15 (full diff 기준).
`);
    process.exit(values.help ? 0 : 1);
  }

  // 기본 임계: 마스킹 가능(매니페스트 존재) 시 0.08, 불가 시 0.15 (full diff는 노이즈 포함)
  var hasManifest = fs.existsSync(path.resolve(values.input).replace(/\.html$/i, '') + '-manifest.json');
  var maxDiff = values['max-diff'] !== undefined ? parseFloat(values['max-diff']) : (hasManifest ? 0.08 : 0.15);

  var outputRoot = path.resolve(values['output-dir'] || path.join(__dirname, '..', 'pptx-compare'));
  ensureDir(outputRoot);
  var explicitIndices = parseIndexList(values.indices);

  var browser = await chromium.launch();
  try {
    var manifest = await processDeck(browser, path.resolve(values.input), outputRoot, explicitIndices);
    // 실패 조건 (셋 중 하나):
    //   (1) 마스킹 diff 비율 > 임계 — 광역 붕괴
    //   (2) 핫셀 ≥ 1 — 국소 결함(박스 탈출 오버플로우)의 고밀도 blob
    //   (3) 잉크 붕괴 ≥ 1 — text bbox에 텍스트가 예측 위치에 없음 (이동/누락)
    var HOT_CELL_LIMIT = 1;
    var failingPairs = manifest.pairs.filter(function(p) {
      var ratioFail = p.gateRatio != null && p.gateRatio > maxDiff;
      var hotFail = p.hotCells != null && p.hotCells >= HOT_CELL_LIMIT;
      var inkFail = p.inkFails != null && p.inkFails.length >= 1;
      if (ratioFail || hotFail || inkFail) {
        var reasons = [];
        if (ratioFail) reasons.push('ratio');
        if (hotFail) reasons.push('hot-cells(' + p.hotCells + ')');
        if (inkFail) reasons.push('ink-collapse(' + p.inkFails.length + ')');
        p.failReason = reasons.join('+');
      }
      return ratioFail || hotFail || inkFail;
    });
    var verdict = manifest.missingIndices.length === 0 && failingPairs.length === 0 ? 'pass' : 'fail';
    var gateMetric = manifest.pairs.some(function(p) { return p.gateMetric === 'masked'; }) ? 'masked' : 'full';
    fs.writeFileSync(path.join(outputRoot, 'report.json'), JSON.stringify({
      generatedAt: new Date().toISOString(),
      deckCount: 1,
      maxDiffThreshold: maxDiff,
      gateMetric: gateMetric,
      verdict,
      decks: [{
        slug: manifest.slug,
        htmlPath: manifest.htmlPath,
        pptxPath: manifest.pptxPath,
        htmlSlideCount: manifest.htmlSlideCount,
        pptxSlideCount: manifest.pptxSlideCount,
        selectedIndices: manifest.selectedIndices,
        pairCount: manifest.pairs.length,
        missingIndices: manifest.missingIndices,
        maxDiffRatio: manifest.maxDiffRatio,
        meanDiffRatio: manifest.meanDiffRatio,
        diffs: manifest.pairs.map(function(p) {
          return { index: p.index, diffRatio: p.diffRatio, maskedDiffRatio: p.maskedDiffRatio, gateRatio: p.gateRatio, hotCells: p.hotCells, maxCellDensity: p.maxCellDensity, inkFails: p.inkFails };
        }),
        failingIndices: failingPairs.map(function(p) { return p.index; }),
      }],
    }, null, 2));
    manifest.maxDiff = maxDiff;
    writeComparisonIndex(outputRoot, [manifest]);
    console.log('Saved compare report: ' + path.join(outputRoot, 'report.json'));
    console.log('Saved compare index:  ' + path.join(outputRoot, 'index.html'));
    console.log('Diff verdict: ' + verdict +
      ' (' + gateMetric + ' max ' + manifest.maxDiffRatio + ', mean ' + manifest.meanDiffRatio + ', threshold ' + maxDiff + ')');
    if (failingPairs.length > 0) {
      console.error('Slides over threshold: ' + failingPairs.map(function(p) {
        return p.index + ' (' + Math.round(p.gateRatio * 100) + '%, ' + (p.failReason || '') + ')';
      }).join(', '));
    }
    if (verdict === 'fail') process.exit(1);
  } finally {
    await browser.close();
  }
}

var isCli = Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch(function(err) {
    console.error('Error: ' + err.message);
    process.exit(1);
  });
}
