# deck_type & narrative arc

slide-plan이 사용자 brief에서 deck_type을 감지하면 아래 arc가 **시작점 휴리스틱**이 된다. 강제 아님 — 사용자 brief에 맞게 자유롭게 적응.

## deck_type 7종 + unknown

| deck_type | 트리거 신호 | 청중 |
|---|---|---|
| `consulting` | 사업 리뷰, 전략 보고서, 경영진 보고, 컨설팅 제안 | C-level, 의사결정자 |
| `educational` | 강의, 워크숍, 트레이닝, 교육 과정 | 학습자, 참가자 |
| `report` | 분석 리포트, research summary, 데이터 보고, 정기 리포트 | 분석가, 매니저 |
| `sales` | 제품 소개, 고객 제안서, pitching, RFP 응답 | 고객, 잠재 고객 |
| `internal_update` | OKR 리뷰, 진행 상황, 팀 공유, 위클리·먼슬리 | 팀, 조직 내부 |
| `proposal` | 사업 제안, 그랜트 신청, 신규 프로젝트 승인 | 의사결정 위원회 |
| `keynote` | 컨퍼런스 발표, 신제품 발표, vision talk | 대중, 청중 |
| `unknown` | 위 신호 없음. 자신없을 때 | — (사용자에게 명시 질문) |

**감지 자신없으면:** 사용자에게 명시적으로 묻는다. `unknown`으로 두고 강제 arc 적용 금지 (가이드 §살아남은 염려점 #2).

---

## narrative arc — deck_type별

각 arc는 **시작점**이지 강제가 아님. 사용자 brief가 다른 시퀀스를 요구하면 자유 변형.

### consulting

```
cover → bottom_line(insight) → executive_summary →
analysis(evidence) × 1~3 → implication(comparison) × 0~2 →
recommendation(solution) → roadmap → cta(closing)
```

**핵심 어법:** Bottom-Line First (BLI) — 결론·핵심 메시지를 먼저 던지고 근거를 뒤따른다.

### educational

```
cover → context(why_now) → agenda →
concept(insight) × 1~2 → example(evidence) × 1~3 →
exercise × 0~2 → recap(summary) → qna/closing
```

**핵심 어법:** 맥락 → 개념 → 사례 → 실습 → 정리. 학습자 인지 부담 분배.

### report

```
cover → executive_summary → context →
findings(evidence) × 2~5 → analysis(insight) × 1~2 →
implications(comparison) × 0~2 → conclusion → appendix(선택)
```

**핵심 어법:** 사실 → 분석 → 함의. 출처 추적성 강조 (R5 Evidence 매핑 의무).

### sales

```
cover → problem(context) → opportunity(insight) →
solution × 1~2 → proof(evidence) × 1~3 → comparison(vs alternative) →
roadmap/pricing → cta
```

**핵심 어법:** Problem → Solution → Proof → Ask.

### internal_update

```
cover → status_summary → progress(evidence) × 2~4 →
blockers(comparison) → next_steps(roadmap) → asks(cta)
```

**핵심 어법:** 사실 보고 + 다음 액션. 공식적 톤 X, 효율적 정보 전달.

### proposal

```
cover → problem → approach(insight) → team →
deliverables(evidence) × 1~3 → pricing/timeline → comparison(vs alternative) → cta
```

brief에서 추출. 강제 arc 안 둠.

### keynote

```
cover(hook) → context(why_now) → vision →
demo(evidence) × 1~3 → availability/pricing → cta
```

brief에서 추출. 강제 arc 안 둠.

---

## 슬라이드 수 결정 (R3 분량 압박)

- 사용자가 명시 안 하면 **default 8~12장**
- 20장 넘기면 split / merge / defer 후보 한 번 더 점검
- "tighter deck > bloated deck" 원칙
- educational / report는 12~20 가능. consulting은 보통 8~15. internal_update는 5~10.

---

## arc 적응 가이드

- arc는 **시작점 시퀀스**. 사용자 brief의 핵심 강조에 맞춰 슬라이드를 add / remove / reorder
- 같은 deck_type이라도 청중·목적에 따라 arc가 다름 — consulting의 경영진 보고와 컨설팅 제안서는 다름
- arc 변형 사유는 `story_arc.why_this_order_is_persuasive`에 기록
