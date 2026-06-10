#!/usr/bin/env node
// html2pptx.mjs — HTML → PPTX 변환의 검증·수정 루프 오케스트레이터.
//
// 한 명령으로 다음을 순차 실행하고, 시각 diff 게이트 실패 시
// 헤드룸(pad-scale)을 올려 자동 재시도한다:
//
//   1. extract-manifest.mjs  — 렌더 실측 좌표로 매니페스트 추출 (라인 락)
//   2. check-manifest.js     — 정적 검증 (겹침·박스 휴리스틱·flat-stack 등)
//   3. rasterize-svg-images  — SVG → PNG (있을 때)
//   4. convert.js --strict   — PPTX 변환 (warning = 실패)
//   5. unzip -t              — 무결성
//   6. pptx-compare.js       — HTML 캡처 vs PPTX 렌더 픽셀 diff 게이트
//
// Usage:
//   node html2pptx.mjs <deck.html> [--max-diff 0.08] [--retries 2]
//   (--max-diff 생략 시 pptx-compare 기본값: masked diff 0.08 / full diff 0.15)
//
// exit 0 = 전 게이트 통과. exit 1 = 재시도 소진 — 실패 슬라이드 인덱스를
// 보고하므로 해당 TSX를 수정하고 재빌드 후 다시 실행한다.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS = {
  extract: path.join(__dirname, 'extract-manifest.mjs'),
  check: path.join(__dirname, 'check-manifest.js'),
  rasterize: path.join(__dirname, 'rasterize-svg-images.mjs'),
  convert: path.join(__dirname, 'convert.js'),
  compare: path.join(__dirname, '..', '..', 'export-pptx', 'scripts', 'pptx-compare.js'),
};

function run(label, cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { encoding: 'utf-8', ...opts });
  const out = (res.stdout || '') + (res.stderr || '');
  return { code: res.status ?? 1, out, label };
}

function parseArgs(argv) {
  // maxDiff 미지정 시 pptx-compare의 기본값을 따른다
  // (매니페스트 존재 → masked diff 0.08, 부재 → full diff 0.15)
  const args = { _: [], maxDiff: null, retries: 2 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--max-diff') args.maxDiff = parseFloat(argv[++i]);
    else if (argv[i] === '--retries') args.retries = parseInt(argv[++i], 10);
    else if (!argv[i].startsWith('--')) args._.push(argv[i]);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const htmlPath = args._[0];
  if (!htmlPath) {
    console.error('Usage: node html2pptx.mjs <deck.html> [--max-diff 0.15] [--retries 2]');
    process.exit(1);
  }
  const resolved = path.resolve(htmlPath);
  const manifestPath = resolved.replace(/\.html$/i, '') + '-manifest.json';
  const pptxPath = resolved.replace(/\.html$/i, '') + '.pptx';
  const compareDir = path.join(path.dirname(resolved), '_compare');

  // pad-scale 에스컬레이션: 1.0 → 1.3 → 1.6 (재시도마다 텍스트 박스 헤드룸 확대)
  const PAD_SCALES = [1.0, 1.3, 1.6];
  let lastFailing = [];

  for (let attempt = 0; attempt <= args.retries; attempt++) {
    const padScale = PAD_SCALES[Math.min(attempt, PAD_SCALES.length - 1)];
    console.log(`\n━━━ attempt ${attempt + 1}/${args.retries + 1} (pad-scale ${padScale}) ━━━`);

    // 1. extract
    let r = run('extract', 'node', [SCRIPTS.extract, resolved, '--pad-scale', String(padScale)]);
    if (r.code !== 0) {
      console.error('[extract] FAIL\n' + r.out);
      process.exit(1);
    }
    console.log('[extract] ok — ' + (r.out.match(/Slides: \d+[^\n]*/)?.[0] ?? ''));

    // 2. check-manifest
    r = run('check', 'node', [SCRIPTS.check, manifestPath]);
    if (r.code !== 0) {
      console.error('[check-manifest] FAIL — 정적 검증 실패. 원본 TSX 수정 필요:\n' + r.out.slice(-1500));
      process.exit(1);
    }
    console.log('[check-manifest] ok');

    // 3. rasterize (SVG 없으면 no-op)
    r = run('rasterize', 'node', [SCRIPTS.rasterize, manifestPath]);
    if (r.code !== 0) {
      console.error('[rasterize] FAIL\n' + r.out.slice(-800));
      process.exit(1);
    }
    console.log('[rasterize] ok');

    // 4. convert --strict
    r = run('convert', 'node', [SCRIPTS.convert, manifestPath, '--strict']);
    if (r.code !== 0) {
      console.error('[convert] FAIL (--strict)\n' + r.out.slice(-800));
      process.exit(1);
    }
    console.log('[convert] ok — ' + path.basename(pptxPath));

    // 5. integrity
    r = run('unzip', 'unzip', ['-t', pptxPath]);
    if (r.code !== 0) {
      console.error('[integrity] FAIL — PPTX 손상\n' + r.out.slice(-400));
      process.exit(1);
    }
    console.log('[integrity] ok');

    // 6. visual diff gate (masked diff 기본 0.08 — pptx-compare가 결정)
    const compareArgs = [SCRIPTS.compare, '--input', resolved, '--output-dir', compareDir];
    if (args.maxDiff !== null) compareArgs.push('--max-diff', String(args.maxDiff));
    r = run('compare', 'node', compareArgs);
    const verdictLine = r.out.match(/Diff verdict: [^\n]*/)?.[0] ?? '(no verdict)';
    console.log('[compare] ' + verdictLine);
    if (r.code === 0) {
      console.log(`\n✅ html2pptx PASS — ${path.basename(pptxPath)} (attempt ${attempt + 1}, pad-scale ${padScale})`);
      process.exit(0);
    }

    // 실패 슬라이드 추출 후 재시도
    try {
      const report = JSON.parse(fs.readFileSync(path.join(compareDir, 'report.json'), 'utf-8'));
      lastFailing = report.decks?.[0]?.failingIndices ?? [];
    } catch { /* report 없으면 무시 */ }
    console.log(`[compare] over-threshold slides: ${lastFailing.join(', ') || '(unknown)'} — retrying with larger pad`);
  }

  console.error(
    `\n❌ html2pptx FAIL — 재시도 소진. diff 임계 초과 슬라이드: ${lastFailing.join(', ') || '(unknown)'}\n` +
    `   ${compareDir}/index.html 에서 해당 슬라이드의 HTML vs PPTX를 비교하고,\n` +
    `   원본 SlideNN.tsx를 수정 → npm run build → 본 스크립트 재실행.`,
  );
  process.exit(1);
}

main().catch((err) => {
  console.error('html2pptx failed:', err.message);
  process.exit(1);
});
