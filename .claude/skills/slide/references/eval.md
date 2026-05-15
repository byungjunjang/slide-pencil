# 비전 평가 기준

## 평가 방법

Pencil CLI `export_nodes`로 슬라이드 프레임을 PNG로 떨군 뒤 Claude의 Read tool로 시각 검증. 호출 패턴은 `references/pencil-cli.md` 참조:

```bash
( cat <<PENCIL
export_nodes({ nodeIds: ["<slideFrameId>"], outputDir: "output/<slug>/_eval", format: "png", scale: 2 })
PENCIL
sleep 1; echo "exit()" ) | pencil interactive --in output/<slug>/pencil-new.pen --out output/<slug>/pencil-new.pen
```

→ `output/<slug>/_eval/<slideFrameId>.png`. Claude는 이 파일을 Read tool로 읽어 본다.

> `get_screenshot`은 base64 JSON을 반환해서 Claude의 Read tool로 못 본다 — 평가에는 항상 `export_nodes`를 쓴다.

## 평가 항목 (10점 만점)

| 항목 | 배점 | 평가 내용 |
|------|------|----------|
| 첫인상 | 1.5 | 프로페셔널한 인상, 시각적 매력, 깔끔함 |
| 타이포그래피 | 1.5 | 계층 구조 명확, 가독성, 폰트 일관성, 크기 적절 |
| 색상 | 1.0 | 팔레트 조화, 대비 충분, 강조 적절, 일관성 |
| 레이아웃 | 1.5 | 정렬, 여백 충분, 그리드 준수, 오버플로우 없음 |
| 콘텐츠 | 1.5 | 메시지 명확, 밀도 적절 (과밀 금지), "So What?" 전달 |
| 정보 설계 | 3.0 | 슬라이드 구조, 흐름, 레이아웃 다양성, 스토리텔링 |

## 품질 게이트

| 등급 | 점수 | 조치 |
|------|------|------|
| SHIP | >= 9.0 | 출력 가능 |
| ACCEPTABLE | >= 8.0 | 출력 가능, 개선 여지 있음 |
| NEEDS WORK | >= 7.0 | 수정 필요 |
| FAIL | < 7.0 | 재디자인 |

## 체크리스트 (슬라이드별)

스크린샷을 보고 다음을 확인:

### 레이아웃
- [ ] 1280×720 프레임 내에 모든 콘텐츠 배치됨
- [ ] 텍스트 잘림(overflow) 없음
- [ ] 가장자리에서 80px 이상 여백
- [ ] 요소 간 정렬 일관적
- [ ] 카드/컬럼 높이 균일

### 타이포그래피
- [ ] 제목과 본문의 크기 차이 명확 (최소 2배)
- [ ] 최소 fontSize 28 준수 (태그/뱃지 22px 예외)
- [ ] 폰트 패밀리 2개 이내
- [ ] 줄 간격 적절 (겹침/과밀 없음)

### 색상/스타일
- [ ] 텍스트-배경 대비 충분 (밝은 배경에 어두운 텍스트 또는 그 반대)
- [ ] 2~3 코어 색상 + 중립색으로 구성
- [ ] 그라디언트/그림자 없음 (미니멀 원칙)

### 콘텐츠
- [ ] 슬라이드당 1개 메시지
- [ ] 짧은 문구 (문단 없음)
- [ ] 빈 공간이 충분 (과밀하지 않음)

## 프로세스 체크

- [ ] Pencil CLI로 디자인했는가 (직접 React 작성 금지)
- [ ] 동일 레이아웃 타입이 2회 이하인가
- [ ] 비교 주제에서 양측 분량이 균형 잡혀 있는가
- [ ] KPI에 구체적 숫자가 있는가
- [ ] dark 슬라이드가 2장 연속 배치되지 않는가
- [ ] 후반부(마지막 30%)에 dark 슬라이드가 몰리지 않는가
- [ ] 액센트 컬러가 커버/섹션 브레이크/KPI에 일관되게 사용되는가

## 이중 검증 (Pencil vs HTML) ⚠️

Pencil 스크린샷과 최종 HTML 출력은 분리하여 검증한다.

### 1단계: Pencil 시각 검증 (Step 3에서 실시간)

위 "평가 방법"의 `export_nodes` 호출로 떨군 PNG를 Read tool로 확인 후 레이아웃 점검. 아래 이슈를 분류:

| 분류 | 정의 | 조치 |
|------|------|------|
| **Pencil-only 이슈** | Pencil 렌더러 한계 (한국어 폰트, layout:none 무시 등). React HTML에서는 정상 | 메모 기록 후 진행. 재시도 무의미 |
| **HTML-only 이슈** | Pencil은 맞는데 React 변환 후 깨지는 경우 | Step 4에서 React 코드 수정 |
| **공통 디자인 이슈** | 양쪽 모두 잘못됨 (배치, 대비, 폰트 크기 등) | Pencil CLI `batch_design`으로 즉시 수정 |

**Pencil-only 이슈로 판단하는 케이스 예시:**
- 커버 슬라이드에서 자식 프레임이 strip으로 쌓이는 현상 (`layout:none` 설정에도 불구)
- 한국어 텍스트 자간/행간이 뭉쳐 보이는 현상
- Pencil 캔버스에서 색상이 약간 다르게 보이는 현상

### 2단계: HTML 최종 검증 (Step 5 빌드 후)

`npm run build` 후 `dist/index.html`을 직접 확인. Pencil 렌더링 이슈와 무관하게 실제 출력물 기준으로 평가.

**최종 품질 판단은 HTML 출력물 기준이다. Pencil 렌더링 이슈는 참고 사항으로 기록.**

### 평가 보고서 형식

덱 평가 시 아래 구분으로 이슈를 기록:
```
Pencil-only: [이슈 목록]
HTML-only: [이슈 목록]
Design issue: [이슈 목록]
Final verdict: HTML 기준 SHIP/ACCEPTABLE/NEEDS_WORK/FAIL
```

## 수정 우선순위

1. **즉시 수정** (BLOCKING): 텍스트 잘림, 오버플로우, 읽을 수 없는 대비
2. **수정 권장** (WARNING): 정렬 불일치, 여백 부족, 폰트 크기 부적절
3. **개선 제안** (SUGGESTION): 색상 미세 조정, 간격 최적화
4. **Pencil-only** (기록만): Pencil 렌더러 특유의 이슈. React HTML 정상이면 진행
