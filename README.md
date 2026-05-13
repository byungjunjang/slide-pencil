# slide-pencil

> **Pencil MCP × React/Tailwind 기반의 16:9 슬라이드 디자인 시스템.**
> Claude Code 채팅창에 "AI 트렌드 슬라이드 만들어줘"라고 한 줄만 입력하면,
> Pencil MCP가 디자인 → React 컴포넌트로 변환 → Vite 단일 HTML 빌드 →
> 필요하면 PPTX·PDF로까지 변환해서 `output/<주제>/` 폴더에 떨어뜨립니다.
> 파워포인트를 한 장씩 그릴 필요도, 디자인 감각도, 코딩 지식도 필요 없습니다.

![Theme](https://img.shields.io/badge/theme-Jangpm-4633E3)
![Viewport](https://img.shields.io/badge/viewport-1280%C3%97720-0b1f3a)
![Patterns](https://img.shields.io/badge/patterns-29-brightgreen)
![Stack](https://img.shields.io/badge/stack-React%2019%20%C2%B7%20Tailwind%204%20%C2%B7%20Vite%206-6b4bff)
![Platform](https://img.shields.io/badge/platform-Claude%20Code-6b4bff)

---

## 이게 뭔가요? (1분 요약)

- **무엇을 하는 도구:** 글로만 지시해도 컨설팅 리포트 스타일 슬라이드 덱을 자동으로 만들어주는 도구입니다.
- **누가 쓰면 좋은가:** 기획자·마케터·강사·임원·컨설턴트 — **PPT를 한 장씩 만들기 지겨운 누구나.**
- **어떻게 쓰는가:** Claude Code 안에서 `/slide` 또는 자연어로 요청하면 됩니다. 명령어 암기 불필요.
- **결과물:**
  - 단일 HTML (`output/<주제>/index.html`) — 브라우저로 바로 발표 가능
  - PPTX — `/slide`가 자동으로 같이 만들어 줍니다 (HTML과 함께 출력). 단독 재변환은 `/export-pptx`
  - PDF (`/export-pdf` 실행 시) — 인쇄·이메일 첨부

**예시 한 줄:**
> "사내 AI 도구 도입 효과 슬라이드 12장 만들어줘. KPI 위주로."

↓ 1~3분 후 ↓

→ `output/사내-AI-도입/index.html` 생성. 표지 → 컨텍스트 → KPI 대시보드 →
사례 카드 → 로드맵 → 클로징 12장이 Jangpm 디자인 시스템(모노크롬 + accent `#4633E3`)으로 통일되어 들어 있습니다.

---


## 처음 설치하는 분을 위한 준비 (5분)

### 1단계. Claude Code 설치

[Claude Code 공식 다운로드](https://claude.com/claude-code) — Mac / Windows / Linux 모두 지원.

### 2단계. 이 저장소 클론

```bash
git clone https://github.com/byungjunjang/slide-pencil.git ~/Desktop/slide-pencil
cd ~/Desktop/slide-pencil
```

### 3단계. 의존성 설치

```bash
npm install
```

### 4단계. VS Code Pencil 확장 설치 (필수 — MCP 자동 연결)

`/slide` 스킬은 **Pencil MCP**가 연결되어 있어야 동작합니다. Pencil 없이는
React로 직행하지 않고 즉시 파이프라인을 중단합니다 (스킬 정책).

가장 쉬운 설치 방법은 **VS Code Pencil 확장 프로그램**을 까는 것입니다.
확장을 설치하면 **Pencil MCP가 같이 등록되기 때문에 별도 설정이 필요 없습니다.**

1. VS Code 실행 → 좌측 Extensions(`⇧⌘X`) 탭 열기
2. "Pencil" 검색 → **Pencil 확장 설치**
3. VS Code 재시작 (또는 Reload Window)
4. Claude Code 채팅창에 `/mcp` 입력 → `pencil` 항목이 `connected` 상태인지 확인

> 💡 별도로 Pencil 데스크탑 앱을 설치하거나 MCP 서버 경로를 수동으로
> 등록할 필요 없습니다. VS Code 확장이 MCP까지 한 번에 처리합니다.

### 5단계. (선택) PPTX·PDF·Drive 변환을 위한 부가 도구

| 변환 종류 | 필요 도구 | 설치 |
|---|---|---|
| PPTX | `pptxgenjs` (이미 `package.json`에 포함) | `npm install`로 자동 설치 |
| PDF | Playwright 브라우저 | `npx playwright install chromium` |

---

## 쓰는 법 — Claude Code 채팅창에 한 줄

### 🟢 가장 흔한 사용 패턴

이 저장소 폴더에서 Claude Code를 열고:

```
/slide AI 코딩 도구 도입 효과 발표 12장 만들어줘. KPI 중심으로.
```

또는 **슬래시 없이 자연어로**:

```
사내 발표용으로 우리 팀 AI 도입 효과 슬라이드 만들어줘.
```

### 🎚 두 가지 모드 — 간단 vs 체계적

| 모드 | 트리거 | 특징 |
|---|---|---|
| **간단 모드** | `/slide` 단독 | 자체 planning + 디자인 → 빠른 첫 draft. 8~12장 일반 덱·내부 브레인스토밍에 적합 |
| **체계적 모드** | `/slide-plan` → `/slide` | 슬라이드별 사유(`core_message`·`why_here`)·증거 추적·차트 takeaway 일체화를 강제. 외부 보고용·30+ 장 deck·사용자 파일 기반에 적합 |

체계적 모드는 `/slide-plan`이 먼저 `output/<주제>/slide_plan.json`을 만들고 사용자에게 검토를 요청합니다. 사용자 confirm 후 `/slide`를 호출하면 plan을 그대로 렌더링합니다 (자체 planning 스킵).

---

Claude는 자동으로 다음 5단계를 순서대로 실행합니다 (간단 모드 기준 — 체계적 모드는 Step 1이 plan 흡수로 대체):

1. **주제 분석 + 구조 설계** — 슬라이드 수, 패턴 배치 계획 수립
2. **Pencil 환경 준비** — `jangpm-design-system.pen`을 열어 토큰 흡수
3. **슬라이드 디자인** — Pencil에서 1280×720 프레임 N개 생성
4. **React 변환** — `src/slides/Slide01.tsx` ~ `SlideNN.tsx` 작성
5. **빌드 + 출력 폴더 정리** — `output/<주제>/index.html` 생성

### 추가로 변환하기

```
/slide-plan            ← (체계적 모드) /slide 호출 전 plan 먼저 만들고 사용자 검토. 결과: output/<주제>/slide_plan.json
/export-pptx           ← React 슬라이드 → PowerPoint (.pptx) 단독 재변환 (보통은 /slide가 자동 생성)
/export-pdf            ← React 슬라이드 → PDF (페이지당 1장)
```

### 디자인 테마 자체를 바꾸고 싶으면

```
/theme-init            ← 활성 테마(Jangpm)를 새 디자인 시스템으로 일회성 교체
```

테마 가이드 마크다운을 사용자가 제공하면, 6개 교체 지점(토큰·HARD RULES·테마 룰·references 폴더·.pen 파일·SKILL.md THEME 블록)을 일괄 갱신하고 빌드 검증까지 자동으로 합니다.

---

## 실전 가이드 — 폴더 정리 & 시나리오

### 폴더 정리 방법

```
slide-pencil/
├── inputs/                    ← 원본 자료 (직접 만들고 채워넣음)
│   ├── KPI지표.xlsx
│   ├── 사례리서치.pdf
│   └── 메시지요약.md
├── src/slides/                ← Claude가 생성한 React 슬라이드 (자동)
│   ├── Slide01.tsx
│   ├── ...
│   └── index.ts               ← 슬라이드 registry
├── output/                    ← 완성물 (자동 생성)
│   └── <주제명>/
│       ├── index.html         ← 단일 HTML 빌드
│       └── <주제명>.pptx      ← /slide Step 6에서 자동 생성 (또는 /export-pptx 단독 호출)
└── ...
```

폴더 이름은 한글/영어 무관. **원본은 `inputs/`, 결과물은 `output/<주제>/`**로 분리만 지키면 됩니다.

### 시나리오 A. 분기 사업 리뷰 덱

```
inputs/
├── 4분기_재무.xlsx
└── 리스크_리스트.md
```

```
inputs/ 자료 보고 Q4 사업 리뷰 12장 만들어줘.
4분기_재무.xlsx 요약 시트로 KPI 대시보드 한 장,
리스크는 매트릭스로, 결론은 투자 승인 요청.
```

### 시나리오 B. 사내 AI 도입 발표

```
inputs/
├── 도입사례.csv
└── 메시지초안.md
```

```
사내 AI 도입 성과 발표 10장. 이미지 표지 + 도입 전후 비교 +
KPI 4개 + 사례 6개 + 로드맵 + 클로징.
```

### 시나리오 C. 숫자만 있고 스토리는 모를 때

```
inputs/
└── 5년_매출.csv
```

```
5년_매출.csv만 보고 핵심 메시지 5장으로 뽑아줘. 추세, 변곡점, 이상치 중심.
```

### 결과가 마음에 안 들면 바로 수정

```
슬라이드 4를 KPI 대시보드 패턴으로 바꿔줘. 전년 대비 화살표 포함.
```

```
슬라이드 7의 세 번째 카드를 accent로 바꿔줘 (시선 앵커).
```

```
전체적으로 카드 그림자 다 빼고, 그라디언트 잔존하는 거 있으면 제거.
```

```
영문판도 같이 만들어줘. 구조·숫자는 동일하게.
```

대화하듯 계속 다듬을 수 있습니다.

---

## 자주 묻는 질문

**Q. Pencil MCP가 꼭 있어야 하나요? React로 직행하면 안 되나요?**
A. 안 됩니다. `/slide` 스킬은 정책상 **Pencil 프레임 수 == TSX 파일 수 == 계획 슬라이드 수**가 정확히 일치해야 진행합니다. Pencil이 없으면 즉시 파이프라인을 중단하고 사용자에게 경고합니다 (지난 사고 학습 — `docs/solutions/workflow/sol-20260424-001.md`). Pencil 없이 슬라이드가 필요하면 자매 프로젝트인 `slide-html` 또는 `slide-svg`를 사용하세요.

**Q. 디자인 색상·폰트를 우리 회사 브랜드로 바꾸고 싶어요.**
A. `/theme-init`을 쓰세요. 디자인 가이드 마크다운(필수)과 선택적 .pen 파일을 주면, 토큰·HARD RULES·테마 룰·references 폴더·.pen·SKILL.md THEME 블록 6개 지점을 일괄 갱신하고 빌드 검증까지 합니다. 수동 편집은 금지 — 6곳이 어긋나면 슬라이드가 일관성을 잃습니다.

**Q. 슬라이드 개수를 지정할 수 있나요?**
A. 네. "10장으로", "15슬라이드짜리"라고 말하면 그대로 만듭니다. 미지정 시 주제 분량에 맞게 4장 이상으로 자동 결정.

**Q. 영어 덱도 만들 수 있나요?**
A. 네. 한국어로 요청하면서 "영문으로 만들어줘"라고 하거나, 영어로 요청하면 영어 덱이 나옵니다. 폰트는 Arial로 동일.

**Q. 완성된 PPTX를 직접 편집할 수 있나요?**
A. 네, 일반 `.pptx` 파일이라 PowerPoint/Keynote/Google Slides에서 자유롭게 편집·발표 가능합니다.

**Q. 기밀 데이터인데 안전한가요?**
A. 파일은 모두 로컬에서 처리됩니다. 단, Claude와의 대화 내용은 AI 응답을 받기 위해 Anthropic 서버로 전달됩니다. 회사 보안 정책에 따라 판단하세요.

**Q. 이전 슬라이드 덱을 삭제하지 않고 보존할 수 있나요?**
A. 네. `src/slides/_archive/` 또는 `src/slides/_backup-<timestamp>/` 폴더로 옮기면 registry에서 제외되어 빌드에 포함되지 않습니다 (`.gitignore`로 timestamped backup은 제외 처리됨).

---

## 라이선스 & 기여

- **버그 리포트·패턴 제안:** GitHub 이슈 환영
- **PR:** 디자인 시스템 추가, 패턴 추가, 회고 기록 환영
- **테마 교체 제안:** `/theme-init` 사용법은 `.claude/skills/theme-init/SKILL.md` 참조

