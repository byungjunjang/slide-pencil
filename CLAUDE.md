# slide-pencil

Pencil MCP 기반 슬라이드 디자인 시스템. Pencil에서 슬라이드를 설계하고 React + Tailwind 컴포넌트로 변환한 뒤 Vite로 단일 HTML을 빌드하고, 같은 `/slide` 스킬 안에서 PPTX 파일까지 자동 생성한다 (HTML + PPTX 두 결과물). 단독 PPTX 재변환만 필요할 땐 `/export-pptx`(thin entry).

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

- 공통 UI는 `src/components/slide-system.tsx` 재사용 (`SlideShell`, `SlideBody`, `SectionHeader`, `Card`, `NumberBadge`, `Metric`, `Pill`, `AccentBadge`, `GuidingMessage`, `RuleLine`)
- 슬라이드 스타일은 `src/index.css` 토큰을 우선 사용. 하드코드 hex 금지 — `var(--*)` 참조
- 타이포는 가능한 한 `.display` / `.headline` / `.title` / `.body` / `.caption` 시맨틱 클래스 사용. 숫자형 Tailwind 크기(`text-[Npx]`)는 카드 내부 앵커 숫자 등 특수 용도에만
- **라이트 모드 전용 (HARD RULE)**: 모든 슬라이드(커버·클로징 포함) 루트 배경은 `var(--bg)` 또는 `var(--surface)`만 사용. dark 배경 금지
- **NO supertitle (HARD RULE)**: 헤딩 **위에** 소형 카테고리 라벨을 **별도 div로** 배치 금지. 태그가 필요하면 헤딩과 같은 flex-row로 **오른쪽** 또는 **하단**에 배치 — `SectionHeader`의 `tag` prop이 이 패턴을 강제함
- 카드 그리드에서 4개 이상이면 1개만 `tone="accent"`로 차별화 (시선 앵커). 모두 같은 톤은 금지
- PPTX 변환 시에도 폰트는 Arial, 강조색은 `#4633E3` 기준 유지
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

## 빌드

```bash
npm run build
```

## 주요 경로

### 활성 슬라이드 · 프리미티브
- `src/slides/` — 활성 슬라이드 (Slide01~15)
- `src/slides/_archive/` — 이전 슬라이드 아카이브 (registry 제외)
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
- `.claude/skills/theme-init/` — 활성 테마를 새 디자인 시스템으로 일회성 교체. DESIGN.md 자동 초안 + 사용자 검토 단계 포함 (Step 4.5)
- `.claude/skills/export-pptx/` — React → PPTX 단독 진입점 (thin entry; 룰·스크립트는 slide 스킬에 single source)
- `.claude/skills/export-pdf/` — React → PDF 변환 (Playwright)
- `.claude/skills/upload-drive/` — PPTX → Google Drive/Slides 업로드
- `.claude/skills/slide/references/pptx-build.md` — PPTX 빌드 룰 single source (매니페스트 핸드크래프트, R2/R5/R6, 검증 루프)
- `.claude/skills/slide/references/manifest-schema.md` — 매니페스트 JSON 스키마
- `.claude/skills/slide/scripts/{convert,check-manifest,rasterize-svg-images}` — PPTX 변환 도구
- `.claude/skills/export-pptx/references/eval.md` — 시각 비교 워크플로우

### 테마 모듈화 문서
- `docs/theme-replacement-map.md` — 6개 교체 지점 + 토큰 컨트랙트 v1 + 3곳 동기화 규칙
- `.claude/skills/theme-init/references/theme-rules-template.md` — 새 테마 theme-rules.md 생성용 템플릿
- `.claude/skills/theme-init/references/design-md-template.md` — 새 테마 DESIGN.md 자동 초안 템플릿 (slide-plan 입력)
- `.claude/skills/theme-init/references/manual-edit-guide.md` — slide-system.tsx 수동 편집 가이드

### 관련 지침
- PPTX 빌드 디테일이 필요할 땐 `.claude/skills/slide/references/pptx-build.md`(룰)를, 시각 비교를 돌릴 땐 `.claude/skills/export-pptx/references/eval.md`를 먼저 본다
- `package.json`의 `pptxgenjs`는 export 워크플로우를 위해 유지
- 디자인 테마 교체(Jangpm → 다른 시스템)는 `/theme-init` 사용. 수동 편집 금지
