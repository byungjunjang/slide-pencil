#!/usr/bin/env node
// Production-ready convert.js replacement with:
//  - Inline `runs` array support (per-run color / bold / italic / fontSize / fontFamily / breakLine)
//  - Explicit `wrap` opt-out per element (defaults to true)
//  - `fit: 'none'` hard-off PPTX auto-shrink behavior so number badges don't wrap
//
// Location: .codex/skills/slide/scripts/convert.js
// (also called from /export-pptx skill which is a thin entry point for this script)

import PptxGenJS from 'pptxgenjs';
import { readFileSync } from 'fs';
import { resolve, dirname, basename } from 'path';

const PPTX_WIDTH = 13.333;
const PPTX_HEIGHT = 7.5;
const SLIDE_PX_W = 1280;
const PX_TO_INCH = PPTX_WIDTH / SLIDE_PX_W;
const PX_TO_PT = PX_TO_INCH * 72;

// Last-resort fallback used ONLY when a manifest declares no `fonts`.
// The active theme's font is theme-agnostic: the default comes from
// `manifest.fonts[0]` (which the LLM fills from src/index.css `--font-sans`),
// never a hardcoded family. See manifest-schema.md "Font mapping".
const GENERIC_FALLBACK_FONT = 'Arial';

function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return '000000';
  const clean = hex.replace('#', '');
  if (clean.length === 8) return clean.slice(0, 6);
  if (clean.length === 3) return clean[0]+clean[0]+clean[1]+clean[1]+clean[2]+clean[2];
  if (clean.length !== 6) return '000000';
  return clean;
}

function isBold(weight) { return parseInt(weight, 10) >= 700; }
function px(val) { return val * PX_TO_INCH; }
function pt(pxVal) { return Math.round(pxVal * PX_TO_PT * 10) / 10; }

function addTextElement(slide, el, warnings, defaultFont) {
  const hasRuns = Array.isArray(el.runs) && el.runs.length > 0;
  if (!hasRuns && !el.content && el.content !== 0) {
    warnings.push(`Skipped text element with empty content at (${el.x},${el.y})`);
    return;
  }

  const textOpts = {
    x: px(el.x),
    y: px(el.y),
    w: px(el.w),
    h: px(el.h),
    fontSize: pt(el.fontSize),
    fontFace: el.fontFamily || defaultFont,
    color: hexToRgb(el.color),
    bold: isBold(el.fontWeight),
    align: el.align || 'left',
    valign: el.valign || 'top',
    wrap: el.wrap !== false,
    fit: 'none',
  };

  // extract-manifest.mjs가 실측 bbox를 주는 경우 PPT 기본 inset(좌우 0.1")이
  // 좌표를 흔들지 않도록 margin을 명시할 수 있다 (pt 단위, 0 허용).
  if (el.margin != null) {
    textOpts.margin = el.margin;
  }

  if (el.lineSpacing && el.lineSpacing > 0) {
    textOpts.lineSpacingMultiple = el.lineSpacing;
  }

  if (hasRuns) {
    const payload = el.runs.map(function(run) {
      const options = {};
      if (run.color) options.color = hexToRgb(run.color);
      if (run.fontWeight != null) options.bold = isBold(run.fontWeight);
      if (run.bold != null) options.bold = !!run.bold;
      if (run.italic != null) options.italic = !!run.italic;
      if (run.underline != null) options.underline = run.underline;
      if (run.fontSize) options.fontSize = pt(run.fontSize);
      if (run.fontFamily) options.fontFace = run.fontFamily;
      if (run.breakLine) options.breakLine = true;
      return { text: String(run.text == null ? '' : run.text), options };
    });
    slide.addText(payload, textOpts);
  } else {
    slide.addText(String(el.content), textOpts);
  }
}

function addRectElement(pres, slide, el, warnings) {
  const opts = {
    x: px(el.x), y: px(el.y), w: px(el.w), h: px(el.h),
    fill: { color: hexToRgb(el.fill) },
  };
  if (el.stroke) opts.line = { color: hexToRgb(el.stroke), width: el.strokeWidth || 1 };
  if (el.cornerRadius > 0) {
    const maxRadius = Math.min(px(el.w), px(el.h)) / 2;
    opts.rectRadius = Math.min(px(el.cornerRadius), maxRadius);
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, opts);
  } else {
    slide.addShape(pres.shapes.RECTANGLE, opts);
  }
}

function addEllipseElement(pres, slide, el, warnings) {
  const opts = {
    x: px(el.x), y: px(el.y), w: px(el.w), h: px(el.h),
    fill: { color: hexToRgb(el.fill) },
  };
  if (el.stroke) opts.line = { color: hexToRgb(el.stroke), width: el.strokeWidth || 1 };
  slide.addShape(pres.shapes.OVAL, opts);
}

function addImageElement(slide, el, warnings) {
  if (!el.src) {
    warnings.push(`Skipped image with empty src at (${el.x},${el.y})`);
    return;
  }
  const opts = { x: px(el.x), y: px(el.y), w: px(el.w), h: px(el.h) };
  if (el.src.startsWith('data:')) opts.data = el.src;
  else { opts.path = el.src; warnings.push(`Image uses external URL: ${el.src} — may not render offline`); }
  slide.addImage(opts);
}

function convertManifest(manifest) {
  const pres = new PptxGenJS();
  const warnings = [];
  // Default font for any text element that omits fontFamily — taken from the
  // manifest's declared fonts (theme-agnostic), not a hardcoded family.
  const defaultFont =
    (Array.isArray(manifest.fonts) && manifest.fonts.length > 0 && manifest.fonts[0]) ||
    GENERIC_FALLBACK_FONT;
  pres.defineLayout({ name: 'WIDE_16_9', width: PPTX_WIDTH, height: PPTX_HEIGHT });
  pres.layout = 'WIDE_16_9';
  pres.title = manifest.title || 'Untitled';
  pres.author = 'slide-pencil';

  for (let i = 0; i < manifest.slides.length; i++) {
    const slideData = manifest.slides[i];
    const slide = pres.addSlide();
    if (slideData.background) slide.background = { fill: hexToRgb(slideData.background) };
    for (const el of slideData.elements) {
      try {
        switch (el.type) {
          case 'text': addTextElement(slide, el, warnings, defaultFont); break;
          case 'rect': addRectElement(pres, slide, el, warnings); break;
          case 'ellipse': addEllipseElement(pres, slide, el, warnings); break;
          case 'image': addImageElement(slide, el, warnings); break;
          default: warnings.push(`Slide ${i + 1}: Unknown element type "${el.type}" — skipped`);
        }
      } catch (err) {
        warnings.push(`Slide ${i + 1}: Error adding ${el.type}: ${err.message}`);
      }
    }
  }
  return { pres, warnings };
}

async function main() {
  const rawArgs = process.argv.slice(2);
  const strict = rawArgs.includes('--strict');
  const args = rawArgs.filter((a) => a !== '--strict');
  if (args.length < 1) {
    console.error('Usage: node convert.js <manifest.json> [output.pptx] [--strict]');
    console.error('  If output.pptx is omitted, it is derived from the manifest filename:');
    console.error('  foo-manifest.json -> foo.pptx (same directory)');
    console.error('  --strict: exit 1 when any conversion warning occurs (CI/gate mode)');
    process.exit(1);
  }

  const manifestPath = resolve(args[0]);
  let outputPath;
  if (args[1]) {
    outputPath = resolve(args[1]);
  } else {
    const manifestBase = basename(manifestPath, '.json').replace(/-manifest$/i, '');
    outputPath = resolve(dirname(manifestPath), manifestBase + '.pptx');
    console.log('Auto-derived output path: ' + outputPath);
  }

  const raw = readFileSync(manifestPath, 'utf-8');
  const manifest = JSON.parse(raw);
  console.log(`Converting "${manifest.title}" (${manifest.slides.length} slides)...`);
  const { pres, warnings } = convertManifest(manifest);
  if (warnings.length > 0) {
    console.log('\nConversion warnings:');
    for (const w of warnings) console.log(`  - ${w}`);
  }
  await pres.writeFile({ fileName: outputPath });
  console.log(`\nPPTX saved: ${outputPath}`);
  console.log(`  Slides: ${manifest.slides.length}`);
  console.log(`  Fonts used: ${(manifest.fonts || []).join(', ') || 'default'}`);
  if (warnings.length > 0) console.log(`  Warnings: ${warnings.length}`);
  if (strict && warnings.length > 0) {
    console.error(`\n--strict: ${warnings.length} warning(s) — failing conversion gate.`);
    process.exit(1);
  }
}

main().catch(err => { console.error('Conversion failed:', err.message); process.exit(1); });
