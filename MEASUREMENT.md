# P5 측정 프로토콜 — 비주얼=근거 효과 검증

`PIPELINE_UPDATE_PLAN.md` Phase 5. 변경(P1~P4)이 실제로 ① 카드 반복을 줄이고 ② 비주얼을 근거로 끌어올리는지를 **정량 측정**한다. 이 결과가 두 가지 게이트:

- (a) R7·공통 취향 규칙의 **warn → hard(gate) 승격** 여부
- (b) **slide-html / slide-svg 전파** 여부 (slide-pencil이 파일럿)

> ⚠️ 실제 before/after 숫자는 **동일 brief로 덱을 2번 생성**해야 나온다(Pencil/codex 인증 + 파이프라인 필요). 이 문서는 *프로토콜과 도구*를 정의한다 — 숫자는 사용자가 파이프라인을 돌려 채운다.

## 측정 도구

`.claude/skills/slide-plan/scripts/measure-deck.mjs` — `slide_plan.json`에서 지표를 계산(렌더 불필요).

```bash
node .claude/skills/slide-plan/scripts/measure-deck.mjs <plan.json>                 # 단일
node .claude/skills/slide-plan/scripts/measure-deck.mjs <before.json> <after.json>  # 비교 + delta
```

### 지표

| 지표 | 의미 | 개선 방향 |
|---|---|---|
| `cardRowRatio` | 콘텐츠 슬라이드 중 card-row 계열(point-grid/kpi-dashboard) 비율 | ↓ |
| `visualPrimaryRatio` | 비주얼이 지배(차트·표·lead-bound·지배형 비주얼 블록)하는 슬라이드 비율 | ↑ |
| `unboundVisuals` | 지배형 비주얼인데 근거 미바인딩(R7 would-warn) 수 | ↓ |
| `leadAdoption` | `lead` 필드 채택률 | ↑ |
| `distinctLeadTypes` | 선언된 `lead.type` distinct 수 | ↑ |
| `leadSkew` | 가장 흔한 `lead.type` 점유율 | ↓ (단, `leadAdoption>0`일 때만 의미. lead가 0이면 0=degenerate) |
| `whitespaceRatio` | 여백률 | ↑ — **렌더타임 지표**, 스크립트 N/A (아래 §여백률) |

## 실행 절차 (before/after)

1. **동일 brief 준비** — 6장 분량 1개(plan 권장 길이).
2. **BEFORE (baseline)** — `main`(플랜 커밋 `8bff616`) 체크아웃에서 `/slide-plan <brief>` → `output/<slug>/slide_plan.json`을 `before.json`으로 보관.
3. **AFTER (변경본)** — `pipeline-update`에서 동일 brief로 `/slide-plan` → `after.json`.
4. **비교** — `node measure-deck.mjs before.json after.json`.
5. **렌더 검증** — 양쪽 `/slide`로 빌드 → 스크린샷. 여백률 + 차트 accent ramp 육안/픽셀 확인.

## 여백률 (render-time)

정적 스크립트로는 못 잰다. Playwright로 `dist/index.html`의 각 슬라이드(1280×720)를 캡처해 **비-배경 픽셀 비율**로 근사한다(배경 = `--bg`/`--surface` 색). P5 1차에서는 육안 비교로 시작하고, 필요하면 스크린샷 픽셀 분석 스크립트를 추가한다.

## 차트 accent ramp 검증 (Fix3)

차트 슬라이드가 있으면: 빌드 후 스크린샷에서 차트 색이 `--accent`(jangpm `#4633E3`) 단일 hue의 opacity ramp(0.85/0.6/0.4/0.25)로 렌더되는지 확인. `chartTheme.ramp()` 사용 시 테마 교체에도 자동 추종(별도 검증: `--accent`를 임시로 바꿔 ramp가 따라오는지).

## 빌드/PPTX 검증 상태

- **빌드:** ✅ 검증됨 — `npm run build`가 probe 덱 + `chartTheme.ts`를 포함해 정상 빌드(33 modules, exit 0). Phase 1~4 변경은 빌드를 깨지 않음. (fresh 워크트리는 활성 덱 registry가 gitignore라 부재 → 빌드엔 덱 필요.)
- **PPTX export:** 실제 덱이 있어야 검증 가능(R2/R5/R6 + `unzip -t`). 측정 덱 생성 시 함께 확인.

## 게이트 판단 기준

`cardRowRatio↓` + `visualPrimaryRatio↑` + `unboundVisuals↓`가 **뚜렷**(예: visualPrimary +20%p↑, unbound 0 수렴)하면:

- R7 + 공통 취향 규칙을 **warn → hard 승격** 검토 (validate_plan.py R7을 `r.err`로, validate-theme.mjs `--strict-hex` 상시화).
- slide-html / slide-svg로 **전파** 진행.

효과가 미미하면 어휘(룰 문구·아키타입)를 보강한 뒤 재측정.

## 열린 결정 (PLAN §6)

- **kicker 충돌:** pencil의 NO supertitle 하드룰 유지 vs 의미형 kicker 채택 — 측정에서 kicker 유무가 visual-primary 인식에 영향을 주는지 본 뒤 택일.
- **warn→hard 승격 시점:** 위 게이트 기준 충족 + 어휘 안정화 후.
