# AGENTS.md — slide-pencil (Codex 진입점)

이 파일은 **Codex(클라우드/웹)** 가 이 repo를 실행할 때 읽는 진입 지시다.
Claude Code는 `/slide` Skill 런타임으로 동일 절차를 자동 수행하므로 이 파일이 필요 없다.

**전체 규칙의 단일 원천은 `CLAUDE.md`다 — 먼저 읽고 그대로 따른다.**
아래는 Codex에 슬래시-스킬 런타임이 없으므로 그 역할을 대신하는 실행 규율이다.

## 0. 핵심 원칙
품질 차이의 근원은 경로가 아니라 **"SKILL.md를 절차로 실행하지 않고 문서로 읽고 즉흥 구현(fallback)"** 하는 것이다. 아래를 **단계대로 실행**하고, 어떤 단계도 수기 재구현으로 대체하지 않는다.

## 1. 라우팅
슬라이드/덱/프레젠테이션/PPT 요청("슬라이드", "덱", "PPT", "make slides", "/slide") 감지 시:
→ **반드시 `.codex/skills/slide/SKILL.md`를 단계대로 실행**한다.
→ 문서를 요약만 하고 즉흥 구현하는 것 금지. **직접 React/manifest/PPTX 생성 같은 fallback 재구현 금지.**

## 2. 사전 단계 (자동 진입)
- 시작 시 `python .codex/skills/slide/scripts/preflight.py [--images]` 실행. 실패(exit≠0)면 **HALT**.
- 데크가 **외부보고·강의·세일즈·사용자 파일 기반·≥10장·명시적 품질요구** → 먼저 `.codex/skills/slide-plan/SKILL.md` 실행 → `output/<slug>/slide_plan.json` 생성.
  - 예외: 요청에 우회 키워드(`간단히`, `빠르게`, `quick`, `simple`, `plan 없이`)가 있을 때만 plan 생략.

## 3. Pencil CLI 규율 (slide-pencil 최대 품질 레버)
- 시작 전 `pencil status` 실제 실행 — `● Active`만 ready. 아니면 `npm install -g @pencil.dev/cli` + `pencil login` 안내 후 **HALT**.
- **Pencil-native frame이 실제로 생성돼야 한다 — React-only 우회 금지.** Pencil 단계 실패 시 `pipeline_status.json` status를 `fallback`/`partial`로 기록하고 완료 선언 금지.
- 저장된 `.pen`이 0바이트면 `save()`~`exit()` 사이 `sleep 1` 누락(`references/pencil-cli.md`) — 재구성 후 재시도.

## 4. 이미지 규율
- `/codex-image`(codex `image_gen`)만 사용. 시작 전 codex 로그인/가용성 선검사.
- 이미지가 필요한데 진짜 생성이 불가하면 **HALT** — PIL/placeholder/단색 이미지로 silent fallback 금지.
- 산출물 `src/images/<slot>.png`, 슬롯명 = 파일명.

## 5. 빌드/Export 규율
- `.codex/skills/slide/references/pptx-build.md` 룰(매니페스트 핸드크래프트, R2/R5/R6, `content` 필드) 준수.
- `node .codex/skills/slide/scripts/check-manifest.js <manifest>` 통과 → `convert.js`로 PPTX 변환.
- `src/index.css`에 `@source "./slides"` 등록 유지.

## 6. 완료 게이트 (done 선언 전 필수)
- `output/<slug>/pipeline_status.json`을 CLAUDE.md schema로 기록(`pencil_native_frames`/`manifest_check`/`triple_gate`/`embedded_images`/`status`).
- `python .codex/skills/slide/scripts/verify_deck.py <slug> "<원본 요청문>"` 통과 필수. 실패 시 **완료 선언 금지** — 우회가 아니라 수정으로 해결.

## 7. 미러 주의
`.codex/skills`는 **생성물**이다. 직접 편집하지 말 것. 스킬을 고치려면 `.claude/skills`를 편집하고
`python .claude/skills/slide/scripts/dev/sync_codex_mirror.py`를 재실행한다.
