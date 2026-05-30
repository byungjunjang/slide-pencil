#!/usr/bin/env node
// gen-colors-and-type.mjs
// ---------------------------------------------------------------------------
// `references/<theme>/colors_and_type.css`(패턴 standalone 프리뷰용 토큰 SSOT)를
// `src/index.css`의 THEME:START..THEME:END 블록에서 **생성**하고, 클래스 패리티를
// **검증**한다. theme-init SKILL.md Step 4 #6의 수동 Write + POSIX awk/comm 블록을
// 대체한다 — Node 기반이라 Windows/macOS/Linux 모두 동작.
//
// 규칙(결정론적): colors_and_type.css = [standalone 헤더] + [src THEME 블록 내용
//   에서 `@layer base { ... }`만 제거] + [THEME:END]. @layer base는 클래스 셀렉터를
//   포함하지 않으므로(`*`/`html`/`body`/엘리먼트 선택자뿐) 패리티에 영향 없음 →
//   생성물은 src THEME 블록의 모든 `.class`를 by-construction 포함한다.
//
// Usage:
//   node gen-colors-and-type.mjs <theme>           # 생성(write) + 패리티 검증
//   node gen-colors-and-type.mjs <theme> --check    # 검증만(write 안 함). 드리프트 시 비-0 exit
//   node gen-colors-and-type.mjs <theme> --root <dir>  # 프로젝트 루트 지정(기본: 스크립트 위치 기준)
//
// exit code: 0 = OK, 1 = 패리티 드리프트/오류
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { resolve, join, dirname } from 'path'
import { fileURLToPath } from 'url'

function defaultRoot() {
  // .claude/skills/theme-init/scripts/gen-colors-and-type.mjs → 루트는 4단계 위
  const here = dirname(fileURLToPath(import.meta.url))
  return resolve(here, '..', '..', '..', '..')
}

function parseArgs(argv) {
  const opts = { check: false, root: null }
  const positional = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--check') opts.check = true
    else if (a === '--root') opts.root = argv[++i]
    else if (a.startsWith('--')) throw new Error(`unknown flag: ${a}`)
    else positional.push(a)
  }
  opts.theme = positional[0]
  return opts
}

// src/index.css의 THEME:START..THEME:END 사이 "CSS 본문"을 추출한다.
// THEME:START는 여러 줄 주석 안에 있고(`/* THEME:START name=... ...... */`),
// THEME:END는 단독 주석(`/* THEME:END */`)이다. 두 마커 주석 자체는 제외하고
// 그 사이의 CSS(:root + 클래스 등)만 반환한다.
function extractThemeBody(css) {
  const startTag = css.indexOf('THEME:START')
  if (startTag === -1) throw new Error('THEME:START 마커를 src/index.css에서 찾지 못함')
  // THEME:START가 들어있는 여는 주석의 닫는 `*/`를 찾는다.
  const afterStartComment = css.indexOf('*/', startTag)
  if (afterStartComment === -1) throw new Error('THEME:START 주석이 닫히지 않음')
  const endTag = css.indexOf('THEME:END', afterStartComment)
  if (endTag === -1) throw new Error('THEME:END 마커를 찾지 못함')
  // THEME:END가 들어있는 여는 주석의 시작 `/*`을 찾는다.
  const endCommentOpen = css.lastIndexOf('/*', endTag)
  return css.slice(afterStartComment + 2, endCommentOpen)
}

// `@layer <name> { ... }` 블록을 중괄호 균형을 세어 제거한다(중첩 셀렉터 안전).
// 주석(/* */)·문자열("...", '...') 안의 중괄호는 세지 않는다 — 신규 테마가 @layer base
// 안에 `/* } */`나 `content:"}"`를 넣어도 미러가 깨지지 않도록(드라이런 후속 하드닝).
function removeAtLayerBlocks(css) {
  let out = css
  const re = /@layer\s+[\w-]+\s*\{/g
  let m
  while ((m = re.exec(out)) !== null) {
    const open = m.index + m[0].length - 1 // '{' 위치
    let depth = 1
    let i = open + 1
    while (i < out.length && depth > 0) {
      const c = out[i]
      if (c === '/' && out[i + 1] === '*') {
        const end = out.indexOf('*/', i + 2)
        i = end === -1 ? out.length : end + 2
        continue
      }
      if (c === '"' || c === "'") {
        i++
        while (i < out.length && out[i] !== c) {
          if (out[i] === '\\') i++
          i++
        }
        i++ // 닫는 따옴표 다음으로
        continue
      }
      if (c === '{') depth++
      else if (c === '}') depth--
      i++
    }
    out = out.slice(0, m.index) + out.slice(i)
    re.lastIndex = 0 // 문자열이 줄었으니 처음부터 다시
  }
  return out
}

// CSS에서 클래스 셀렉터(.foo) 집합을 추출한다. 선언 블록 `{...}` 내부(속성값)는
// 제외하고, 셀렉터 위치의 `.class`만 모은다.
function extractClassSelectors(css) {
  const set = new Set()
  // 규칙 본문을 제거하고 셀렉터 부분만 남긴다: `... { ... }` 에서 `{...}`를 공백으로.
  const selectorsOnly = css.replace(/\{[^{}]*\}/g, ' {} ')
  // 이제 `.classname` 토큰만 셀렉터 영역에서 매치
  const re = /\.[A-Za-z_][\w-]*/g
  let m
  while ((m = re.exec(selectorsOnly)) !== null) set.add(m[0])
  return set
}

function buildHeader(theme) {
  return `/* THEME:START name=${theme}
   ============================================================
   패턴 HTML 토큰 + 타이포 SSOT (standalone 프리뷰용).
   값은 src/index.css THEME 블록과 동일하게 유지 — 패턴 프리뷰=빌드 일치.
   _slide.css가 \`@import url('../colors_and_type.css')\`로 로드한다.
   ⚠️ 이 파일은 /theme-init scripts/gen-colors-and-type.mjs가 자동 생성한다.
      직접 편집하지 말고 src/index.css THEME 블록을 고친 뒤 재생성할 것.
   ============================================================ */
`
}

function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (!opts.theme) {
    console.error('Usage: node gen-colors-and-type.mjs <theme> [--check] [--root <dir>]')
    process.exit(1)
  }
  const root = resolve(opts.root || defaultRoot())
  const indexCssPath = join(root, 'src', 'index.css')
  if (!existsSync(indexCssPath)) {
    console.error(`[gen-colors-and-type] src/index.css 없음: ${indexCssPath}`)
    process.exit(1)
  }
  const mirrorPath = join(
    root,
    '.claude',
    'skills',
    'slide',
    'references',
    opts.theme,
    'colors_and_type.css',
  )

  const indexCss = readFileSync(indexCssPath, 'utf-8')
  const themeBody = extractThemeBody(indexCss)
  const body = removeAtLayerBlocks(themeBody).replace(/\n{3,}/g, '\n\n').trim()
  const generated = buildHeader(opts.theme) + body + '\n/* THEME:END */\n'

  // 패리티: src THEME 블록의 클래스 ⊆ 생성물의 클래스
  const srcClasses = extractClassSelectors(themeBody)
  const genClasses = extractClassSelectors(generated)
  const missing = [...srcClasses].filter((c) => !genClasses.has(c)).sort()

  if (opts.check) {
    // 검증 대상은 디스크의 기존 미러(있으면). 없으면 생성물 자체로 검증.
    const target = existsSync(mirrorPath) ? readFileSync(mirrorPath, 'utf-8') : generated
    const targetClasses = extractClassSelectors(target)
    const drift = [...srcClasses].filter((c) => !targetClasses.has(c)).sort()
    if (drift.length > 0) {
      console.error(
        `[gen-colors-and-type] FAIL — src THEME 클래스 중 미러에 없는 것 ${drift.length}개: ${drift.join(', ')}`,
      )
      console.error('  → `node gen-colors-and-type.mjs ' + opts.theme + '`로 재생성하세요.')
      process.exit(1)
    }
    console.log(`[gen-colors-and-type] OK — 클래스 패리티 통과 (${srcClasses.size}개 모두 미러에 존재)`)
    process.exit(0)
  }

  if (missing.length > 0) {
    // by-construction 발생하면 안 됨 — 발생 시 생성 규칙 버그
    console.error(`[gen-colors-and-type] 내부 오류: 생성물에서 클래스 누락 ${missing.join(', ')}`)
    process.exit(1)
  }

  mkdirSync(dirname(mirrorPath), { recursive: true })
  writeFileSync(mirrorPath, generated, 'utf-8')
  console.log(`[gen-colors-and-type] 생성 완료: ${mirrorPath}`)
  console.log(`  미러 클래스 ${genClasses.size}개, src THEME 클래스 ${srcClasses.size}개 — 패리티 OK`)
}

main()
