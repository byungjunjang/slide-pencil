# jangpm — DESIGN.md

> slide-pencil 활성 테마 `jangpm`의 디자인 시스템 통합 사양. **slide-plan 스킬이 입력으로 소비**한다.
>
> 단일 진실 원천(SSOT)은 분야별로 흩어져 있다 — `theme-rules.md`(테마 룰), `layout-guide.md`(레이아웃), `reference/`(원본 MD), `patterns/`(29 HTML). 이 문서는 plan 단계가 한 번에 흡수할 수 있도록 distill한 통합본이다.
>
> 새 테마는 `/theme-init`이 자동 초안을 생성하고 사용자가 검토·확정한다. 기존 jangpm은 본 파일이 수동 백필 (1회 작성).

---

## 1. Visual theme & atmosphere

**감각:** 미니멀 모던 리포트형 (Notion / Linear / Vercel 계열).

- Generous whitespace · 단일 accent · 명확한 타이포 hierarchy
- 슬라이드 = **발표용 문서**. 대시보드 위젯이 아니다 (anti-pattern Rule 18 — SaaS dashboard aesthetic 금지)
- 시각 요소는 정보 전달 수단. 장식 목적의 아이콘·이미지·그라디언트·글로우 금지
- **라이트 모드 전용** (HARD RULE) — dark 배경 슬라이드 절대 금지

**Calibration anchors (자체 평가):**
| Score | Reference |
|---|---|
| 10점 | Notion / Linear 수준 — 여백 풍부, 색 절제, 계층 명확 |
| 8점 | 깨끗한 SaaS intro — 정돈됐지만 덜 다듬어짐 |
| 6점 | 일반 Bootstrap 템플릿 — 작동은 함 |

---

## 2. Palette & contrast behavior

**고정 accent:** `#4633E3` (`var(--accent)`). 덱당 1개. 한 슬라이드당 **1~2회**만 사용. 사용 위치 — 커버, 섹션 브레이크, KPI 숫자, 비교 우측 컬럼, 인라인 키워드 하이라이트.

**컬러 토큰 (모든 색상은 `var(--*)` — 하드코드 hex 금지):**

| Token | Hex | Usage |
|---|---|---|
| `--bg` | `#FAFAF9` | 슬라이드 루트 (warm off-white) |
| `--surface` | `#FFFFFF` | 카드 기본 |
| `--surface-alt` | `#F5F5F4` | 카드 alt, 비주얼 블록 |
| `--text` | `#1A1A1A` | 본문 (순수 `#000` 금지) |
| `--text-secondary` | `#6B7280` | 서브타이틀, 메타 |
| `--text-tertiary` | `#9CA3AF` | 캡션 |
| `--border` | `#E5E7EB` | 1px 구분선 |
| `--border-strong` | `#D4D4D4` | 강한 구분선 |
| `--accent` | `#4633E3` | KPI, 보더, 인라인 강조 |
| `--accent-soft` | `#E8E5FC` | accent 카드 배경, badge |
| `--accent-ink` | `#2E1FB3` | accent-soft 위 텍스트 |

**Semantic colors (데이터 컨텍스트 전용 — 장식 사용 금지):**

| Token | Hex | Use |
|---|---|---|
| `--positive` / `--positive-soft` | `#059669` / `#ECFDF5` | 성장, 긍정 metric |
| `--negative` / `--negative-soft` | `#E11D48` / `#FFF1F2` | 감소, churn 등 부정 metric |
| `--warning` / `--warning-soft` | `#D97706` / `#FFFBEB` | 주의, 리스크 |

**Contrast 규칙:**
- 슬라이드 bg는 `--bg` 또는 `--surface`만. 카드는 `--surface` / `--surface-alt` / `--accent-soft` 셋 중. **dark 배경 금지**
- accent-soft 기본 배경화 금지 (Anti-slop Rule 16) — 희소 자원
- 카드 그리드 ≥ 4개일 때 1개만 `tone="accent"` (시선 앵커). 모두 같은 톤 금지
- accent 카드 슬라이드당 ≤ 1개

---

## 3. Typography hierarchy

**폰트:** Arial 고정 — `'Arial', 'Helvetica Neue', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif`

**시맨틱 클래스 우선.** 하드코드 `text-[Npx]`는 카드 내부 앵커 숫자 등 특수 용도에만.

| Role | Class | Size | Weight | Color Token |
|---|---|---|---|---|
| Display | `.display` | 56px | 800 | `--text` |
| Display-sm | `.display-sm` | 40px | 800 | `--accent` or `--text` |
| Headline (h2) | `.headline` | 32px | 700 | `--text` |
| Title | `.title` | 18.4px | 600 | `--text` |
| Body | `.body` | 15.2px | 400 | `--text` |
| Caption | `.caption` | 12.8px | 500 | `--text-secondary` |
| Label-caption | `.label-caption` | 12.8px | 600 UPPERCASE | `--text-secondary` |

**Letter-spacing:** Display `-0.03em`, Headline `-0.02em`.
**Line-height:** Display `1.08`, Headline `1.2`, Title `1.3`, Body `1.6`, Caption `1.4`.

**허용 fontSize 스케일 (HARD):** {22, 24, 28, 32, 36, 40, 44, 48, 56, 64, 72, 80, 96, 100+}. 외 값 (18, 20, 30, 37 등) 사용 금지.

**절대 최솟값:** **22px** — pill / badge 내부 텍스트 포함. `rounded-full` 또는 tag는 `text-[22px]` 이상 강제.

**`.label-caption` 사용:** 카드 위 카테고리 라벨, 표지 "Speaker · 발표자" 등 **고정 라벨**. h2 위에 supertitle로 배치 금지 (NO supertitle 룰).

---

## 4. Spacing & density

**8px 그리드.** 모든 spacing은 토큰.

| Token | Value | Usage |
|---|---|---|
| `--space-4` | 16px | small gap |
| `--space-6` | 24px | 카드 padding/gap 기본 |
| `--space-8` | 32px | section gap |
| `--space-14` | 56px | 슬라이드 padding |
| `--space-16` | 64px | 슬라이드 bottom padding (GM 영역 확보) |

**카드:**
- radius **12px** (`--card-radius`)
- padding **24px** (`--card-padding`)
- gap **24px** (`--card-gap`)
- `1px solid var(--border)`

**Density rules (HARD RULES — slide-plan과 /slide 양쪽에서 강제):**
- 빈 공간 ≥ 15%면 보조 요소 추가 (태그, 보조 KPI, 인사이트 바, 출처)
- 콘텐츠 슬라이드 React `div`/`span` ≥ 15개
- 카드 내부 ≥ 3 layer (icon/badge + title + body + tag/metric)
- 텍스트 전용 슬라이드 2장 연속까지만 (3장 연속 금지)
- 4+ 카드 또는 고밀도 슬라이드 ≥ 콘텐츠 슬라이드의 **30%** (고밀도 쿼터)

---

## 5. Layout grammar (layout families)

slide-plan의 `recommended_layout_family` 어휘는 아래 **13개**. 각 family는 1~다수의 jangpm 패턴으로 매핑되며, 패턴 ID 결정은 `/slide` 렌더러 책임.

| layout_family | 의도 | 매핑 패턴 (jangpm) |
|---|---|---|
| `cover` | 첫 슬라이드. 첫인상 점수 결정 | 01-title, 13-cover-vertical |
| `section-divider` | 주제 전환. 챕터 경계 | 03-section |
| `agenda` | 덱 구조 미리보기 | 02-agenda |
| `point-grid` | 균일 카드로 N개 요소 병렬 (3~6) | 04-three-point, 04b-four-point, 07b-six-point |
| `kpi-dashboard` | 수치 중심. KPI / stats | 06-stats, 20-kpi-dashboard |
| `comparison` | 두 옵션·항목 비교 | 05-comparison, 19-paired-concept |
| `narrative-split` | 좌측 요약 + 우측 콘텐츠/프로세스 | 14-overview-split, 09-process |
| `tabular` | 표 중심 데이터 | 07-table, 16-forecast-table, 17-pnl, 18-seasonal |
| `matrix` | 2×2 / 트렌드 매트릭스 | 15-matrix-trends |
| `statement` | Key Statement / Quote | 08-quote |
| `exercise` | 워크숍 실습 슬라이드 | 08a-exercise-1up, 08b-exercise-2up |
| `media` | 이미지·터미널 등 풀블리드 미디어 | 22-image-1up, 23-image-2up, 24-terminal-split, 25-terminal-full |
| `summary-closing` | 마무리·체크리스트·요약 | 10-checklist, 11-summary, 12-closing, 21-closing-big |

**Diversity 규칙 (R4 — Lazy 반복 금지):**
- 동일 family 연속 3장 금지 (`section-divider`만 예외 — 챕터 구분 목적)
- 8장 이하: 최소 **3종** / 10장 이상: 최소 **4종**
- `point-grid` / `kpi-dashboard` / `matrix` 중 하나 이상이 콘텐츠 슬라이드의 ≥ 30%에 사용 (고밀도 쿼터)

**리듬:** 고밀도 (`point-grid` 4~6 카드 / `kpi-dashboard` / `tabular`) ↔ 여백 (`statement` / `agenda` / single KPI) 교차.

---

## 6. Header / body / footer structure

**모든 콘텐츠 슬라이드 (커버·섹션·클로징 제외):**

```
┌─ Header — h2 .headline (슬라이드 패딩 직후 첫 번째 텍스트)
│   └─ 태그 필요 시 같은 flex-row 오른쪽 또는 헤딩 하단 (NO supertitle)
├─ Body — slide-body wrapper (flex:1, justify-content:flex-start, padding-top:--space-4)
│   └─ 카드 / 그리드 / 비교 / 표 / 차트
└─ Footer — .gm (Governing Message 1줄, 절대 위치 하단)
```

**NO supertitle (HARD RULE):** h2 위에 별도 `div`로 카테고리 라벨 배치 금지. 헤딩 div보다 JSX 위쪽에 어떤 요소든 있으면 supertitle. 핵심 판단 기준: **헤딩이 JSX 첫 번째여야 함**.

**Governing Message (`.gm`):** 모든 콘텐츠 슬라이드의 `SlideShell` `gm` prop 필수. 1줄 슬라이드 핵심 요약. 커버·섹션·클로징은 생략.

---

## 7. Page flow (Title / Body / End)

| 페이지 종류 | 시각 | 클래스 |
|---|---|---|
| **Title (cover)** | 첫 슬라이드. AI 이미지 또는 대형 타이포. 5요소 최소 — 태그·제목·부제·메타·구분선 | `.slide-centered`, `.display` |
| **Section divider** | 주제 전환. Label(28) + Title(48~56) | `.slide-centered` |
| **Body** | 콘텐츠. 헤더 + 바디 + GM | `.slide-body` |
| **End (closing)** | 마지막 슬라이드. 임팩트 + contact / CTA | `.slide-centered`, `.headline` |

**커버 유형 (덱별 다른 유형 선택 — 5장에서 같은 패턴 반복 금지):**
- **A. Split** → `01-title` 기반: 좌 50% 텍스트 + 우 50% AI 이미지. 제목 56px (`.display`) + accent 태그 + accent 구분선
- **B. Full Bleed** → `01-title` 기반: 전체 AI 이미지 + 단색 오버레이. 제목 56px 중앙 또는 하단
- **C. Bold Typography** → `13-cover-vertical` 기반: 흰 배경 + accent 컬러 대형 타이포 1~2단어. 이미지 없이 타이포가 주인공
- **D. Accent Block** → `13-cover-vertical` 기반: 좌측 accent 컬러 블록(30%w) + 우측 제목/부제목
- **E. Diagonal Split** → `01-title` 기반: 대각선 분할 이미지 + 텍스트 영역

---

## 8. Chart / table treatment

slide-plan의 `chart_strategy` / `table_strategy`는 아래 **수사적 역할 어휘**를 사용한다. 시각 구현은 jangpm boilerplate가 책임.

### 차트 수사적 역할 9종 + custom

| Strategy | 의미 | 매핑 패턴 (jangpm) |
|---|---|---|
| `growth-trend` | 단일 시계열 성장. 한 metric의 시간 흐름 | layout-17 Data+Insight, 단일 시리즈 |
| `forecast` | 과거 실측 + 미래 예측 (시각적 구분) | layout-17 + dashed line / 16-forecast-table |
| `structural-break` | 성장률 변곡·단절 강조 | matrix-trends 또는 분할 라인 |
| `focus-comparison` | 카테고리 비교에서 1개 하이라이트 | 06-stats + 1개 accent 강조 |
| `distribution` | 산점·버블 분포 (두 축) | custom CSS/SVG |
| `quadrant` | 2×2 분면 (BCG, growth-share) | 15-matrix-trends |
| `priority-matrix` | 3×3 우선순위 (시급성×중요도) | custom matrix |
| `split-segment` | stacked / grouped 구성 비율 | 17-pnl, 18-seasonal |
| `funnel` | 깔때기 (TAM/SAM/SOM) | custom |
| `custom` | 위 어휘 못 잡는 케이스. 자유 description 허용 | — |

**모든 차트 슬라이드 R2 의무:** `chart_strategy` + `chart_takeaway` **모두** plan에 채워야 함. 차트만 있고 인사이트 텍스트 없는 슬라이드는 plan 단계에서 거부.

**차트 색상 룰:**
- accent `#4633E3` 단일 hue + opacity 변형 (`0.85` / `0.6` / `0.4` / `0.25`). **다중 hue 금지**
- 차트 컨테이너 height **400px** (단일 차트 슬라이드). 320px 금지
- `Chart.defaults.animation = false`
- Chart.js config 안에서 CSS 변수(`var(--accent)`) 사용 금지 — `rgba()` 직접 작성

### 테이블 룰 (07/16/17/18 패턴)

- **비교 테이블은 winner 1개 컬럼** `col-recommended` (accent-soft 배경) — 동등 가중치 금지 (Rule 18 SaaS dashboard 회피)
- 헤더에 subtitle / stat 추가 (밀도)
- binary feature는 ✓/✗ SVG 아이콘 (이모지 금지)
- 하단 verdict / summary row 권장
- table 슬라이드도 R2 의무 — `table_strategy` + `table_takeaway` 모두 필수

---

## 9. Icon system

- **Bare line icons만:** Lucide 또는 인라인 SVG, `stroke="currentColor"`, `stroke-width="2"`
- 원형 wrapper / 배경 박스 금지 (SaaS dashboard 안티패턴)
- 카드 그리드 기본은 line icon. 순서가 핵심 정보일 때만 number badge (`01`–`04`, accent)
- 아이콘 + 숫자 배지 mix 권장
- **이모지·유니코드 장식 기호** (`→`, `✓`, `★`, `▪` 등) **절대 금지** — 인라인 SVG로 대체
- 데이터 컨텍스트의 trend indicator는 semantic color (`var(--positive)`, `var(--negative)`)

---

## 10. Anti-patterns

`reference/anti-slop.md`의 **18 forbidden patterns** 단일 진실 원천. plan 단계와 /slide Step 4 양쪽에서 self-check.

| # | Rule | 핵심 |
|---|---|---|
| 1 | No floating gradient orbs | radial-gradient + blur 금지 |
| 2 | No rainbow / gradient borders | linear-gradient border 금지 |
| 3 | No headline gradient text | text gradient clip 금지 |
| 4 | No hover scale / translateY | 정적 슬라이드, hover 애니메이션 금지 |
| 5 | No glow effects | 컬러 box-shadow 다중 hue 금지 |
| 6 | No decorative animations | float, pulse keyframe 금지 |
| 7 | No decorative partial borders | `border-l-*`, `border-t-*` 컬러 스트립 금지 |
| 8 | Avoid inline styles | 허용 목록 외 `style="..."` 금지 |
| 9 | No hardcoded HEX | 모든 컬러 토큰 참조 |
| 10 | (Removed) | 텍스트 전용 슬라이드 자체는 허용 |
| 11 | No uncontrolled text density | `max-width` 없는 8+ 불릿 금지 |
| 12 | No inconsistent spacing | margin 핵 대신 grid `gap` |
| 13 | No decorative-only images | 콘텐츠 설명 아닌 이미지 금지 |
| 14 | No `position: relative` on slide section | Reveal.js 충돌 |
| 15 | No card-first layouts | rule line + 텍스트 블록 우선 |
| 16 | No `accent-soft` as default bg | 희소 자원, max 1~2회/슬라이드 |
| 17 | No decorative semantic colors | positive/negative/warning은 데이터 의미일 때만 |
| 18 | No SaaS dashboard aesthetics | stat widget, icon badge wrapper 금지 |

**Slide-level self-check (slide-plan에서 강제):**
- supertitle 없음 (헤딩 위 별도 div 라벨 금지)
- 1280×720 영역 안 (오버플로우 없음)
- 콘텐츠 슬라이드 GM 1줄 포함
- 모든 색상 `var(--*)` 토큰
- 이모지·유니코드 장식 기호 0개

### Anti-pattern 19 (v0.2 — Density Underflow): min lines 미달 = 시각 디테일 부족 ⚠️

**금지 패턴:**
- plan의 `min_lines_estimate`보다 실제 TSX 줄 수가 적은 슬라이드 (B-density FAIL)
- plan의 `required_primitives` 중 하나라도 TSX에서 grep되지 않음
- plan에 `chart_data.series[].values`가 12 포인트인데 React에서 SVG path 2줄짜리 시뮬로 축소
- 차트 슬라이드인데 끝점 라벨·축 그리드·인사이트 카드·교차점 마커 없이 path만 있는 경우

**문제:** v0.1 dual mode 결과가 master 분량의 51%로 압축된 핵심 원인. plan은 콘텐츠 명세, React는 디자인 표현이지만 plan의 압축 표현(`content_blocks[].content_instruction`)을 그대로 React에 복붙하면 시각 디테일이 무너진다.

**기대 강제력:**
- master Slide11 차트 = 148줄 (12 포인트 데이터 + xOf/yOf 헬퍼 + Y축 그리드 5줄 + X축 라벨 + 끝점 마커 + 끝점 라벨 + 교차점 점선 + 교차점 마커 + 인사이트 카드 2개 + 격차 박스)
- master Slide03 메타포 = 99줄 (3-카드 grid + 적토마 SVG + 등호 SVG + 하네스 SVG + 카드별 라벨/제목/본문 + 하단 인사이트 바)
- v0.2 plan은 이 수준을 강제. /slide Step 4가 plan의 chart_data를 보고 "12 포인트 → 12 포인트 React 배열" 옮기고, required_primitives에 `Card`가 있으면 import해서 사용해야 한다.

**복구:** B-density FAIL 발생 시 fail된 슬라이드를 master Slide{NN}.tsx (있으면) 또는 같은 layout_family의 master 수준 reference를 보고 재작성. plan의 압축 표현을 그대로 옮기지 말 것.

---

## Appendix — slide-plan ↔ jangpm 매핑 빠른 참조

slide-plan이 채워야 할 슬라이드별 필드 → jangpm 자산:

| Plan field | 매핑 |
|---|---|
| `recommended_layout_family` | §5의 13개 family 어휘 |
| `chart_strategy` | §8의 9종 + custom |
| `core_message` | h2 (`.headline`) 텍스트 |
| `audience_takeaway` | `.gm` 텍스트 |
| `content_blocks[].block_type` | `title` → `.headline` / `bullets` → `.body` ul / `chart` → §8 / `metric_cards` → `kpi-dashboard` family / `callout` → `.accent-badge` 또는 accent 카드 / `quote` → `statement` family |
| `evidence_sources` | 카드 내부 출처 caption 또는 GM 옆 메타 |
| `must_not_include` | §10 anti-patterns 위반 항목 자동 추가 |
