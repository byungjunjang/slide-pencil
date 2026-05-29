#!/usr/bin/env node
// rename-theme.mjs
// ---------------------------------------------------------------------------
// 활성 테마 디렉토리를 새 슬러그로 옮기고(git mv), 문서 안의 경로/파일명 참조를
// 일괄 치환한다. theme-init SKILL.md Step 4 #4(git mv) + #9/#10(rg 경로 치환)의
// 수동 블록을 대체한다 — Node 기반이라 크로스플랫폼(rg/sed 불필요).
//
// 치환 대상 문자열:
//   - `references/<old>`            → `references/<new>`
//   - `<old>-design-system.pen`     → `<new>-design-system.pen`
//
// 안전장치(HARD):
//   - 제외 1 (제너레이터 예시): `.claude/skills/theme-init/**` 는 손대지 않는다.
//     (여기 등장하는 references/<old>는 from-theme 설명용 canonical 예시)
//   - 제외 2 (이력 보존): `docs/theme-replacement-map.md` 는 운영 참조와 이력
//     참조가 섞여 있어 자동 치환하지 않고 매치만 출력 → **수동 검토**.
//   - 바이너리/.pen/node_modules/dist/output/src/images/.git 은 스캔 제외.
//   - 루트 `<old>-design-system.pen` 파일 자체의 생성/삭제는 이 스크립트가 안 함
//     (디자인 경로에 따라 SKILL.md/pen-guard가 처리). 문서 내 "파일명 문자열"만 치환.
//
// Usage:
//   node rename-theme.mjs <old> <new>             # 실제 git mv + 치환
//   node rename-theme.mjs <old> <new> --dry-run   # 변경 미리보기만 (write/git mv 안 함)
//   node rename-theme.mjs <old> <new> --root <dir>
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs'
import { resolve, join, dirname, relative, sep } from 'path'
import { fileURLToPath } from 'url'
import { execFileSync } from 'child_process'

function defaultRoot() {
  const here = dirname(fileURLToPath(import.meta.url))
  return resolve(here, '..', '..', '..', '..')
}

const TEXT_EXT = new Set([
  '.md', '.css', '.tsx', '.ts', '.js', '.mjs', '.cjs', '.json',
  '.html', '.htm', '.txt', '.yml', '.yaml', '.svg',
])
const SKIP_DIRS = new Set(['node_modules', 'dist', 'output', '.git', 'src/images'])
// 자동 치환에서 제외하고 "수동 검토 매치만 출력"할 이력-보존 문서(루트 상대 경로)
const MANUAL_REVIEW = new Set(['docs/theme-replacement-map.md'])

function parseArgs(argv) {
  const opts = { dryRun: false, root: null }
  const pos = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--dry-run') opts.dryRun = true
    else if (a === '--root') opts.root = argv[++i]
    else if (a.startsWith('--')) throw new Error(`unknown flag: ${a}`)
    else pos.push(a)
  }
  opts.old = pos[0]
  opts.next = pos[1]
  return opts
}

function isExcludedDir(relDir) {
  const norm = relDir.split(sep).join('/')
  if (norm.startsWith('.claude/skills/theme-init')) return true // 제외 1
  for (const s of SKIP_DIRS) {
    if (norm === s || norm.startsWith(s + '/')) return true
  }
  return false
}

function walk(root, dir, files) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const rel = relative(root, full)
    const relNorm = rel.split(sep).join('/')
    let st
    try { st = statSync(full) } catch { continue }
    if (st.isDirectory()) {
      if (entry === '.git' || entry === 'node_modules' || entry === 'dist' || entry === 'output') continue
      if (relNorm === 'src/images') continue
      if (relNorm.startsWith('.claude/skills/theme-init')) continue
      walk(root, full, files)
    } else {
      const dot = entry.lastIndexOf('.')
      const ext = dot === -1 ? '' : entry.slice(dot).toLowerCase()
      if (!TEXT_EXT.has(ext)) continue
      if (ext === '.pen') continue
      files.push({ full, rel: relNorm })
    }
  }
}

function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (!opts.old || !opts.next) {
    console.error('Usage: node rename-theme.mjs <old> <new> [--dry-run] [--root <dir>]')
    process.exit(1)
  }
  const root = resolve(opts.root || defaultRoot())
  const oldDir = join(root, '.claude/skills/slide/references', opts.old)
  const tag = opts.dryRun ? '[dry-run] ' : ''

  // 1) 디렉토리 git mv
  if (existsSync(oldDir)) {
    const fromRel = `.claude/skills/slide/references/${opts.old}`
    const toRel = `.claude/skills/slide/references/${opts.next}`
    console.log(`${tag}git mv ${fromRel} ${toRel}`)
    if (!opts.dryRun) {
      execFileSync('git', ['mv', fromRel, toRel], { cwd: root, stdio: 'inherit' })
    }
  } else {
    console.log(`${tag}(skip git mv — ${oldDir} 없음)`)
  }

  // 2) 문서 경로/파일명 참조 치환
  const reDir = new RegExp(`references/${opts.old}(?=[/\\s'")\\].:]|$)`, 'g')
  const rePen = new RegExp(`${opts.old}-design-system\\.pen`, 'g')

  const files = []
  walk(root, root, files)

  let changed = 0
  const manualHits = []
  for (const f of files) {
    let text
    try { text = readFileSync(f.full, 'utf-8') } catch { continue }
    if (!reDir.test(text) && !rePen.test(text)) continue
    reDir.lastIndex = 0; rePen.lastIndex = 0

    const dirHits = (text.match(reDir) || []).length
    const penHits = (text.match(rePen) || []).length
    reDir.lastIndex = 0; rePen.lastIndex = 0

    if (MANUAL_REVIEW.has(f.rel)) {
      manualHits.push({ rel: f.rel, dirHits, penHits })
      continue // 자동 치환 안 함 — 이력줄 보존
    }
    const next = text.replace(reDir, `references/${opts.next}`).replace(rePen, `${opts.next}-design-system.pen`)
    if (next !== text) {
      console.log(`${tag}edit ${f.rel}  (references:${dirHits}, .pen:${penHits})`)
      changed++
      if (!opts.dryRun) writeFileSync(f.full, next, 'utf-8')
    }
  }

  console.log(`\n${tag}자동 치환 파일 ${changed}개.`)
  if (manualHits.length) {
    console.log('\n⚠️ 수동 검토 필요 (이력/체인지로그 보존 — 자동 치환 안 함):')
    for (const h of manualHits) {
      console.log(`   ${h.rel}  (references/${opts.old}:${h.dirHits}, ${opts.old}-design-system.pen:${h.penHits})`)
    }
    console.log('   → 운영 줄만 새 슬러그로, 과거 마이그레이션을 서술하는 이력 줄은 그대로 둘 것.')
  }
  if (opts.dryRun) console.log('\n[dry-run] 실제 변경 없음. 플래그 없이 다시 실행하면 적용됩니다.')
}

main()
