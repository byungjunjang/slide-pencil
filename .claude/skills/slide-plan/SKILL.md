---
name: slide-plan
description: 슬라이드 기획 두뇌. 사용자 brief + DESIGN.md를 받아 슬라이드별 사유(core_message·why_here)·증거 매핑·차트 수사적 역할이 박힌 slide_plan.json을 생산. /slide의 선택적 prerequisite — plan json이 있으면 /slide가 자체 planning을 스킵하고 plan을 그대로 렌더링한다. Trigger on "/slide-plan", "슬라이드 기획", "deck plan", "체계적으로 슬라이드 만들어".
---

# /slide-plan — 슬라이드 기획 스킬

활성 테마(jangpm)의 디자인 사양을 따라 사용자 brief를 **structured plan**(`slide_plan.json`)으로 변환한다. `/slide`가 이 plan을 소비해 렌더링하면 슬라이드별 사유·증거 추적성·차트-takeaway 일체화가 강제된다.

## 사용 모드

slide-pencil은 **dual mode**:

| 모드 | 트리거 | 흐름 |
|---|---|---|
| **간단** | `/slide` 직접 호출 | `/slide` Step 1이 자체 planning |
| **체계적** | `/slide-plan` → `/slide` | `slide_plan.json` 생성 + 검토 → `/slide`가 Step 1.0에서 감지·소비 |

체계적 모드를 권장하는 경우:
- 외부 보고용 (consulting / report / proposal / sales)
- 30+ 장 deck
- 사용자 파일(엑셀·MD·PDF)이 있어 evidence 추적이 필요한 경우
- 차트 슬라이드 ≥ 3장
- 사용자가 슬라이드별 사유·논리를 직접 검토하고 싶을 때

간단 모드면 충분한 경우:
- 내부 브레인스토밍·아이디어 정리
- 8~12장 표준 educational deck
- 빠른 첫 draft

---

## 보편 규율 (Layer 1) — HARD RULES

> 가이드 §Layer 1 박제. 워크OS 3개 슬라이드 프로젝트 공통.

### R1. 슬라이드별 사유 출력 의무

모든 슬라이드는 4개 필드를 **빈 값 없이** 채워야 함:
- `core_message` — 이 슬라이드의 단일 주장
- `audience_takeaway` — 청중이 가져갈 한 줄
- `why_here` — 왜 다른 위치가 아니라 여기인지
- `recommended_layout_family` — DESIGN.md §5의 13개 어휘 중 하나

### R2. 차트 / 표 슬라이드의 strategy + takeaway + data 일체화 (v0.2)

- chart-led 슬라이드 → `chart_strategy` + `chart_takeaway` + **`chart_data` (시리즈당 ≥ 6 포인트)** 셋 다 필수
- table-led 슬라이드 → `table_strategy` + `table_takeaway` 둘 다 필수
- 차트만 있고 인사이트 텍스트 없거나, chart_data 없거나, 데이터 6개 미만인 슬라이드는 plan 단계에서 거부
- 의도: SVG path 2줄 시뮬에 그치는 worktree v0.1 회귀 방지 (master Slide11 수준의 12 포인트 + 끝점 라벨 + 인사이트 카드 강제)

### R3. 분량 압박

- 사용자가 명시 안 하면 **default 8~12장**
- 20장 넘기면 split / merge / defer 후보를 한 번 더 점검 (`ordering_notes`에 기록)
- "tighter deck > bloated deck"

### R4. Lazy 반복 금지

- 같은 `recommended_layout_family` 연속 3장 이상 금지 (`section-divider` 예외)
- 8장 이하: 최소 3종 / 10장 이상: 최소 4종 layout_family 사용
- 고밀도 family (`point-grid` / `kpi-dashboard` / `matrix`) ≥ 콘텐츠 슬라이드의 30%

### R5. Evidence 매핑 의무

모든 슬라이드의 `content_constraints.evidence_to_use` 필수. **빈 배열 금지**.
- 사용자 파일 있으면 `content_inventory[].source_id` 매핑
- 없으면 `["inference"]` 또는 `["common-knowledge"]`로 명시

### R6. 시각 밀도 의무 (v0.2 신설) ⚠️

모든 슬라이드는 plan 단계에서 **3 필드** 추가로 채워야 한다:

- `recommended_pattern_id` — DESIGN.md §5의 layout_family → 패턴 매핑 표에서 **구체 패턴 ID 1개** (예: `01-title`, `04b-four-point`, `14-overview-split`, `06-stats`, `19-paired-concept`, `12-closing`)
- `min_lines_estimate` — 이 슬라이드 TSX 최소 줄 수 추정. 차트 슬라이드 ≥ **100**, 일반 콘텐츠 ≥ **60**, 섹션·클로징 ≥ **40**, 커버 ≥ **60**
- `required_primitives` — slide-system.tsx 프리미티브 사용 의무 목록 (배열, ≥ 1개). 후보: `SlideShell` / `SlideMeta` / `SectionHeader` / `Card` / `NumberBadge` / `Metric` / `Pill` / `AccentBadge` / `RuleLine` / `GuidingMessage`

**왜 이 룰이 필요한가:** v0.1 dual mode 결과물이 master 분량의 51%에 불과했던 핵심 원인은 plan이 콘텐츠 기획 두뇌로는 작동했지만 디자인 처방까지는 안 했기 때문이다. plan에서 미리 패턴 ID·최소 줄 수·프리미티브를 박아두면 /slide Step 4가 "이 카드는 master 수준으로 채워야 한다"는 신호를 받는다.

**의무 강도 (B-density 검증):** /slide Step 4 빌드 검증에서 plan의 `min_lines_estimate` vs 실제 TSX `wc -l` + `required_primitives` grep 검증을 자동 활성화. 위반 시 어떤 슬라이드 / 무엇이 부족한지 출력 + 재작성 강제.

---

## 입력

1. **사용자 brief** (텍스트 — 주제·청중·길이·톤·핵심 메시지)
2. **활성 테마 DESIGN.md**: `.claude/skills/slide/references/jangpm/DESIGN.md`
3. (선택) **사용자 파일** — `output/{slug}/inputs/`에 미리 복사된 엑셀·MD·PDF·이미지

`{slug}`은 사용자 brief에서 유도 (소문자 kebab-case, `/slide` Step 5 폴더 이름 규칙과 동일).

---

## 출력

```
output/{slug}/
├── slide_plan.json          # plan-schema.md 사양
└── slide_plan.summary.md    # 사용자 검토용 markdown
```

---

## 워크플로우

### Step 1: 컨텍스트 로드

**처리 주체:** LLM (도구 호출 없음)

1. 본 SKILL.md 읽기
2. `.claude/skills/slide/references/jangpm/DESIGN.md` 읽기 — 활성 테마 사양
3. `references/deck-types.md` / `slide-roles.md` / `chart-rhetoric.md` / `plan-schema.md` 읽기
4. (사용자 파일 있으면) `output/{slug}/inputs/` 디렉토리 목록 확인 + 각 파일 요약

### Step 2: deck_type 감지 + 슬라이드 수 결정

**deck_type 감지:**
- `references/deck-types.md`의 7개 후보 + `unknown`
- 사용자 brief에서 키워드 신호로 추론
- **자신 없으면 `unknown` + 사용자에게 명시 질문** — 강제 arc 적용 금지

**슬라이드 수:**
- 사용자가 명시 → 그대로 (R3 분량 압박 안내만)
- 명시 안 함 → default 8~12장. deck_type별 권장 레인지 참고 (deck-types.md 하단)

**언어:** 사용자 brief의 주 언어 감지 (`ko` / `en`).

### Step 3: narrative arc 선택

`references/deck-types.md`의 deck_type별 arc를 시작점으로:
1. arc 그대로 채택 / 변형 / 자유 시퀀스 결정
2. 변형 시 `story_arc.why_this_order_is_persuasive`에 사유 기록

### Step 4: content_inventory 작성

- 사용자 파일 있으면 → 파일별 `source_id` + `summary` + `relevance` + `usable_for` 분류
- 파일 없으면 → `inference` 모드. 사용자 brief 핵심 데이터만 분리해 inventory 작성
- inventory가 슬라이드별 `evidence_sources` 매핑의 **풀(pool)** 역할

### Step 5: 슬라이드별 plan 작성

각 슬라이드:
1. `slide_role` (slide-roles.md enum) — deck_type 별 추가 role 활용 가능
2. `page_family` — `title` / `body` / `end` / `appendix`
3. **R1 4개 필드 채움** — core_message, audience_takeaway, why_here, recommended_layout_family (DESIGN.md §5에서)
4. **R6 3개 필드 채움 (v0.2)** — `recommended_pattern_id` (DESIGN.md §5 매핑 표에서 구체 패턴 ID 1개), `min_lines_estimate` (차트 ≥ 100, 일반 ≥ 60, 섹션·클로징 ≥ 40, 커버 ≥ 60), `required_primitives` (≥ 1개의 slide-system.tsx 프리미티브 배열)
5. `content_blocks[]` — 슬라이드 안 콘텐츠 단위 (block_type + purpose + content_instruction)
6. **R2 chart 슬라이드면** — `chart_strategy` + `chart_takeaway` + **`chart_data` (시리즈당 ≥ 6 포인트)** 셋 다 필수. chart-rhetoric.md의 strategy별 권장 형식 참조
7. **R2 table 슬라이드면** — `table_strategy` + `table_takeaway` 둘 다
8. `content_constraints` — must_include / must_not_include / **evidence_to_use (R5 빈값 금지)**
9. `priority` — `must` / `should` / `could`

### Step 6: ordering_notes 작성

- `split_topics`: 분할한 주제
- `merged_topics`: 병합한 주제
- `deferred_topics`: 다음 덱으로 미룬 주제
- `appendix_candidates`: 부록 후보

### Step 7: 자기 검증 (Layer 1 self-check)

`references/plan-schema.md` 하단 체크리스트 모두 통과해야 출력. 위반 시 plan 수정 후 재검증.

- [ ] R1 — 모든 슬라이드 4개 필드 채워짐
- [ ] R2 — chart 슬라이드 `chart_strategy` + `chart_takeaway` + `chart_data` 셋 다 채워짐. `chart_data.series[].values.length >= 6`
- [ ] R2 — table 슬라이드 `table_strategy` + `table_takeaway` 둘 다
- [ ] R3 — 슬라이드 수 ≤ 20 (초과 시 ordering_notes에 사유)
- [ ] R4 — 같은 layout_family 연속 3장 이상 없음 (section-divider 예외)
- [ ] R4 — 8장 이하 ≥ 3종 / 10장 이상 ≥ 4종 layout_family
- [ ] R4 — point-grid / kpi-dashboard / matrix 중 1종 이상이 콘텐츠 슬라이드 ≥ 30%
- [ ] R5 — 모든 슬라이드 evidence_sources 비어있지 않음
- [ ] **R6 — 모든 슬라이드 `recommended_pattern_id` (구체 패턴 ID), `min_lines_estimate` (차트 ≥100/일반 ≥60/섹션·클로징 ≥40), `required_primitives` (≥1개) 채워짐**
- [ ] design_dependency.allowed_layout_families가 DESIGN.md §5의 13개 어휘 안에서

### Step 8: JSON + summary 파일 작성

1. `output/{slug}/slide_plan.json` — Write tool로 저장 (스키마: `references/plan-schema.md`)
2. `output/{slug}/slide_plan.summary.md` — 사용자 검토용 markdown 요약

폴더가 없으면 먼저 생성.

### Step 9: 사용자 검토 체크포인트 (HARD RULE)

`slide_plan.summary.md` 내용을 사용자에게 보여주고:

```
체계적 모드 — Plan 작성 완료.

위 요약을 검토해주세요:
- 슬라이드 시퀀스가 청중에게 설득력 있나?
- 각 슬라이드의 core_message가 정확한가?
- 누락된 주제 / 추가할 슬라이드가 있나?

확정 시: "/slide"를 호출하면 이 plan으로 렌더링 시작.
수정 필요 시: 어떤 슬라이드/필드를 바꾸고 싶은지 알려주세요.
```

**사용자 confirm 없이 자동으로 `/slide` 호출 금지.** plan/render 사이의 검토가 핵심 가치.

---

## references/ 로드 조건

| 파일 | 로드 시점 |
|---|---|
| `.claude/skills/slide/references/jangpm/DESIGN.md` | Step 1 (필수 — preset 사양) |
| `references/deck-types.md` | Step 2 (deck_type 감지) |
| `references/slide-roles.md` | Step 5 (슬라이드별 role 채우기) |
| `references/chart-rhetoric.md` | Step 5 (chart 슬라이드만) |
| `references/plan-schema.md` | Step 7~8 (검증 + 출력) |
| `examples/sample-plan.json` | 첫 호출 시 형식 학습용 |

---

## 자동 chain (선택)

사용자가 `/slide-plan` 호출 시 명시적으로 "끝나면 자동으로 /slide도 실행해줘"라고 하면, Step 9의 체크포인트는 보여주되 사용자 confirm을 받지 않고 바로 `/slide` 호출 가능.

기본 동작은 **수동 confirm** (가이드 §살아남은 염려점 #1).

---

## autoresearch 격리 (메모리 정합)

autoresearch 덱은 plan json도 `autoresearch-slide/runs/exp-N/T-id/` 격리 폴더에 저장. `output/`에 쓰지 않음 (메모리 노트 `feedback_autoresearch_output_isolation` 정합).

---

## 새 테마(non-jangpm) 사용 시

`/theme-init`이 새 테마의 `DESIGN.md`를 자동 초안 생성 + 사용자 검토. slide-plan은 변경 없이 새 `<theme>/DESIGN.md`를 입력으로 소비. `recommended_layout_family` 어휘는 새 DESIGN.md §5에서 자유롭게 변경 가능 (preset별 자유).
