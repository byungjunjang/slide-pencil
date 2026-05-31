# slide_plan.json 스키마

slide-plan의 출력 JSON 사양. `output/{slug}/slide_plan.json`에 저장된다. `/slide`가 Step 1.0에서 이 파일을 감지·소비.

> 가이드 §Layer 2 스키마 + slide-pencil 활성 테마(jangpm) 어휘. preset이 바뀌면 `recommended_layout_family` 어휘만 변경.

## 최상위 구조

```json
{
  "deck_meta": { ... },
  "design_dependency": { ... },
  "story_arc": { ... },
  "content_inventory": [ ... ],
  "slides": [ ... ],
  "ordering_notes": { ... }
}
```

---

## deck_meta

| 필드 | 타입 | 의미 |
|---|---|---|
| `working_title` | string | 작업 제목. 사용자 brief에서 추출 또는 LLM 제안 |
| `deck_goal` | string | 청중이 가져가야 할 한 줄 결과 |
| `deck_type` | enum | `consulting` / `educational` / `report` / `sales` / `internal_update` / `proposal` / `keynote` / `unknown` |
| `target_audience` | string | 청중 정의 |
| `tone` | string | 톤 (formal / friendly / data-driven 등) |
| `target_length` | object | `{ slides: number, reasoning: string }` |
| `language` | string | `ko` / `en` |

---

## design_dependency

| 필드 | 타입 | 의미 |
|---|---|---|
| `preset_name` | string | `jangpm` (slide-pencil 현재 활성) |
| `design_md_path` | string | `.claude/skills/slide/references/jangpm/DESIGN.md` |
| `allowed_layout_families` | string[] | DESIGN.md §5의 13개 family ID |
| `consistency_notes` | string[] | 사용자 brief의 디자인 제약 (예: "차트 슬라이드 ≥ 3장") |

---

## story_arc

| 필드 | 타입 | 의미 |
|---|---|---|
| `narrative_shape` | string | 자연어. 예: "BLI 변형 — 결론 먼저, 근거 3개, 비교 1개, 실행안" |
| `why_this_order_is_persuasive` | string | 청중·목적에 맞는 시퀀스 사유 |

---

## content_inventory

사용자 파일·brief·inference로부터 추출한 정보 풀. 슬라이드별 `evidence_sources`가 이 풀의 source_id를 참조.

```json
[
  {
    "source_id": "src-001",
    "source_type": "file" | "prompt" | "inference",
    "summary": "Q3 매출 데이터 (엑셀)",
    "relevance": "high" | "medium" | "low",
    "usable_for": ["evidence", "kpi"]
  }
]
```

**파일 없을 때 처리:** `inference` 모드. `summary`에 LLM 추론임을 명시. 슬라이드별 `evidence_sources`에 `["inference"]` 또는 `["common-knowledge"]` 사용.

---

## slides[] — 슬라이드별 plan

```json
{
  "slide_number": 1,
  "slide_role": "cover",
  "page_family": "title" | "body" | "end" | "appendix",
  "working_title": "AI 에이전트 도입 가이드",
  "core_message": "AI 에이전트는 6개월 내 50% 생산성 향상 가능",
  "audience_takeaway": "오늘 발표의 결론 한 줄",
  "why_here": "왜 다른 위치가 아니라 이 시점에 등장하는지",
  "recommended_layout_family": "cover",
  "recommended_pattern_id": "01-title",
  "min_lines_estimate": 60,
  "required_primitives": ["SlideShell", "AccentBadge"],
  "content_blocks": [
    {
      "block_type": "title",
      "purpose": "메인 제목",
      "content_instruction": "Bold 56px, accent 태그 1개, AI 이미지 우측"
    },
    {
      "block_type": "subtitle",
      "purpose": "부제",
      "content_instruction": "발표 일자 + 발표자 메타"
    }
  ],
  "chart_strategy": null,
  "chart_takeaway": null,
  "chart_data": null,
  "table_strategy": null,
  "table_takeaway": null,
  "lead": {
    "type": "chart",
    "carries": "evidence",
    "what_it_proves": "이 비주얼이 core_message의 무엇을 증명/설명하는지 한 줄"
  },
  "content_constraints": {
    "must_include": ["AI 이미지 (우측 50%)", "accent 태그 1개"],
    "must_not_include": ["supertitle", "그라디언트", "이모지"],
    "evidence_to_use": ["src-001", "src-003"]
  },
  "priority": "must" | "should" | "could"
}
```

### 필드 의무 룰

**모든 슬라이드 필수:**
- `slide_number` (정수, 1부터)
- `slide_role` (slide-roles.md enum)
- `page_family` (`title` / `body` / `end` / `appendix`)
- `core_message` (Layer 1 R1 — **빈 값 금지**)
- `audience_takeaway` (Layer 1 R1 — 빈 값 금지)
- `why_here` (Layer 1 R1 — 빈 값 금지)
- `recommended_layout_family` (Layer 1 R1 — DESIGN.md §5의 13개 중 하나)
- `recommended_pattern_id` (Layer 1 R6 — DESIGN.md §5 매핑 표의 구체 패턴 ID 1개. 예: `01-title`, `04b-four-point`, `14-overview-split`, `19-paired-concept`)
- `min_lines_estimate` (Layer 1 R6 — 이 슬라이드 TSX 최소 줄 수 추정. 차트 ≥ 100, 일반 콘텐츠 ≥ 60, 섹션·클로징 ≥ 40, 커버 ≥ 60)
- `required_primitives` (Layer 1 R6 — slide-system.tsx 프리미티브 사용 의무 목록. 배열. 예: `["SlideShell", "SectionHeader", "Card", "AccentBadge", "RuleLine"]`)
- `content_blocks` (≥ 1개)
- `content_constraints.evidence_to_use` (Layer 1 R5 — 빈 배열 금지. 파일 없으면 `["inference"]`)

**chart-led 슬라이드 (`recommended_layout_family` = chart 포함 family):**
- `chart_strategy` 필수 (chart-rhetoric.md enum)
- `chart_takeaway` 필수 (Layer 1 R2)
- `chart_data` 필수 (Layer 1 R2 — 6 데이터포인트 이상). 차트가 SVG path 시뮬에 그치는 것을 막기 위한 강제 데이터 명세

**table-led 슬라이드 (`recommended_layout_family: tabular`):**
- `table_strategy` 필수
- `table_takeaway` 필수 (Layer 1 R2)

### `block_type` enum

| block_type | 의미 |
|---|---|
| `title` | 슬라이드 제목 (h2 .headline) |
| `subtitle` | 부제 |
| `bullets` | 불릿 목록 |
| `chart` | 차트 영역 |
| `table` | 표 영역 |
| `callout` | accent 카드 / 강조 박스 |
| `quote` | 인용문 |
| `metric_cards` | KPI 카드 그리드 |
| `icon_group` | 아이콘 + 라벨 그룹 |
| `infographic` | 다이어그램·그림 |
| `diagram_flow` | 프로세스 흐름도 |
| `footer_note` | 출처·메타 정보 |

### `chart_data` 스키마 (D — 차트 슬라이드 필수)

차트 슬라이드는 SVG path 2줄 시뮬에 그치지 않고 **실제 데이터 배열**을 plan 단계에서 정의해야 한다. /slide Step 4에서 이 데이터를 그대로 React 차트(SVG path + 헬퍼)로 옮긴다.

```json
"chart_data": {
  "type": "two-line-cross-over" | "single-line-trend" | "bar-comparison" | "stacked-bar" | "scatter" | "matrix-2x2" | "matrix-3x3" | "funnel" | "forecast-dashed" | "custom",
  "x_axis": {
    "label": "주차",
    "values": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  },
  "y_axis": {
    "label": "산출 품질",
    "min": 0,
    "max": 100
  },
  "series": [
    {
      "name": "기도 메타",
      "values": [35, 50, 56, 58, 60, 60, 61, 60, 62, 61, 62, 62],
      "tone": "muted"
    },
    {
      "name": "빌드 메타",
      "values": [18, 28, 42, 58, 70, 78, 84, 88, 91, 93, 95, 96],
      "tone": "accent"
    }
  ],
  "annotations": [
    { "type": "cross-over", "x": 4, "label": "교차점 W4" },
    { "type": "endpoint-label", "series": "빌드 메타", "value": 96 }
  ]
}
```

**필수 룰 (B-r2 검증):**
- `chart_strategy != null`이면 `chart_data != null` 필수 (둘 다 채우거나 둘 다 null)
- `chart_data.series[].values.length` 최소 수는 type-aware (chart-rhetoric.md 데이터포인트 최소 수 표):
  - 시계열 (`single-line-trend`, `two-line-cross-over`, `forecast-dashed`): 시리즈당 **≥ 6**
  - 카테고리 비교 (`bar-comparison`, `stacked-bar`): 시리즈당 **≥ 4**
  - 분포·매트릭스 (`scatter`, `matrix-2x2`, `matrix-3x3`): 포인트 **≥ 4** (matrix-3x3은 ≥ 9 권장)
  - 깔때기 (`funnel`): 단계 **≥ 3**
  - `custom`: 자유 (단, plan 작성자가 reasoning 명시)
- `type`은 chart-rhetoric.md의 9종 strategy별 권장 형식과 정합

**테이블 슬라이드는 `table_strategy` + `table_takeaway`로 충분** (chart_data 미적용).

### `lead` 스키마 (A — '비주얼=근거', optional)

**P1 대원칙:** 콘텐츠 슬라이드의 지배 요소는 비주얼이고, GM/제목은 그 비주얼이 **무엇을 증명/설명하는지** 말하는 캡션이다. `lead`는 그 비주얼-근거 바인딩을 **명시적으로** 선언하는 **선택 필드**다. `/slide`는 모르는 필드를 무시하므로 안전하게 추가 가능.

```json
"lead": {
  "type": "chart" | "table" | "diagram" | "image" | "infographic" | "metric" | "statement" | "number" | "quote",
  "carries": "evidence" | "explanation",
  "what_it_proves": "이 비주얼이 core_message의 무엇을 증명(evidence)/설명(explanation)하는지 한 줄"
}
```

- `type` — 이 슬라이드를 지배하는 lead 요소의 종류. `statement`/`number`/`quote`도 1급 lead(차트만 lead가 아니다).
- `carries` — `evidence`(데이터로 증명) 또는 `explanation`(개념을 설명). 둘 중 하나.
- `what_it_proves` — lead가 core_message에 대해 무엇을 입증/해명하는지 한 줄.

**R7 검증 (validate_plan.py, WARN — warn-then-gate):**
- `lead`가 있으면 `type` enum / `carries` enum / `what_it_proves` 비어있지 않음을 검사(위반 시 warn).
- `lead`가 없어도 차트·테이블은 `chart_takeaway`/`table_takeaway`(R2)로 이미 근거가 바인딩됨 → 통과.
- `lead`가 없고 **지배형 비주얼 블록**(`image` / `infographic` / `diagram_flow`)만 있으면 "근거 역할 미선언" warn — `lead`로 바인딩 권장.
- 선언된 `lead.type`이 ≥ 3장인데 1종뿐이면 **lead 다양성** warn(C).
- 전 항목 **WARN**. P5 측정·어휘 확보 후 hard 승격은 열린 결정(`PIPELINE_UPDATE_PLAN.md` §6).

---

## ordering_notes

```json
{
  "split_topics": ["주제 X는 슬라이드 4와 5로 분할"],
  "merged_topics": ["주제 Y와 Z는 슬라이드 7로 병합"],
  "deferred_topics": ["주제 W는 appendix로 이동"],
  "appendix_candidates": ["디테일 데이터 표"]
}
```

---

## 검증 (slide-plan SKILL.md Step 7에서 실행)

JSON 출력 직전 self-check:

- [ ] R1 — 모든 슬라이드의 4개 필드 (core_message, audience_takeaway, why_here, recommended_layout_family) 비어있지 않음
- [ ] R2 — 모든 chart-led 슬라이드 `chart_strategy` + `chart_takeaway` + `chart_data` **3개 모두** 채워짐. `chart_data.series[].values.length >= 6`
- [ ] R2 — 모든 table-led 슬라이드 `table_strategy` + `table_takeaway` 둘 다 채워짐
- [ ] R3 — 슬라이드 수 ≤ 20 (초과 시 split / merge / defer 검토 결과 ordering_notes에 기록)
- [ ] R4 — 같은 layout_family 연속 3장 이상 없음 (section-divider 예외)
- [ ] R4 — 8장 이하 ≥ 3종 / 10장 이상 ≥ 4종 layout_family 사용
- [ ] R4 — point-grid / kpi-dashboard / matrix 중 1종 이상이 콘텐츠 슬라이드의 ≥ 30%
- [ ] R5 — 모든 슬라이드 `evidence_sources` 비어있지 않음
- [ ] **R6 — 모든 슬라이드의 `recommended_pattern_id` (DESIGN.md §5 매핑 표 안), `min_lines_estimate` (차트 ≥100, 일반 ≥60, 섹션·클로징 ≥40), `required_primitives` (≥1개) 채워짐**
- [ ] R7 (advisory/WARN) — '비주얼=근거': 지배형 비주얼(image/infographic/diagram_flow) 슬라이드는 `lead{carries, what_it_proves}` 권장. `lead` 선언 시 enum 정합. lead.type 한 종류로 쏠리지 않음
- [ ] design_dependency — `allowed_layout_families`가 DESIGN.md §5의 13개 어휘 안에서

위반 시 plan을 수정하고 재검증. 사용자에게 거부 사유 보고 가능.

---

## 출력 산출물

```
output/{slug}/
├── slide_plan.json          # 위 스키마
└── slide_plan.summary.md    # 사용자 검토용 markdown 요약 (슬라이드별 1줄)
```

`slide_plan.summary.md` 형식:

```markdown
# {working_title} — Plan Summary

**Type:** {deck_type} | **Audience:** {target_audience} | **Length:** {N}장 | **Tone:** {tone}

## Story arc
{narrative_shape}

## Slides
1. **[cover]** {core_message} — {recommended_layout_family}
2. **[context]** {core_message} — {recommended_layout_family}
3. **[insight]** {core_message} — {recommended_layout_family}
   - chart: {chart_strategy} → {chart_takeaway}
...

---
**확정:** 사용자가 이 요약을 검토 후 confirm하면 `/slide` 호출.
```
