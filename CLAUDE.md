# slide-pencil

Pencil CLI(`@pencil.dev/cli`) 기반 슬라이드 디자인 시스템. Pencil에서 슬라이드를 설계하고 React + Tailwind 컴포넌트로 변환한 뒤 Vite로 단일 HTML을 빌드하고, 같은 `/slide` 스킬 안에서 PPTX 파일까지 자동 생성한다 (HTML + PPTX 두 결과물). 단독 PPTX 재변환만 필요할 땐 `/export-pptx`(thin entry).

**호스트 비의존:** VS Code 확장이나 Pencil MCP에 의존하지 않는다 — 터미널·Claude Code 데스크탑·Cursor·OpenClaw 등 어디서나 동작. 호출 메커니즘 단일 진실 원천: `.claude/skills/slide/references/pencil-cli.md`.

<!-- THEME:START name=jangpm
     이 섹션부터 "디자인 참고 자산" 섹션 끝까지가 활성 테마 소유 영역.
     /theme-init 실행 시 이 블록 전체가 교체된다.
     외부 섹션("# 프로젝트 헤더", "## 빌드", "## 주요 경로")은 인프라로 유지. -->

**디자인 시스템: Jangpm (장피엠)** — 모노크롬 + 단일 accent `#4633E3` 기반 리포트형 레이어.

## 핵심 제약 (HARD RULES)

- **뷰포트: 1280×720 (16:9)** — SlideShell이 고정
- **폰트: Arial 고정** (`'Arial', 'Helvetica Neue', 'Apple SD Gothic Neo', 'Malgun Gothic', ...`)
- **강조색: `#4633E3` 고정** (`var(--accent)`). 한 슬라이드당 1~2회만. accent-soft(`#E8E5FC`)는 연한 배경용
- **타이포 스케일 (Jangpm 원본 유지)** — 하드코드 금지, 시맨틱 클래스 우선
  - Display 56px / 800 (커버·섹션 타이틀) — `.display`
  - Display-sm 40px / 800 (KPI) — `.display-sm`
  - Headline 32px / 700 (h2) — `.headline`
  - Title 18.4px / 600 (카드 제목) — `.title`
  - Body 15.2px / 400 (본문) — `.body`
  - Caption 12.8px / 500 (라벨 / GM) — `.caption`
  - Label-caption 12.8px / 600 UPPERCASE (메타 라벨 / 카테고리) — `.label-caption`
- **카드**: 라운드 12px, 패딩 24px, `1px solid var(--border)`
  - 기본: `var(--surface)` 흰 배경
  - alt: `var(--surface-alt)` 연회색
  - accent: `var(--accent-soft)` 배경 + `var(--accent)` 테두리 + 본문 텍스트 유지 (진한 보라 배경 + 흰 글자 금지)
- **Governing Message (`.gm`)** — 커버/섹션/클로징을 제외한 모든 콘텐츠 슬라이드는 하단에 1줄 요약 포함. SlideShell의 `gm` prop으로 주입
- **슬라이드 루트 div는 반드시 `relative`** — SlideShell이 보장
- **그라디언트/글로우 금지**. 그림자는 `shadow-sm/md/lg` 3단계로 제한, 데이터 강조 카드에만 sparse 사용
- **장식 보더 금지** — `border-l-*`, `border-t-*` 같은 컬러 좌/상단 스트립 금지. 보더는 구조적 디바이더로만
- **이모지 / 유니코드 장식 기호 금지** (`→`, `✓`, `★` 등을 아이콘 대신 쓰지 않음). 필요하면 인라인 SVG (stroke `currentColor`, 2px)

## 구현 원칙

- 공통 UI는 `src/components/slide-system.tsx` 재사용 (`SlideShell`, `SlideBody`, `SlideMeta`, `SectionHeader`, `Card`, `NumberBadge`, `NumKickerHead`, `Metric`, `Pill`, `AccentBadge`, `GuidingMessage`, `RuleLine`, `BulletCheck`, `MetricBar`, `TrendArrow`, `RuledList`, `RuledColumns`)
- **Hybrid 구성 + 에디토리얼 우선 (HARD)** — 본문 슬라이드는 `헤딩 + 동등 카드 N개` 단일 구성을 기본으로 쓰지 않는다. 2~3 프리미티브 조합(지배 비주얼/리스트 + 보조 해석 + 결론 띠)이 기본. 카드 박스 대신 `RuledList`/`RuledColumns`(hairline 에디토리얼)·`MetricBar`(progress+trend+비교 컨텍스트)를 우선하고, 카드 그리드는 2차 도구. 같은 family라도 슬라이드마다 변형 ≥1개 적용. 단일 진실 원천: `references/jangpm/theme-rules.md` "Hybrid 다중 프리미티브 구성"·"변형 영감" + anti-slop Rule 19
- 슬라이드 스타일은 `src/index.css` 토큰을 우선 사용. 하드코드 hex 금지 — `var(--*)` 참조
- 타이포는 가능한 한 `.display` / `.headline` / `.title` / `.body` / `.caption` 시맨틱 클래스 사용. 숫자형 Tailwind 크기(`text-[Npx]`)는 카드 내부 앵커 숫자 등 특수 용도에만
- **라이트 모드 전용 (HARD RULE)**: 모든 슬라이드(커버·클로징 포함) 루트 배경은 `var(--bg)` 또는 `var(--surface)`만 사용. dark 배경 금지
- **NO supertitle (HARD RULE)**: 헤딩 **위에** 소형 카테고리 라벨을 **별도 div로** 배치 금지. 태그가 필요하면 헤딩과 같은 flex-row로 **오른쪽** 또는 **하단**에 배치 — `SectionHeader`의 `tag` prop이 이 패턴을 강제함
- 카드 그리드에서 4개 이상이면 1개만 `tone="accent"`로 차별화 (시선 앵커). 모두 같은 톤은 금지
- **카드-row = '구성' 안티패턴 (should)** — 3~4개 동등 카드를 한 줄로 줄세우는 것을 기본 레이아웃으로 쓰지 않는다. `<Card>` 프리미티브든 생짜 `rounded-[12px] border` div든 **동일**(카드-row는 컴포넌트가 아니라 *구성*의 문제). 구분은 rule-line/여백 우선, 카드는 담을 이유가 있을 때만(metric·비교·callout). 세부는 `.claude/skills/slide/references/jangpm/theme-rules.md` 공통 취향 규칙 + anti-slop Rule 15
- PPTX 변환 시에도 폰트는 Arial, 강조색은 `#4633E3` 기준 유지
- **AI 이미지 생성: codex-image 스킬로만 (HARD RULE)** — 외부 `<img>`용 AI 이미지는 반드시 `/codex-image` 스킬로 생성한다. 직접 `codex exec` 호출 · `scripts/image_gen.py` · `IMAGE_BACKEND` 등 다른 백엔드 금지. 산출물은 `src/images/<slot>.png`. Pencil 디자인 내부 이미지는 G() 연산 유지(이 경로는 codex-image 대상 아님)
- `src/App.tsx`의 `#slides-root`는 유지 — `.claude/skills/export-pptx/scripts/pptx-compare.js`가 슬라이드별 캡처에 사용

## 디자인 참고 자산

- **`jangpm-design-system.pen`** — 프로젝트 루트에 위치하는 Pencil 파일. 토큰·타이포·컴포넌트·샘플 슬라이드의 시각 레퍼런스. Pencil에서 슬라이드를 디자인할 때 이 파일을 먼저 열어 스타일을 흡수
- **`.claude/skills/slide/references/jangpm/theme-rules.md`** — 활성 테마 세부 룰 (커버 전략, 액센트 컬러 전략, 폰트 웨이트 기준표, 카드 내부 구성, 헤드 메시지 표준화, 폰트·스케일·Pill 최솟값). `/slide` Step 1 시작 시 반드시 로드. 단일 진실 원천
- `.claude/skills/slide/references/jangpm/reference/` — Jangpm 원본 마크다운 (design-system.md, anti-slop.md, patterns.md, skeleton.md, libraries.md, visual-assets.md, export.md)
- `.claude/skills/slide/references/jangpm/patterns/` — 29개 완성 HTML 패턴 샘플 (canonical 시각 레퍼런스)

<!-- THEME:END -->

## 사용 모드 (dual mode)

slide-pencil은 두 가지 진입 모드를 지원한다:

- **간단 모드** — `/slide` 단독. 자체 planning + 디자인. 8~12장 일반 덱·내부 브레인스토밍에 적합
- **체계적 모드** — `/slide-plan` → `/slide`. `output/<slug>/slide_plan.json`을 생성·검토 후 `/slide`가 그대로 렌더링. 슬라이드별 사유(`core_message`·`why_here`)·증거 추적·차트 takeaway 일체화 강제. 외부 보고용·30+ 장 deck·사용자 파일 기반에 적합

`/slide` 진입 시 Step 1.0에서 `slide_plan.json` 존재 여부로 모드를 자동 분기. 간단 모드 회귀 위험 0 — plan json 없으면 분기 자체가 안 탐. 빌드 검증의 R2/R5/plan-count 룰은 plan 모드에서만 활성, 간단 모드는 자동 SKIP.

## WorkOS 3-pipeline 운영 게이트

WorkOS에서 `slide-html`, `slide-svg`와 함께 병렬 실행될 때 `slide-pencil`은 아래 게이트를 따른다.

- 시작 전 `pencil status`를 실제 셸에서 실행해 인증 상태를 확인한다. `● Active`만 ready로 본다. `which pencil`/`pencil --version`만으로는 인증 끊김을 잡지 못하므로 금지.
- `Not authenticated` 또는 `command not found: pencil` 응답이면 사용자에게 `npm install -g @pencil.dev/cli` + `pencil login` 안내 후 즉시 blocked 처리한다.
- `pencil interactive` 호출이 transport/IPC 에러로 실패하면 1회 실패로 blocked 처리하지 않고 최대 2회 재시도. 그래도 실패하면 blocked.
- 저장된 `.pen` 파일이 0바이트면 `save()`와 `exit()` 사이 `sleep 1` 누락 — `references/pencil-cli.md` "왜 sleep 1이 필요한가" 참조해 호출 재구성 후 재시도.
- Pencil CLI가 최종 실패하면 React-only 우회 금지. `pipeline_status.json`에 blocked reason을 남긴다.
- Slack/원격 턴 interrupt에 취약하므로 장시간 생성은 독립 실행 세션에서 돌리고, Slack 스레드는 상태 보고만 담당한다.

### 상태 파일 schema

- **완료 산출물 (HARD, 두 호스트 공통):** 덱 생성이 끝나면 `output/<slug>/pipeline_status.json`을 아래 schema로 기록한다. 최소 `pencil_native_frames`(= 활성 TSX 수 = PPTX 슬라이드 수 = plan slide 수), `manifest_check`(check-manifest 결과, "N/N" 형태), `triple_gate`(R2/R5/R6 결과 — `pass`/`true`/`verified` 중 하나여야 통과), `embedded_images`, `status`를 채운다. `verify_deck.py`가 이 값을 실제 산출물과 교차 검증하므로 임의 값은 통과하지 못한다.

`pipeline_status.json` 또는 동등한 상태 파일에는 최소 다음 필드를 기록한다.

```json
{
  "pipeline": "slide-pencil",
  "project_slug": "",
  "status": "preflight|initialized|content_ready|built|pptx_ready|verified|uploaded|blocked|partial|fallback",
  "updated_at": "",
  "planned_slide_count": 0,
  "actual_content_count": 0,
  "pencil_native_frames": 0,
  "manifest_check": "0/0",
  "triple_gate": "pass",
  "embedded_images": 0,
  "pptx_path": null,
  "verification": {},
  "blocked_reason": null,
  "source_artifacts": []
}
```

### Pencil-native / Export 단계 분리

- **Pencil-native 단계:** `.pen` 파일에 계획 장수와 동일한 top-level frame이 실제로 존재해야 한다. 이 단계가 통과해야 `content_ready`로 올릴 수 있다.
- **Export 단계:** Pencil frames → React/HTML/manifest/PPTX 또는 Pencil frames → PNG/SVG/PDF/PPTX 변환을 수행하고, 최종 PPTX가 `unzip -t`를 통과해야 한다.
- Pencil-native 단계가 실패했는데 Export 단계만 성공한 경우에는 `verified`로 기록하지 않는다. `fallback` 또는 `partial`로 기록하고 source lineage를 남긴다.

### Pencil CLI 복구 runbook

1. `pencil status` 실행 — `● Active` 떠야 ready.
2. `Not authenticated` 또는 인증 만료면 `pencil login` (이메일+OTP 인터랙티브) 또는 `PENCIL_CLI_KEY` env var 설정.
3. `command not found: pencil`면 `npm install -g @pencil.dev/cli`로 재설치.
4. `pencil interactive --out /tmp/probe.pen <<< 'get_editor_state({ include_schema: false })'` 1줄 probe로 transport 확인.
5. 저장된 .pen이 0바이트면 heredoc의 `save()` ~ `exit()` 사이에 `sleep 1`이 들어갔는지 확인 (`references/pencil-cli.md`).
6. 그래도 실패하면 `npm view @pencil.dev/cli version`과 `pencil version`을 비교해 CLI 업그레이드.

## 빌드

```bash
npm run build
```

## 주요 경로

- **dual-host:** 루트 `AGENTS.md`가 Codex 진입점. `.claude/skills` 수정 후 반드시 `python .claude/skills/slide/scripts/dev/sync_codex_mirror.py` 재실행(미러 `.codex/skills` 재생성). pre-commit hook이 stale을 차단.

### 활성 슬라이드 · 프리미티브
- `src/slides/` — 활성 슬라이드 (Slide01~15)
- `src/slides/_archive_v2/` — 트래킹된 백업 덱 (빌드/테마교체 검증용 fixture, registry 제외). `_archive/`는 gitignore 로컬 스크래치
- `src/slides/index.ts` — 슬라이드 registry
- `src/components/slide-system.tsx` — 공통 프리미티브
- `src/index.css` — 디자인 토큰 (THEME 블록이 활성 테마 영역)

### 테마 자산 (활성 테마: jangpm)
- `jangpm-design-system.pen` — Pencil 시각 레퍼런스
- `.claude/skills/slide/references/jangpm/DESIGN.md` — **slide-plan 입력 사양** (10 섹션 통합 — Visual / Palette / Typography / Spacing / Layout grammar / Header-body-footer / Page flow / Chart-table / Icon / Anti-patterns)
- `.claude/skills/slide/references/jangpm/theme-rules.md` — 테마 세부 룰 (단일 진실 원천)
- `.claude/skills/slide/references/jangpm/reference/` — Jangpm 원본 MD
- `.claude/skills/slide/references/jangpm/patterns/` — 29개 패턴 HTML

### 스킬
- `.claude/skills/slide/` — 슬라이드 생성 스킬. Step 1.0에서 plan 모드 자동 감지 (dual mode)
- `.claude/skills/slide-plan/` — **(체계적 모드)** 슬라이드 기획. `output/<slug>/slide_plan.json` + summary 생산. /slide의 선택적 prerequisite
- `.claude/skills/theme-init/` — 활성 테마를 새 디자인 시스템으로 일회성 교체. Layout Re-authoring(시그니처 패턴 재작곡, Step 4.5) + DESIGN.md 자동 초안·사용자 검토(Step 4.6) + 테마 미리보기 HTML 승인 게이트(Step 5.5, 커밋 전 HITL) 포함
- `.claude/skills/export-pptx/` — React → PPTX 단독 진입점 (thin entry; 룰·스크립트는 slide 스킬에 single source)
- `.claude/skills/export-pdf/` — React → PDF 변환 (Playwright)
- `.claude/skills/upload-drive/` — PPTX → Google Drive/Slides 업로드
- `.claude/skills/diagram-design/` — **(슬라이드 파이프라인 전용)** 다이어그램 그래머. `/slide`가 진짜 다이어그램 슬라이드(아키텍처/플로우/시퀀스/ER/타임라인/스윔레인/트리·조직도/레이어/벤/피라미드 등 14종)를 **inline SVG**로 손수 그릴 때 타입별 레이아웃·복잡도 예산·노드 트리트먼트·taste gate를 제공. 단독 진입점 아님(Mermaid/Pencil은 단순 흐름용으로 병존). 스킨은 `references/style-guide.md`가 활성 테마 토큰으로 고정 — `/theme-init`이 테마 교체 시 함께 리스킨(교체 지점 #8). 색=`var(--accent)` 등 토큰, 폰트=Arial 고정
- `.claude/skills/slide/references/pptx-build.md` — PPTX 빌드 룰 single source (매니페스트 핸드크래프트, R2/R5/R6, 검증 루프)
- `.claude/skills/slide/references/manifest-schema.md` — 매니페스트 JSON 스키마
- `.claude/skills/slide/scripts/{convert,check-manifest,rasterize-svg-images}` — PPTX 변환 도구
- `.claude/skills/export-pptx/references/eval.md` — 시각 비교 워크플로우

### 테마 모듈화 문서
- `.claude/skills/theme-init/references/theme-replacement-map.md` — 6개 교체 지점 + 토큰 컨트랙트 v1 + 3곳 동기화 규칙
- `.claude/skills/theme-init/references/theme-rules-template.md` — 새 테마 theme-rules.md 생성용 템플릿
- `.claude/skills/theme-init/references/design-md-template.md` — 새 테마 DESIGN.md 자동 초안 템플릿 (slide-plan 입력)
- `.claude/skills/theme-init/references/manual-edit-guide.md` — slide-system.tsx 수동 편집 가이드

### 관련 지침
- PPTX 빌드 디테일이 필요할 땐 `.claude/skills/slide/references/pptx-build.md`(룰)를, 시각 비교를 돌릴 땐 `.claude/skills/export-pptx/references/eval.md`를 먼저 본다
- `package.json`의 `pptxgenjs`는 export 워크플로우를 위해 유지
- 디자인 테마 교체(Jangpm → 다른 시스템)는 `/theme-init` 사용. 수동 편집 금지
