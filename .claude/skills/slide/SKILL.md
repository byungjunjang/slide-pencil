---
name: slide
description: 활성 테마(현재 jangpm) 기반 슬라이드 생성 — Pencil MCP로 디자인 → React/Tailwind 컴포넌트 변환 → Vite 단일 HTML 빌드 → 같은 스킬 안에서 PPTX까지 자동 변환 (Step 6, references/pptx-build.md 룰 적용). 테마 룰은 references/<theme>/theme-rules.md에서 로드. 테마 교체는 /theme-init 사용.
---

# /slide — 슬라이드 생성 스킬

사용자의 텍스트 요청을 받아 Pencil MCP로 슬라이드를 디자인하고, React + Tailwind 컴포넌트로 변환, Vite로 빌드하여 단일 HTML 파일을 출력한다.

<!-- THEME:START name=jangpm
     활성 테마 요약. /theme-init 실행 시 이 블록이 새 테마의 요약으로 교체된다.
     세부 룰·수치는 references/jangpm/theme-rules.md (단일 진실 원천).
     CLAUDE.md THEME 블록과 이 블록은 동일 사실의 역할별 제시 —
     동기화 규칙은 docs/theme-replacement-map.md 참조. -->

## 디자인 시스템 (Jangpm)

이 프로젝트는 **Jangpm Slide Design System**을 따른다.

- **뷰포트: 1280×720 (16:9)** · **폰트: Arial 고정** · **강조색: `#4633E3`** (`var(--accent)`)
- **모드: 라이트 전용** (다크 배경 슬라이드 금지)
- **카드**: 라운드 12px, 패딩 24px, 1px border. accent 카드는 `accent-soft` 배경 + `accent` 테두리 (진한 보라 배경 + 흰 글자 금지)
- **Governing Message**: 콘텐츠 슬라이드 하단에 1줄 요약(`.gm`) 필수. `SlideShell`의 `gm` prop으로 주입
- **그림자**: `shadow-sm/md/lg` 3단계, 데이터 강조 카드에만 sparse 사용

**타이포 스케일 (시맨틱 클래스 우선, 하드코드는 허용 스케일 `{22, 24, 28, 32, 36, 40, 44, 48, 56, 64, 72, 80, 96, 100+}` 안에서만):**

| 클래스 | 크기 / 굵기 | 용도 |
|---|---|---|
| `.display` | 56px / 800 | 커버·섹션 타이틀 |
| `.display-sm` | 40px / 800 | KPI 큰 숫자 |
| `.headline` | 32px / 700 | h2 (콘텐츠 슬라이드 헤딩) |
| `.title` | 18.4px / 600 | 카드 제목 |
| `.body` | 15.2px / 400 | 본문 |
| `.caption` | 12.8px / 500 | 메타 / GM |
| `.label-caption` | 12.8px / 600 UPPERCASE | 카테고리 라벨 |

**참고 자산** (단일 진실 원천): `jangpm-design-system.pen`, `references/jangpm/theme-rules.md`, `references/jangpm/reference/`, `references/jangpm/patterns/`

<!-- THEME:END -->

## 🚫 절대 위반 금지 (HARD VIOLATIONS) ⚠️

슬라이드 작성 전 반드시 확인. 아래 두 규칙은 Step 4 작성 중과 작성 직후 **매 슬라이드마다** 자기 점검.

### V1. 모든 콘텐츠 카드는 시각 앵커 1개 이상 포함

stats / comparison / paired-concept / overview-split / three-point / four-point / six-point 등 **모든 콘텐츠 카드 패턴**에서 각 카드(card / column / stat box)는 아래 중 **최소 1개** 포함:

- **SVG 아이콘** (stroke currentColor, 2px) — Lucide 또는 인라인
- **NumberBadge / AccentBadge** — `rounded-full` 원형 번호/이니셜 배지
- **pill 태그** — `rounded-full` 카테고리/상태 라벨 (22px 이상)

**큰 숫자(72px KPI)만 있는 카드는 미달.** 숫자 + 구분선 + 본문만으로는 부족. 숫자 옆/위에 trend 아이콘 또는 카테고리 pill을 반드시 추가.

```tsx
{/* ❌ 금지: 숫자 + 라벨 + 본문만 */}
<div className="..."><div className="text-[72px]">55%</div><div>코딩 속도</div><p>...</p></div>

{/* ✅ 올바름: trend 아이콘 + 숫자 + 라벨 + pill */}
<div className="...">
  <div className="flex items-center gap-[12px]">
    <svg width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><path d="M3 17l6-6 4 4 7-7"/></svg>
    <span className="text-[72px]">55%</span>
  </div>
  <div>코딩 속도 향상</div>
  <p>...</p>
  <span className="rounded-full bg-[var(--accent-soft)] text-[var(--accent-ink)] px-[12px] py-[4px] text-[22px] font-[600]">생산성</span>
</div>
```

### V2. 하드코드 hex 절대 금지 — `var(--*)` 토큰만 사용

슬라이드 TSX에서 **모든 색상**은 `var(--*)` 토큰 참조. `text-[#059669]`, `bg-[#2a2a2a]` 같은 하드코드 금지.

**유일한 예외**: `terminal-split` / `terminal-full` 패턴 내부의 터미널 chrome 색상(`#1a1a1a` 배경, `#27c93f` 프롬프트 등 — 패턴 HTML에 정의된 것만). 그 외 모든 슬라이드에서 hex 금지.

```tsx
{/* ❌ 금지 */}
<span className="text-[#059669]">+18%</span>
<div className="bg-[#2a2a2a] border-[#333]">{/* overview-split 안에 다크 chrome */}</div>

{/* ✅ 올바름 */}
<span className="text-[var(--accent)]">+18%</span>
<div className="bg-[var(--surface-alt)] border-[var(--border)]">...</div>
```

**자기 점검**: Step 4 슬라이드 작성 완료 후 파일별로 `grep -E 'text-\[#|bg-\[#|border-\[#' SlideNN.tsx` 해서 hex 발견 시 즉시 토큰으로 교체.

## 트리거

사용자가 슬라이드/프레젠테이션 생성을 요청할 때 (예: "AI 에이전트 활용사례 슬라이드 만들어줘", "발표 자료 만들어줘")

## 워크플로우

### Step 1: 주제 분석 + 구조 설계

**처리 주체:** LLM (도구 호출 없음)

#### Step 1.0 — Plan 모드 감지 (분기) ⚠️

slide-pencil은 **dual mode**:

- **간단 모드** — `/slide` 단독. 자체 planning으로 빠르게 생성
- **체계적 모드** — `/slide-plan` → `/slide`. `slide_plan.json`을 소비해 사유·증거 추적·차트 takeaway 일체화 강제

`/slide` 진입 시 사용자 brief에서 `{slug}`을 유도(Step 5 폴더 이름 규칙과 동일)하고 `output/{slug}/slide_plan.json` 존재 여부를 확인:

```bash
ls output/{slug}/slide_plan.json 2>/dev/null && echo "PLAN_MODE" || echo "SIMPLE_MODE"
```

**존재함 (체계적 모드):**

1. `slide_plan.json` 로드 (Read tool)
2. `slide_plan.summary.md`도 함께 로드해 사용자에게 1줄짜리 plan summary 1회 더 보여주고 confirm 받기 (slide-plan에서 받았어도 한 번 더 — 가이드 §"기존 /slide 스킬 수정 포인트 E")
3. plan에서 추출:
   - 슬라이드 수 `N` (= `plan.slides.length`)
   - 슬라이드별 `recommended_layout_family` → `references/jangpm/DESIGN.md` §5의 매핑 표 → jangpm 패턴 ID
   - 슬라이드별 `core_message` / `audience_takeaway` / `why_here` → 콘텐츠 아웃라인 + GM 텍스트 후보
   - 슬라이드별 `chart_strategy` / `chart_takeaway` (있을 시) → 패턴 선택
   - `content_constraints.must_include` / `must_not_include` / `evidence_to_use`
   - `deck_meta.language` → 언어 결정
4. **Step 1.1~1.9 (자체 planning) 스킵** → 그대로 Step 2로 이동
5. Step 4 빌드 검증에서 **B-r2 / B-r5 / B-r6 / B-density / B-plan-count** 자동 활성화 (plan json 존재 시 자동 실행). v0.2부터 추가:
   - **B-r6**: plan에 `recommended_pattern_id` / `min_lines_estimate` / `required_primitives` 셋 다 채워졌는지 검증
   - **B-density**: plan의 `min_lines_estimate` vs 실제 TSX wc -l + `required_primitives` grep. 위반 시 어떤 슬라이드 / 무엇이 부족한지 출력
   - **B-r2 강화**: chart 슬라이드는 strategy + takeaway에 더해 `chart_data.series[].values.length >= 6` 검증
6. plan 모드에서 슬라이드 작성 중 plan의 `recommended_pattern_id` / `chart_data` / `required_primitives`를 패턴 HTML 선택과 React 변환의 **단일 진실 원천**으로 사용. plan에 chart_data 시리즈가 12 포인트면 React 차트도 12 포인트 배열로 작성 (시뮬 금지)

**존재 안 함 (간단 모드):**

1. **Step 1.1~1.9 기존 로직 그대로 실행** (변경 없음)
2. 사용자가 더 체계적이고 싶다고 하면 `/slide-plan` 권유 가능
3. B-r2 / B-r5 / B-plan-count 검증은 자동 `SKIP` (간단 모드 정합)

**Triple gate 정합 (메모리 노트 `sol-20260424-001`):** plan 모드에서는 슬라이드 수 게이트가 `plan.slides.length == Pencil Slide* 프레임 수 == TSX 파일 수` 셋 다 일치 필요. Step 4의 B-pencil + B-plan-count로 검증.

#### Step 1.1 — 주제 분석 (간단 모드만 실행)

> Step 1.0에서 plan 모드면 1.1~1.9를 스킵.

1. 주제/도메인 파악
2. 슬라이드 수 결정: 사용자가 명시한 장수를 그대로 따른다. 명시하지 않은 경우 주제 분량에 맞게 자유롭게 결정 (최소 커버+클로징 포함 4장 이상)
3. 언어 감지 (한국어/영어)
4. `references/layout-guide.md` 읽기
5. **액센트 컬러**: 활성 테마의 `--accent` CSS 변수 사용. 세부 전략(커버·하이라이트·KPI 적용 위치)은 `references/jangpm/theme-rules.md`의 "액센트 컬러 전략" 참조
   - 모노크롬 베이스 + 1 accent 컬러 전략
   - 커버, 섹션 브레이크, KPI, 비교/강조에 일관되게 사용
6. Jangpm 패턴 배치 계획 수립:
   - `references/layout-guide.md`의 **29개 Jangpm 패턴** 중 선택 (title/agenda/section/three-point/four-point/six-point/matrix-trends/paired-concept/comparison/process/overview-split/stats/table/forecast-table/pnl/seasonal/kpi-dashboard/exercise-1up/exercise-2up/quote/checklist/summary/image-1up/image-2up/closing/closing-big/cover-vertical/terminal-split/terminal-full)
   - **다양성 규칙**: 연속 동일 패턴 금지(section 예외), 최소 종류 수: 8장 이하 → 3종, 10장 이상 → 4종
   - **고밀도 패턴 쿼터 (필수)**: 콘텐츠 슬라이드(title/section/closing 제외)의 최소 30%는 grid 패턴이어야 한다. `four-point` / `six-point` / `matrix-trends` / `kpi-dashboard` / `numbered-grid` 중에서 선택
   - 개폐 슬라이드(title/cover-vertical, closing/closing-big)는 감정적 임팩트 중시
7. **톤 시퀀스 계획** (light/neutral):
   - 모든 슬라이드는 **light 모드만** 사용. dark 배경 슬라이드 금지
   - 각 슬라이드에 톤 레이블 부여 (light / neutral)
   - 리듬은 밀도로 조절: 고밀도(4+카드) ↔ 여백(Key Statement, Quote) 슬라이드 교차
8. 이미지 필요 여부 판단 — 커버에는 AI 이미지 기본 사용
9. 슬라이드별 콘텐츠 아웃라인 수립

**Step 1 완료 전 체크리스트 (모두 통과해야 진행)** ⚠️:
- [ ] 고밀도(4+카드) 슬라이드 수 ≥ 콘텐츠 슬라이드의 30%? (예: 10장 콘텐츠 → 최소 3장)
- [ ] 시각 요소(이미지/숫자 배지/도형/SVG) 포함 슬라이드를 표시했을 때, 텍스트 전용 2장 이상 연속 없음?
- [ ] 같은 레이아웃이 3회 이상 사용되지 않음?
- [ ] 이모지·유니코드 장식 기호(→✓★▪ 등) 완전 금지. 아이콘이 필요하면 숫자(01/02/03), 도형 div, 또는 인라인 SVG(stroke currentColor, 2px)로 대체했는가? (CLAUDE.md 정책과 일치)
- [ ] 타이포가 활성 테마의 시맨틱 스케일 안에서 반복 사용되는가? 시맨틱 클래스(`.display`, `.display-sm`, `.headline`, `.title`, `.body`, `.caption`) 우선, 하드코드 `text-[Npx]` 최소화. 구체 수치는 `references/jangpm/theme-rules.md`의 "폰트 웨이트 + 크기 기준표" 참조

**실패 시:** 즉시 재계획

### Step 2: Pencil 환경 준비

**처리 주체:** LLM → Pencil MCP

`references/pencil-workflow.md` 읽기 후 실행:

1. `get_style_guide_tags` → 태그 목록 확인
2. `get_style_guide(tags)` → 주제에 맞는 Style Guide 선택
   - 기본 취향: minimal, monochrome, clean, flat 계열 우선
   - Step 1에서 선택한 accent 컬러와 어울리는 Style Guide 선택
3. **시각 레퍼런스 확인 — `open_document('<project-root>/jangpm-design-system.pen')`**:
   - 프로젝트 루트의 `jangpm-design-system.pen`을 먼저 열어 Jangpm 디자인 SSOT를 로드
   - `get_variables`로 기존 토큰(색상·폰트·간격) 목록 확인 → Step 4에서 재사용
   - `batch_get(patterns="slide")` 또는 `batch_get(patterns="*")`로 샘플 프레임/컴포넌트 구조 파악
   - 이 단계는 **시각 레퍼런스 흡수용**. 이 문서는 편집하지 않는다 (읽기 전용 취급)
4. `open_document('new')` → 출력용 새 .pen 파일 생성
5. `set_variables` → **Step 3에서 확인한 활성 테마 토큰을 출력 .pen에 주입** (`src/index.css` 값과 일치):
   - 색상: `--text` (primary), `--text-secondary` (muted), `--surface-alt` (card-bg), `--accent` (accent — 필수)
   - 폰트: `--font-sans` 값을 display/body에 동일 적용
   - 간격: `--card-padding`, `--card-gap`
   - 구체 값은 `src/index.css`의 THEME 블록에서 직접 확인. 하드코드 금지 — 토큰 이름으로 참조
6. `get_guidelines('slides')` → 슬라이드 디자인 규칙 로드

**검증:** `get_variables`로 설정 확인 — accent 컬러 포함 여부 반드시 확인

**실패 시 처리 (HARD RULE) ⚠️:**

Pencil MCP 호출이 실패하면 **자동 재시도 최대 2회**까지만 수행. 2회 재시도 후에도 실패 시 **즉시 파이프라인 중단**하고 사용자에게 경고한다. 직접 React 작성으로 우회 금지.

**중단 조건 (다음 중 하나라도 해당):**
- Pencil MCP 도구(`mcp__pencil__*`)가 환경에 등록되어 있지 않음 (tool not found / tool unavailable)
- `get_style_guide_tags` / `open_document` / `get_variables` 등 핵심 호출이 2회 연속 실패
- Pencil MCP 서버가 응답하지 않음 (timeout, connection error)

**중단 시 사용자에게 출력할 경고 (예시):**
```
⚠️ Pencil MCP 사용 불가 — 파이프라인 중단

/slide 스킬은 Pencil MCP로 디자인한 .pen 파일을 React로 변환하는 것이 핵심 단계입니다.
Pencil MCP가 동작하지 않으면 스킬 정책상 직접 React를 작성하지 않습니다.

해결 방법:
1. Pencil 앱이 실행 중인지 확인
2. Pencil MCP 서버가 Claude Code에 연결되어 있는지 확인 (/mcp 로 상태 확인)
3. 연결이 정상화되면 동일 요청을 다시 실행

대안 파이프라인 (Pencil 없이 슬라이드가 필요한 경우):
- slide-html (Reveal.js 기반 HTML)
- slide-svg (네이티브 SVG → DrawingML PPTX)
```

이 경고를 출력한 뒤 **Step 3~5를 실행하지 않고 종료**한다. 사용자가 명시적으로 "Pencil 없이 직접 React로 작성해달라"고 요청하는 경우에만 예외.

### Step 3: 슬라이드 디자인

**처리 주체:** LLM → Pencil MCP

`references/pencil-workflow.md` 참조하여 슬라이드별 반복:

1. `find_empty_space_on_canvas(width=1280, height=720, padding=80, direction="right")`
2. `batch_design` — 선택한 Jangpm 패턴에 따라 프레임 생성:
   - **커버/히어로/비주얼 슬라이드 (절대 위치 필요)**: 슬라이드 프레임을 `layout: "none"`으로 생성. 자식에 `x`, `y`, `width`, `height` 명시. 참고: `references/pencil-workflow.md` "커버/히어로 슬라이드 절대 위치 규칙"
   - **일반 콘텐츠 슬라이드 (자동 정렬)**: `layout: "vertical"` 유지 가능
   - 내부 구조: 배경 → 레이아웃 그리드 → 콘텐츠 노드
   - 최대 25개 연산/배치. 복잡한 슬라이드는 2~3회 batch_design 호출
3. 이미지 필요 시 `G(nodeId, "ai", "이미지 설명 프롬프트")` 연산
   - Style Guide의 색상/무드와 일치하는 프롬프트 작성
   - 커버 슬라이드에는 기본으로 AI 이미지 사용 (첫인상 점수 직접 영향)
   - 한 덱에서 한 가지 스타일 유지 (all photo 또는 all render)
4. `get_screenshot(slideFrameId)` → LLM 비전 검증
   - `references/eval.md` 읽기 후 6개 항목별 시각 검증 (이중 검증 섹션 포함)
   - Pencil-only 이슈는 기록 후 진행. React HTML 정상이면 블록킹 아님
   - 체크: 텍스트 잘림, 정렬, 오버플로우, 색상 대비, 계층 구조
5. 문제 발견 시 `batch_design`으로 수정 (최대 3회). Pencil-only 이슈는 재시도 불필요

**성공 기준:** 모든 슬라이드가 1280×720 내 배치, 텍스트 잘림 없음, 시각적 일관성

**Step 3 완료 게이트 — Pencil 완전성 검증 (HARD RULE)** ⚠️:

Step 4로 넘어가기 **직전** 반드시 실행. 통과 못하면 Step 4 진입 금지.

1. `get_editor_state({ include_schema: false })` 호출
2. 응답의 "Top-Level Nodes" 목록에서 **이름이 `Slide`로 시작하는 프레임** 개수를 센다
3. Step 1에서 결정한 슬라이드 수 `N`과 **정확히 일치**해야 한다 (초기 placeholder `Frame` 등은 제외)
4. 각 프레임 이름이 `Slide01-*`, `Slide02-*`, …, `Slide{N}-*` 형태로 연속되는지 눈으로 확인

**실패 시 처리:**
- 프레임이 부족하면 → 누락된 슬라이드를 Pencil에서 추가 디자인 (Step 3 반복)
- **절대로 "Pencil에 없는 슬라이드를 React로 직접 작성"하지 않는다**. 사용자는 `pencil-new.pen`을 직접 열어 검증한다 (위반 사례: `docs/solutions/workflow/sol-20260424-001.md`)
- Pencil MCP가 연결 끊겨서 추가 불가 → Step 2 "실패 시 처리" 절차에 따라 파이프라인 중단

**게이트 통과 기준:** Pencil top-level Slide* 프레임 수 == N (Step 1 계획 슬라이드 수)

### Step 4: React 컴포넌트 생성

**처리 주체:** LLM → Pencil MCP + Write tool

1. `get_guidelines('code')` 로드
2. `references/pen-to-react.md` 읽기
3. `get_variables` → `src/index.css`의 `:root` CSS 변수 업데이트
4. **이미지 export (이미지가 있는 슬라이드에만):**
   - G() 연산으로 이미지를 생성한 슬라이드의 이미지 노드 ID 수집
   - `export_nodes(filePath, nodeIds=[...], outputDir="src/images", format="png", scale=1)`
   - 생성된 파일: `src/images/{nodeId}.png`
   - 이후 슬라이드 TSX에서 ES import로 참조 (`import img from '../images/{nodeId}.png'`)
5. 슬라이드별 반복:
   a. **패턴 HTML 로드 (필수)**: Step 1에서 선택한 패턴 ID에 해당하는 `references/jangpm/patterns/<id>-<name>.html`을 Read tool로 읽는다. 이 HTML이 구조·시맨틱 클래스·간격의 **단일 진실 원천** — React 변환 시 이 구조를 복제. 공통 스타일은 같은 디렉토리의 `_slide.css`를 참조
   b. `batch_get(nodeId=slideFrameId, maxDepth=10)` → 전체 노드 트리 읽기 (텍스트 콘텐츠 + Pencil 배치 확인용)
   c. `get_screenshot(slideFrameId)` → 시각 참조용
   d. pen-to-react.md 매핑 규칙에 따라 노드 → React + Tailwind 변환. **패턴 HTML의 클래스 어휘(`.display`, `.headline`, `.accent-badge`, `.rule-accent` 등)와 구조를 `slide-system.tsx` 프리미티브(`SlideShell`, `SectionHeader`, `Card`, `AccentBadge`, `RuleLine`)로 매핑**. 패턴 HTML에 없는 장식 요소는 추가하지 않는다
   e. `src/slides/SlideNN.tsx` 작성 (Write tool)
      - 컴포넌트명: `Slide01`, `Slide02`, ...
      - default export
      - 루트: `<SlideShell gm="...">` 필수 (1280×720 + relative + GM 슬롯 자동 주입). 커버·섹션·클로징 슬라이드는 `gm` prop 생략 가능, 그 외 콘텐츠 슬라이드는 반드시 주입
**Step 4 완료 전 체크리스트 (모두 통과해야 Step 5 진행)** ⚠️:
- [ ] **Pencil 프레임 수 == TSX 파일 수 == Step 1 계획 수** (세 값이 정확히 일치해야 함. 불일치 시 어느 쪽이 먼저 생성됐든 누락된 쪽을 복구. "TSX만 있고 Pencil에 없음" 상태로 Step 5 진행 금지 — `docs/solutions/workflow/sol-20260424-001.md` 참조)
- [ ] 모든 SlideNN.tsx가 `SlideShell` 사용 (권장) 또는 `w-[1280px] h-[720px] relative` 루트 컨테이너 사용했는가? (`relative` 누락 시 absolute 장식 요소가 다른 슬라이드 위에 렌더링됨)
- [ ] 타이포가 시맨틱 클래스(`.display`, `.display-sm`, `.headline`, `.title`, `.body`, `.caption`)로 반복 사용되는가? 하드코드 `text-[Npx]` 최소화. 수치는 `references/jangpm/theme-rules.md` 참조
- [ ] 이모지·유니코드 장식 기호(→✓★ 등) 완전 제거. 시각 요소는 인라인 SVG(stroke currentColor, 2px) 사용?
- [ ] 시각 요소(img/svg) 없는 슬라이드가 2장 이상 연속 없음?
- [ ] 4+ 카드 또는 고밀도 정보 블록을 가진 슬라이드가 콘텐츠 슬라이드의 30% 이상인가?
- [ ] 같은 레이아웃 시그니처 3회 이상 반복 없음?
- [ ] gradient, glow, decorative animation 없음? 그림자는 `shadow-sm/md/lg`만 허용 (`shadow-xl/2xl/inner` 금지), KPI/데이터 강조 카드에만 sparse 적용
- [ ] 모든 콘텐츠 슬라이드의 h2가 `.headline` 클래스 사용? (하드코드 시 `theme-rules.md`의 Headline 수치와 일치해야 함)
- [ ] 메인 헤딩 **위에** 소형 카테고리 라벨(supertitle)이 없는가? `SectionHeader`의 `tag`는 헤딩 오른쪽에만
- [ ] 3/4단 카드 레이아웃에서 각 카드가 아이콘/SVG OR 태그/pill OR 4개 이상 목록 항목을 포함하는가?
- [ ] 카드 그리드(≥3개)에서 1개는 `tone="accent"` (accent-soft 배경 + accent 테두리)로 차별화?
- [ ] 커버/섹션/클로징이 아닌 모든 콘텐츠 슬라이드 하단에 `.gm` (SlideShell gm prop) 1줄 포함?
- [ ] 슬라이드 총 수가 사용자 지정 장수와 일치하는가? (미지정 시 커버+클로징 포함 4장 이상)

6. `src/slides/index.ts` 업데이트 후 **즉시 bash 검증 실행 (위반 시 수정 후 재검증)**:

> ⚠️ **테마 의존성 알림**: 아래 bash 스크립트의 수치(`B4: <12`, `B9: text-[32px]`)와 패턴 이름(`B7`)은 **활성 테마(jangpm) 기준**이다. `/theme-init`으로 테마 교체 시 이 블록도 새 테마의 `theme-rules.md`에 맞춰 업데이트 필요. 교체 지점은 `docs/theme-replacement-map.md` 참조.

```bash
# B-pencil: Pencil 프레임 수 == TSX 파일 수 검증 (sol-20260424-001 재발 방지)
#   Pencil MCP 호출 결과(get_editor_state)에서 집계한 Slide* 프레임 수를 PENCIL_SLIDE_COUNT에 넣어 실행.
#   예: PENCIL_SLIDE_COUNT=10 bash -c "$(아래 스크립트)"
#   프레임 조회를 건너뛰고 싶으면 명시적으로 PENCIL_SLIDE_COUNT=SKIP 설정 (권장 X — sol-20260424-001 위반 재발 위험)
python3 -c "import os,glob; n=len(glob.glob('src/slides/Slide[0-9]*.tsx')); p=os.environ.get('PENCIL_SLIDE_COUNT','UNSET'); print('B-pencil FAIL: PENCIL_SLIDE_COUNT 미지정 — Pencil 프레임 수를 세서 export 후 재실행') if p=='UNSET' else (print(f'B-pencil SKIP (TSX={n}) — sol-20260424-001 위반 위험') if p=='SKIP' else (print(f'B-pencil FAIL: Pencil={p} vs TSX={n}') if int(p)!=n else print(f'B-pencil: PASS ({n})')))"
# B4: 12px 미만 하드코드 폰트 (jangpm 캡션 12.8px가 최소. 다른 테마는 theme-rules.md 확인)
python3 -c "import re,glob; v=[(f.split('/')[-1],s) for f in glob.glob('src/slides/Slide*.tsx') for s in re.findall(r'text-\[(\d+)px\]',open(f).read()) if int(s)<12]; print('B4 FAIL:',v) if v else print('B4: PASS')"
# B5: 이모지/특수기호 금지
python3 -c "import re,glob; c=sum(len(re.findall(r'[\U0001F300-\U0001FAFF\U00002600-\U000026FF\U00002700-\U000027BF]',open(f).read())) for f in glob.glob('src/slides/Slide*.tsx')); print('B5 FAIL') if c else print('B5: PASS')"
# B6: 1920×1080 레거시 뷰포트 잔존 체크
python3 -c "import re,glob; fails=[f.split('/')[-1] for f in sorted(glob.glob('src/slides/Slide*.tsx')) if re.search(r'w-\[1920px\]|h-\[1080px\]',open(f).read())]; print('B6 FAIL:',fails) if fails else print('B6: PASS')"
# B7: 고밀도 grid 패턴 (활성 테마의 grid 패턴 — jangpm: four-point/six-point/matrix-trends/kpi-dashboard/numbered-grid) 3장 이상
python3 -c "import re,glob; count=sum(1 for f in sorted(glob.glob('src/slides/Slide*.tsx')) if re.search(r'(four-point|six-point|matrix-trends|kpi-dashboard|numbered-grid)',open(f).read()[:300])); print(f'B7 FAIL: {count}/3') if count<3 else print(f'B7: PASS ({count})')"
# B9: 콘텐츠 슬라이드 h2가 .headline 클래스 사용 (title/section/closing 제외). 하드코드 허용 시 활성 테마의 Headline 수치 (jangpm: 32px)
python3 -c "import re,glob; fails=[f.split('/')[-1] for f in sorted(glob.glob('src/slides/Slide*.tsx')) if not re.search(r'pattern=\"(title|section|closing|cover-vertical|closing-big)\"|Bold Cover|Section Break|Closing|Cover',open(f).read()[:300]) and not re.search(r'<h2[^>]*(?:headline|text-\[32px\])|<SectionHeader',open(f).read())]; print('B9 FAIL:',fails) if fails else print('B9: PASS')"
# B-gm: 콘텐츠 슬라이드 .gm 포함 여부 (title/section/closing 제외)
python3 -c "import re,glob; fails=[f.split('/')[-1] for f in sorted(glob.glob('src/slides/Slide*.tsx')) if not re.search(r'pattern=\"(title|section|closing|cover-vertical|closing-big)\"|Bold Cover|Section Break|Closing|Cover',open(f).read()[:300]) and not re.search(r'<SlideShell[^>]*\sgm=|<GuidingMessage',open(f).read())]; print('B-gm FAIL:',fails) if fails else print('B-gm: PASS')"
# B10: flex-col 컨테이너에서 badge가 h2 바로 앞 (supertitle 패턴)
python3 -c "import re,glob; fails=[f.split('/')[-1] for f in sorted(glob.glob('src/slides/Slide*.tsx')) if not re.search(r'pattern=\"(title|section|closing|cover-vertical|closing-big)\"|Bold Cover|Section Break|Closing|COVER|Cover',open(f).read()[:300]) and re.search(r'flex-col[^\"\']*[\"\']\S*>[\s]*<(?:div|span)[^>]*>[\s]*[가-힣A-Za-z][^<\n]{0,80}[\s]*</(?:div|span)>[\s]*<h2',open(f).read())]; print('B10 FAIL:',fails) if fails else print('B10: PASS')"
# B-dark: 슬라이드 루트 컨테이너 dark 배경 금지
python3 -c "import re,glob; fails=[f.split('/')[-1] for f in sorted(glob.glob('src/slides/Slide*.tsx')) if re.search(r'w-\[1280px\].*?bg-\[#[0-2][0-9a-fA-F]',open(f).read()[:800],re.DOTALL)]; print('B-dark FAIL:',fails) if fails else print('B-dark: PASS')"

# === Plan 모드 (체계적 모드) 검증 — slide_plan.json 존재 시 자동 활성. 간단 모드면 자동 SKIP ===
# B-plan-count: plan.slides.length == TSX 파일 수 (Triple gate 정합, sol-20260424-001)
python3 -c "import json,glob; p=glob.glob('output/*/slide_plan.json'); n=len(glob.glob('src/slides/Slide[0-9]*.tsx')); (print('B-plan-count: SKIP (간단 모드)') if not p else (lambda d: print(f'B-plan-count: PASS ({n})') if len(d.get('slides',[]))==n else print(f'B-plan-count FAIL: plan={len(d.get(\"slides\",[]))} vs TSX={n}'))(json.load(open(p[0]))))"
# B-r2: chart 슬라이드는 strategy + takeaway + chart_data 필수, type-aware 데이터포인트 최소 (Layer 1 R2 v0.2)
#   - 시계열(single-line-trend/two-line-cross-over/forecast-dashed): 시리즈당 ≥6
#   - 카테고리(bar-comparison/stacked-bar): 시리즈당 ≥4
#   - 분포·매트릭스(scatter/matrix-2x2/matrix-3x3): 포인트 ≥4
#   - 깔때기(funnel): 단계 ≥3
#   - custom: 자유
python3 -c "
import json,glob
MIN={'single-line-trend':6,'two-line-cross-over':6,'forecast-dashed':6,'bar-comparison':4,'stacked-bar':4,'scatter':4,'matrix-2x2':4,'matrix-3x3':9,'funnel':3}
p=glob.glob('output/*/slide_plan.json')
if not p:
    print('B-r2: SKIP (간단 모드)')
else:
    d=json.load(open(p[0])); fails=[]
    for s in d.get('slides',[]):
        n=s.get('slide_number')
        if s.get('chart_strategy'):
            if not s.get('chart_takeaway'): fails.append(f'{n}:no-takeaway')
            cd=s.get('chart_data')
            if not cd: fails.append(f'{n}:no-chart_data')
            else:
                ctype=cd.get('type','custom')
                threshold=MIN.get(ctype,0)
                series=cd.get('series',[])
                if not series and ctype!='custom': fails.append(f'{n}:empty-series')
                for ser in series:
                    vals=ser.get('values',[])
                    if threshold and len(vals)<threshold: fails.append(f'{n}:series-{ser.get(\"name\")}-len{len(vals)}<{threshold}({ctype})')
        if s.get('table_strategy') and not s.get('table_takeaway'): fails.append(f'{n}:no-table_takeaway')
    print('B-r2 FAIL:',fails) if fails else print('B-r2: PASS')
"
# B-r5: 모든 슬라이드 evidence_to_use 비어있지 않음 (Layer 1 R5)
python3 -c "import json,glob; p=glob.glob('output/*/slide_plan.json'); (print('B-r5: SKIP (간단 모드)') if not p else (lambda d: (lambda fails: print('B-r5 FAIL:',fails) if fails else print('B-r5: PASS'))([s.get('slide_number') for s in d.get('slides',[]) if not s.get('content_constraints',{}).get('evidence_to_use')]))(json.load(open(p[0]))))"
# B-r6: plan에 recommended_pattern_id / min_lines_estimate / required_primitives 채워졌는지 (Layer 1 R6 v0.2)
python3 -c "
import json,glob
p=glob.glob('output/*/slide_plan.json')
if not p:
    print('B-r6: SKIP (간단 모드)')
else:
    d=json.load(open(p[0])); fails=[]
    for s in d.get('slides',[]):
        n=s.get('slide_number'); missing=[]
        if not s.get('recommended_pattern_id'): missing.append('pattern_id')
        mle=s.get('min_lines_estimate')
        if not isinstance(mle,(int,float)) or mle<40: missing.append(f'min_lines={mle}')
        rp=s.get('required_primitives')
        if not isinstance(rp,list) or len(rp)<1: missing.append('required_primitives')
        if missing: fails.append(f'{n}:{missing}')
    print('B-r6 FAIL:',fails) if fails else print('B-r6: PASS')
"
# B-density: plan의 min_lines_estimate vs 실제 TSX 줄 수 + required_primitives grep (R6 강제)
python3 -c "
import json,glob,os,re
p=glob.glob('output/*/slide_plan.json')
if not p:
    print('B-density: SKIP (간단 모드)')
else:
    d=json.load(open(p[0])); fails=[]
    for s in d.get('slides',[]):
        n=s.get('slide_number')
        tsx=f'src/slides/Slide{n:02d}.tsx'
        if not os.path.exists(tsx):
            fails.append(f'{n}:no-tsx'); continue
        content=open(tsx).read(); lines=content.count(chr(10))+1
        mle=s.get('min_lines_estimate',60)
        if lines < mle:
            fails.append(f'{n}:lines={lines}<{mle}')
        rp=s.get('required_primitives',[])
        for prim in rp:
            if prim not in content:
                fails.append(f'{n}:missing-{prim}')
    print('B-density FAIL:',fails) if fails else print('B-density: PASS')
"
```

### Step 5: 빌드 + 브라우저 확인

**처리 주체:** Bash tool + 사용자

**폴더 이름 규칙 (HARD RULE) ⚠️:**

`{제목}`은 **반드시 소문자 kebab-case**로 변환한다. 파일명·폴더명에 대문자·공백·한글 사용 금지.

변환 규칙:
1. 한글 제목 → 영문으로 번역 또는 의미 있는 영문 축약 (예: "AI 도구 카테고리" → `ai-tools-categories`)
2. 공백 / 언더스코어 / CamelCase → 하이픈(`-`)으로 통일 (예: `AI Development Patterns` → `ai-development-patterns`)
3. 전부 **소문자**로 변환 (영문 대문자 허용 안 됨)
4. 날짜/버전 suffix가 필요하면 하이픈으로 연결 (예: `ai-tools-categories-20260424`, `gpters-intro-v2`)

**올바른 예:** `ai-tools-categories-20260424` / `gpters-intro` / `claude-skill-overview-v2`
**금지:** `AI-Development-Patterns` / `AI_Tools_Categories` / `GPters Intro` / `장피엠-소개`

아래 bash 스크립트에서 `{slug}` 자리에 위 규칙으로 만든 소문자 kebab-case 문자열을 넣는다.

```bash
npm run build

# eval 라운드 결과물인 경우 → eval 폴더에 저장
mkdir -p "eval/html-rounds/r{N}/{slug}/src"
cp dist/index.html "eval/html-rounds/r{N}/{slug}/{slug}.html"
cp src/slides/Slide*.tsx "eval/html-rounds/r{N}/{slug}/src/"
cp src/App.tsx "eval/html-rounds/r{N}/{slug}/src/"
cp src/index.css "eval/html-rounds/r{N}/{slug}/src/"
cp -r src/images "eval/html-rounds/r{N}/{slug}/src/" 2>/dev/null || true
open "eval/html-rounds/r{N}/{slug}/{slug}.html"

# 일반 사용자 요청 (eval 아닌 경우) → output 폴더에 저장
mkdir -p "output/{slug}/src"
cp dist/index.html "output/{slug}/{slug}.html"
cp src/slides/Slide*.tsx "output/{slug}/src/"
cp src/App.tsx "output/{slug}/src/"
cp src/index.css "output/{slug}/src/"
cp -r src/images "output/{slug}/src/" 2>/dev/null || true
open "output/{slug}/{slug}.html"
```

**출력 위치 규칙:**
- **eval 라운드** (`eval loop`, `라운드 N` 등의 맥락): `eval/html-rounds/r{N}/{slug}/` 에 저장
- **일반 사용자 요청**: `output/{slug}/` 에 저장
- `{slug}`은 위 "폴더 이름 규칙"에 따라 소문자 kebab-case로 생성
- `src/` 서브폴더에 React 소스코드 아카이브 (SlideNN.tsx, App.tsx, index.css)
- 수정 시 동일 폴더에 덮어쓰기 (새 폴더 생성 금지)

**빌드 실패 시:** TypeScript/Tailwind 에러 확인 → 해당 SlideNN.tsx 수정 → 재빌드 (최대 3회)

사용자에게 브라우저에서 확인 요청.

### Step 6: PPTX 자동 변환 (HARD RULE) ⚠️

**처리 주체:** LLM (이 스킬 안에서 직접 수행 — 다른 스킬로 넘어가지 않는다)

Step 5에서 HTML 빌드가 끝나면 **즉시** 같은 컨텍스트에서 PPTX 변환을 이어서 수행한다. HTML만 결과물로 두고 종료하지 않는다 — 이 파이프라인의 최종 산출물은 PPTX 파일이다.

**디테일 룰 single source**: `references/pptx-build.md` (매니페스트 핸드크래프트, 필드 이름, runs, Layout-Collapse Detector, R2/R5/R6 등 모든 디테일). 변환 들어가기 전 이 문서를 로드.

**절차 (즉시 실행):**

1. **매니페스트 핸드크래프트** — `output/{slug}/src/Slide*.tsx` + `src/index.css`을 읽고, `references/pptx-build.md` Step 1~2 룰에 따라 슬라이드별로 elements 배열을 직접 JSON에 작성. 빌더 스크립트로 일괄 생성 금지(HARD RULE). `output/{slug}/{slug}-manifest.json`에 저장. 매니페스트 스키마는 `references/manifest-schema.md`.

2. **자가 검증 + 자동 수정 루프** (`pptx-build.md` Step 2.5):
   ```bash
   node .claude/skills/slide/scripts/check-manifest.js "output/{slug}/{slug}-manifest.json"
   ```
   5/5 PASS까지 카드 스코프 우선으로 자동 수정 (최대 3회). Layout-Collapse Detector(2.5.0)도 같이 실행.

3. **SVG 래스터화** (`pptx-build.md` Step 2.7) — 매니페스트에 SVG image 요소가 있으면 반드시:
   ```bash
   node .claude/skills/slide/scripts/rasterize-svg-images.mjs output/{slug}/{slug}-manifest.json
   ```

4. **PPTX 변환**:
   ```bash
   node .claude/skills/slide/scripts/convert.js "output/{slug}/{slug}-manifest.json"
   ```
   출력은 `output/{slug}/{slug}.pptx` (manifest와 동일 폴더, 동일 슬러그 — 자동 유도).

5. **보고** — 사용자에게 PPTX 경로 + 슬라이드 수 + warning 보고. 환경에 외부 전송 채널이 있으면 PPTX 파일 송출.

**자동 수정 3회로도 실패하면**: 실패 항목을 사용자에게 보고하고 수동 수정 요청.

**왜 한 스킬 안에서 처리하는가**: 이 파이프라인의 최종 산출물은 PPTX로 통일하도록 설계되어 있다. /slide → 별도 /export-pptx로 컨텍스트가 끊기면 LLM이 흐름을 놓칠 수 있고 사용자도 두 번 트리거해야 함. /export-pptx 스킬은 별도로 살아있지만, "이미 React만 있는 프로젝트에서 PPTX만 재변환"하는 단독 시나리오에만 사용.

**예외 — PPTX 생략 허용 조건**: 사용자가 명시적으로 "HTML만 필요해", "PPTX는 안 만들어도 돼", "eval 라운드라 HTML만" 같이 요청한 경우만. 이 경우에도 사용자에게 "PPTX는 `/export-pptx`로 추후 생성 가능"이라고 한 줄 안내한다.

### Step 7: 수정 루프

**처리 주체:** 사용자 피드백 → LLM

사용자가 수정 요청 시:
1. 해당 슬라이드만 Pencil에서 수정 (Step 3 반복)
2. 해당 React 컴포넌트만 재생성 (Step 4 반복)
3. 재빌드 + 브라우저 재오픈 (Step 5 반복)
4. PPTX 재변환 (Step 6 반복) — 매니페스트의 영향받은 슬라이드만 부분 재작성 가능하지만, convert.js는 전체 매니페스트를 다시 PPTX로 변환한다

사용자 승인 시 완료.

## 테마 세부 룰 (외부 참조)

커버 전략, 액센트 컬러 사용 규칙, 폰트 웨이트 + 크기 기준표 등 **활성 테마의 세부 룰**은 다음 파일을 참조한다. Step 1 시작 시 반드시 로드:

- `references/jangpm/theme-rules.md`

`/theme-init` 실행 시 이 파일은 새 테마의 `theme-rules.md`로 교체된다.

## 카드 내부 구성 규칙 (원칙)

**카드는 빈 껍데기가 아니다.** 모든 카드 내부에 최소 3개 요소(아이콘·제목·본문)를 포함하여 밀도감과 완성도를 확보한다. 카드 강화 요소(KPI 숫자, pill 태그, 인사이트 바, 진행률 바, 구분선) 적극 권장.

**안티 패턴 (금지):** 제목만 있는 빈 카드 · 모든 카드가 동일한 내부 구조 · 카드 내부에 3줄 초과 문단.

**상세 수치·치수**: `references/jangpm/theme-rules.md`의 "카드 내부 구성 규칙" 참조.

## Bento Grid 레이아웃 전략 (v3) ⚠️

**핵심 원칙: 모든 카드가 같은 크기일 필요 없다.** 슬라이드를 불규칙한 타일 그리드로 구성하여 시각적 흥미와 정보 계층을 동시에 만든다.

**Bento Grid 규칙:**
- 콘텐츠 슬라이드의 **최소 40%** 에서 Bento Grid 배치 사용
- Bento = 카드/영역이 2가지 이상 다른 크기로 배치되는 그리드
- **큰 카드(hero card)**: 핵심 메시지를 담는 1개 카드가 다른 카드의 2배 크기
- **작은 카드**: 보조 정보를 담는 2~4개 카드가 나머지 공간을 채움
- **accent 카드**: 1개 카드만 accent 컬러 배경 — 시선의 앵커 포인트 역할

**Bento 배치 패턴 예시 (1280×720 내부):**
- **패턴 A — L자형**: 좌측 큰 카드(60%w) + 우측 상하 2개 작은 카드(40%w)
- **패턴 B — 역L형**: 상단 가로 긴 카드(100%w, 40%h) + 하단 3개 카드(33%w each)
- **패턴 C — 비대칭 3단**: 좌(30%w 세로 풀) + 중앙(40%w 상하 2개) + 우(30%w 세로 풀)
- **패턴 D — 대형+미니**: 중앙 대형 카드(70%w) + 좌우 좁은 사이드 카드(15%w each)
- **패턴 E — 4+1 그리드**: 상단 4개 작은 카드 + 하단 1개 풀와이드 인사이트 바

**React 구현 패턴:**
```tsx
{/* 패턴 A — L자형. 하드코드 hex 금지, 토큰만 사용 */}
<div className="flex flex-row gap-[36px] flex-1">
  <div className="flex-[3] bg-[var(--surface-alt)] rounded-[24px] p-[40px]">
    {/* hero card — 큰 카드 */}
  </div>
  <div className="flex-[2] flex flex-col gap-[36px]">
    <div className="flex-1 bg-[var(--surface-alt)] rounded-[24px] p-[36px]">{/* 작은 카드 1 */}</div>
    <div className="flex-1 bg-[var(--accent-soft)] rounded-[24px] p-[36px]">{/* accent 카드 */}</div>
  </div>
</div>
```

**대비감 강화 규칙:**
- 각 슬라이드의 시각적 **무게중심이 다르게** 배치: 어떤 슬라이드는 좌측 무거움, 어떤 슬라이드는 우측, 어떤 슬라이드는 하단
- 동일한 카드 크기/배치가 2장 연속 반복 금지
- **accent 카드 위치 변화**: 슬라이드마다 accent 카드가 다른 위치에 배치 (좌상 → 우하 → 중앙 등)
- **라이트 모드 전용 (HARD RULE)** ⚠️: 모든 슬라이드(커버·클로징 포함) dark 배경 금지. 슬라이드 bg는 `bg-[var(--bg)]` 또는 `bg-[var(--surface)]`만 허용. 카드는 `bg-[var(--surface)]` / `bg-[var(--surface-alt)]` / `bg-[var(--accent-soft)]` 만 사용. 대비감은 accent 컬러 vs neutral gray, 큰 카드 vs 작은 카드, 숫자 크기 차이로 생성. 하드코드 hex 금지.
- **숫자/KPI를 카드 안에 배치**: 독립 KPI 슬라이드 대신 콘텐츠 카드 안에 큰 숫자를 넣어 밀도와 대비감 동시 확보

**오버플로우/정렬 검증 (HARD RULE)** ⚠️:
- Step 4 완료 후 반드시 빌드하여 스크린샷 캡처
- 각 슬라이드 스크린샷에서 확인:
  - 텍스트/카드가 1280×720 영역 밖으로 삐져나가지 않았는가
  - 카드 내부 텍스트가 카드 경계를 넘지 않았는가
  - 좌우/상하 정렬이 일관적인가
  - 이미지가 올바르게 렌더링되었는가
- 위반 발견 시 해당 SlideNN.tsx 수정 후 재빌드

## 시각적 요소 규칙 ⚠️

- 매 덱에서 최소 50%의 슬라이드에 시각적 요소를 포함한다
- **Pencil G() 이미지**: 커버, 콘셉트 슬라이드에 AI 생성 이미지 사용
- **Lucide 아이콘**: 3 Pillars, Icon Row, List 레이아웃에서 적극 활용. React TSX에서 lucide-react 컴포넌트 또는 인라인 `<svg>` 태그로 렌더링
- **차트/다이어그램**: KPI 슬라이드에 프로그레스 바, 비교 슬라이드에 시각적 대비 요소
- **화살표 커넥터**: Process 레이아웃에서 단계 간 흐름 표시 (ArrowRight 등)
- **텍스트 전용 연속 금지 (HARD RULE)**: 시각 요소(`<img>`, `<svg>`, lucide 아이콘) 없는 슬라이드가 **2장 연속까지만 허용**. 3장 연속 시 반드시 중간에 아이콘/이미지/SVG 삽입. Step 1 아웃라인 단계에서 시각 요소 배치를 명시적으로 계획하고, Step 4 React 변환 시 텍스트 전용 슬라이드에 Lucide 아이콘(`<svg>`) 최소 1개 이상 삽입
- **시각 요소 검증**: Step 4 완료 후 슬라이드 시퀀스를 검토하여 3연속 텍스트 전용이 없는지 확인. 위반 시 해당 슬라이드에 관련 아이콘 추가

## 헤드 메시지 표준화 규칙 (원칙) ⚠️ HARD RULE

**모든 콘텐츠 슬라이드(커버·클로징 제외)의 메인 헤딩은 동일한 규격을 유지한다.**

- **크기 일관성**: 덱 내에서 헤딩은 하나의 사이즈로 통일. 구체 수치는 테마 룰 참조
- **위치**: 슬라이드 상단 고정 — 슬라이드 패딩 직후 첫 번째 텍스트 요소
- **NO supertitle (HARD RULE)**: 헤딩 **위에** 소형 카테고리 라벨 별도 div 배치 금지. 태그가 필요하면 헤딩과 같은 flex-row 또는 헤딩 **하단**에 배치.
- **핵심 판단 기준:** 헤딩 div보다 먼저(JSX 위쪽에) 어떤 요소든 위치하면 supertitle이다.

**구체 수치·색상·React 예시**: `references/jangpm/theme-rules.md`의 "헤드 메시지 표준화 규칙" 참조.

## 핵심 제약

**인프라 (테마 무관):**
- 뷰포트: 1280×720 (16:9)
- 콘텐츠 밀도: 슬라이드당 1개 메시지, 짧은 문구 > 문장, 문단 금지. 단, 카드 본문은 2~3줄로 충분히 채울 것
- batch_design: 배치당 최대 25개 연산
- 이미지: Pencil G() 연산으로만 생성
- **Pencil MCP 필수**: Step 2~3은 절대 생략 불가. 모든 슬라이드는 Pencil에서 디자인 후 React로 변환. 직접 React 작성 금지.

**테마 특정 (폰트·허용 스케일·pill 최솟값·색상 팔레트)**: `references/jangpm/theme-rules.md`의 "폰트 / 허용 스케일 / Pill 최솟값" 참조.

## 콘텐츠 품질 규칙

- **KPI 슬라이드**: 구체적 숫자를 사용한다 (예: "78%", "$2.4B"). 약어/추상적 표현 지양 (예: "ROI 향상" → "ROI 340%"). 숫자 + 설명 + 보조 데이터 포인트로 밀도 있게 구성
- **비교 주제**: 양측에 동일한 깊이와 분량으로 구성한다. 한쪽만 상세하고 다른 쪽이 빈약하면 안 됨
- **프로세스 슬라이드**: 모든 단계를 균등한 분량으로 설명한다. 초반 단계만 상세하고 후반이 간략하면 안 됨
- **긴 텍스트 레이블**: `comparison` 카드에서 레이블이 6자 이상이면 fontSize를 한 단계 축소 (title → body)
- **카드 본문 밀도**: 카드 안에 제목만 넣지 말고, 반드시 3~4줄 설명 텍스트 포함. **키워드 나열이 아닌 설명형 문장으로 작성** — 읽는 것만으로 개념을 이해할 수 있는 완성된 문장을 사용한다 (예: "코드 리뷰 자동화" → "역할별 전문 에이전트를 직접 만들 필요 없이 검증된 플러그인을 가져와 브레인스토밍부터 코드 리뷰까지 자동화하세요")
- **불릿 리스트**: 최소 5~6개 항목으로 구성. 4개 이하는 허전함. 각 항목에 설명 1~2줄 추가
- **3/4단 카드 fill 규칙 (HARD RULE)** ⚠️: 3단(grid-cols-3) 또는 4단(grid-cols-4) 카드 레이아웃의 각 카드는 다음 중 **하나 이상** 포함 필수:
  1. **아이콘/배지**: SVG 아이콘, 원형 번호 배지(`rounded-full`), 이니셜 배지
  2. **태그/pill**: `rounded-full` 태그 1개 이상 (상단 또는 하단)
  3. **불릿 목록 4~5줄**: `<ul>` 또는 `<li>` 또는 bullet div 4개 이상
  - 제목+짧은 본문(2줄)만 있는 카드는 **공백 카드**로 판정 → 반드시 위 3가지 중 하나 추가

## 시각적 요소 밀도 규칙 (v3 강화) ⚠️ HARD RULE

**핵심 원칙: 빈 공간보다 요소가 많아야 한다.** 텍스트를 늘리는 것이 아니라 시각적 구성 요소(태그, 뱃지, 구분선, 보조 KPI, accent 바, 아이콘)를 추가하여 슬라이드를 풍성하게 채운다.

**슬라이드당 최소 시각 요소 수 (React div/span 기준):**
- 콘텐츠 슬라이드: **최소 15개** div/span 요소 (카드 컨테이너 + 텍스트 + 아이콘 + 태그 + 구분선 등)
- KPI 슬라이드: 메인 숫자 + 보조 KPI 2~3개 + 프로그레스 바 + 컨텍스트 텍스트 + 출처 + **카테고리 태그**
- 전환 슬라이드(Key Statement, Quote 등): **최소 10개** 요소
- 커버/클로징: **최소 10개** 요소 (태그 + 타이틀 + 부제 + 메타 + 장식 요소)

**모든 콘텐츠 슬라이드에 필수 보조 요소 (HARD RULE)** ⚠️:
1. **상단 메타 영역**: 메인 헤딩과 **같은 줄(flex-row) 또는 하단**에 카테고리 태그/뱃지 1개 배치. **헤딩 위(위쪽)에 별도 div로 카테고리 라벨 금지** — supertitle은 시각적 흐름을 분산시킨다.
2. **하단 인사이트 바 (50%+ 슬라이드에 적용)**: 슬라이드 하단에 핵심 테이크어웨이 문장 + accent 하이라이트. 형태: `bg-[var(--surface-alt)]` 풀와이드 바에 인사이트 텍스트
3. **카드 내부 보조 요소**: 아이콘 + 제목 + 본문 + **하단 태그 또는 수치 뱃지** (예: "ROI 340%" 뱃지, "2025 Q1" 태그)
4. **구분선/accent 바**: 섹션 간 시각적 구분을 위한 얇은 라인 또는 accent 색상 바

**전환 슬라이드 밀도 강화** ⚠️:
- Key Statement: 카테고리 태그 + 메인 문장 + accent 구분선 + 부제/설명 + 출처 + 하단 보조 태그 3개
- Quote: 인용부호(SVG) + 인용문 + accent 구분선 + 이름 + 직책 + 카테고리 태그 2개
- Single KPI: 카테고리 태그 + 라벨 + 숫자 + 프로그레스 바 + 설명 + 보조 KPI 수치

**복합 패턴 권장 (Jangpm):**
- `matrix-trends` + 하단 인사이트 바
- `three-point` + 상단 KPI 숫자
- `comparison` + 하단 요약 row
- `overview-split`: 좌측 요약 + 우측 카드/차트
- `six-point`: 6개 카드로 고밀도 정보 전달
- `kpi-dashboard`: 여러 stat 카드 + 트렌드 인디케이터

**빈 공간 제한 (HARD RULE):**
- 콘텐츠 슬라이드에서 빈 공간이 **15%** 이상이면 보조 요소 추가
- 보조 요소 후보: 태그/뱃지, 보조 KPI, 인사이트 바, 출처 표기, accent 구분선, 데코 도트

**카드 내부 구성 최소 기준:**
- 아이콘/SVG + 제목 + 본문(3~4줄) + **보조 태그 또는 수치 뱃지** (필수)
- 본문이 2줄 이하인 카드는 밀도 부족으로 판정
- **카드 하단에 pill 태그 추가 권장**: `bg-[var(--accent-soft)]` 배경에 `text-[var(--accent-ink)]` 텍스트로 핵심 키워드 1~2개

**슬라이드 레이어링 전략:**
- 각 슬라이드를 3개 레이어로 구성: (1) 헤더 영역(타이틀+태그), (2) 메인 콘텐츠 영역(카드/그리드/비교), (3) 푸터 영역(인사이트 바/출처/보조 정보)
- 2개 레이어만 있는 슬라이드는 밀도 부족 — 3번째 레이어(인사이트 바, 보조 KPI, 출처)를 추가

## references/ 로드 조건

| 파일 | 로드 시점 |
|------|----------|
| `references/jangpm/theme-rules.md` | Step 1 시작 시 (테마 세부 룰) |
| `references/layout-guide.md` | Step 1 시작 시 |
| `references/pencil-workflow.md` | Step 2 시작 시 |
| `references/eval.md` | Step 3에서 get_screenshot 검증 시 |
| `references/pen-to-react.md` | Step 4 시작 시 |
