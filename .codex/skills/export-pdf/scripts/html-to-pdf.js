#!/usr/bin/env node
/**
 * HTML → PDF converter for lecture-slide-pencil
 *
 * Strategy:
 *   1. Load dist/index.html in Playwright
 *   2. Screenshot each slide element individually (exact 1280×720 clip)
 *   3. Build a fresh HTML page embedding each screenshot as a full-page image
 *   4. Print that HTML to PDF — no CSS page-break quirks
 *
 * Usage:
 *   node html-to-pdf.js [output_path]
 */

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../../..');

const outputArg = process.argv[2];

const distHtml = path.join(ROOT, 'dist', 'index.html');
if (!fs.existsSync(distHtml)) {
  console.error(`[export-pdf] dist/index.html not found. Run "npm run build" first.`);
  process.exit(1);
}

function resolveOutput() {
  if (outputArg) return path.resolve(outputArg);
  const outputDir = path.join(ROOT, 'output');
  fs.mkdirSync(outputDir, { recursive: true });
  const ts = new Date().toISOString().slice(0, 10);
  return path.join(outputDir, `slides-${ts}.pdf`);
}

const outputPath = resolveOutput();

(async () => {
  const browser = await chromium.launch();

  // ── Step 1: Screenshot each slide ─────────────────────────────────────────
  const capturePage = await browser.newPage();
  await capturePage.setViewportSize({ width: 1280, height: 720 });
  await capturePage.goto(`file://${distHtml}`, { waitUntil: 'networkidle' });
  await capturePage.waitForTimeout(300);

  const slideHandles = await capturePage.locator('#slides-root > *').all();
  console.log(`[export-pdf] Found ${slideHandles.length} slides → ${outputPath}`);

  const pngDataUrls = [];
  for (let i = 0; i < slideHandles.length; i++) {
    const handle = slideHandles[i];
    // Clip exactly to the slide element — ignores surrounding padding/gap
    const buf = await handle.screenshot({ type: 'png' });
    pngDataUrls.push('data:image/png;base64,' + buf.toString('base64'));
    process.stdout.write(`  capturing slide ${i + 1}/${slideHandles.length}\r`);
  }
  console.log('');
  await capturePage.close();

  // ── Step 2: Build print HTML from screenshots ──────────────────────────────
  const imgTags = pngDataUrls
    .map((src, i) => {
      const isLast = i === pngDataUrls.length - 1;
      return `<img src="${src}" style="break-after:${isLast ? 'avoid' : 'page'}">`;
    })
    .join('\n');

  const printHtml = `<!DOCTYPE html>
<html>
<head>
<style>
  @page { size: 1280px 720px; margin: 0; }
  html, body { margin: 0; padding: 0; background: white; }
  img { display: block; width: 1280px; height: 720px; }
</style>
</head>
<body>
${imgTags}
</body>
</html>`;

  // ── Step 3: Print to PDF ───────────────────────────────────────────────────
  const printPage = await browser.newPage();
  await printPage.setViewportSize({ width: 1280, height: 720 });
  await printPage.setContent(printHtml, { waitUntil: 'load' });

  await printPage.pdf({
    path: outputPath,
    width: '1280px',
    height: '720px',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });

  await browser.close();
  console.log(`[export-pdf] Done: ${outputPath}`);
})().catch((err) => {
  console.error('[export-pdf] Error:', err.message);
  process.exit(1);
});
