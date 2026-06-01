#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

function fail(message) {
  throw new Error(message);
}

function ensureFile(filePath, label) {
  if (!fs.existsSync(filePath)) fail(label + ' not found: ' + filePath);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function runCommand(command, args, label) {
  var result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.status !== 0) {
    var stderr = (result.stderr || result.stdout || '').trim();
    fail(label + ' failed: ' + (stderr || ('exit code ' + result.status)));
  }
}

function collectRenderedSlides(outputDir, prefixBase) {
  var prefix = prefixBase + '-';
  return fs.readdirSync(outputDir)
    .filter(function(name) {
      return name.startsWith(prefix) && name.toLowerCase().endsWith('.png');
    })
    .sort(function(a, b) {
      var aNum = parseInt(a.slice(prefix.length).replace(/\.png$/i, ''), 10);
      var bNum = parseInt(b.slice(prefix.length).replace(/\.png$/i, ''), 10);
      return aNum - bNum;
    });
}

function parseIndexList(rawValue) {
  if (!rawValue) return null;
  var parsed = rawValue
    .split(',')
    .map(function(item) { return parseInt(item.trim(), 10); })
    .filter(function(item) { return Number.isInteger(item) && item >= 0; });
  return parsed.length > 0 ? Array.from(new Set(parsed)).sort(function(a, b) { return a - b; }) : null;
}

export function exportPptxScreenshots(options) {
  var inputPath = path.resolve(options.inputPath);
  var outputDir = path.resolve(options.outputDir);
  var density = options.density || 144;
  var keepIntermediate = Boolean(options.keepIntermediate);
  var selectedIndices = Array.isArray(options.indices) ? options.indices.slice().sort(function(a, b) { return a - b; }) : null;

  ensureFile(inputPath, 'PPTX input');
  ensureDir(outputDir);
  for (var existing of fs.readdirSync(outputDir)) {
    if (existing.toLowerCase().endsWith('.png') || existing === '_intermediate') {
      fs.rmSync(path.join(outputDir, existing), { recursive: true, force: true });
    }
  }

  var tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'lecture-slide-pencil-pptx-'));
  var pdfName = path.basename(inputPath, path.extname(inputPath)) + '.pdf';
  var pdfPath = path.join(tempRoot, pdfName);
  var prefixBase = 'slide';

  try {
    runCommand('soffice', [
      '--headless',
      '--convert-to', 'pdf',
      '--outdir', tempRoot,
      inputPath,
    ], 'LibreOffice PDF export');

    ensureFile(pdfPath, 'Intermediate PDF');

    runCommand('pdftoppm', [
      '-png',
      '-r', String(density),
      pdfPath,
      path.join(outputDir, prefixBase),
    ], 'PDF to PNG export');

    var rendered = collectRenderedSlides(outputDir, prefixBase);
    if (rendered.length === 0) fail('No PNG slides were rendered');

    var kept = [];
    var keepSet = selectedIndices ? new Set(selectedIndices) : null;

    for (var i = 0; i < rendered.length; i++) {
      var srcName = rendered[i];
      var zeroIndex = i;
      var keep = !keepSet || keepSet.has(zeroIndex);
      var srcPath = path.join(outputDir, srcName);
      var finalName = 'slide-' + zeroIndex + '.png';
      var finalPath = path.join(outputDir, finalName);

      if (!keep) {
        fs.rmSync(srcPath, { force: true });
        continue;
      }

      if (srcPath !== finalPath) {
        if (fs.existsSync(finalPath)) fs.rmSync(finalPath, { force: true });
        fs.renameSync(srcPath, finalPath);
      }
      kept.push(finalName);
    }

    if (kept.length === 0) fail('Selected slide indices produced no screenshots');

    return {
      inputPath,
      outputDir,
      density,
      totalSlides: rendered.length,
      screenshots: kept,
    };
  } finally {
    if (keepIntermediate) {
      ensureDir(path.join(outputDir, '_intermediate'));
      if (fs.existsSync(pdfPath)) {
        fs.copyFileSync(pdfPath, path.join(outputDir, '_intermediate', path.basename(pdfPath)));
      }
    }
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

var isCli = Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
  var { values } = parseArgs({
    options: {
      input: { type: 'string', short: 'i' },
      'output-dir': { type: 'string', short: 'o' },
      density: { type: 'string', short: 'd', default: '144' },
      indices: { type: 'string' },
      'keep-intermediate': { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: false,
  });

  if (values.help || !values.input || !values['output-dir']) {
    console.log(`
Usage: node pptx-screenshot.js --input <pptx-file> --output-dir <dir> [--indices 0,2,5] [--density 144]
`);
    process.exit(values.help ? 0 : 1);
  }

  try {
    var result = exportPptxScreenshots({
      inputPath: values.input,
      outputDir: values['output-dir'],
      density: parseInt(values.density, 10) || 144,
      indices: parseIndexList(values.indices),
      keepIntermediate: values['keep-intermediate'],
    });
    console.log('Rendered ' + result.totalSlides + ' slide(s)');
    console.log('Saved screenshots: ' + result.screenshots.join(', '));
  } catch (err) {
    console.error('Error: ' + err.message);
    process.exit(1);
  }
}
