# 차트 수사적 역할 (chart_strategy 어휘)

slide-plan의 차트·다이어그램 슬라이드는 시각 구현(line / bar / pie 등)이 아니라 **수사적 역할**로 분류한다. 시각 구현은 활성 테마 boilerplate(jangpm 패턴)가 책임진다.

> 출처: mckinsey-pptx의 column_chart 4종 + future-slide의 chart vocabulary를 design-agnostic 어휘로 추상화. 자세한 매핑은 `references/jangpm/DESIGN.md` §8 참조.

## 9종 + custom

| chart_strategy | 의미 | 전형적 시각 형태 | 매핑 패턴 (jangpm 활성 테마) |
|---|---|---|---|
| `growth-trend` | 단일 metric 시계열 성장 | line / area / bar | layout-17 Data+Insight, 단일 시리즈 |
| `forecast` | 과거 실측 + 미래 예측 (시각적 구분 필수) | line / bar with dashed future segment | layout-17 + dashed line, 16-forecast-table |
| `structural-break` | 성장률 변곡·단절·정책 효과 | split line, before/after bar | matrix-trends 또는 분할 라인 |
| `focus-comparison` | 카테고리 비교에서 1개 강조 (winner highlight) | bar with 1 accent color, others muted | 06-stats + 1개 accent |
| `distribution` | 두 축 분포 (산점·버블) | scatter / bubble | custom CSS/SVG |
| `quadrant` | 2×2 분면 (BCG, growth-share, importance-urgency) | 2×2 axis with quadrant labels | 15-matrix-trends |
| `priority-matrix` | 3×3 우선순위 (시급성 × 중요도) | 3×3 heatmap | custom matrix |
| `split-segment` | stacked / grouped 구성 비율 | stacked bar / grouped bar | 17-pnl, 18-seasonal |
| `funnel` | 깔때기 단계 축소 (TAM/SAM/SOM, conversion) | inverted triangle / stacked decreasing | custom funnel |
| `custom` | 위 어휘 못 잡는 케이스. 자유 description 허용 | — | 자유 |

---

## R2 의무 — chart + takeaway + data 일체화 (v0.2 확장)

차트 슬라이드는 plan 단계에서 **세 필드 모두** 채워야 한다:
- `chart_strategy` — 위 어휘 1개
- `chart_takeaway` — 청중이 차트에서 읽어가야 할 1줄 인사이트
- `chart_data` — **6 데이터포인트 이상의 실제 데이터 배열** (plan-schema.md `chart_data` 스키마)

차트만 있고 인사이트 텍스트 없는 슬라이드 또는 데이터 6개 미만 슬라이드는 plan 단계에서 거부 (가이드 Layer 1 R2).

표 슬라이드(`table_strategy` / `table_takeaway`)에도 strategy + takeaway 룰 적용 (data는 별도).

---

## strategy별 권장 chart_data 형식 (v0.2)

| chart_strategy | chart_data.type | 필요 시리즈 | 핵심 annotations |
|---|---|---|---|
| `growth-trend` | `single-line-trend` | 1개 (x: 시간 / y: metric) | `endpoint-label` (최종값) |
| `forecast` | `forecast-dashed` | 1개 (실측 + 미래는 dashed segment) | `forecast-divider` (실측/예측 경계) |
| `structural-break` | `single-line-trend` 또는 `two-line-cross-over` | 1~2개 | `inflection-point` (변곡점) |
| `focus-comparison` | `bar-comparison` | 1개 (카테고리별 단일 metric) | `winner-highlight` (1개 막대 accent) |
| `distribution` | `scatter` | n 포인트 (x, y) | 클러스터 라벨 |
| `quadrant` | `matrix-2x2` | 항목 배치 좌표 | 분면 라벨 4개 |
| `priority-matrix` | `matrix-3x3` | 항목 배치 좌표 | 우선순위 등급 라벨 |
| `split-segment` | `stacked-bar` | n 카테고리 × m 세그먼트 | 카테고리별 비율 라벨 |
| `funnel` | `funnel` | 단계별 수치 | 전환율 % |
| `custom` | `custom` | 자유 | 자유 description |

**데이터포인트 최소 수 (R2 강제):**
- `single-line-trend` / `two-line-cross-over` / `forecast-dashed`: 시리즈당 ≥ 6 포인트 (일반적으로 12 권장)
- `bar-comparison`: 카테고리 ≥ 4개 (강조 1개 + 비강조 3개+)
- `stacked-bar`: 카테고리 × 세그먼트 ≥ 6 셀
- `scatter` / `matrix-*`: 포인트 ≥ 6
- `funnel`: 단계 ≥ 3, 각 단계는 수치 + 다음 단계 전환율

위반 시 plan 거부.

---

## chart_strategy 선택 가이드

| 청중이 던질 질문 | 권장 strategy |
|---|---|
| "얼마나 늘었어?" / "추세는?" | `growth-trend` |
| "앞으로 어떻게 될까?" | `forecast` |
| "왜 이 시점에 변화가?" | `structural-break` |
| "이 중에 뭐가 제일 커?" / "누가 winner?" | `focus-comparison` |
| "두 변수 관계는?" | `distribution` |
| "전략 위치는?" | `quadrant` |
| "뭐부터 할까?" | `priority-matrix` |
| "각 항목 비중은?" | `split-segment` |
| "단계별 손실은?" / "유입 → 전환은?" | `funnel` |
| 위 9개로 못 잡는 경우 | `custom` + 자유 description |

---

## 차트 색상 룰 (테마 무관, 모든 preset 공통 권장)

활성 테마(jangpm) 기준:
- 단일 accent + opacity 변형 (다중 hue 금지)
- height 400px 권장 (단일 차트 슬라이드)
- `Chart.defaults.animation = false`
- semantic color (positive/negative/warning)는 데이터 의미일 때만

다른 preset은 `references/<theme>/DESIGN.md` §8을 우선.
