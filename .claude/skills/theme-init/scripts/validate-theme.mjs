#!/usr/bin/env node
// validate-theme.mjs
// ---------------------------------------------------------------------------
// /theme-init 적용 후 정적 검증 게이트 (deck-비의존). theme-init SKILL.md Step 5의
// 일부를 자동화한다. `npm run build`(라이브 덱 필요)는 SKILL.md가 별도로 돌린다.
//
// 검사 항목:
//   1. THEME 마커 존재 — src/index.css, CLAUDE.md, .claude/skills/slide/SKILL.md
//   2. v1 토큰 컨트랙트 완전성 — 필수 CSS 변수가 src/index.css THEME 블록에 정의됨
//   3. 클래스 패리티 — src THEME 블록의 .class ⊆ references/<theme>/colors_and_type.css
//   4. 토큰 값 패리티 — 코어 토큰 값이 src/index.css == colors_and_type.css
//   5. stale-hex 스캔 (Fix1) — 사용자 작성 슬라이드(src/slides/*.tsx)에 하드코딩 hex 잔존 여부.
//        테마 교체 후 옛 accent가 토큰화되지 않고 남으면 드리프트. 기본 WARN(P3 warn-then-gate).
//        범위: src/slides/ 최상위 .tsx 만 (자동생성 working copy). _archive*/output/.pen 제외.
//   6. imagePromptDrift (Fix2) — 이미지 프롬프트(README + slide/SKILL.md + image-archetypes.md)에
//        옛 accent hex 잔존 여부(codex-image 프롬프트 교체 누락 가드). --stale-hex 지정 시에만 활성.
//
// Usage:
//   node validate-theme.mjs <theme> [--root <dir>] [--stale-hex #aaa,#bbbbbb] [--strict-hex]
//     --stale-hex  검사할 옛 hex 목록(콤마구분). 생략 시 src/slides 의 *모든* 하드코딩 hex 탐지.
//     --strict-hex stale-hex 발견을 WARN 대신 FAIL(exit 1)로 승격(warn→gate).
// exit code: 0 = 하드 실패 없음(WARN 가능), 1 = 하나라도 하드 실패
// ---------------------------------------------------------------------------

import { readFileSync, existsSync, readdirSync } from 'fs'
import { resolve, join, dirname } from 'path'
import { fileURLToPath } from 'url'

function defaultRoot() {
  const here = dirname(fileURLToPath(import.meta.url))
  return resolve(here, '..', '..', '..', '..')
}

const REQUIRED_TOKENS = [
  'bg', 'surface', 'surface-alt',
  'text', 'text-secondary', 'text-tertiary',
  'border', 'border-strong',
  'accent', 'accent-soft', 'accent-ink',
  'positive', 'positive-soft', 'negative', 'negative-soft', 'warning', 'warning-soft',
  'font-sans', 'font-mono',
  'fs-display', 'fs-display-sm', 'fs-headline', 'fs-title', 'fs-body', 'fs-caption',
  'fw-display', 'fw-headline', 'fw-title', 'fw-body', 'fw-caption',
  'space-1', 'space-2', 'space-3', 'space-4', 'space-5', 'space-6',
  'space-8', 'space-10', 'space-12', 'space-14', 'space-16',
  'radius-xs', 'radius-sm', 'radius-md', 'radius-lg', 'radius-xl', 'radius-pill',
  'shadow-sm', 'shadow-md', 'shadow-lg',
  'card-padding', 'card-gap', 'card-radius',
  'card-bg', 'card-border-color',
]
// 값 패리티를 검사할 코어 토큰 (별칭/code 토큰 제외)
const VALUE_PARITY_TOKENS = REQUIRED_TOKENS

function themeScope(css) {
  const s = css.indexOf('THEME:START')
  const e = css.indexOf('THEME:END')
  if (s === -1 || e === -1) return null
  return css.slice(s, e)
}

function tokenValue(scope, name) {
  const m = scope.match(new RegExp('--' + name.replace(/[-]/g, '\\-') + '\\s*:\\s*([^;]+);'))
  return m ? m[1].trim().replace(/\s+/g, ' ') : null
}

function classSet(scope) {
  const selectorsOnly = scope.replace(/\{[^{}]*\}/g, ' {} ')
  const set = new Set()
  const re = /\.[A-Za-z_][\w-]*/g
  let m
  while ((m = re.exec(selectorsOnly)) !== null) set.add(m[0])
  return set
}

function main() {
  const argv = process.argv.slice(2)
  let theme = null, root = null, staleHexList = null, strictHex = false
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--root') root = argv[++i]
    else if (argv[i] === '--stale-hex') staleHexList = argv[++i].split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    else if (argv[i] === '--strict-hex') strictHex = true
    else if (!argv[i].startsWith('--')) theme = argv[i]
  }
  if (!theme) {
    console.error('Usage: node validate-theme.mjs <theme> [--root <dir>] [--stale-hex #aaa,#bbbbbb] [--strict-hex]')
    process.exit(1)
  }
  root = resolve(root || defaultRoot())

  const indexCssPath = join(root, 'src', 'index.css')
  const claudeMdPath = join(root, 'CLAUDE.md')
  const slideSkillPath = join(root, '.claude/skills/slide/SKILL.md')
  const mirrorPath = join(root, '.claude/skills/slide/references', theme, 'colors_and_type.css')

  const results = []
  const add = (id, pass, detail, opts = {}) =>
    results.push({ id, pass, detail, ...(opts.warn ? { warn: true } : {}) })

  // 1) 마커 존재
  for (const [label, p] of [['src/index.css', indexCssPath], ['CLAUDE.md', claudeMdPath], ['slide/SKILL.md', slideSkillPath]]) {
    if (!existsSync(p)) { add(`marker:${label}`, false, '파일 없음'); continue }
    const t = readFileSync(p, 'utf-8')
    const hasMarkers = t.includes('THEME:START') && t.includes('THEME:END')
    const nameOk = t.includes(`THEME:START name=${theme}`)
    add(
      `marker:${label}`,
      hasMarkers && nameOk,
      !hasMarkers
        ? 'THEME:START/END 마커 누락'
        : !nameOk
          ? `THEME:START name= 가 '${theme}' 와 불일치 (Step 4에서 마커 이름 갱신 누락?)`
          : `THEME:START/END + name=${theme}`,
    )
  }

  const indexCss = existsSync(indexCssPath) ? readFileSync(indexCssPath, 'utf-8') : ''
  const srcScope = themeScope(indexCss)

  // 2) v1 토큰 컨트랙트 완전성
  if (!srcScope) {
    add('tokenContract', false, 'src/index.css THEME 블록 없음')
  } else {
    const missing = REQUIRED_TOKENS.filter((t) => tokenValue(srcScope, t) === null)
    add('tokenContract', missing.length === 0, missing.length === 0 ? `${REQUIRED_TOKENS.length}개 토큰 모두 정의됨` : `누락: ${missing.map((m) => '--' + m).join(', ')}`)
  }

  // 3) 클래스 패리티
  if (!srcScope) {
    add('classParity', false, 'src THEME 블록 없음')
  } else if (!existsSync(mirrorPath)) {
    add('classParity', false, `colors_and_type.css 없음: references/${theme}/`)
  } else {
    const mirror = readFileSync(mirrorPath, 'utf-8')
    const srcClasses = classSet(srcScope)
    const mirrorClasses = classSet(themeScope(mirror) || mirror)
    const drift = [...srcClasses].filter((c) => !mirrorClasses.has(c)).sort()
    add('classParity', drift.length === 0, drift.length === 0 ? `${srcClasses.size}개 클래스 미러에 모두 존재` : `미러 누락: ${drift.join(', ')}`)
  }

  // 4) 토큰 값 패리티 (index.css == colors_and_type.css)
  if (srcScope && existsSync(mirrorPath)) {
    const mirrorScope = themeScope(readFileSync(mirrorPath, 'utf-8')) || ''
    const mismatches = []
    for (const t of VALUE_PARITY_TOKENS) {
      const a = tokenValue(srcScope, t)
      const b = tokenValue(mirrorScope, t)
      if (a !== null && b !== null && a !== b) mismatches.push(`--${t} (src:${a} != mirror:${b})`)
    }
    add('valueParity', mismatches.length === 0, mismatches.length === 0 ? '코어 토큰 값 일치' : mismatches.slice(0, 5).join('; '))
  } else {
    add('valueParity', false, '비교 불가 (src THEME 또는 미러 없음)')
  }

  // 5) stale-hex 스캔 (Fix1) — src/slides/ 최상위 .tsx 만. _archive*/ 하위·output/·.pen 자동 제외.
  const slidesDir = join(root, 'src', 'slides')
  const HEX_RE = /#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g
  if (!existsSync(slidesDir)) {
    add('staleHex', true, 'src/slides/ 없음 — 스캔 대상 없음')
  } else {
    const offenders = []
    for (const ent of readdirSync(slidesDir, { withFileTypes: true })) {
      if (!ent.isFile() || !ent.name.endsWith('.tsx')) continue // 디렉터리(_archive_v2 등) 자동 제외
      const found = readFileSync(join(slidesDir, ent.name), 'utf-8').match(HEX_RE) || []
      const hits = staleHexList
        ? found.filter((h) => staleHexList.includes(h.toLowerCase()))
        : found
      const uniq = [...new Set(hits.map((h) => h.toLowerCase()))]
      if (uniq.length) offenders.push(`${ent.name}: ${uniq.join(', ')}`)
    }
    const scope = staleHexList ? `대상 ${staleHexList.join('/')}` : '전체 하드코딩 hex'
    add(
      'staleHex',
      offenders.length === 0,
      offenders.length === 0
        ? `clean (src/slides/*.tsx, ${scope})`
        : `하드코딩 hex 잔존 → 토큰화 필요 (${scope}): ${offenders.join(' | ')}`,
      { warn: offenders.length > 0 && !strictHex },
    )
  }

  // 6) imagePromptDrift (Fix2 / E-경량) — 이미지 프롬프트(README + slide/SKILL.md + image-archetypes.md)에
  //    옛 accent hex 가 남았는지. theme-init Step 4 #11(codex-image 프롬프트 수동 교체) 누락 드리프트 가드.
  //    --stale-hex 가 주어졌을 때만 활성(없으면 활성 테마 자기 hex로 false-positive). 기본 WARN, --strict-hex 로 FAIL.
  if (!staleHexList) {
    add('imagePromptDrift', true, 'SKIP — --stale-hex 미지정 (옛 accent hex 모름)')
  } else {
    const promptFiles = [
      ['README.md', join(root, 'README.md')],
      ['slide/SKILL.md', slideSkillPath],
      ['image-archetypes.md', join(root, '.claude/skills/slide/references/image-archetypes.md')],
    ]
    const offenders = []
    for (const [label, p] of promptFiles) {
      if (!existsSync(p)) continue
      const found = (readFileSync(p, 'utf-8').match(HEX_RE) || []).map((h) => h.toLowerCase())
      const uniq = [...new Set(found)].filter((h) => staleHexList.includes(h))
      if (uniq.length) offenders.push(`${label}: ${uniq.join(', ')}`)
    }
    add(
      'imagePromptDrift',
      offenders.length === 0,
      offenders.length === 0
        ? `clean (이미지 프롬프트, 대상 ${staleHexList.join('/')})`
        : `옛 accent hex 잔존 → theme-init #11 codex-image 프롬프트 교체 누락: ${offenders.join(' | ')}`,
      { warn: offenders.length > 0 && !strictHex },
    )
  }

  const passed = results.filter((r) => r.pass).length
  console.log(JSON.stringify({ theme, passRate: `${passed}/${results.length}`, results }, null, 2))
  // WARN(미통과지만 warn:true)은 게이트를 막지 않는다 — 하드 실패만 exit 1.
  if (results.some((r) => !r.pass && !r.warn)) process.exit(1)
}

main()
