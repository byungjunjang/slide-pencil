#!/usr/bin/env node
// pen-guard.mjs
// ---------------------------------------------------------------------------
// Pencil CLI로 .pen을 생성/갱신할 때의 0바이트 가트차를 막는 얇은 가드.
// theme-init SKILL.md Step 4 #8의 `rm -f` + `test -s` 수동 절차를 크로스플랫폼화.
// .pen *콘텐츠*(batch_design heredoc)는 여전히 LLM/SKILL.md가 만든다 — 이 스크립트는
// 호출 전 타깃 부재 보장과 호출 후 크기 검증(가드)만 담당한다.
//
// Usage:
//   node pen-guard.mjs pre    <target.pen>   # 호출 전: 잔존 타깃 제거(truncate 충돌 방지)
//   node pen-guard.mjs verify <target.pen>   # 호출 후: 0바이트면 비-0 exit + 진단 메시지
//
// 권장 사용(SKILL.md bash):
//   node pen-guard.mjs pre  theme-design-system.pen
//   ( heredoc ... save() ... sleep 4; echo exit() ) | pencil interactive --out theme-design-system.pen
//   node pen-guard.mjs verify theme-design-system.pen   # 실패 시 sleep 상향 후 재시도
// ---------------------------------------------------------------------------

import { rmSync, existsSync, statSync } from 'fs'
import { resolve } from 'path'

function main() {
  const [cmd, target] = process.argv.slice(2)
  if (!cmd || !target || !['pre', 'verify'].includes(cmd)) {
    console.error('Usage: node pen-guard.mjs <pre|verify> <target.pen>')
    process.exit(2)
  }
  const path = resolve(target)

  // .pen 외 타깃 거부 — `pre`가 rmSync(force)하므로 오타로 다른 파일을 삭제하지 않도록.
  if (!path.toLowerCase().endsWith('.pen')) {
    console.error(`[pen-guard] 거부: 타깃이 .pen 파일이 아님 → ${target}`)
    process.exit(2)
  }

  if (cmd === 'pre') {
    if (existsSync(path)) {
      rmSync(path, { force: true })
      console.log(`[pen-guard] pre: 기존 ${target} 제거 (truncate 충돌 방지)`)
    } else {
      console.log(`[pen-guard] pre: ${target} 부재 확인 — OK`)
    }
    process.exit(0)
  }

  // verify
  if (!existsSync(path)) {
    console.error(`[pen-guard] verify FAIL: ${target} 가 생성되지 않음 (파일 없음)`)
    console.error('  → pencil 호출 실패 또는 잘못된 --out 경로. pencil status / 호출 로그 확인.')
    process.exit(1)
  }
  const size = statSync(path).size
  if (size === 0) {
    console.error(`[pen-guard] verify FAIL: ${target} 0바이트.`)
    console.error('  → 원인: (1) 호출 전 타깃 잔존(pre 누락) 또는 (2) save()~exit() settle 부족.')
    console.error('  → 조치: `pen-guard pre`로 타깃 제거 → heredoc의 sleep 을 3~5로 상향 → 재실행.')
    console.error('  → 참조: .claude/skills/slide/references/pencil-cli.md ("왜 sleep 이 필요한가")')
    process.exit(1)
  }
  console.log(`[pen-guard] verify OK: ${target} (${size} bytes)`)
  process.exit(0)
}

main()
