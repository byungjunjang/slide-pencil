#!/usr/bin/env node
// Rasterize inline-SVG `image` elements in a manifest into PNG data URIs.
//
// Why: PowerPoint / LibreOffice drop SVG stroke colors when converting to EMF,
// so accent-colored icons render gray. PNG bitmaps survive the PPTX pipeline.
//
// Usage:
//   node rasterize-svg-images.mjs <manifest.json> [--scale 4]
//
// Writes the manifest in-place (replacing `data:image/svg+xml;base64,...` src
// values with `data:image/png;base64,...`). Non-SVG image elements are skipped.

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: node rasterize-svg-images.mjs <manifest.json> [--scale N]');
  process.exit(1);
}

const manifestPath = resolve(args[0]);
const scaleArgIdx = args.indexOf('--scale');
const SCALE = scaleArgIdx >= 0 ? parseInt(args[scaleArgIdx + 1], 10) || 4 : 4;

const m = JSON.parse(readFileSync(manifestPath, 'utf-8'));

function parseSvg(dataUri) {
  if (!dataUri || typeof dataUri !== 'string') return null;
  if (!dataUri.startsWith('data:image/svg')) return null;
  const b64 = dataUri.split(',')[1];
  if (!b64) return null;
  return Buffer.from(b64, 'base64').toString('utf-8');
}

(async () => {
  const targets = [];
  m.slides.forEach((s, sIdx) => {
    s.elements.forEach((e, eIdx) => {
      if (e.type === 'image') {
        const svg = parseSvg(e.src);
        if (svg) targets.push({ sIdx, eIdx, svg });
      }
    });
  });

  if (targets.length === 0) {
    console.log('No SVG image elements found — nothing to rasterize.');
    return;
  }

  console.log(`Rasterizing ${targets.length} SVG image(s) at ${SCALE}x...`);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 800, height: 800 },
    deviceScaleFactor: SCALE,
  });
  const page = await context.newPage();

  for (const t of targets) {
    const html = `<!doctype html><html><head><meta charset="utf-8">
      <style>html,body{margin:0;padding:0;background:transparent} svg{display:block}</style>
      </head><body>${t.svg}</body></html>`;
    await page.setContent(html);
    await page.evaluate(() => document.body.offsetHeight);
    const el = await page.$('svg');
    if (!el) {
      console.warn(`  slide ${t.sIdx+1} idx ${t.eIdx}: svg not found in DOM, skipped`);
      continue;
    }
    const png = await el.screenshot({ type: 'png', omitBackground: true });
    const b64 = png.toString('base64');
    m.slides[t.sIdx].elements[t.eIdx].src = 'data:image/png;base64,' + b64;
    console.log(`  slide ${t.sIdx+1} idx ${t.eIdx}: PNG ${(b64.length/1024).toFixed(1)}KB`);
  }

  await browser.close();
  writeFileSync(manifestPath, JSON.stringify(m, null, 2));
  console.log(`\nUpdated: ${manifestPath}`);
})().catch(err => { console.error(err); process.exit(1); });
