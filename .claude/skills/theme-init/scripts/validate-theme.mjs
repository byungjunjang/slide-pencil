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
//
// Usage:
//   node validate-theme.mjs <theme> [--root <dir>]
// exit code: 0 = 전부 통과, 1 = 하나라도 실패
// ---------------------------------------------------------------------------

import { readFileSync, existsSync } from 'fs'
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
  let theme = null, root = null
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--root') root = argv[++i]
    else if (!argv[i].startsWith('--')) theme = argv[i]
  }
  if (!theme) {
    console.error('Usage: node validate-theme.mjs <theme> [--root <dir>]')
    process.exit(1)
  }
  root = resolve(root || defaultRoot())

  const indexCssPath = join(root, 'src', 'index.css')
  const claudeMdPath = join(root, 'CLAUDE.md')
  const slideSkillPath = join(root, '.claude/skills/slide/SKILL.md')
  const mirrorPath = join(root, '.claude/skills/slide/references', theme, 'colors_and_type.css')

  const results = []
  const add = (id, pass, detail) => results.push({ id, pass, detail })

  // 1) 마커 존재
  for (const [label, p] of [['src/index.css', indexCssPath], ['CLAUDE.md', claudeMdPath], ['slide/SKILL.md', slideSkillPath]]) {
    if (!existsSync(p)) { add(`marker:${label}`, false, '파일 없음'); continue }
    const t = readFileSync(p, 'utf-8')
    const ok = t.includes('THEME:START') && t.includes('THEME:END')
    add(`marker:${label}`, ok, ok ? 'THEME:START/END 존재' : 'THEME 마커 누락')
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

  const passed = results.filter((r) => r.pass).length
  console.log(JSON.stringify({ theme, passRate: `${passed}/${results.length}`, results }, null, 2))
  if (results.some((r) => !r.pass)) process.exit(1)
}

main()
