# slide-pencil

> **Pencil CLI × React/Tailwind 기반의 16:9 슬라이드 디자인 시스템.**
> Claude Code 채팅창에 "AI 트렌드 슬라이드 만들어줘"라고 한 줄만 입력하면,
> Pencil CLI가 디자인 → React 컴포넌트로 변환 → Vite 단일 HTML 빌드 →
> 필요하면 PPTX·PDF로까지 변환해서 `output/<주제>/` 폴더에 떨어뜨립니다.
> 파워포인트를 한 장씩 그릴 필요도, 디자인 감각도, 코딩 지식도 필요 없습니다.
> **VS Code 확장 의존 없이 어떤 셸에서든 동작** — 터미널·Claude Code 데스크탑·Cursor·OpenClaw 모두 OK.

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
  - Google Slides (`/upload-drive` 실행 시) — Drive 자동 업로드 + Slides 변환

**예시 한 줄:**
> "사내 AI 도구 도입 효과 슬라이드 12장 만들어줘. KPI 위주로."

↓ 1~3분 후 ↓

→ `output/사내-AI-도입/index.html` 생성. 표지 → 컨텍스트 → KPI 대시보드 →
사례 카드 → 로드맵 → 클로징 12장이 Jangpm 디자인 시스템(모노크롬 + accent `#4633E3`)으로 통일되어 들어 있습니다.

---

## 디자인 시스템 — Jangpm

이 저장소의 활성 테마는 **Jangpm Slide Design System**입니다. 한 마디로:
**"맥킨지 표지처럼 임팩트, 본문은 미니멀 모노크롬, 강조는 단 한 가지 색."**

| 항목 | 값 |
|---|---|
| 뷰포트 | **1280×720 (16:9)** 고정 |
| 폰트 | **Arial** (한글: Apple SD Gothic Neo / Malgun Gothic 폴백) |
| 강조색 | **`#4633E3`** — 한 슬라이드당 1~2회만 사용 |
| accent-soft | `#E8E5FC` — 강조 카드 배경 |
| 모드 | **라이트 전용** (다크 배경 슬라이드 금지) |
| 카드 | 12px radius · 24px padding · 1px border |
| 그림자 | `shadow-sm/md/lg` 3단계만, 데이터 강조 카드에 sparse 사용 |
| 아이콘 | 인라인 SVG (stroke `currentColor`, 2px). **이모지·유니코드 장식 기호 금지** |
| Governing Message | 모든 콘텐츠 슬라이드 하단에 1줄 요약 (`SlideShell`의 `gm` prop) |

**타이포 스케일 (시맨틱 클래스 우선):**

| 클래스 | 크기 | 굵기 | 용도 |
|---|---|---|---|
| `.display` | 56px | 800 | 커버·섹션 타이틀 |
| `.display-sm` | 40px | 800 | KPI 큰 숫자 |
| `.headline` | 32px | 700 | h2 (콘텐츠 슬라이드 헤딩) |
| `.title` | 18.4px | 600 | 카드 제목 |
| `.body` | 15.2px | 400 | 본문 |
| `.caption` | 12.8px | 500 | 라벨 / Governing Message |

> 시각 레퍼런스의 단일 진실 원천(SSOT)은 프로젝트 루트의 **`jangpm-design-system.pen`** 파일과
> **`.claude/skills/slide/references/jangpm/theme-rules.md`** 입니다.
> 다른 디자인 시스템으로 바꾸려면 → **`/theme-init`** 사용 (수동 편집 금지).

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

### 4단계. Pencil CLI 설치 (필수)

`/slide` 스킬은 **Pencil CLI** (`@pencil.dev/cli`)로 디자인합니다. CLI 없이는 React로 직행하지 않고 즉시 파이프라인을 중단합니다 (스킬 정책).

```bash
npm install -g @pencil.dev/cli
pencil login            # 이메일+비밀번호 또는 OTP, 인터랙티브
pencil status           # "● Active" 떠야 ready
```

- 인증 토큰은 `~/.pencil/`에 저장되고 이후 세션에서 자동 재사용됩니다.
- 비인터랙티브 환경(CI 등)에선 `PENCIL_CLI_KEY` env var로 대체 가능.
- VS Code 확장 / 데스크탑 앱 설치 불필요 — **어떤 셸에서든 동작**합니다.

> 💡 호출 메커니즘 (heredoc 패턴·`save()` async·실패 모드)은 `.claude/skills/slide/references/pencil-cli.md` 단일 진실 원천에 모여 있습니다.

### 5단계. AI 이미지 생성 — `/codex-image` (기본값, API 키 불필요)

`/slide` Step 3.5(Image_Generator)는 슬라이드가 외부 AI 이미지를 React `<img>`로 직접 임베드해야 할 때 자동으로 codex-image 경로를 호출합니다 (Pencil 내부 G() 이미지와는 다른 슬롯).
**API 키 발급·관리 없이 Codex CLI OAuth(ChatGPT 로그인)만으로** `gpt-image-2`를 호출합니다.

**최초 1회 준비 (한 번만 하면 됩니다):**

```bash
npm install -g @openai/codex      # Codex CLI 설치
codex login                        # ChatGPT 계정으로 OAuth 인증 (브라우저 자동 오픈)
codex login status                 # "Logged in using ChatGPT" 표시되면 끝
```

`codex login`은 OAuth 토큰을 `~/.codex/auth.json`에 한 번 저장하고, 이후 모든 이미지 호출은 그 토큰을 자동 재사용합니다.
**`sk-*` 형식 API 키는 어디에도 저장되지 않습니다.** Codex OAuth 토큰은 ChatGPT 세션 토큰이라 OpenAI REST API로 직접 던지면 401이 떨어지지만, `codex exec`의 내부 브릿지가 OAuth → 내장 `image_gen` 도구 → `gpt-image-2` 경로로 라우팅해줍니다.

`/slide` 외에 직접 호출하고 싶을 때는 Claude Code 채팅창에 그대로:

```
/codex-image cherry blossom hanok courtyard, golden afternoon light
/codex-image --size 1536x1024 --quality high aerial view of jeju coastline
```

`/slide` Step 3.5가 슬라이드별로 호출할 때는 슬롯명을 그대로 파일명으로 박습니다 — `--out src/images --filename <slot>` 형태라 빌더가 미리 결정한 슬롯명이 그대로 파일로 떨어집니다. 타임스탬프 파일명은 만들지 않습니다 (마크업 참조 무결성).

**사이즈 매핑 (gpt-image-2는 이 세 사이즈만 지원):**

| 슬롯 형태 | `--size` | 슬라이드 처리 |
|---|---|---|
| 16:9 풀-블리드 / 헤로 | `1536x1024` | React `<img>` + `object-fit: cover`로 1280×720 영역에 크롭 |
| 1:1 카드/타일 | `1024x1024` | 그대로 사용 |
| 3:4 세로 카드 / 포트레이트 | `1024x1536` | 그대로 사용 |

**슬롯 타입별 스타일 어댑터** (자동 적용 — 사용자 입력 불필요):
- **illustration / diagram** — `minimal flat line-art, muted pastel tones aligned with #4633E3 indigo accent, transparent background`. negative에 `photograph, photorealistic` 포함
- **photography** — `editorial photography, natural lighting, muted tones`. negative에서 `photograph, photorealistic` 제외 (그렇지 않으면 모델이 사진을 거부)

| 증상 | 해결 |
|---|---|
| `auth expired` / 401 | `codex login` 재실행 (토큰 갱신) |
| `NOT_FOUND` | `npm install -g @openai/codex` |
| 트러스트 오류 | 스킬이 `--skip-git-repo-check` 사용 — 자세한 내용은 `.claude/skills/codex-image/README.md` |

**스킬 위치:** `.claude/skills/codex-image/` (이 저장소에 vendored. 업스트림: [wjb127/codex-image](https://github.com/wjb127/codex-image))
**비용:** ChatGPT Plus/Team/Enterprise 계정의 OpenAI 사용량에 청구 (`1024x1024 high` ≈ $0.04, `1536x1024 high` ≈ $0.06).

codex CLI 미설치 또는 `codex login` 미인증 상태면 슬라이드의 외부 이미지 슬롯은 **Pencil 내부 `G()` 이미지** 또는 **placeholder `<div>`** 로 대체됩니다 (파이프라인 자체는 계속 진행). 필요하면 슬롯 경로(`src/images/<slot>.png`)에 직접 그린·다운로드한 이미지를 떨궈도 됩니다.

### 6단계. (선택) PPTX·PDF·Drive 변환을 위한 부가 도구

| 변환 종류 | 필요 도구 | 설치 |
|---|---|---|
| PPTX | `pptxgenjs` (이미 `package.json`에 포함) | `npm install`로 자동 설치 |
| PDF | Playwright 브라우저 | `npx playwright install chromium` |
| Google Slides 업로드 | `gws-drive-upload` 스킬 + Google 인증 | Claude Code Skills 안내 따라 인증 |

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

Claude는 자동으로 다음 단계를 순서대로 실행합니다 (간단 모드 기준 — 체계적 모드는 Step 1이 plan 흡수로 대체):

1. **주제 분석 + 구조 설계** — 슬라이드 수, 패턴 배치 계획 수립
2. **Pencil 환경 준비** — `jangpm-design-system.pen`을 열어 토큰 흡수
3. **슬라이드 디자인** — Pencil에서 1280×720 프레임 N개 생성
3.5. **(선택) AI 이미지 생성** — 외부 AI 이미지가 필요한 슬롯에만. `/codex-image` 스킬(Codex CLI OAuth → `gpt-image-2`, **API 키 불필요**)이 슬롯별로 1장씩 호출 — 자세한 셋업은 위 "5단계" 참조
4. **React 변환** — `src/slides/Slide01.tsx` ~ `SlideNN.tsx` 작성
5. **빌드 + 출력 폴더 정리** — `output/<주제>/index.html` 생성

### 운영 체크 — Pencil CLI와 WorkOS 3-pipeline 실행

`slide-pencil`은 Pencil CLI가 핵심 단계입니다. CLI 없이 React로 바로 우회하면 full pipeline으로 보지 않습니다.

- 시작 전 `pencil status`를 실제 셸에서 호출해 `● Active` 인지 확인합니다. `which pencil`/`pencil --version`만으로는 인증 끊김을 못 잡으므로 금지.
- `Not authenticated` / `command not found: pencil`이면 사용자에게 `npm install -g @pencil.dev/cli` + `pencil login` 안내 후 즉시 blocked 처리합니다.
- `pencil interactive` 호출이 transport/IPC 에러로 실패하면 1회 실패로 blocked 처리하지 않고 최대 2회 재시도합니다.
- 저장된 `.pen`이 0바이트면 heredoc의 `save()` ~ `exit()` 사이 `sleep 1` 누락이므로 호출 재구성 후 재시도합니다 (`.claude/skills/slide/references/pencil-cli.md` "왜 sleep 1이 필요한가").
- `content_ready`: Pencil top-level frame 수가 계획한 슬라이드 수와 일치해야 합니다.
- `built`: React/Tailwind 변환 후 Vite build가 성공해야 합니다.
- `verified`: manifest slide count와 `unzip -t <deck>.pptx`가 통과해야 합니다.
- 병렬 worker가 hook 오류를 내거나 2분 이상 파일 변화 없이 정체하면, 같은 폴더에서 메인 세션이 CLI preflight부터 이어받아 완료합니다.

#### WorkOS 3-pipeline용 상태 추적

WorkOS에서 `slide-html`, `slide-svg`와 함께 병렬 실행할 때는 `pipeline_status.json` 또는 동등한 상태 파일에 최소한 다음 필드를 남깁니다.

```text
pipeline
project_slug
status
updated_at
planned_slide_count
actual_content_count
pptx_path
verification
blocked_reason
source_artifacts
```

상태는 `preflight → initialized → content_ready → built → pptx_ready → verified → uploaded` 순서로 올립니다. Slack 스레드나 원격 턴이 중간에 끊겨도 작업 세션은 계속 살아 있어야 하며, scaffold 생성만으로 `content_ready` 이상을 기록하면 안 됩니다.

#### Pencil-native 단계와 Export 단계

`slide-pencil` 완료 판정은 두 단계를 분리합니다.

1. Pencil-native 단계: `.pen` 파일에 계획 장수와 같은 top-level frame이 실제로 있어야 합니다.
2. Export 단계: Pencil frames를 React/HTML/manifest/PPTX 또는 PNG/SVG/PDF/PPTX로 변환하고, 최종 PPTX가 `unzip -t`를 통과해야 합니다.

Pencil-native 단계가 실패했는데 Export 단계만 성공한 경우에는 `verified`로 부르지 말고 `fallback` 또는 `partial`로 기록합니다.

#### Pencil CLI 복구 runbook

1. `pencil status` — `● Active`만 ready로 본다.
2. `Not authenticated` / 인증 만료면 `pencil login` (인터랙티브) 또는 `PENCIL_CLI_KEY` env var 설정.
3. `command not found: pencil`이면 `npm install -g @pencil.dev/cli`로 재설치.
4. `pencil interactive --out /tmp/probe.pen <<< 'get_editor_state({ include_schema: false })'` 1줄 probe로 transport 확인.
5. 저장된 .pen이 0바이트면 heredoc에 `save()` 뒤 `sleep 1` 누락 — `.claude/skills/slide/references/pencil-cli.md` 패턴 그대로 사용.
6. 그래도 실패하면 `npm view @pencil.dev/cli version`과 `pencil version` 비교 후 CLI 업그레이드.

### 추가로 변환하기

```
/slide-plan            ← (체계적 모드) /slide 호출 전 plan 먼저 만들고 사용자 검토. 결과: output/<주제>/slide_plan.json
/export-pptx           ← React 슬라이드 → PowerPoint (.pptx) 단독 재변환 (보통은 /slide가 자동 생성)
/export-pdf            ← React 슬라이드 → PDF (페이지당 1장)
/upload-drive          ← PPTX → Google Drive 업로드 + Slides 변환
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

**Q. Pencil CLI가 꼭 있어야 하나요? React로 직행하면 안 되나요?**
A. 안 됩니다. `/slide` 스킬은 정책상 **Pencil 프레임 수 == TSX 파일 수 == 계획 슬라이드 수**가 정확히 일치해야 진행합니다. CLI가 없거나 인증이 끊겨 있으면 즉시 파이프라인을 중단하고 사용자에게 경고합니다 (지난 사고 학습 — `docs/solutions/workflow/sol-20260424-001.md`). Pencil 없이 슬라이드가 필요하면 자매 프로젝트인 `slide-html` 또는 `slide-svg`를 사용하세요.

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

## 어떤 슬라이드 패턴을 만들어주나요? — 29개 Jangpm 패턴

Claude가 자동으로 골라주지만, 직접 지정하고 싶으면 패턴 ID로 부르면 됩니다.
패턴 HTML 원본은 `.claude/skills/slide/references/jangpm/patterns/`에 있습니다.

### 🪪 표지·구조 슬라이드
- **01-title** — 메인 표지 (큰 제목 + 부제 + 메타데이터)
- **13-cover-vertical** — 세로형 표지 (이미지 강한 슬라이드용)
- **02-agenda** — 목차
- **03-section** — 섹션 구분 (큰 번호 + 섹션 타이틀)
- **11-summary** — 요약 슬라이드
- **12-closing** — 클로징
- **21-closing-big** — 큰 한 줄 클로징

### 🧱 그리드 카드 (고밀도 패턴 — 콘텐츠의 30% 이상 의무)
- **04-three-point** — 3분할 카드
- **04b-four-point** — 4분할 카드
- **07b-six-point** — 6분할 카드
- **15-matrix-trends** — 트렌드 매트릭스
- **20-kpi-dashboard** — KPI 4~8개 타일

### 📊 데이터·테이블 패턴
- **06-stats** — 큰 숫자 + 본문
- **07-table** — 비교 테이블
- **16-forecast-table** — 실적 + 전망 테이블
- **17-pnl** — 손익 테이블
- **18-seasonal** — 계절성 차트형 테이블

### 🔁 비교·프로세스
- **05-comparison** — 좌우 비교 (Before/After, Option A/B)
- **09-process** — 프로세스 흐름도 (3~6단계)
- **19-paired-concept** — 짝개념 카드

### 📝 진행·체크리스트
- **10-checklist** — 체크리스트
- **08a-exercise-1up** — 실습 슬라이드 (1단)
- **08b-exercise-2up** — 실습 슬라이드 (2단)

### 🖼 이미지·인용
- **08-quote** — 인용 슬라이드
- **22-image-1up** — 이미지 1장 풀폭
- **23-image-2up** — 이미지 2장
- **14-overview-split** — 좌우 분할 (이미지 + 본문)

### 💻 데모·기술 콘텐츠
- **24-terminal-split** — 터미널 + 설명 분할
- **25-terminal-full** — 터미널 풀스크린

> **다양성 룰:** 연속 동일 패턴 금지(section 예외), 8장 이하 → 3종 이상, 10장 이상 → 4종 이상, 고밀도 grid 패턴은 콘텐츠의 30% 이상.

---

## 저장소 구조

```
slide-pencil/
├── .claude/
│   └── skills/
│       ├── slide/                 ← /slide 스킬 (활성 테마 기반 슬라이드 생성)
│       │   ├── SKILL.md
│       │   └── references/
│       │       └── jangpm/
│       │           ├── DESIGN.md          ← slide-plan 입력 사양 (10개 섹션 통합본)
│       │           ├── theme-rules.md     ← Jangpm 단일 진실 원천
│       │           ├── reference/         ← 원본 MD (design-system, anti-slop, patterns, ...)
│       │           ├── patterns/          ← 29개 패턴 HTML (canonical 시각 레퍼런스)
│       │           └── assets/
│       ├── slide-plan/            ← (체계적 모드) slide_plan.json 생산. /slide의 선택적 prerequisite
│       ├── theme-init/            ← 활성 테마 일회성 교체 (디자인 시스템 갈아끼우기)
│       ├── export-pptx/           ← PPTX 단독 변환 진입점 (thin entry; 룰·스크립트는 slide 스킬에 있음)
│       ├── export-pdf/            ← React → PDF (Playwright)
│       └── upload-drive/          ← PPTX → Google Drive + Slides 변환
│
├── src/
│   ├── slides/
│   │   ├── Slide01.tsx ~ Slide15.tsx   ← 활성 슬라이드 (15장 패턴 데모 덱)
│   │   ├── index.ts                    ← 슬라이드 registry (빌드 시 import 순서)
│   │   ├── _archive/                   ← 이전 슬라이드 보관 (registry 제외)
│   │   └── _backup-<timestamp>/        ← 작업 중 백업 (gitignore)
│   ├── components/
│   │   └── slide-system.tsx            ← 공통 프리미티브 (SlideShell, Card, NumberBadge, ...)
│   ├── images/                         ← Pencil에서 export한 슬라이드 이미지
│   ├── App.tsx                         ← #slides-root 렌더링 (export-pptx 시각 비교 캡처 기준)
│   ├── index.css                       ← 디자인 토큰 (THEME 블록 = 활성 테마 영역)
│   └── main.tsx
│
├── docs/
│   ├── theme-replacement-map.md   ← /theme-init이 건드리는 6개 교체 지점 + 토큰 컨트랙트 v1
│   └── solutions/                 ← /reflect 학습 기록 (sol-YYYYMMDD-NNN.md)
│
├── output/                        ← 빌드 결과물 (주제별 폴더)
│   └── <주제명>/
│       ├── index.html
│       └── <주제명>.pptx
│
├── jangpm-design-system.pen       ← Pencil 시각 레퍼런스 (Jangpm SSOT)
├── CLAUDE.md                      ← 에이전트용 HARD RULES + 프로젝트 맥락
├── README.md                      ← (이 파일)
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## 핵심 제약 (HARD RULES)

`CLAUDE.md`에 정의된 위반 금지 규칙. 슬라이드 작성 시 매 슬라이드마다 자기 점검합니다.

- **V1. 모든 콘텐츠 카드는 시각 앵커 1개 이상 포함** — SVG 아이콘, NumberBadge/AccentBadge, 또는 pill 태그 중 최소 하나. 큰 숫자만 있는 카드는 미달.
- **V2. 하드코드 hex 절대 금지** — 모든 색상은 `var(--*)` 토큰 참조. `text-[#059669]`, `bg-[#2a2a2a]` 같은 패턴은 빌드 검증에서 차단. (예외: terminal 패턴 내부 chrome 색상만)
- **NO supertitle** — 헤딩 위에 소형 카테고리 라벨을 별도 div로 두지 않음. 태그가 필요하면 `SectionHeader`의 `tag` prop으로 헤딩 오른쪽에 배치.
- **No gradient / glow / decorative animation** — 그림자는 `shadow-sm/md/lg` 3단계만, 데이터 강조 카드에 sparse 적용.
- **No emoji / no unicode decoration** — `→`, `✓`, `★` 같은 문자 장식 금지. 인라인 SVG (stroke `currentColor`, 2px) 사용.
- **Light mode only** — 모든 슬라이드(커버·클로징 포함) 루트 배경은 `var(--bg)` 또는 `var(--surface)`. 다크 배경 금지.
- **Governing Message 의무** — 커버/섹션/클로징 외 모든 콘텐츠 슬라이드는 하단에 1줄 요약(`SlideShell`의 `gm` prop) 필수.
- **카드 그리드 차별화** — 4개 이상 카드 그리드에서 1개는 반드시 `tone="accent"`로 시선 앵커.

자세한 내용은 `CLAUDE.md` 및 `.claude/skills/slide/references/jangpm/theme-rules.md` 참조.

---

## 학습된 사고 사례 (Past Learnings)

`/reflect` 스킬로 누적된 회고 — 같은 실수를 반복하지 않기 위해 자동 로드됩니다.

- **sol-20260424-001** — Pencil 프레임이 부족할 때 1장만 Pencil로 만들고 나머지를 React로 직행하지 말 것. 항상 `Pencil 프레임 수 == TSX 파일 수` 일치 검증.
- **sol-20260424-002** — Pencil horizontal row 프레임에 `width: fill_container` 누락 시 텍스트가 세로로 찌부러짐. 모든 horizontal row에 명시.
- **sol-20260422-001** — Legacy cleanup 전에는 반드시 grep으로 참조 검증 후 삭제.

전체 기록: `docs/solutions/<category>/<id>.md`

---

## 빌드 & 개발

```bash
npm install              # 의존성 설치 (한 번만)
npm run dev              # Vite 개발 서버 (Hot Reload)
npm run build            # 단일 HTML 빌드 (vite-plugin-singlefile)
npm run preview          # 빌드 결과 로컬 프리뷰
npm run compare:pptx     # PPTX vs HTML 시각 비교 (eval/pipeline/pptx-compare.js)
```

빌드 결과는 `dist/index.html`에 단일 파일로 떨어집니다 — 이미지·CSS·JS가 모두 인라인되어 어디든 그대로 옮겨 쓸 수 있습니다.

---

## 자매 프로젝트

이 저장소는 **WorkOS 슬라이드 3대 파이프라인** 중 하나입니다. 같은 주제로 세 가지 다른 결과물을 동시에 만들 수 있습니다.

| 프로젝트 | 입력 → 출력 | 강점 |
|---|---|---|
| **slide-pencil** (이 저장소) | 자연어 → Pencil → React/Tailwind → HTML/PPTX/PDF | 디자인 일관성, 시각 레퍼런스 기반, 토큰 컨트랙트 |
| **slide-html** | 자연어 → Reveal.js HTML | 발표 인터랙션, 트랜지션, 단일 HTML로 즉시 발표 |
| **slide-svg** | 자연어 → 네이티브 SVG → DrawingML PPTX | 파워포인트 네이티브 편집성, 도형 단위 정밀도 |

WorkOS 루트에서 "슬라이드 만들어줘"라고 요청하면 3개를 병렬 실행합니다.

---

## 라이선스 & 기여

- **버그 리포트·패턴 제안:** GitHub 이슈 환영
- **PR:** 디자인 시스템 추가, 패턴 추가, 회고 기록 환영
- **테마 교체 제안:** `/theme-init` 사용법은 `.claude/skills/theme-init/SKILL.md` 참조

---

<details>
<summary>🛠 개발자용 (스킬 내부 구조 · 토큰 컨트랙트 · 변환 파이프라인)</summary>

### 토큰 컨트랙트 v1

`docs/theme-replacement-map.md`에 정의된 9개 토큰은 **테마와 무관하게 항상 같은 의미**로 유지되어야 합니다:

| 토큰 | 의미 |
|---|---|
| `--bg` | 페이지 배경 |
| `--surface` | 카드 기본 배경 |
| `--surface-alt` | 카드 alt 배경 (연회색) |
| `--text` | 본문 텍스트 |
| `--text-secondary` | 보조 텍스트 |
| `--border` | 카드·디바이더 테두리 |
| `--accent` | 강조색 (테마별 단일값) |
| `--accent-soft` | 강조 카드 배경 |
| `--accent-ink` | 강조 위 텍스트 |

`/theme-init`은 이 9개 키 이름을 유지한 채 값만 새 테마로 교체합니다.

### 6개 교체 지점 (`/theme-init`이 건드리는 곳)

1. `src/index.css` — THEME 블록 (토큰 값)
2. `CLAUDE.md` — HARD RULES (강조색, 폰트 등 인라인 사실)
3. `.claude/skills/slide/SKILL.md` — `<!-- THEME:START -->` ~ `<!-- THEME:END -->` 블록
4. `.claude/skills/slide/references/<theme>/theme-rules.md` — 새 테마의 단일 진실 원천 (template은 `.claude/skills/theme-init/references/theme-rules-template.md`)
5. `.claude/skills/slide/references/<theme>/` — patterns/, reference/, assets/ 등 자산 디렉토리
6. 프로젝트 루트의 `*.pen` 파일 — Pencil 시각 레퍼런스

3곳(`src/index.css` THEME 블록 / `CLAUDE.md` HARD RULES / `slide/SKILL.md` THEME 블록)의 사실 동기화 규칙은 `docs/theme-replacement-map.md`에 명시.

### `/slide` 5단계 워크플로우

```
Step 1: 주제 분석 + 구조 설계 (LLM)
  ├─ 슬라이드 수 결정
  ├─ 패턴 배치 계획 (29개 중 다양성 + 30% 고밀도 룰)
  └─ 톤 시퀀스 (light/neutral 모드만)

Step 2: Pencil 환경 준비 (Pencil CLI interactive heredoc)
  ├─ pencil interactive --in jangpm-design-system.pen ...   ← 시각 레퍼런스 흡수
  ├─ pencil interactive --out output/<slug>/pencil-new.pen  ← 출력 .pen 생성
  └─ set_variables                                          ← src/index.css 토큰 주입

Step 3: 슬라이드 디자인 (Pencil CLI interactive heredoc)
  ├─ 슬라이드별 batch_design (1280×720 프레임)
  ├─ 이미지 필요 시 G(nodeId, "ai", "프롬프트")
  └─ export_nodes로 PNG 추출 → Read tool로 시각 검증

  → 게이트: Pencil top-level Slide* 프레임 수 == 계획 N

Step 4: React 컴포넌트 생성 (Write tool)
  ├─ 패턴 HTML 로드 (단일 진실 원천)
  ├─ pen-to-react.md 매핑 규칙으로 변환
  ├─ src/slides/SlideNN.tsx 작성
  └─ src/slides/index.ts 업데이트

  → bash 검증: B-pencil / B4 / B5 / B6 / B7 / B9 / B-gm / B10 / B-dark

Step 5: 빌드 + 출력 폴더 정리
  ├─ npm run build
  └─ output/<주제>/index.html 복사
```

### PPTX 변환 파이프라인 (/slide Step 6 또는 /export-pptx 단독)

```
src/slides/SlideNN.tsx
        ↓ (handcraft, slide 스킬 references/pptx-build.md 룰)
output/<주제>/<주제>-manifest.json
        ↓
.claude/skills/slide/scripts/check-manifest.js  (5/5 PASS까지 자동 수정)
        ↓
.claude/skills/slide/scripts/rasterize-svg-images.mjs  (SVG 있을 때)
        ↓
.claude/skills/slide/scripts/convert.js (pptxgenjs)
        ↓
output/<주제>/<주제>.pptx
```

시각 비교(선택): `.claude/skills/export-pptx/scripts/pptx-screenshot.js` + `pptx-compare.js`로 HTML vs PPTX 슬라이드별 PNG diff.

> 매니페스트는 슬라이드별로 직접 작성합니다. 빌더 스크립트로 일괄 생성 금지 — 퀄리티 우선 (`feedback_export_pptx_handcraft_only.md`).

### 검증 스크립트 (Step 4 끝에서 자동 실행)

```bash
# B-pencil: Pencil 프레임 수 == TSX 파일 수
PENCIL_SLIDE_COUNT=N python3 -c "..."

# B4: 12px 미만 하드코드 폰트 (jangpm 캡션 12.8px 최소)
# B5: 이모지/유니코드 장식 기호 금지
# B6: 1920×1080 레거시 뷰포트 잔존 체크
# B7: 고밀도 grid 패턴 3장 이상
# B9: 콘텐츠 슬라이드 h2가 .headline 사용
# B-gm: 콘텐츠 슬라이드 .gm 포함
# B10: supertitle 패턴 (헤딩 위 라벨) 금지
# B-dark: 슬라이드 루트 dark 배경 금지
```

### Tech Stack

```
React 19 + TypeScript 5.7
Tailwind CSS 4 (@tailwindcss/vite)
Vite 6 + vite-plugin-singlefile
Playwright 1.58 (PPTX 캡처 / PDF 변환)
pptxgenjs 4.0
```

### 주요 경로 한눈에

```
.claude/skills/slide/SKILL.md                        ← /slide 스킬 정의 (Step 1.0에서 plan 모드 자동 감지)
.claude/skills/slide/references/jangpm/DESIGN.md      ← slide-plan 입력 사양 (10 섹션 통합)
.claude/skills/slide/references/jangpm/theme-rules.md ← 활성 테마 룰
.claude/skills/slide/references/jangpm/patterns/      ← 29개 패턴 HTML
.claude/skills/slide-plan/SKILL.md                   ← (체계적 모드) plan 생산 스킬
.claude/skills/theme-init/SKILL.md                   ← 테마 교체 (DESIGN.md 자동 초안 + 검토 포함)
.claude/skills/export-pptx/SKILL.md                  ← PPTX 단독 진입점 (thin entry)
.claude/skills/slide/references/pptx-build.md         ← PPTX 빌드 룰 single source
.claude/skills/slide/scripts/{convert,check-manifest,rasterize-svg-images}  ← 변환 스크립트
.claude/skills/export-pdf/SKILL.md                   ← PDF 변환
.claude/skills/upload-drive/SKILL.md                 ← Drive 업로드
src/components/slide-system.tsx                      ← 공통 프리미티브
src/index.css                                        ← 디자인 토큰
docs/theme-replacement-map.md                        ← 테마 교체 컨트랙트
docs/solutions/                                      ← /reflect 회고 기록
```

</details>
