# Jangpm 테마 룰

활성 테마(`jangpm`)의 슬라이드 제작 세부 룰. `/slide` 스킬이 Step 1 시작 시 반드시 이 파일을 로드한다. `/theme-init` 실행 시 이 파일이 새 테마의 `theme-rules.md`로 교체된다.

## 커버 슬라이드 기본 전략

커버 슬라이드는 첫인상(1.5점 배점) 점수를 직접 결정한다. 기본으로 고임팩트 커버를 사용한다.

- **AI 이미지 기본 사용:** `G(imageFrame, "ai", "...")` 연산으로 커버에 이미지 생성. 텍스트만인 커버는 지양
- **타이포 실험 허용:** 커버 제목은 100~200px 범위에서 대담하게 사용. 단어 1~2개 + 부제목 조합
- **액센트 컬러 강조:** 커버에서 accent 컬러가 시각적으로 눈에 띄어야 함 (버튼, 선, 하이라이트 등)
- **덱별 차별화:** 매 덱의 커버가 다른 느낌이어야 함. 같은 레이아웃 패턴 반복 금지
- **`layout: "none"` 필수:** 커버 슬라이드 프레임은 항상 `layout: "none"` (→ pencil-workflow.md 참조)

커버 유형 예시 (매 덱에서 다른 유형 선택):

> **패턴 매핑:** `title`(중앙 정렬)은 B/E 유형에 적합. `cover-vertical`(세로 강조)은 C/D 유형에 적합. A 유형은 `title` 기반으로 좌우 분할 커스텀.

- **A. Split Cover** → `title` 기반: 좌측 50% 텍스트 + 우측 50% AI 이미지. 제목 56px (`.display`), accent 태그 + accent 구분선
- **B. Full Bleed** → `title` 기반: 전체 AI 이미지 + 단색 오버레이. 제목 56px 중앙 또는 하단 배치
- **C. Bold Typography** → `cover-vertical` 기반: 흰색 배경, accent 컬러 대형 타이포 1~2단어. 이미지 없이 타이포가 주인공
- **D. Accent Block** → `cover-vertical` 기반: 좌측에 accent 컬러 블록(30%w) + 우측에 제목/부제목
- **E. Diagonal Split** → `title` 기반: 대각선으로 분할된 이미지 + 텍스트 영역

**커버 내부 최소 요소**: accent 태그(pill) + 제목 + 부제목 + 메타(날짜/슬라이드 수) + accent 구분선 또는 장식 요소 = 최소 5요소

## 액센트 컬러 전략

- **덱당 1개 accent 컬러** (모노크롬 + 1 accent)
- **사용 위치:** 커버(배경/텍스트 블록), 섹션 브레이크(타이틀), KPI 숫자, Before/After 우측 컬럼, 비교 차트 강조, **텍스트 레벨 하이라이트**
- **텍스트 레벨 하이라이트**: 핵심 키워드나 구문에 accent 컬러 배경 하이라이트(bg + 흰색/검정 텍스트) 또는 볼드+컬러로 **단어/구문 단위** 강조. 박스/카드 단위가 아닌 인라인 수준에서 시선을 끄는 방식. 타이틀, 클로징 인사이트, Key Statement에서 특히 효과적
- **고정 컬러:** #4633E3 (모든 덱에서 동일하게 사용)

### 인라인 강조 의무 (HARD RULE) ⚠️

**본문이 균일한 회색이면 안 된다.** 모든 콘텐츠 슬라이드에서 핵심 키워드·수치·결론어를 **인라인으로 강조**해 시선의 위계를 만든다. KPI 숫자나 헤딩만 강조하고 본문·GM·카드 설명이 전부 `text-secondary` 회색 한 톤이면 밋밋(flat)하다.

- **무엇을 강조하나:** 각 텍스트 블록(본문·카드 설명·GM)에서 **그 문장의 핵심 1~2개** — 수치(`78%`, `9개월`), 결론어(`운영 단계`, `최단`), 대비어(`아니라`, `먼저`) 등. 문장 전체를 강조하지 않는다(강조가 흔해지면 강조가 아니다).
- **강조 수단 (둘 중 하나, 또는 병행):**
  - **accent 컬러**: `text-[var(--accent)]` — 핵심 수치·결론어 (슬라이드당 accent 인라인 1~3회, accent 카드/KPI와 합산해 과하지 않게)
  - **bold weight**: `font-[700]` 이상 — accent를 아끼고 싶을 때 같은 색에서 굵기로 위계
- **GM(.gm)**: governing message의 **핵심 구절**은 bold 또는 accent로 — GM이 회색 한 톤이면 약하다.
- **하지 말 것:** 본문 전체 bold(위계 소실), accent 남용(슬라이드당 accent 이벤트 ≤ 2~3 유지, anti-slop Rule 16), 회색 한 톤 본문.

**React 예시 (토큰만):**
```tsx
{/* ❌ flat — 전부 한 톤 회색 */}
<p className="body text-[var(--text-secondary)]">고객지원은 6개월 회수로 ROI가 가장 빠르다.</p>

{/* ✅ 핵심 수치·결론어 인라인 강조 */}
<p className="body text-[var(--text-secondary)]">
  고객지원은 <span className="font-[700] text-[var(--accent)]">6개월</span> 회수로 ROI가
  <span className="font-[700] text-[var(--text)]"> 가장 빠르다</span>.
</p>
```

**PPTX 변환:** 위 `<span>` 강조는 매니페스트에서 `runs` 배열로 옮긴다(`references/pptx-build.md` "인라인 강조 runs" 룰) — `content` 한 문자열로 합치면 강조가 사라진다.

## 폰트 웨이트 + 크기 기준표

시맨틱 클래스 사용을 권장. 하드코드는 예시/특수 용도에 한해 허용.

| 역할 | 클래스 | fontSize | fontWeight | 색상 토큰 |
|------|--------|----------|-----------|----------|
| 커버 타이틀 (대형) | `.display` | 56px | 800 | `--text` |
| 섹션/커버 대형 타이틀 | — | 44–56px | 800 | `--text` |
| 섹션 제목 (h2) | `.headline` | 32px | 700 | `--text` |
| KPI 대형 숫자 | `.display-sm` | 40px | 800 | `--accent` 또는 `--text` |
| 카드 제목 (앵커 텍스트) | — | 20–24px | 800 | `--text` |
| 카드 서브 타이틀 | `.title` | 18.4px | 600 | `--text` |
| 본문 / 불릿 | `.body` | 15.2px | 400 | `--text` |
| 뮤트 설명 | `.body` + `text-secondary` | 15.2px | 400 | `--text-secondary` |
| 메타 / 날짜 / 라벨 | `.caption` | 12.8px | 500 | `--text-secondary` |
| 카테고리 라벨 (UPPERCASE) | `.label-caption` | 12.8px | 600 | `--text-secondary` |
| pill / 태그 | `.body` (Pill 컴포넌트) | 15.2px | 600 | `--accent-ink` on `--accent-soft` |
| 코드 | `.mono` | 0.9em | 400 | `--text` |

**`.label-caption` 보충 (UPPERCASE letter-spacing 0.05em):** 카드 위 카테고리 라벨, 표지 "Speaker · 발표자"처럼 **고정 라벨**에 사용. 본문(`.caption`)과 다른 점은 텍스트가 항상 짧고 분류적이라는 것. h2 위에 supertitle로 배치하지 말 것 (NO supertitle 룰).

**하드코드 허용 예외:** 커버 초대형 배경 숫자·장식 텍스트(200~260px), 숫자 앵커(24~32px).

## 카드 내부 구성 규칙

**카드는 빈 껍데기가 아니다.** 모든 카드 내부에 최소 3개 요소를 포함하여 밀도감과 완성도를 확보한다.

**카드 최소 구성 (HARD RULE)** ⚠️:
- **아이콘/비주얼** (상단 또는 인라인): SVG 아이콘, 원형 번호, 이니셜 배지, 색상 도트 중 1개
- **제목** (bold, 36-48px): 핵심 메시지 1줄
- **본문** (28-32px, 2-3줄): 구체적 설명 또는 데이터

**카드 강화 요소** (필수는 아니지만 적극 권장):
- **KPI 숫자** (56-72px, bold): 카드 상단이나 좌측에 큰 숫자로 시각적 앵커
- **pill 태그** (22-24px, rounded-full): 카테고리/상태 표시, 카드 상단 우측
- **인사이트 바**: 카드 하단에 1줄 요약 — 다른 배경색(accent 또는 연한 회색)
- **진행률 바**: 숫자와 함께 시각적 비율 표현
- **구분선**: 카드 내부 섹션을 나눌 때 1px 라인

**안티 패턴 (금지):**
- 제목만 있는 빈 카드 (아이콘+본문 없이 제목만)
- 모든 카드가 동일한 내부 구조 (변화를 줄 것)
- 카드 내부에 문단 (3줄 초과 텍스트)

## 헤드 메시지 표준화 규칙

**모든 콘텐츠 슬라이드(커버·클로징 제외)의 메인 헤딩은 동일한 규격을 유지한다.**

- **크기**: `.headline` 클래스 또는 `text-[32px] font-[700]` — 덱 내에서 하나의 사이즈로 통일
- **굵기**: `font-bold` (font-weight: 700) 필수
- **위치**: 슬라이드 상단 고정 — 슬라이드 패딩 직후 첫 번째 텍스트 요소
- **NO supertitle (HARD RULE)**: 헤딩 **위에** 소형 카테고리 라벨(22~32px) 별도 div 배치 금지. 카테고리 태그가 필요하면 헤딩과 같은 flex-row(flex items-center gap-4)로 헤딩 **오른쪽** 또는 헤딩 **하단**에 배치.

**올바른 헤더 구조 (React — 토큰 사용):**
```tsx
{/* 헤딩 + 태그가 같은 행에. 하드코드 hex 금지, 토큰만 사용 */}
<div className="flex items-center gap-[16px] mb-[32px]">
  <h2 className="headline text-[var(--text)] leading-tight">슬라이드 제목</h2>
  <span className="text-[22px] bg-[var(--accent)] text-[var(--surface)] rounded-full px-[20px] py-[8px]">태그</span>
</div>
```

**금지 패턴 (pill/badge 포함 모두 금지):**
```tsx
{/* ❌ flex-col 스택에서 heading 위에 어떤 요소도 금지 */}
<div className="flex flex-col gap-[16px]">
  <div className="rounded-full bg-[var(--text)] text-[var(--surface)]">카테고리</div>  {/* ❌ heading 위 pill */}
  <h2 className="headline">슬라이드 제목</h2>
</div>

{/* ✅ 올바른 패턴: flex-row로 나란히 */}
<div className="flex flex-row items-center gap-[16px]">
  <h2 className="headline">슬라이드 제목</h2>
  <div className="rounded-full bg-[var(--text)] text-[var(--surface)] text-[22px]">카테고리</div>  {/* ✅ 헤딩 오른쪽 */}
</div>
```

**핵심 판단 기준:** 헤딩 div보다 먼저(JSX 위쪽에) 어떤 요소든 위치하면 supertitle이다. 이를 피하려면 카테고리 태그를 항상 헤딩 JSX 다음에 배치하거나 flex-row로 나란히 배치한다.

## 폰트 / 허용 스케일 / Pill 최솟값

- **폰트**: Arial 고정 (`'Arial', 'Helvetica Neue', sans-serif`)
- **최소 fontSize**: 28px. 단, `rounded-full` pill/badge 컨테이너 **안에** 있는 텍스트는 22px 허용. **절대 최솟값: 22px** — 배지 내부 아이콘 텍스트, 스텝 번호, 약어 텍스트 등 모든 경우에 22px 미만 금지.
- **허용 스케일만 사용**: {22, 24, 28, 32, 36, 40, 44, 48, 56, 64, 72, 80, 96, 100+}. 이 집합 외의 값(18px, 20px, 30px, 37px 등) 사용 금지.
- **pill/tag 최솟값 강제 (HARD RULE)** ⚠️: `rounded-full` 또는 tag 형태의 텍스트는 반드시 `text-[22px]` 이상. 20px 이하 절대 금지. 올바른 예: `<span className="text-[22px] font-[600] rounded-full px-[12px] py-[4px]">태그</span>`
- **색상 팔레트**: 2~3 코어 + 중립색, 고대비 필수. 라이트 모드 전용.
  - 슬라이드 배경: `bg-[var(--bg)]` (`#FAFAF9` warm off-white) — `SlideShell`이 기본 적용
  - 카드 배경: `bg-[var(--surface)]` (흰색) / `bg-[var(--surface-alt)]` (`#F5F5F4`) / `bg-[var(--accent-soft)]` (accent 카드)
  - **하드코드 hex 금지.** 모든 색상은 `var(--*)` 토큰 참조. 토큰 이름 계약은 `.claude/skills/theme-init/references/theme-replacement-map.md` 참조

## 그림자 / 엘리베이션 (sparse)

3곳 동기화 룰(`.claude/skills/theme-init/references/theme-replacement-map.md`)에 따라 CLAUDE.md·`slide/SKILL.md`와 동일한 그림자 정책을 단일 진실 원천으로 명시한다.

- **3단계만 사용**: `shadow-sm` / `shadow-md` / `shadow-lg` (`src/index.css` THEME 토큰 `--shadow-sm/md/lg`, 계열 `0 1px 2px` / `0 2px 8px` / `0 8px 24px`). 임의 그림자 값 금지.
- **sparse 적용**: KPI·데이터 강조 카드 등 **시선 앵커에만**. 일반 카드는 1px hairline 보더로 구분하고 그림자 없음.
- **그라디언트 / 글로우 금지 (HARD RULE)**: 깊이는 그림자 3단계로만 표현. `from-*`/`to-*` 그라디언트·glow·3D 금지.

## 공통 취향 규칙 (warn → gate, P3)

> **상태: warn.** "취향을 규칙으로" 옮기되 어휘가 쌓일 때까지 **경고로만** 운영한다(warn-then-gate). 측정(P5) 후 일부를 hard로 승격한다(→ 열린 결정). 겹치는 항목은 `reference/anti-slop.md`의 해당 Rule을 단일 진실 원천으로 본다.

**P1 비주얼=근거 (대원칙):** 콘텐츠 슬라이드의 **지배 요소는 비주얼**(차트·다이어그램·근거형 이미지·표)이고, GM/제목은 그 비주얼이 **무엇을 증명하는지** 말하는 캡션이다("action title + chart proof"). 비주얼이 설명·증거를 담지 않고 장식에 그치면 warn. 기획 단계 강제는 slide-plan **R7**(`check_slide_r7_visual_evidence_binding`)에서 수행.

1. **카드-row = '구성'이 아니다 (card-row, should):** 3~4개 동등 카드를 한 줄로 줄세우는 것을 **기본 레이아웃으로 쓰지 않는다**. `<Card>` 프리미티브든 생짜 `<div className="rounded-[12px] border ...">` 그리드든 **동일하게 적용**(카드-row는 컴포넌트가 아니라 *구성*의 문제). 구분은 rule-line/여백을 우선하고, 카드는 **담을 이유가 있을 때만**(metric·비교·callout). → anti-slop Rule 15.
2. **step-flow 필러 금지:** 의미 없는 번호 스텝/쉐브론 프로세스 바를 칸 채우기로 쓰지 않는다. 진짜 순서/플로우라면 `diagram-design`의 flow/sequence/timeline으로 그린다. → anti-slop Rule 18.
3. **장식 비주얼·사진 단독 금지:** 이미지는 내용을 **설명·증명**해야 한다. 배경 장식 이미지나 의미 없는 추상 사진을 단독으로 배치하지 않는다. → anti-slop Rule 13.
4. **한 메시지당 불릿 ≤ 3:** 하나의 헤드/카드 아래 불릿은 **3개 이하**. 4개 이상이면 묶거나 슬라이드를 분할한다. → anti-slop Rule 11.
5. **여백 ≥ 30%:** 콘텐츠가 1280×720을 빈틈없이 채우지 않는다. 빈 영역을 **의도적으로** 남겨 시선의 호흡을 만든다. 데이터/카드로 캔버스를 가득 메우면 warn.
6. **우상단 공백:** 헤드/메타 외에 **우상단 모서리에 무게를 싣지 않는다**. 비워서 시선 진입점과 여백 리듬을 확보한다.

이 규칙들의 warn→hard 승격 시점은 P5 측정·어휘 확보 후 결정한다(열린 결정).

## Hybrid 다중 프리미티브 구성 (HARD RULE) ⚠️

> slide-html·slide-svg 리뷰에서 이식. slide-pencil의 "밀도·완결성 부족"의 핵심 원인은 본문 슬라이드가 **`헤딩 + 카드 그리드` 단일 구성**으로 끝나는 것이었다. 형제 파이프라인은 본문을 **2~3개 프리미티브의 조합**으로 강제한다.

**본문 콘텐츠 슬라이드의 기본형 = 2~3 프리미티브 조합.** `헤딩 + 동등 카드 N개`만으로 끝나는 슬라이드를 **기본 구성으로 쓰지 않는다**(→ anti-slop Rule 19). 조합 = (지배 비주얼/리스트) + (보조 해석) + (하단 결론 띠).

**권장 Hybrid 조합 (예시):**

| 조합 | 구성 |
|---|---|
| `chart-led + takeaway-stack` | 차트(좌 ~60%) + 인사이트 `Card` 2~3개(우) + 하단 결론 띠(`surface-alt` 한 줄) |
| `ruled-list + anchor-stat` | `RuledList`(좌, hairline 목록) + `MetricBar` 앵커 1개(우) |
| `matrix + readout` | 매트릭스/2×2(좌) + 분면 해석 `Card`(우, 1개 accent) |
| `table + verdict` | 비교표 + winner 컬럼(accent-soft) + 하단 verdict 행 |
| `kpi-row + insight-band` | `MetricBar` 3개(progress+trend+comparator) + 하단 인사이트 띠 |
| `columns + footnote` | `RuledColumns`(세로 hairline 분할) + 출처/메타 각주 |

**카드 그리드는 *2차* 도구다.** 진짜로 N개 동등 항목을 담아야 할 때만(metric·비교·callout). 그 외엔 `RuledList`/`RuledColumns`(hairline 에디토리얼)나 Hybrid 조합을 우선한다.

## 변형 영감 (Variation Inspirations) — 슬라이드마다 ≥1개 적용 ⚠️

> "compose, don't copy." 같은 layout family라도 매 슬라이드 아래 변형 중 **최소 1개를 적용**해 템플릿 반복을 깬다. 같은 변형을 3회 이상 반복 금지. 비표준 변형 비율 ≥ 50% 목표.

- **kpi-dashboard:** ① 1개 KPI만 `MetricBar` mega(`display`급) lead, 나머지 작게 ② 모든 KPI에 `TrendArrow` ↑↓ ③ 4-column 대신 `1+3` 비대칭 ④ 카드 안 inline progress bar(`MetricBar percent`) ⑤ 하단에 비교 컨텍스트 띠("vs 전년/업계평균")
- **point-grid:** ① `RuledList`(hairline)로 카드 박스 제거 ② 1개 카드만 `tone="accent"` + 위에 `NumberBadge` ③ hero 카드(2×) + 작은 카드 3개 bento ④ 각 카드에 SVG 아이콘 + 하단 pill ⑤ 2×2 대신 좌측 요약 + 우측 4행 `RuledList`
- **comparison:** ① winner 컬럼 accent-soft + verdict 행 ② before/after 색상 분할 ③ `RuledColumns`(세로 hairline)로 박스 제거 ④ 각 항목 ✓/✗ SVG + 가중 점수 ⑤ 중앙 vs 축 + 양쪽 비대칭 강조
- **narrative-split:** ① 좌 요약 + 우 `RuledList` ② 좌 mega-`MetricBar` + 우 본문 ③ 좌 다이어그램 + 우 해석 카드 ④ 좌 인용(`statement`) + 우 근거 3 ⑤ 60/40 비대칭
- **tabular:** ① winner 컬럼 강조 + 하단 verdict ② 행마다 미니 progress bar ③ 헤더에 stat 추가 ④ 1행만 accent-soft 강조 ⑤ 표 + 우측 핵심 `MetricBar`
- **matrix:** ① 좌하단 밀집 영역 accent-soft 음영 ② 분면 라벨 4개 + 대표 점 강조 ③ 매트릭스 + 우측 readout 카드 2개 ④ 사분면별 카운트 배지 ⑤ 대각선 trend 화살표
- **statement:** ① 핵심 구절 accent 인라인 ② 좌측 accent bar + 큰 인용부호 SVG ③ 하단 출처 + 보조 stat 3 ④ 한 단어만 `display` 초대형 ⑤ 인용 + 우측 근거 `MetricBar`

## 카드 micro-data-viz (#4, 권장) 

KPI/stat 카드가 **'큰 숫자 + 라벨' 한 톤이면 얇다.** `MetricBar` 프리미티브로 채운다:
- `percent` → 6px accent progress 바 (비율 시각화)
- `trend="up|down|flat"` → semantic color 추세 화살표(`TrendArrow`)
- `context` → **비교 컨텍스트 줄**("vs 업계평균 3.2%", "전년 +12%p") — *카드 하단 밀도의 핵심*. stat 카드는 비교 기준선 한 줄을 **반드시** 포함.

```tsx
<MetricBar value="78%" label="엔터프라이즈 도입률" percent={78} trend="up" context="vs 2024년 63% · +15%p" accent />
```

## Hairline 에디토리얼 프리미티브 (#5) — 카드 그리드의 대안

카드 박스 대신 **1px 라인으로 구성한 리포트 텍스처**. 목록·열 비교를 카드 없이 표현해 SaaS 대시보드 느낌을 피하고 "문서/리포트" 완결성을 만든다.
- `RuledList` — eyebrow + hairline으로 구분된 `label : body` 행. 3~6개 항목 목록에 카드 그리드 대신 사용.
- `RuledColumns` — eyebrow + 세로 1px 라인으로 분할한 N개 열. 2~4개 항목 병렬 비교에 사용.

```tsx
<RuledList eyebrow="3대 동인" items={[
  { label: 'LLM 추론 성능', body: '멀티스텝 추론·도구 사용이 실용 수준 도달', accent: true },
  { label: '도구·MCP 생태계', body: '표준 프로토콜로 통합 비용 하락' },
  { label: '토큰 비용 하락', body: '상시 운영 경제성 확보' },
]} />
```
