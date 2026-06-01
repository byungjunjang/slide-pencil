# Layout Contract 활용 가이드

## 컬러 팔레트 (전체 허용 색상)

모든 슬라이드는 아래 팔레트 내에서만 색상을 사용한다. **슬라이드 컴포넌트는 하드코드 hex가 아니라 `var(--*)` 토큰으로 참조한다** (CLAUDE.md HARD RULES). 이 테이블의 hex 값은 `src/index.css` THEME 블록의 실제 토큰 값과 동기화되어 있으며, 디버깅·디자인 참조용이다.

| 역할 | 토큰 | 값 | 사용 위치 |
|------|------|-----|----------|
| **슬라이드 배경** | `var(--bg)` | `#FAFAF9` | 모든 슬라이드 루트 (warm off-white) |
| **카드 배경 (기본)** | `var(--surface)` | `#FFFFFF` | 카드, 컬럼 기본 |
| **카드 배경 (대안)** | `var(--surface-alt)` | `#F5F5F4` | 비주얼 블록, 그룹 영역 |
| **구분선 / 테두리** | `var(--border)` | `#E5E7EB` | 구분선, 타임라인 라인, 테이블 경계, 카드 1px 보더 |
| **구분선 (강조)** | `var(--border-strong)` | `#D4D4D4` | 더 강한 구분선 |
| **본문 텍스트** | `var(--text)` | `#1A1A1A` | 제목, 카드 제목, 본문 (순수 블랙 금지) |
| **뮤트 텍스트** | `var(--text-secondary)` | `#6B7280` | 부제목, 메타, 설명, 날짜 |
| **Tertiary 텍스트** | `var(--text-tertiary)` | `#9CA3AF` | 캡션, 주석 |
| **액센트** | `var(--accent)` | `#4633E3` | KPI 숫자, 보더, 태그, 타임라인 도트 |
| **액센트 (연한 배경)** | `var(--accent-soft)` | `#E8E5FC` | accent 카드 배경, badge 배경 |
| **액센트 (진한)** | `var(--accent-ink)` | `#2E1FB3` | accent 카드 위 텍스트 |

**금지:** 그라디언트(`from-*`, `to-*`) 금지. 커스텀 hex 추가 금지. dark 배경 금지 (라이트 모드 전용, HARD RULE) — 슬라이드 루트는 `var(--bg)`만 허용.

---

## Layout Contract 요약

아래 레이아웃 카탈로그(`layout-01`~`layout-32`) 중 슬라이드 유형에 맞는 것을 선택한다.

### 개폐 슬라이드

| ID | 의도 | 구조 | 사용 시점 |
|----|------|------|----------|
| layout-01 | Cover (중앙 정렬) | CenterStack: Title(64-200) + Subtitle(64-96) + Meta(36-48) | 첫 슬라이드 |
| layout-02 | Bold Cover (좌측 정렬) | 좌측 텍스트만: pill 태그 + Title(80-120, 최대 3줄) + accent 구분선 + Subtitle(32-40) + Meta(22px). 우측 별도 영역 없음 | 첫 슬라이드 (대안) |
| layout-20 | Closing | CenterStack: Headline(48-56) + Sub(28) + Contact(24) | 마지막 슬라이드 |

### 구분/전환

| ID | 의도 | 구조 | 사용 시점 |
|----|------|------|----------|
| layout-03 | Section Break | Center: Label(28, 뮤트) + Title(48-56) | 주제 전환 |
| layout-04 | Key Statement | Center: Statement(36-48, 최대 2줄) | 핵심 메시지 강조 |

### 콘텐츠 + 비주얼

| ID | 의도 | 구조 | 사용 시점 |
|----|------|------|----------|
| layout-05 | Concept+Visual | 2col(50/50): 좌=Title+Body+불릿 4개 / 우=비주얼 영역 (3가지 유형 중 선택) | 개념 설명 + 시각 자료 |
| layout-06 | Concept+Visual (미러) | 2col(50/50): 좌=비주얼 영역 / 우=Title+Body+불릿 4개 | layout-05의 미러 버전 |
| layout-14 | Hero Image | FullBleed: 오버레이 Title + Subtitle | 시각적 임팩트 |

### 비교/나열

| ID | 의도 | 구조 | 사용 시점 |
|----|------|------|----------|
| layout-07 | 3 Pillars | 3col: 각 Visual+Label(36)+Desc(20) | 세 가지 요소 병렬 |
| layout-08 | Compare 2 | 2col: 각 Heading(48-64)+Points(28, 4~5개)+하단 KPI 숫자 2개 필수 | 두 가지 비교 |
| layout-15 | Matrix 4 | 2x2: 각 Heading(48)+Desc(28) | 네 가지 요소 |
| layout-16 | Icon Row | Row(3-4): 각 Icon+Label(28)+Desc(28) | 기능/특성 나열 |
| layout-18 | Before/After | 2col+Arrow: 좌=Before(뮤트) / 우=After(강조) | 변화 비교 |
| layout-19 | List | Stack: Title(80) + Items(28, 3-5개) | 목록 나열 |

### 데이터/KPI

| ID | 의도 | 구조 | 사용 시점 |
|----|------|------|----------|
| layout-09 | Single KPI | CenterStack: Label(28) + Number(120-200) + Context(28) | 핵심 수치 1개 |
| layout-10 | Two KPIs | 2col: 각 Number(80-120)+Label(28) | 핵심 수치 2개 |
| layout-11 | Three KPIs | 3col: 각 Number(64-80)+Label(28) | 핵심 수치 3개 |
| layout-17 | Data+Insight | Stack: Chart(~60%H) + Insight(28, Bold) | 차트 + 핵심 인사이트 |

### 인용/프로세스

| ID | 의도 | 구조 | 사용 시점 |
|----|------|------|----------|
| layout-12 | Quote | 상단=h2(64px, 슬라이드 주제 헤딩) + 중앙=인용구(36-48px, 이탤릭) + 하단=Attribution(28px) | 인용문 강조 |
| layout-13 | Process | Row(3-5 Steps): 각 Icon/Number+Label(28)+Desc(28) | 순서/단계 |

### 고밀도 레이아웃 (R4 추가)

| ID | 의도 | 구조 | 사용 시점 |
|----|------|------|----------|
| layout-21 | Cards+KPI Combo | 2col: 좌=2~3 카드 스택 / 우=KPI 숫자+차트 영역 | 데이터+설명 병행 |
| layout-22 | 2×3 Grid | 6col(2행×3열): 각 Icon+Title(36)+Desc(28) | 6개 요소 나열 |
| layout-23 | Stats+List | Stack: 상단=3 KPI 카드 Row / 하단=불릿 리스트 또는 설명 텍스트 | KPI+상세 정보 |
| layout-24 | Dense Compare | 2col: 각 Heading(44)+불릿 5~6개+하단 KPI 숫자 | 깊이 있는 비교 |
| layout-25 | Timeline | 가로 또는 세로 타임라인: 연도/날짜 라벨 + 이벤트 제목(36px) + 설명(28px), 3~6개 노드 | 연혁·로드맵·마일스톤 |

### v4 추가 패턴

| ID | 의도 | 구조 | 사용 시점 |
|----|------|------|----------|
| layout-26 | Numbered Cards | 2×2 그리드: 각 카드 = 번호 배지(01-04, accent) + pill 태그 + Title(44) + Desc(28, 2줄) **[고밀도]** | 4개 항목을 순서·번호와 함께 강조 (Matrix 4보다 구조화된 카드 필요 시) |
| layout-27 | Data Table | 상단 h2 + 풀와이드 테이블: thead(dark bg) + tbody(5~8행, 4~6열, 교대 배경) + 하단 인사이트 바 선택 **[고밀도]** | 비교 데이터, 순위표, 피처 매트릭스 |
| layout-28 | Diagram | 상단 h2 + 중앙 다이어그램. **진짜 다이어그램(아키텍처/플로우/시퀀스/ER/타임라인/스윔레인/트리 등)은 `.codex/skills/diagram-design/` 그래머를 따라 inline SVG로 작성** (타입별 레이아웃·복잡도 예산·taste gate). 단순 흐름은 Pencil batch_design / Mermaid도 가능. 색=`var(--accent)` 등 토큰, 폰트=Arial 고정 | 시스템 구조, 워크플로우, 의사결정 흐름 전용 슬라이드 |
| layout-29 | Goal Breakdown | 2열 그리드 (2~4 카드): 각 카드 = 배지 + Title(44) + 구분선 + 불릿 3개(28px) **[고밀도]** | 목표·전략·이니셔티브를 항목별로 분해할 때. Compare 2보다 리스트 중심 |
| layout-30 | Comparison Table | 피처 비교 테이블: 좌측 기능명 컬럼 + 2~4개 옵션 컬럼(추천 1개 accent 헤더) + 각 셀 ✓/✗ 아이콘 **[고밀도]** | 제품/서비스 옵션 비교, 솔루션 선택 근거. Dense Compare보다 체계적인 ✓/✗ 매트릭스 |
| layout-31 | Chart | 상단 h2 + 메인 차트 영역(CSS/SVG 막대 또는 선형, 70%H) + 하단 인사이트 캡션(bold, 1~2줄) | 시계열 데이터, 카테고리 비교 전용. layout-17은 차트+인사이트 카드 조합이고, layout-31은 차트가 주인공 |
| layout-32 | Code Explain | 2col: 좌=코드 블록(dark bg, monospace, 구문 강조) / 우=설명 카드(제목+불릿 3~4개) | 기술 프레젠테이션 전용. API 사용법, 코드 패턴 설명 |

---

## layout-05/06 비주얼 영역 유형 (3가지 중 선택)

layout-05와 layout-06의 우측(또는 좌측) 비주얼 영역은 아래 3가지 유형 중 하나를 명시적으로 선택한다.

| 유형 | 구조 | 적합 콘텐츠 |
|------|------|------------|
| **A. 다이어그램형** | 박스+화살표 흐름도, 아키텍처 구조, 계층도 | 시스템·프로세스 설명 |
| **B. 스탯 박스형** | 3~4개 KPI 숫자 카드 스택 (#F4F4F5 배경) | 수치 강조, 데이터 기반 슬라이드 |
| **C. 이미지형** | Pencil G() AI 이미지로 채운 영역 | 감성적 임팩트, 커버 대안 |

선택한 유형을 TSX 코드 주석에 명시: `{/* 비주얼: A. 다이어그램형 */}`

---

## layout-25 Timeline 상세

**목적:** 연혁, 로드맵, 마일스톤, 제품 출시 일정처럼 시간 순서가 있는 정보.

**구조 A — 가로 타임라인 (3~5개 노드):**
```tsx
{/* 상단: h2 헤딩 (태그 없음) */}
{/* 중앙: 가로 라인 + 노드 점 + 날짜 + 제목 + 설명 */}
<div className="flex flex-row items-start gap-0 relative">
  {/* 연결선 */}
  <div className="absolute top-[20px] left-0 right-0 h-[3px] bg-[var(--border)]" />
  {nodes.map(node => (
    <div className="flex-1 flex flex-col items-center gap-[16px]">
      <div className="w-[40px] h-[40px] rounded-full bg-[var(--accent)] z-10" />
      <span className="text-[24px] font-[700] text-[var(--accent)]">{node.date}</span>
      <p className="text-[32px] font-[800] text-center">{node.title}</p>
      <p className="text-[26px] font-[400] text-[var(--text-secondary)] text-center">{node.desc}</p>
    </div>
  ))}
</div>
{/* 하단: 인사이트 바 */}
```

**구조 B — 세로 타임라인 (4~6개 노드, 더 많은 텍스트):**
```tsx
<div className="flex flex-col gap-0">
  {nodes.map((node, i) => (
    <div className="flex flex-row gap-[40px] items-start">
      {/* 좌측: 날짜 + 점 + 라인 */}
      <div className="flex flex-col items-center w-[160px] flex-shrink-0">
        <span className="text-[24px] font-[700] text-[var(--accent)]">{node.date}</span>
        <div className="w-[16px] h-[16px] rounded-full bg-[var(--accent)] my-[8px]" />
        {i < nodes.length-1 && <div className="w-[2px] flex-1 bg-[var(--border)]" />}
      </div>
      {/* 우측: 콘텐츠 카드 */}
      <div className="flex-1 bg-[var(--surface-alt)] rounded-[20px] p-[32px] mb-[20px]">
        <p className="text-[36px] font-[800]">{node.title}</p>
        <p className="text-[28px] font-[400] text-[var(--text-secondary)]">{node.desc}</p>
      </div>
    </div>
  ))}
</div>
```

## 슬라이드 톤(Tone) 메타데이터

모든 슬라이드는 **light 모드**만 사용한다. dark 배경 슬라이드 금지.

| 톤 | 정의 | 해당 레이아웃 예시 |
|----|------|-----------------|
| `light` | 흰색 배경 (#FFFFFF) | 대부분의 콘텐츠 슬라이드, Cover, Closing, Section Break |
| `neutral` | 카드 기반 (슬라이드 bg는 white, 카드들이 #F4F4F5) | Compare, Matrix 4, Before/After, 고밀도 레이아웃 |

### 톤 리듬 규칙 ⚠️

1. **dark 배경 슬라이드 금지:** 슬라이드 전체 배경을 #111 등 어두운 색으로 쓰지 않는다. bg-white 또는 bg-[#F9F9F9] 만 허용.
2. **accent 카드는 허용:** 슬라이드 내부 카드 1개를 bg-[var(--accent)]로 강조하는 것은 허용. 슬라이드 전체 bg가 아닌 카드 수준에서만.
3. **리듬은 밀도로 조절:** dark/light 대비 대신 고밀도(4+카드) ↔ 여백(Key Statement, Quote) 슬라이드 교차로 리듬감 확보.
4. **예시 좋은 리듬 (12장 덱):**
   - `light(cover) → light(key) → light(section) → neutral(matrix) → light(concept) → neutral(compare) → light(section) → neutral(stats) → light(process) → neutral(grid) → light(kpi) → light(closing)`

---

## 다양성 규칙

1. **동일 레이아웃 최대 2회:** 같은 layout type을 덱 내에서 2번까지만 사용
2. **연속 동일 금지:** 같은 Layout Contract를 연달아 사용하지 않는다
3. **최소 4종 (10장+):** 10장 이상 덱에서 최소 4가지 다른 레이아웃 사용 (8장 이하는 3종)
4. **리듬감:** 밀도 높은 슬라이드(07, 15, 16) 사이에 여백 슬라이드(03, 04, 09) 배치
5. **개폐 임팩트:** 첫 슬라이드(01/02)와 마지막 슬라이드(20)는 감정적 임팩트 중시
6. **덱 간 다양성:** 이전에 생성한 덱과 레이아웃 시퀀스를 반복하지 않는다. Compare(08), Before/After(18), Quote(12), Icon Row(16) 등을 적극 활용

## 레이아웃별 텍스트 가이드

| Layout | 레이블 글자 수 | 권장 fontSize |
|--------|-------------|-------------|
| layout-08 Compare | ≤6자 | 48-64px |
| layout-08 Compare | >6자 | 44px |
| layout-13 Process | ≤4자 Label | 28px |
| layout-13 Process | >4자 Label | 24px (뱃지 예외 적용) |

## 슬라이드 수별 추천 구성

### 8장 구성 — 고임팩트 전략 (infoDesign 3.0 목표) ⚠️

8장 덱은 개폐 슬라이드(1번+8번)가 구조를 점유하므로, 중간 6장에 고임팩트 레이아웃을 집중 배치해야 infoDesign 3.0을 달성할 수 있다.

**핵심 원칙:** Matrix 4 또는 Concept+Visual을 필수 포함. Before/After나 Quote를 내러티브 피봇으로 활용. Safe한 3 Pillars + List + Process 조합만으로는 2.5 이상이 어렵다.

**8장 고임팩트 구성 A (분석형):**
1. layout-14 또는 layout-02 (Hero / Bold Cover) `light`
2. layout-04 (Key Statement — 핵심 주장) `light`
3. layout-15 (Matrix 4 — 2×2 구조 분석) `neutral`
4. layout-18 (Before/After — 변화 대비) `neutral`
5. layout-05 (Concept+Visual — 핵심 개념+이미지) `light`
6. layout-11 (Three KPIs — 임팩트 수치) `light`
7. layout-12 (Quote — 내러티브 전환) `light`
8. layout-20 (Closing) `light`

**8장 고임팩트 구성 B (실행형):**
1. layout-01 (Cover + AI 이미지) `light`
2. layout-09 (Single KPI — 핵심 숫자 1개) `light`
3. layout-13 (Process — 실행 단계) `light`
4. layout-15 (Matrix 4 — 전략 매핑) `neutral`
5. layout-08 (Compare 2 — 옵션 비교) `neutral`
6. layout-16 (Icon Row — 실행 도구) `light`
7. layout-12 (Quote — 입증) `light`
8. layout-20 (Closing) `light`

**8장 기본 구성 (예비 — 고임팩트 구성이 주제에 맞지 않을 때):**
1. layout-01 (Cover)
2. layout-07 (3 Pillars — 개요)
3. layout-05 (Concept+Visual)
4. layout-19 (List)
5. layout-06 (Concept+Visual 미러)
6. layout-09 (Single KPI)
7. layout-04 (Key Statement)
8. layout-20 (Closing)

### 12장 구성
1. layout-01 (Cover)
2. layout-04 (Key Statement — 문제 제기)
3. layout-03 (Section Break)
4. layout-07 (3 Pillars)
5. layout-05 (Concept+Visual)
6. layout-19 (List)
7. layout-03 (Section Break)
8. layout-06 (Concept+Visual 미러)
9. layout-15 (Matrix 4)
10. layout-09 (Single KPI)
11. layout-12 (Quote)
12. layout-20 (Closing)

### 12장 대안 A (비교 주제)
1. layout-02 (Bold Cover)
2. layout-03 (Section Break)
3. layout-08 (Compare 2)
4. layout-05 (Concept+Visual)
5. layout-16 (Icon Row)
6. layout-18 (Before/After)
7. layout-03 (Section Break)
8. layout-19 (List)
9. layout-11 (Three KPIs)
10. layout-12 (Quote)
11. layout-04 (Key Statement)
12. layout-20 (Closing)

### 12장 대안 B (프로세스 주제)
1. layout-01 (Cover)
2. layout-04 (Key Statement)
3. layout-13 (Process)
4. layout-05 (Concept+Visual)
5. layout-15 (Matrix 4)
6. layout-03 (Section Break)
7. layout-06 (Concept+Visual 미러)
8. layout-16 (Icon Row)
9. layout-09 (Single KPI)
10. layout-18 (Before/After)
11. layout-12 (Quote)
12. layout-20 (Closing)

### 15장 구성 (표준 강의/보고서형)

1. layout-01 (Cover)
2. layout-04 (Key Statement — 문제 제기)
3. layout-03 (Section Break — Part 1)
4. layout-05 (Concept+Visual)
5. layout-07 (3 Pillars)
6. layout-15 (Matrix 4) ← 고밀도
7. layout-03 (Section Break — Part 2)
8. layout-08 (Compare 2)
9. layout-18 (Before/After)
10. layout-22 (2×3 Grid) ← 고밀도
11. layout-03 (Section Break — Part 3)
12. layout-11 (Three KPIs)
13. layout-13 (Process)
14. layout-12 (Quote)
15. layout-20 (Closing)

### 15장 대안 A (데이터 중심)

1. layout-02 (Bold Cover)
2. layout-09 (Single KPI — 핵심 숫자)
3. layout-03 (Section Break)
4. layout-17 (Data+Insight)
5. layout-08 (Compare 2)
6. layout-24 (Dense Compare) ← 고밀도
7. layout-03 (Section Break)
8. layout-15 (Matrix 4) ← 고밀도
9. layout-05 (Concept+Visual)
10. layout-23 (Stats+List) ← 고밀도
11. layout-03 (Section Break)
12. layout-16 (Icon Row)
13. layout-10 (Two KPIs)
14. layout-04 (Key Statement)
15. layout-20 (Closing)

### 20장 구성 (심층 분석/제안서형)

1. layout-01 (Cover)
2. layout-04 (Key Statement — 핵심 주장)
3. layout-03 (Section Break — Chapter 1)
4. layout-05 (Concept+Visual)
5. layout-07 (3 Pillars)
6. layout-19 (List)
7. layout-15 (Matrix 4) ← 고밀도
8. layout-03 (Section Break — Chapter 2)
9. layout-08 (Compare 2)
10. layout-18 (Before/After)
11. layout-06 (Concept+Visual 미러)
12. layout-24 (Dense Compare) ← 고밀도
13. layout-03 (Section Break — Chapter 3)
14. layout-11 (Three KPIs)
15. layout-17 (Data+Insight)
16. layout-22 (2×3 Grid) ← 고밀도
17. layout-25 (Timeline — 로드맵/연혁)
18. layout-13 (Process)
19. layout-12 (Quote)
20. layout-20 (Closing)

이 구성은 예시이며, 주제에 따라 자유롭게 조합한다. 다양성 규칙만 준수할 것. 이전 덱에서 사용한 시퀀스를 반복하지 말 것.

## Pencil 노드 매핑 원칙

| Layout 요소 | Pencil 노드 |
|------------|------------|
| Title | `{type: "text", fontSize: 80~200, fontWeight: "800"}` |
| Body | `{type: "text", fontSize: 36~48, fontWeight: "400"}` |
| Card/Column | `{type: "frame", layout: "vertical"/"horizontal", gap: N, padding: N, fill: "색상", cornerRadius: N}` |
| 2col/3col Grid | 부모 `{layout: "horizontal", gap: 40}` + 자식 `{width: "fill_container"}` |
| Icon | `{type: "frame", width: 72, height: 72, fill: "#000", cornerRadius: 36}` + 내부 텍스트 |
| Image | `{type: "frame"}` + `G(nodeId, "ai"/"stock", "prompt")` |
| Tag/Badge | `{type: "frame", fill: "#000", cornerRadius: 20, padding: [8,16]}` + `{type: "text", color: "#fff"}` |
