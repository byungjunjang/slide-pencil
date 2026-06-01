# slide_role enum

slide-plan의 슬라이드별 `slide_role` 필드는 아래 enum 중 하나. 공통 8개는 모든 deck_type에서 사용 가능, 도메인별 추가 role은 해당 deck_type 안에서.

## 공통 8개 (모든 deck_type)

| role | 의미 |
|---|---|
| `cover` | 첫 슬라이드. 제목·부제·메타 |
| `context` | 배경, 왜 지금, 시장 상황 |
| `insight` | 핵심 주장, bottom line, 단일 메시지 |
| `evidence` | 근거 데이터, 사례, 분석 결과 |
| `solution` | 해결책, 제안, 접근 방식 |
| `summary` | 정리, recap, key takeaways |
| `cta` | call to action, 다음 단계 요청 |
| `appendix` | 보조 자료, 부가 정보 |

## deck_type별 추가

### consulting
| role | 의미 |
|---|---|
| `problem` | 문제 정의 |
| `comparison` | 옵션·전략 비교 |
| `roadmap` | 실행 일정, 마일스톤 |

### educational
| role | 의미 |
|---|---|
| `concept` | 학습할 개념 |
| `example` | 실제 사례, 예시 |
| `exercise` | 실습, 워크숍 활동 |
| `recap` | 회고, 핵심 정리 |
| `qna` | 질의응답 슬라이드 |
| `agenda` | 학습 목차 |

### report
| role | 의미 |
|---|---|
| `executive_summary` | 임원 요약 |
| `findings` | 발견 사항 (evidence의 specialization) |
| `methodology` | 방법론, 분석 절차 |

### sales
| role | 의미 |
|---|---|
| `problem` | 고객 페인 포인트 |
| `proof` | 사회적 증명, 고객 사례, 인증 |
| `comparison` | vs alternative |
| `pricing` | 가격, 옵션 |
| `roadmap` | 도입 일정 |

### internal_update
| role | 의미 |
|---|---|
| `status_summary` | 현황 요약 |
| `progress` | 진행 상황 (evidence specialization) |
| `blockers` | 막혀있는 이슈 |
| `next_steps` | 다음 액션 |
| `asks` | 팀에게 요청 사항 |

### proposal
| role | 의미 |
|---|---|
| `problem` | 해결할 문제 |
| `comparison` | 대안 비교 |
| `pricing` | 견적 |
| `team` | 수행 팀 소개 |
| `roadmap` | 일정·마일스톤 |

### keynote
| role | 의미 |
|---|---|
| `hook` | 도입부 임팩트 |
| `vision` | 비전, 큰 그림 |
| `demo` | 실제 시연 |
| `availability` | 출시 일정 |

---

## 사용 규칙

- 각 슬라이드는 **하나의 slide_role**을 갖는다 (다중 역할 금지)
- 같은 role이 연속 4장 이상 반복되면 split 고려 (lazy 반복 R4 위반 위험)
- 도메인별 추가 role은 해당 deck_type 안에서만 사용. 다른 deck_type에서 쓰려면 `role: "custom"` + 자유 description
- 예시:
  - `cover` (slide 1) → `context` (slide 2) → `insight` (slide 3) → `evidence` (slide 4~5) → `solution` (slide 6) → `cta` (slide 7) → `closing` (slide 8)

## 새 role 추가 가이드라인

- deck_type별 enum은 자유롭게 확장 가능
- 단 **공통 8개는 보존** (drift 방지)
- 추가 role은 `references/slide-roles.md`에 표로 박제 + slide-pencil specific 표시
