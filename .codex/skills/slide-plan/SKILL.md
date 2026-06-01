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

> Layer 1 규칙 박제. 본 스킬을 사용하는 모든 slide 프로젝트 공통.

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

**의무 강도 (B-density 검증):** /slide Step 4 빌드 검증에서 plan의 `min_lines_estimate` vs 실제 TSX `wc -l` + `required_primitives` grep 검증을 자동 활성화. 위반 시 어떤 슬라이드 / 무엇이 부족한지 출력 + 재작성 강제. **`required_primitives:["Card"]`는 `<Card>` 프리미티브든 `rounded-[12px] border` 카드 div든 양쪽 인정**(card-row는 컴포넌트가 아니라 구성의 문제 — 무지성 카드 줄세우기만 별도 취향 규칙으로 억제).

### R7. 비주얼 = 근거 (advisory / WARN)

**P1 대원칙:** 콘텐츠 슬라이드의 지배 요소는 비주얼이고, GM/제목은 그 비주얼이 **무엇을 증명/설명하는지** 말하는 캡션이다("action title + chart proof"). 비주얼이 설명·증거를 담지 않고 장식이면 슬롭이다.

- **선택 필드 `lead{type, carries, what_it_proves}`** 로 비주얼-근거 바인딩을 명시한다(스키마는 `references/plan-schema.md` §lead). `statement`/`number`/`quote`도 1급 lead — 차트만 lead가 아니다.
- 차트·테이블은 `chart_takeaway`/`table_takeaway`(R2)로 이미 근거가 바인딩되므로 `lead` 생략 가능.
- **지배형 비주얼 블록**(`image`/`infographic`/`diagram_flow`)을 쓰면 `lead`로 근거 역할을 선언할 것. 미선언 시 validate_plan.py가 WARN.
- 덱 전반에서 `lead.type`이 한 종류로 쏠리지 않게 변주(lead 다양성 WARN).
- **전부 WARN(warn-then-gate, P3)** — 지금은 경고만, P5 측정 후 hard 승격 검토.

---

## 입력

1. **사용자 brief** (텍스트 — 주제·청중·길이·톤·핵심 메시지)
2. **활성 테마 DESIGN.md**: `.codex/skills/slide/references/jangpm/DESIGN.md`
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
2. `.codex/skills/slide/references/jangpm/DESIGN.md` 읽기 — 활성 테마 사양
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
8. **R7 비주얼=근거 (선택)** — 지배형 비주얼(image/infographic/diagram_flow) 또는 statement/number/quote가 슬라이드를 끌면 `lead{type, carries: evidence|explanation, what_it_proves}` 채움. 차트·테이블은 takeaway로 갈음 가능. lead.type은 덱 전반에서 변주
9. `content_constraints` — must_include / must_not_include / **evidence_to_use (R5 빈값 금지)**
10. `priority` — `must` / `should` / `could`

### Step 5.5: Fact-check (인터넷 검색 기반 팩트 체크)

**언제 활성:**
- 슬라이드 ≥ 7장 (auto-on)
- 슬라이드 ≤ 6장이라도 brief에 `사실 확인` / `출처 확인` / `fact check` / `verify` 키워드 → 강제 ON
- 슬라이드 ≤ 6장이고 강제 키워드 없으면 SKIP (overhead 감안)

**무엇을 검증 (claim 자동 추출):**

각 슬라이드의 `core_message`, `audience_takeaway`, `chart_data` 안 수치, `content_constraints.must_include`에서 다음을 추출:

| 우선순위 | 패턴 |
|---|---|
| HIGH | chart_data 시리즈 수치 / must_include의 숫자·퍼센트·통화·단위 |
| HIGH | 최근 3년 이내 사건·발표·출시 |
| HIGH | 외부 인물/조직 인용 |
| MEDIUM | core_message 안 수치/연도 |
| MEDIUM | 고유명사 (회사명·제품명·인물명) |
| LOW (SKIP) | 일반 통념·정의 |

HIGH/MEDIUM만 검증. 슬라이드당 최대 3개 claim까지.

**실행:**

1. 도구 로드: `ToolSearch("select:WebSearch,WebFetch")`
2. 각 claim에 대해 `WebSearch("<claim text> source authoritative 2025 2026")`
3. 신뢰 source(정부/공식 발표/주요 매체/위키 등) 1-2개 선별. 의심 시 `WebFetch`로 본문 확인.
4. 결과 분류: `verified` / `corrected` / `unverified`

**결과 plan 반영:**

- **verified**: `content_inventory`에 `{"source_id": "web_NN", "source_type": "web", "summary": "<URL+요약>", "relevance": "high", "usable_for": ["evidence"]}` 추가 → 해당 슬라이드 `content_constraints.evidence_to_use`에 `web_NN` 추가
- **corrected**: 수치/날짜 즉시 수정 + `fact_check_log`에 before/after
- **unverified**: 약화 표현으로 수정 ("약 X" → "추정 X~Y"), `evidence_to_use`에 `"inference-unverified"` 추가

**plan 루트에 `fact_check_log[]` 추가:**

```json
"fact_check_log": [
  {
    "claim": "<원문>",
    "slide_number": N,
    "priority": "HIGH" | "MEDIUM",
    "status": "verified" | "corrected" | "unverified",
    "source": "<URL or null>",
    "original": "<원본 텍스트>",
    "corrected_to": "<수정 텍스트 or null>",
    "checked_at": "YYYY-MM-DD"
  }
]
```

**사용자 알림 (Step 9 검토 때 함께 출력):**

```
Fact-check 결과: verified N / corrected M / unverified K
unverified claim:
  - slide #N: "<claim>" — 공신력 source 미확인
corrected claim:
  - slide #M: "<원본>" → "<수정>" (source: <URL>)
```

> 설계 의도: Non-blocking. 검증 실패가 critical하면 사용자가 Step 9 stop keyword로 plan 수정 요청. internal data·미공개 자료처럼 검증 불가능한 경우도 정상 케이스이므로 BLOCKING 안 함.

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
- [ ] R7 (advisory/WARN) — 지배형 비주얼 슬라이드 `lead{carries, what_it_proves}` 권장 · 선언 시 enum 정합 · lead.type 한 종류 쏠림 없음
- [ ] design_dependency.allowed_layout_families가 DESIGN.md §5의 13개 어휘 안에서

### Step 8: JSON + summary 파일 작성

1. `output/{slug}/slide_plan.json` — Write tool로 저장 (스키마: `references/plan-schema.md`)
2. `output/{slug}/slide_plan.summary.md` — 사용자 검토용 markdown 요약

폴더가 없으면 먼저 생성.

### Step 9: 사용자 검토 체크포인트 (soft notice — non-blocking by default)

`slide_plan.summary.md`를 사용자에게 보여주고:

```
체계적 모드 — Plan 작성 완료. 같은 턴 안에서 /slide로 진행합니다.

수정이 필요하면 `다시` / `수정` / `멈춰` / `잠깐` / `wait` / `stop` 중 하나로 응답하세요.
어떤 슬라이드/필드를 바꾸고 싶은지 알려주시면 plan을 갱신합니다.
```

**진행 분기 (3개 슬라이드 파이프라인 공통):**

| 사용자 다음 메시지 | 행동 |
|---|---|
| `다시` / `수정` / `멈춰` / `잠깐` / `wait` / `stop` / `다른` / `안 돼` / 슬라이드 N번 수정 같은 명시적 변경 요청 | plan 수정 모드 — 해당 필드/슬라이드만 갱신 후 검증 재실행 → summary 재출력 |
| 그 외 (`/slide`, `OK`, `진행`, `좋아`, 새 주제, 또는 응답 없음) | `/slide`로 즉시 진입 — plan 그대로 소비 |

**원격 환경 (Slack / OpenClaw / Telegram 등):**
- BLOCKING 대기 금지. plan summary 출력과 동시에 같은 턴에 `/slide`로 자동 진행한다.
- 사용자가 다음 턴에서 stop keyword를 주면 그때 다시 plan 수정 모드로 진입 (다음 호출에서 `slide_plan.json` 이미 존재 → 차이만 수정).

**로컬 + 명시적 BLOCKING 요청:**
- 사용자가 첫 호출에서 `--confirm-plan` / "확인하고 진행" / "plan 검토하고 시작" 같이 명시한 경우에만 BLOCKING 유지.

> 설계 의도: 기존 BLOCKING은 plan dropped(채택률 0%)의 주된 원인이었다. 기본 동작은 plan을 즉시 소비하되, 사용자가 의식적으로 멈출 수 있는 단어를 명확히 제시한다.

---

## references/ 로드 조건

| 파일 | 로드 시점 |
|---|---|
| `.codex/skills/slide/references/jangpm/DESIGN.md` | Step 1 (필수 — preset 사양) |
| `references/deck-types.md` | Step 2 (deck_type 감지) |
| `references/slide-roles.md` | Step 5 (슬라이드별 role 채우기) |
| `references/chart-rhetoric.md` | Step 5 (chart 슬라이드만) |
| `references/plan-schema.md` | Step 7~8 (검증 + 출력) |
| `examples/sample-plan.json` | 첫 호출 시 형식 학습용 |

---

## 자동 chain (기본 동작)

기본 동작은 **plan 작성 후 같은 턴 안에서 `/slide` 자동 진입** (Step 9 참조). 사용자가 명시적 stop keyword를 주지 않으면 plan을 그대로 소비한다.

사용자가 `--confirm-plan` 또는 "확인하고 진행" 같이 명시한 경우에만 BLOCKING confirm으로 폴백.

---

## autoresearch 격리 (메모리 정합)

autoresearch 덱은 plan json도 `autoresearch-slide/runs/exp-N/T-id/` 격리 폴더에 저장. `output/`에 쓰지 않음 (메모리 노트 `feedback_autoresearch_output_isolation` 정합).

---

## 새 테마(non-jangpm) 사용 시

`/theme-init`이 새 테마의 `DESIGN.md`를 자동 초안 생성 + 사용자 검토. slide-plan은 변경 없이 새 `<theme>/DESIGN.md`를 입력으로 소비. `recommended_layout_family` 어휘는 새 DESIGN.md §5에서 자유롭게 변경 가능 (preset별 자유).
