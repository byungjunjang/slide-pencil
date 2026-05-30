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
//   - 제외 1 (제너레이터 예시 + 교체 맵): `.claude/skills/theme-init/**` 는 손대지 않는다.
//     references/<old>는 from-theme 설명용 canonical 예시이고, theme-init/references/의
//     theme-replacement-map.md도 이 zone에 있어 미스캔(자체 references/<old>는 동적 예시).
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
// "수동 검토 매치만 출력"할 이력-보존 문서(루트 상대 경로)를 담는 확장점. 현재 비어 있음 —
// theme-replacement-map.md가 .claude/skills/theme-init/references/ (제외 1 zone)로 이동해
// rename 대상에서 빠졌다. 향후 운영+이력 혼재 문서가 생기면 여기에 추가한다.
const MANUAL_REVIEW = new Set([])

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

  // 2) 문서 경로/파일명 참조 치환 (슬러그를 정규식 이스케이프 — 특수문자 슬러그 방어)
  const esc = opts.old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const reDir = new RegExp(`references/${esc}(?=[/\\s'")\\].:]|$)`, 'g')
  const rePen = new RegExp(`${esc}-design-system\\.pen`, 'g')

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

  // 3) bare 테마명 잔여 리포트 (드라이런 발견 GAP) — THEME 마커 밖 · 경로/.pen 외에서
  //    슬러그가 토큰으로 남은 곳을 "수동 검토"로 출력한다. 자동 치환은 안 한다:
  //    `<old>`가 일반 명사/고유명사로 산문·배지·트리·preset_name에 박혀 있어 오탐 위험이
  //    크기 때문(경로/.pen 형태만 안전하게 자동 치환). THEME:START..END 안은 Step 4 #1~3에서
  //    LLM이 본문째 재작성하므로 제외, MANUAL_REVIEW(이력) 문서도 제외.
  const reBare = new RegExp(`(?<![\\w-])${esc}(?![\\w-])`, 'gi')
  const stripTheme = (t) => t.replace(/THEME:START[\s\S]*?THEME:END/g, ' ')
  // 활성/신규 테마 콘텐츠 디렉토리는 제외 — 그 안의 테마명(패턴 <title>, theme-rules,
  // DESIGN, reference/*.md 배너)은 reskin/Step 4.5 재작곡 + theme-rules/DESIGN 재작성이
  // 담당하는 "콘텐츠"이지 운영 문서의 rename 누락이 아니다. 리포트는 운영 문서에 집중.
  const themeDirPrefixes = [
    `.claude/skills/slide/references/${opts.old}/`,
    `.claude/skills/slide/references/${opts.next}/`,
  ]
  const bareHits = []
  for (const f of files) {
    if (MANUAL_REVIEW.has(f.rel)) continue
    if (themeDirPrefixes.some((p) => f.rel.startsWith(p))) continue
    let text
    try { text = readFileSync(f.full, 'utf-8') } catch { continue }
    // 경로/.pen 형태(#2 자동 치환 대상)는 메모리상 먼저 치환해 제거 → dry-run/real 동일 결과
    const post = text
      .replace(reDir, `references/${opts.next}`)
      .replace(rePen, `${opts.next}-design-system.pen`)
    reDir.lastIndex = 0; rePen.lastIndex = 0
    const hits = stripTheme(post).match(reBare)
    if (hits && hits.length) bareHits.push({ rel: f.rel, count: hits.length })
  }
  if (bareHits.length) {
    bareHits.sort((a, b) => b.count - a.count)
    console.log(`\n⚠️ bare 테마명 "${opts.old}" 잔여 (THEME 마커 밖 · 경로/.pen 외 — 자동 치환 안 함):`)
    for (const h of bareHits) console.log(`   ${h.rel}  (${h.count})`)
    console.log('   → 운영 문서의 테마명(README 배지/헤딩/디렉토리 트리, slide/SKILL.md 패턴 설명,')
    console.log('     slide-plan preset_name, CLAUDE.md "주요 경로 > 테마 자산" 라벨 등)을 새 슬러그/')
    console.log('     타이틀케이스로 수동 갱신. THEME:START..END 안 본문은 Step 4 #1~3에서 재작성되므로 제외됨.')
  }

  if (opts.dryRun) console.log('\n[dry-run] 실제 변경 없음. 플래그 없이 다시 실행하면 적용됩니다.')
}

main()
