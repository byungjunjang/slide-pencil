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
      rows.push('<div class="pair">');
      rows.push('<div class="cell"><div class="label">HTML slide ' + pair.index + '</div><img src="' + pair.htmlRel + '" alt="HTML slide ' + pair.index + '"></div>');
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
      });
    }

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
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: false,
  });

  if (values.help || !values.input) {
    console.log(`
Usage:
  node pptx-compare.js --input ../../output/<slug>/<slug>.html [--output-dir ../pptx-compare]
`);
    process.exit(values.help ? 0 : 1);
  }

  var outputRoot = path.resolve(values['output-dir'] || path.join(__dirname, '..', 'pptx-compare'));
  ensureDir(outputRoot);
  var explicitIndices = parseIndexList(values.indices);

  var browser = await chromium.launch();
  try {
    var manifest = await processDeck(browser, path.resolve(values.input), outputRoot, explicitIndices);
    fs.writeFileSync(path.join(outputRoot, 'report.json'), JSON.stringify({
      generatedAt: new Date().toISOString(),
      deckCount: 1,
      decks: [{
        slug: manifest.slug,
        htmlPath: manifest.htmlPath,
        pptxPath: manifest.pptxPath,
        htmlSlideCount: manifest.htmlSlideCount,
        pptxSlideCount: manifest.pptxSlideCount,
        selectedIndices: manifest.selectedIndices,
        pairCount: manifest.pairs.length,
        missingIndices: manifest.missingIndices,
      }],
    }, null, 2));
    writeComparisonIndex(outputRoot, [manifest]);
    console.log('Saved compare report: ' + path.join(outputRoot, 'report.json'));
    console.log('Saved compare index:  ' + path.join(outputRoot, 'index.html'));
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
