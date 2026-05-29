---
name: theme-init
description: 활성 디자인 테마를 새로운 디자인 시스템으로 일회성 교체. 사용자가 제공한 디자인 가이드 MD(필수)와 선택적으로 .pen 파일을 받아 src/index.css 토큰, CLAUDE.md HARD RULES, SKILL.md 테마 요약, references/<테마>/ 디렉토리, 루트 .pen 파일을 일괄 교체한다. 사전 git branch 생성 + 빌드 검증 + 스크린샷 확인 후 커밋. Trigger on "/theme-init", "테마 교체", "테마 초기화", "디자인 시스템 바꿔", "새 디자인 적용", "디자인 가이드 올렸어".
---

# /theme-init — 활성 테마 일회성 교체

이 프로젝트는 **하나의 에이전트 = 하나의 테마**를 전제로 한다. `/theme-init`은 포크 직후 또는 리브랜딩 시점에 **한 번** 실행하여 **현재 활성 테마**(Step 0에서 자동 감지 — 최초 상태는 Jangpm, 이미 교체됐다면 그 테마)를 사용자의 디자인 시스템으로 영구 교체한다. **런타임 스위칭은 지원하지 않는다.** 여러 테마를 동시에 쓰려면 리포지토리를 각각 포크하여 각자 `/theme-init`을 돌린다.

> **`<active-theme>` 표기:** 이 문서 전반의 명령·경로에서 `<active-theme>`는 Step 0에서 감지한 **현재 활성 테마 슬러그**(예: 최초 `jangpm`, 한 번 교체 후면 `montage` 등)이고, `<new-theme>`는 이번에 새로 적용할 테마 슬러그다. 과거에 `jangpm`으로 하드코드돼 있던 from-theme 경로는 모두 `<active-theme>`로 일반화됐다 — 한 번 교체된 리포지토리에서도 재브랜딩이 깨지지 않는다.

## 트리거

- 슬래시 커맨드: `/theme-init` (새 테마 이름은 실행 중 확인)
- 자연어: "이 디자인으로 바꿔줘", "테마 교체해줘", "디자인 가이드 올렸어", "새 디자인 시스템 적용"

## 입력

### 필수
1. **디자인 가이드 마크다운 파일** — 자유 형식. 다음 내용 포함:
   - 테마 이름/설명 (한두 줄)
   - 컬러 팔레트 (최소: accent, bg, surface, text, border)
   - 폰트 패밀리 (sans, 선택적 mono)
   - 타이포 사이즈 스케일 (display / headline / title / body / caption 또는 그에 상응)
   - 철학·anti-slop (원하는 것·피하는 것)
2. **새 테마 이름** — kebab-case 슬러그 (예: `brutalist`, `minimal-mono`). 디렉토리·파일명에 사용.

### 선택
3. **`.pen` Pencil 파일** — 제공 시 Pencil CLI(`pencil interactive`)로 색/폰트/텍스트 스타일을 자동 추출하여 MD와 교차검증. 호출 패턴은 `../slide/references/pencil-cli.md` 참조.
4. **샘플 HTML/이미지** — 패턴 시드로 활용. 없으면 5종 기본 템플릿(cover/content/kpi/comparison/closing) 사용.

---

## 사전 안전장치 (Step 0)

워크플로우 시작 전 반드시:

0. **활성 테마 자동 감지 (`<active-theme>` 확정, HARD)** — 이후 모든 from-theme 경로의 기준. `jangpm`을 가정하지 말 것:
   ```bash
   # 1순위: CLAUDE.md THEME 마커의 name= (단일 진실 원천)
   ACTIVE_THEME=$(grep -oE 'THEME:START name=[a-z0-9-]+' CLAUDE.md | head -1 | sed 's/.*name=//')
   # 2순위(마커 누락 시 폴백): theme-rules.md를 가진 references 하위 디렉토리
   [ -z "$ACTIVE_THEME" ] && ACTIVE_THEME=$(basename "$(dirname "$(ls .claude/skills/slide/references/*/theme-rules.md | head -1)")")
   echo "active theme = $ACTIVE_THEME"
   ```
   - 두 신호가 불일치하면(마커 name과 디렉토리명이 다름) 사용자에게 어느 쪽이 맞는지 확인 후 진행. 추측 금지.
   - 이후 본 문서의 `<active-theme>`·`jangpm` 자리표시자는 모두 이 값으로 치환해 명령을 실행한다. 루트 `.pen`도 `<active-theme>-design-system.pen` (예: `jangpm-design-system.pen` 또는 `montage-design-system.pen`).
1. **git working tree 확인**: `git status --porcelain`
   - clean이면 Step 2 진행
   - dirty면 사용자에게 세 가지 옵션 제시:
     - **(권장) 스태시**: `git stash push -m "pre-theme-init"` → /theme-init 완료 후 `git stash pop`으로 복구
     - **먼저 커밋**: 관련 변경을 먼저 커밋 후 재시도
     - **강행(비권장)**: 이 경우 현재 dirty 변경이 theme-init 커밋에 섞여 rollback이 어려워짐. 명시적 사용자 동의 필요
2. 현재 브랜치명 기록: `git rev-parse --abbrev-ref HEAD` → 복귀용
3. 새 브랜치 생성: `git checkout -b theme-init/<new-theme-name>`
4. `docs/theme-replacement-map.md` 로드하여 교체 대상 7개 지점 확인 (#7 = README codex-image 팔레트 앵커)

---

## 워크플로우

### Step 1: 입력 분석

**처리 주체:** LLM (+ Pencil CLI if `.pen` 제공)

1. 디자인 가이드 MD 읽고 파싱
2. `.pen`이 있으면 — 한 번의 `pencil interactive` heredoc 안에서:
   ```bash
   ( cat <<'PENCIL'
   get_variables()
   search_all_unique_properties({ parents: ["document"], properties: ["color", "fontSize", "fontWeight", "fontFamily"] })
   PENCIL
   sleep 1; echo "exit()" ) | pencil interactive --in <path.pen> --out <path.pen>
   ```
   - `get_variables()` → 컬러/폰트 토큰 추출
   - `search_all_unique_properties(...)` → 실제 사용된 스타일 수집
3. 추출 결과를 **토큰 컨트랙트 v1** 이름으로 매핑 (`docs/theme-replacement-map.md`의 컨트랙트 섹션 참조):
   - Core: `--bg, --surface, --surface-alt, --text, --text-secondary, --text-tertiary, --border, --border-strong`
   - Accent: `--accent, --accent-soft, --accent-ink`
   - Semantic (data): `--positive(-soft), --negative(-soft), --warning(-soft)`
   - Typography: `--font-sans, --font-mono, --fs-display/-sm/-headline/-title/-body/-caption, --fw-*`
   - Layout: `--space-1~16, --radius-xs/sm/md/lg/xl/pill, --shadow-sm/md/lg, --card-padding/-gap/-radius`
4. **누락 토큰을 사용자에게 질문 (최대 5개).** 추측 금지. 예:
   - "accent-soft를 자동 생성할까요(accent의 알파 15%) 아니면 별도 값이 있나요?"
   - "본문 사이즈(fs-body) 기본값을 정해주세요"
   - "shadow 3단계 값이 가이드에 없습니다. 기본(`0 1px 2px`, `0 2px 8px`, `0 8px 24px`) 사용할까요?"
5. 철학 섹션 추출:
   - 가이드에서 "금지/지양/피한다" 류 키워드 → anti-slop 목록
   - "권장/필수/반드시" → positive rules
   - 커버 전략, 액센트 사용 규칙, 카드 구조 관련 문장 수집

### Step 2: 스캐폴딩 생성 (메모리)

6개 교체 지점의 새 내용을 준비. 파일 쓰기는 Step 4에서.

**(1) `src/index.css` THEME 블록**
- 마커 `/* THEME:START name=<new-theme> */` ... `/* THEME:END */` 사이를 새 토큰 값으로 재생성
- 토큰 **이름은 v1 계약대로 고정**, 값만 교체
- 시맨틱 타이포 클래스(`.display`, `.headline`, `.title`, `.body`, `.caption`, `.label-caption`) 유지 — 수치만 새 스케일

**(2) `CLAUDE.md` THEME 블록**
- 마커 `<!-- THEME:START name=<new-theme> -->` ... `<!-- THEME:END -->` 사이를 재생성
- 구성: "디자인 시스템: <new>" 소개 → "## 핵심 제약 (HARD RULES)" → "## 구현 원칙" → "## 디자인 참고 자산"
- **처방적 톤 유지.** "테마의 규칙을 따른다" 같은 일반화 금지 — 구체 수치·색상 명시 ("뷰포트 1280×720, 폰트 XXX 고정, accent #XXXXXX 슬라이드당 1~2회")

**(3) `.claude/skills/slide/SKILL.md` THEME 블록**
- 새 테마 요약(뷰포트·폰트·accent·타이포 스케일·카드·그림자) + 참고 자산 경로
- 경로: `<active-theme>-design-system.pen` → `<new-theme>-design-system.pen`

**(4) `.claude/skills/slide/references/<new-theme>/` 디렉토리**
- `references/theme-rules-template.md`를 읽어 플레이스홀더를 새 값으로 채워 `theme-rules.md` 생성
- `references/design-md-template.md`를 읽어 채워서 `DESIGN.md` 초안 준비 (Step 4.6에서 사용자 검토 후 저장)
- **`colors_and_type.css` (패턴 토큰 SSOT)** — `src/index.css` THEME 블록의 토큰 + **시맨틱 클래스 전체**를 **동일 값으로 미러**한 파일을 준비. `patterns/_slide.css`가 `@import url('../colors_and_type.css')`로 로드하므로 **이 파일이 없으면 패턴 HTML이 standalone 렌더 불가**(Step 4.5 스크린샷 검토 선행조건). Step 4.5 레이아웃 토큰도 여기에 합류.
  - **시맨틱 클래스 누락 0 (HARD, 드리프트 방지):** `src/index.css` THEME 블록의 클래스 셀렉터 집합(시맨틱 타이포 7종 `.display`/`.display-sm`/`.headline`/`.title`/`.body`/`.caption`/`.label-caption` **+** 유틸리티 컬러 `.text-accent`/`.trend-*` 등)과 1:1 대조해야 한다. 하나라도 빠지면 패턴 프리뷰와 빌드 결과가 어긋난다(과거 jangpm baseline이 `.label-caption`을 누락해 드리프트 발생 — 드라이런 발견). 클래스 목록은 하드코드하지 말고 생성 직전 `src/index.css` THEME 블록에서 실제 집합을 추출해 대조한다(검증 명령은 Step 4 #6 참조).
- 옵션: `reference/` 하위 design-system.md / anti-slop.md / patterns.md / libraries.md / visual-assets.md / export.md (기존 `<active-theme>` 디렉토리 구조 복제)
- `patterns/` 디렉토리:
  - 사용자가 HTML 샘플 제공 → 해당 HTML들을 5종 시드 중 적합한 자리에 배치
  - 없음 → 기본 5종 템플릿(cover/content/kpi/comparison/closing) 생성. 새 테마 토큰 사용.

**(5) 루트 `.pen` 파일 (시각 SSOT)**
- **사용자 제공 `.pen` 있음** → 그 파일을 `<new-theme>-design-system.pen`로 덮어쓴다. 사용자가 이미 새 테마 토큰으로 디자인했다고 전제하고 Pencil 자체 후처리 안 함.
- **사용자 제공 `.pen` 없음 (기본 경로)** → 기존 파일 삭제 후 Pencil CLI로 **5종 시드 슬라이드** (cover/content/kpi/comparison/closing) 자동 생성. 새 테마 토큰을 `set_variables`로 주입한 뒤 시드 프레임이 그 토큰을 참조하도록 박는다. 사용자가 Pencil 앱을 열어 손으로 그릴 필요 없음.
- 어느 경로든 Step 4 #7에서 실제 파일 생성. 호출 패턴은 `../slide/references/pencil-cli.md` 단일 진실 원천 참조 (heredoc + `sleep` rule).

**(6) `src/components/slide-system.tsx`**
- **자동 수정 금지.** Step 4 완료 후 사용자에게 수동 편집 가이드 제시 (아래 "수동 편집 가이드" 섹션 참조)

### Step 3: diff 미리보기

사용자에게 변경 요약을 표 형태로 제시:

```
제안된 교체: <active-theme> → <new-theme>

TOKEN 변경:
  --accent         #4633E3  →  #XXXXXX
  --font-sans      Arial    →  <new-font>
  --fs-display     56px     →  <N>px
  --fs-headline    32px     →  <N>px
  ... (주요 토큰 10개 정도만 요약)

FILE 교체:
  · src/index.css — THEME 블록 전체
  · CLAUDE.md — THEME 블록 전체
  · .claude/skills/slide/SKILL.md — THEME 블록
  · .claude/skills/slide/references/<active-theme>/  →  .../<new-theme>/
  · .claude/skills/slide/references/<new-theme>/colors_and_type.css (패턴 토큰 SSOT — src/index.css와 동일 값)
  · .claude/skills/slide/references/<new-theme>/patterns/*.html (Step 4.5 cover/closing/feature-board 재작곡)
  · .claude/skills/slide/references/<new-theme>/DESIGN.md (신규 — slide-plan 입력)
  · README.md — codex-image 일러스트 어댑터 팔레트 앵커 (#4633E3/indigo/pastel → 새 테마 accent/hue/무드)
  · <active-theme>-design-system.pen  →  <new-theme>-design-system.pen
    (사용자 .pen 미제공 시 Pencil CLI로 5종 시드 슬라이드 자동 생성)

유지되는 파일:
  · src/components/slide-system.tsx (수동 편집 필요 — 가이드 제공)
  · src/slides/SlideAgent*.tsx (기존 슬라이드 — 토큰 이름 고정이라 자동 반영, 필요시 개별 수정)
  · 인프라 파일 (package.json, vite.config.ts 등)

이대로 진행할까요? (y/n)
```

- **n**: 어떤 토큰/섹션을 수정할지 물어보고 Step 2로 돌아감. 3회 반복 후 중단.
- **y**: Step 4 진행.

### Step 4: 적용 (파일 쓰기)

1. `src/index.css` — Edit으로 THEME 마커 사이 내용 교체
2. `CLAUDE.md` — Edit으로 THEME 마커 사이 내용 교체 (마커 이름도 `name=<new-theme>`으로)
3. `.claude/skills/slide/SKILL.md` — Edit으로 THEME 마커 사이 내용 교체
4. 디렉토리 이동: `git mv .claude/skills/slide/references/<active-theme> .claude/skills/slide/references/<new-theme>` (`<active-theme>`는 Step 0에서 감지한 슬러그)
5. 새 테마 디렉토리의 `theme-rules.md` 덮어쓰기 (Write)
6. **`references/<new-theme>/colors_and_type.css` 생성 (HARD)** — `src/index.css` THEME 블록 토큰 + **시맨틱 클래스 전체**를 동일 값으로 미러(Write). 패턴 standalone 렌더 + Step 4.5 스크린샷 검토의 선행조건. `git mv`로 옮겨온 디렉토리에 이 파일이 없으면 반드시 새로 만든다.
   - **시맨틱 클래스 누락 0 검증 (HARD):** `src/index.css`의 **THEME 블록 안에서 정의된 모든 클래스 셀렉터**를 추출해 `colors_and_type.css`와 대조한다. 시맨틱 타이포(`.display`/…/`.label-caption`) **및** 유틸리티 컬러(`.text-accent`, `.trend-positive` 등)는 패턴 HTML이 참조하므로 전부 미러 대상이다. 누락이 1개라도 있으면 패턴 프리뷰=빌드 불일치(과거 jangpm `.label-caption` 누락 드리프트). THEME:START~THEME:END로 스코프하므로 `<active-theme>`이 무엇이든 동작한다:
     ```bash
     awk '/THEME:START/{f=1} /THEME:END/{f=0} f' src/index.css \
       | grep -oE '\.[a-zA-Z][a-zA-Z0-9-]*' | sort -u > /tmp/src-classes.txt
     grep -oE '\.[a-zA-Z][a-zA-Z0-9-]*' .claude/skills/slide/references/<new-theme>/colors_and_type.css \
       | sort -u > /tmp/mirror-classes.txt
     comm -23 /tmp/src-classes.txt /tmp/mirror-classes.txt   # src에만 있고 미러에 없는 클래스
     ```
     출력이 **비어 있어야** 통과(=src THEME 블록 클래스 중 미러에 없는 것 0). 비어 있지 않으면 누락 클래스를 `colors_and_type.css`에 추가한다. 현재 기준 시맨틱 타이포 7종(`.display`/`.display-sm`/`.headline`/`.title`/`.body`/`.caption`/`.label-caption`) + 유틸리티 컬러가 모두 잡혀야 한다.
   - **검증:** `references/<new-theme>/patterns/01-title.html`을 Playwright로 열어 **콘솔/리소스 에러 0건** 확인(`ERR_FILE_NOT_FOUND` 나오면 경로/파일 누락).
7. `.claude/skills/slide/references/<new-theme>/patterns/` 내용 교체(옵션)
8. **`.pen` 시각 SSOT 생성** — 두 경로 자동 분기:

   **(a) 사용자가 `.pen` 파일 업로드한 경우**:
   ```bash
   git rm <active-theme>-design-system.pen   # <active-theme> = Step 0 감지 슬러그
   cp <uploaded.pen> <new-theme>-design-system.pen
   git add <new-theme>-design-system.pen
   ```
   사용자 디자인을 그대로 SSOT로 사용. Pencil CLI 후처리 안 함.

   **(b) 사용자가 `.pen` 미제공 (기본 경로)** — Pencil CLI로 자동 생성:

   > **⚠️ 0바이트 가트차 (드라이런 발견):** `pencil interactive --out <target>`은 **타깃 파일이 이미 존재하면** `save()`가 기존 리소스와 충돌해 0바이트로 truncate되는 사례가 있다(파일 존재 + `sleep 2` → 0바이트; `rm` 후 `sleep 5` → 성공). 따라서 **반드시 (1) 호출 전 타깃 파일 부재를 보장**하고(`<new-theme>-design-system.pen`은 신규 슬러그라 보통 없지만 재시도 시 잔존할 수 있음 → `rm -f`), **(2) settle 시간을 `sleep 3`~`sleep 5`로** 둔다(`sleep 2`는 비동기 `save()` 완료 전에 `exit()`이 나가 0바이트를 만들 수 있음). 만약 같은 이름의 타깃을 갱신해야 하는 상황이면 `--in/--out`을 같게 두고 heredoc 안에서 `removeResource`로 기존 프레임을 먼저 비운 뒤 재생성한다(빈 파일 위 신규 생성이 아니라 truncate 충돌을 피하기 위함).

   ```bash
   git rm <active-theme>-design-system.pen   # <active-theme> = Step 0 감지 슬러그
   rm -f <new-theme>-design-system.pen        # 타깃 부재 보장 (재시도 잔존 truncate 방지)
   ( cat <<'PENCIL'
   set_variables({ variables: { "bg": {"type":"color","value":"<NEW_BG>"}, "surface": {"type":"color","value":"<NEW_SURFACE>"}, "surface-alt": {"type":"color","value":"<NEW_SURFACE_ALT>"}, "text": {"type":"color","value":"<NEW_TEXT>"}, "text-secondary": {"type":"color","value":"<NEW_TEXT_SECONDARY>"}, "border": {"type":"color","value":"<NEW_BORDER>"}, "accent": {"type":"color","value":"<NEW_ACCENT>"}, "accent-soft": {"type":"color","value":"<NEW_ACCENT_SOFT>"} } })
   batch_design({ input: 'c=I(document,{type:"frame",name:"Slide01-Cover",x:0,y:0,width:1280,height:720,fill:"$bg",layout:"none"})\nct=I(c,{type:"text",content:"<DECK 주제 자리표시자>",fontSize:<DISPLAY_PX>,fontWeight:800,fill:"$text",x:80,y:280,width:1120,height:80})\ncs=I(c,{type:"text",content:"<부제목>",fontSize:<BODY_PX>,fontWeight:400,fill:"$text-secondary",x:80,y:380,width:1120,height:40})' })
   batch_design({ input: 'h=I(document,{type:"frame",name:"Slide02-Content",x:0,y:780,width:1280,height:720,fill:"$bg",layout:"none"})\nhh=I(h,{type:"text",content:"콘텐츠 헤딩",fontSize:<HEADLINE_PX>,fontWeight:700,fill:"$text",x:80,y:80,width:1120,height:48})\nhb=I(h,{type:"text",content:"본문 한 줄 — 활성 테마 토큰을 시각화하는 시드 슬라이드입니다.",fontSize:<BODY_PX>,fontWeight:400,fill:"$text",x:80,y:144,width:1120,height:60})\nhgm=I(h,{type:"text",content:"so-what 한 줄 (governing message)",fontSize:<CAPTION_PX>,fontWeight:500,fill:"$text-secondary",x:80,y:660,width:1120,height:24})' })
   batch_design({ input: 'k=I(document,{type:"frame",name:"Slide03-KPI",x:0,y:1560,width:1280,height:720,fill:"$bg",layout:"none"})\nkh=I(k,{type:"text",content:"핵심 지표 4종",fontSize:<HEADLINE_PX>,fontWeight:700,fill:"$text",x:80,y:80,width:1120,height:48})\nk1=I(k,{type:"frame",x:80,y:200,width:266,height:300,fill:"$surface",cornerRadius:12,stroke:{thickness:1,fill:"$border"},layout:"none"})\nk1n=I(k1,{type:"text",content:"+240%",fontSize:<DISPLAY_SM_PX>,fontWeight:800,fill:"$text",x:24,y:24,width:218,height:56})\nk1l=I(k1,{type:"text",content:"라벨 1",fontSize:<CAPTION_PX>,fontWeight:500,fill:"$text-secondary",x:24,y:96,width:218,height:24})\nk2=I(k,{type:"frame",x:362,y:200,width:266,height:300,fill:"$surface",cornerRadius:12,stroke:{thickness:1,fill:"$border"},layout:"none"})\nk2n=I(k2,{type:"text",content:"$1.2M",fontSize:<DISPLAY_SM_PX>,fontWeight:800,fill:"$text",x:24,y:24,width:218,height:56})\nk2l=I(k2,{type:"text",content:"라벨 2",fontSize:<CAPTION_PX>,fontWeight:500,fill:"$text-secondary",x:24,y:96,width:218,height:24})\nk3=I(k,{type:"frame",x:644,y:200,width:266,height:300,fill:"$accent-soft",cornerRadius:12,stroke:{thickness:1,fill:"$accent"},layout:"none"})\nk3n=I(k3,{type:"text",content:"3.4×",fontSize:<DISPLAY_SM_PX>,fontWeight:800,fill:"$text",x:24,y:24,width:218,height:56})\nk3l=I(k3,{type:"text",content:"라벨 3 (accent)",fontSize:<CAPTION_PX>,fontWeight:500,fill:"$text-secondary",x:24,y:96,width:218,height:24})\nk4=I(k,{type:"frame",x:926,y:200,width:274,height:300,fill:"$surface",cornerRadius:12,stroke:{thickness:1,fill:"$border"},layout:"none"})\nk4n=I(k4,{type:"text",content:"94%",fontSize:<DISPLAY_SM_PX>,fontWeight:800,fill:"$text",x:24,y:24,width:226,height:56})\nk4l=I(k4,{type:"text",content:"라벨 4",fontSize:<CAPTION_PX>,fontWeight:500,fill:"$text-secondary",x:24,y:96,width:226,height:24})' })
   batch_design({ input: 'p=I(document,{type:"frame",name:"Slide04-Comparison",x:0,y:2340,width:1280,height:720,fill:"$bg",layout:"none"})\nph=I(p,{type:"text",content:"Before vs After",fontSize:<HEADLINE_PX>,fontWeight:700,fill:"$text",x:80,y:80,width:1120,height:48})\npl=I(p,{type:"frame",x:80,y:200,width:540,height:400,fill:"$surface-alt",cornerRadius:12,layout:"none"})\npll=I(pl,{type:"text",content:"Before",fontSize:<TITLE_PX>,fontWeight:600,fill:"$text-secondary",x:24,y:24,width:492,height:32})\nplb=I(pl,{type:"text",content:"이전 상태 설명",fontSize:<BODY_PX>,fontWeight:400,fill:"$text",x:24,y:80,width:492,height:60})\npr=I(p,{type:"frame",x:660,y:200,width:540,height:400,fill:"$accent-soft",cornerRadius:12,stroke:{thickness:1,fill:"$accent"},layout:"none"})\nprl=I(pr,{type:"text",content:"After",fontSize:<TITLE_PX>,fontWeight:600,fill:"$accent",x:24,y:24,width:492,height:32})\nprb=I(pr,{type:"text",content:"이후 상태 설명",fontSize:<BODY_PX>,fontWeight:400,fill:"$text",x:24,y:80,width:492,height:60})' })
   batch_design({ input: 'z=I(document,{type:"frame",name:"Slide05-Closing",x:0,y:3120,width:1280,height:720,fill:"$bg",layout:"none"})\nzm=I(z,{type:"text",content:"한 줄 클로징 메시지",fontSize:<DISPLAY_PX>,fontWeight:800,fill:"$accent",x:80,y:300,width:1120,height:80})\nzc=I(z,{type:"text",content:"call-to-action 부연",fontSize:<BODY_PX>,fontWeight:400,fill:"$text-secondary",x:80,y:400,width:1120,height:40})' })
   save()
   PENCIL
   sleep 4; echo "exit()" ) | pencil interactive --out <new-theme>-design-system.pen
   git add <new-theme>-design-system.pen
   ```

   **자리표시자**(`<NEW_BG>`, `<DISPLAY_PX>` 등)는 Step 1에서 추출한 토큰 값으로 채워 넣는다. `fontFamily`는 의도적으로 생략 — Pencil 폰트 카탈로그에 없는 값을 넣으면 batch 전체 롤백되므로 SSOT는 Pencil 기본 폰트로 두고 실제 폰트는 `src/index.css` 토큰이 책임진다.

   **검증** (HARD RULE): `test -s <new-theme>-design-system.pen`이 통과해야 한다. 0바이트면 (1) 타깃이 호출 전 잔존했거나(`rm -f` 누락), (2) `save()`와 `exit()` 사이 settle이 짧았던 것(`sleep 2` → `sleep 3~5`). 위 가트차 박스 순서대로 — 타깃 `rm -f` 보장 → `sleep` 상향 → 재실행. `../slide/references/pencil-cli.md` 단일 진실 원천 참조.
9. **내부 경로 참조 일괄 치환** (문서만 대상, 바이너리/.pen 제외):
   ```bash
   # .pen 바이너리, node_modules, dist, output, 그리고 제너레이터 스킬 자신을 제외하고 텍스트 파일만 매치
   rg -l "references/<active-theme>" . \
     --glob='!*.pen' --glob='!node_modules' --glob='!dist' --glob='!output' --glob='!src/images' \
     --glob='!.claude/skills/theme-init/**'
   ```
   결과 파일들에서 `references/<active-theme>` → `references/<new-theme>`로 Edit replace_all.
   - **제외 1 — 제너레이터 canonical 예시 (HARD):** `.claude/skills/theme-init/**`(이 SKILL.md 포함)는 **치환하지 않는다.** 여기 등장하는 `references/jangpm`·`<active-theme>` 등은 from-theme를 설명하는 canonical 예시·플레이스홀더이지 운영 경로가 아니다. 치환하면 제너레이터가 자기 예시를 잃고 다음 리브랜딩이 깨진다. (위 rg glob이 이미 제외.)
   - **제외 2 — 이력/체인지로그 줄 보존 (HARD, 수동 구분):** `docs/theme-replacement-map.md`에는 **운영 참조**(현재 활성 경로)와 **이력 참조**(과거 마이그레이션을 서술하는 줄 — 예 "[x] … `references/jangpm/theme-rules.md`로 이관 완료", 드라이런 발견 GAP 설명)가 섞여 있다. **과거 디렉토리를 언급하는 이력/체크리스트 줄은 그대로 보존**하고, "현재 활성 테마가 무엇인지"를 가리키는 운영 줄만 치환한다. 한 줄씩 운영 vs 이력을 판별 — 일괄 replace_all 금지.
   **주의**: 루트 `<active-theme>-design-system.pen` 파일명 자체는 이 치환 대상 아님 (Step 4 #8에서 git mv로 처리). rg 결과가 파일명 자체를 잡아낸 경우 그건 건너뛰기.
10. `CLAUDE.md`, `README.md`, `docs/theme-replacement-map.md`의 `<active-theme>-design-system.pen` 언급을 `<new-theme>-design-system.pen`으로 치환 (위 제외 2 동일 적용 — 이력 줄 보존)
11. **README.md codex-image 일러스트 어댑터 팔레트 앵커 교정 (HARD):** README의 illustration/diagram 프롬프트 줄(`muted pastel tones aligned with #4633E3 indigo accent` 형태)이 활성 테마에 고정돼 있다. 새 테마 토큰으로 갱신:
   - `#4633E3` → 새 테마 `--accent` hex
   - `indigo` → 새 accent의 실제 hue 계열(예: teal/amber/…)
   - `muted pastel` → 새 테마 무드(가이드 MD §1 Visual / tone에서 추출)
   - **유지(락):** `minimal flat line-art`, `transparent background`, negative의 `photograph, photorealistic` 등 no-gradient/glow/3D/photorealism 락은 그대로. 무드 단어만 교체하고 스타일 락은 건드리지 않는다.
   - 활성 테마 accent를 언급하는 다른 README 줄(예: 번들 덱 소개의 `accent #4633E3`)도 같이 새 accent로 갱신.
12. `docs/theme-replacement-map.md`의 "현재 활성 테마" 섹션 업데이트

### Step 4.5: Layout Re-authoring — 시그니처 레이아웃 재작곡 (HARD RULE) ⚠️

**처리 주체:** LLM (디자인) → 사용자 검토 (BLOCKING 루프)

Step 4는 패턴을 **색만** 새 토큰으로 reskin한다. 이 단계는 거기서 멈추지 않고, 디자인 가이드의 **시각 시그니처**에 맞춰 핵심 패턴의 *구성 자체를* 새로 그린다. "색만 바꾼 `<active-theme>` 레이아웃"으로 신규 테마를 끝내지 않기 위한 강제 단계.

**입력:**
- 필수: 새 디자인 가이드 MD (Step 1 파싱 결과)
- 필수: `references/<theme>/DESIGN.md` 초안 + Step 1 토큰 컨트랙트 결과
- 선택: `.pen` 파일, 사용자 자연어 지시, 레퍼런스 패턴/슬라이드

**재작곡 최소 범위 (HARD):** 최소 아래 3종은 색 교체가 아니라 **레이아웃 신규 작성**.

| 역할 | 대상 패턴 파일 | 재작곡 의미 |
|---|---|---|
| cover | `patterns/01-title.html` (+ `13-cover-vertical.html`) | 브랜드 히어로 레이아웃 |
| closing | `patterns/12-closing.html` (+ `21-closing-big.html`) | 브랜드 클로징 + CTA |
| feature-board | `patterns/04b-four-point.html` (또는 `20-kpi-dashboard.html`) | 브랜드 피처보드 |

나머지 패턴은 baseline reskin 유지(필요 시 추가 재작곡 가능).

**선행조건 — 패턴 토큰 CSS 존재 (HARD, 드라이런 발견):** ⚠️
`patterns/_slide.css`는 `@import url('../colors_and_type.css')`로 v1 코어 토큰 **과** 시맨틱 클래스(`.display`/`.headline`/…)를 받는다. 이 토큰 CSS는 **Step 4 #6에서 생성**된다(THEME 마커 + v1 코어 값 + 시맨틱 클래스). Step 4.5는 여기에 **레이아웃 토큰 그룹을 합류**시킨다. 값은 `src/index.css` THEME 블록과 동일해야 한다(패턴 프리뷰=빌드 일치). 이 파일이 없으면 패턴 HTML이 standalone 렌더되지 않아(`ERR_FILE_NOT_FOUND`) BLOCKING 스크린샷 검토가 불가하므로, Step 4.5 시작 전 존재를 확인한다(없으면 즉시 생성).
> jangpm 본체에는 이 파일이 누락돼 있던 것을 백필 완료(드라이런 발견 GAP-1). 신규 테마는 Step 4 #6이 항상 생성.

**워크플로우:**

1. **시그니처 추출** — 가이드 MD + DESIGN.md draft(+`.pen`)에서 브랜드 레이아웃 시그니처를 도출.
   (예: Notion → cover/closing 네이비 히어로 + 브랜드 스펙트럼 닷 + 퍼플 CTA, 파스텔 피처보드)

2. **레이아웃 토큰 설계** — 시그니처 구현에 필요한 토큰을 식별해 **추가**(교체 아님). 토큰 컨트랙트 v1을 깨지 않고 **테마-스코프 확장 그룹**으로 더한다. 예: `--navy`, `--brand-spectrum-1..n`, `--link`, `--on-dark`, `--cta` / `--cta-ink`, `.dot-*` 유틸. **반드시 THEME:START/END 마커 안**에, `patterns/_slide.css`(가 import하는 `colors_and_type.css`) **와** `src/index.css` 양쪽에 동일하게 기록 (패턴 프리뷰=빌드 일치).
   - v1 코어 토큰 이름은 그대로 고정·교차테마 공유. 레이아웃 토큰은 **테마별 자유·additive**이며 교차테마 공유 대상이 아니다 (`docs/theme-replacement-map.md` "레이아웃 토큰" 절 참조).
   - **밴드 변형 우선순위 (드라이런 검증):** 네이비 밴드 등 슬라이드 배경 변형은 반드시 **`.slide.navy-band` 복합 선택자**로 작성한다. bare `.navy-band { background }` 는 `_slide.css`의 `.slide { background:var(--bg) }` 보다 소스 순서상 뒤에 와도 동일 명시도라 base가 이겨 **밴드 배경이 적용되지 않는다**(흰 배경 위 흰 텍스트 → 헤드라인 실종). on-dark 텍스트 규칙도 `.slide.navy-band .display` 식으로 base를 넘어서게 한다.

3. **보일러플레이트 초안 작곡** — 위 3종을 새로 그린다. 락(아래) 전부 준수. 직전 작업 레퍼런스가 있으면 적극 활용: `patterns/01-title`·`12-closing`·`04b-four-point` + `src/slides/Slide01.tsx`.

4. **▶ 보일러플레이트 검토 루프 (BLOCKING)** — 초안을 렌더 스크린샷으로 사용자에게 **레퍼런스로 먼저 제시** → 피드백 수령 → 수정. 최대 3회.
   - **렌더 경로 (드라이런 검증):** 패턴 HTML은 `_slide.css` → 토큰 CSS(`colors_and_type.css`)에 의존하므로 **토큰 CSS가 존재해야 standalone 렌더가 된다**(아래 "선행조건" 참조). Playwright로 `file://.../patterns/<pattern>.html`을 1280×720 뷰포트로 열어 캡처하고, **콘솔/리소스 에러 0건**을 확인한다(`ERR_FILE_NOT_FOUND` = 토큰 CSS 누락).
   - **웹폰트:** 테마 폰트(예: Pretendard)가 시스템에 없으면 스크린샷이 폴백 폰트로 잡혀 실제와 달라진다. 토큰 CSS에 `@font-face`/`@import`로 테마 폰트를 포함해 캡처 충실도를 확보한다.
   ```
   <theme> Layout Re-authoring 초안 — 검토 요청

   재작곡한 시그니처 3종 스크린샷:
     · cover         — [네이비 히어로 + 브랜드 스펙트럼 닷]
     · closing       — [퍼플 CTA]
     · feature-board — [파스텔 카드 보드]
   추가된 레이아웃 토큰: --navy, --brand-spectrum-*, --cta, .dot-* (N개)

   확정: y   /   수정: 어느 패턴의 무엇을 바꿀지 알려주세요
   ```
   - 미합의 3회 → 사용자에게 수동 작성 안내 + 초안 경로 제시.

5. **승인 후 기록** — 최종 `patterns/*.html` 저장 + `patterns/_slide.css`(→ `colors_and_type.css`)/`src/index.css` 레이아웃 토큰 확정. 데모 `src/slides/Slide01·02.tsx` 갱신은 **기본 스킵** — 사용자가 명시 요청할 때만. 빌드 검증은 기존 슬라이드로 수행.

6. **slide-system.tsx 자동 수정 금지(유지).** 새 레이아웃이 프리미티브를 요구하면 (centered hero / CTA 버튼 / navy-band 등) `references/manual-edit-guide.md`의 "신규 레이아웃 프리미티브" 섹션을 따라 **사용자가 수동 추가**.

7. **동기화** — 승인된 레이아웃 어휘를 Step 4.6 DESIGN.md §5(layout grammar)·§6(header/body/footer), `theme-rules.md`(커버 전략·레이아웃 어휘), `docs/theme-replacement-map.md`에 반영.

**락 (HARD — 재작곡이 절대 깨면 안 됨):**
- 뷰포트 **1280×720** (SlideShell 고정)
- 테마 확정 폰트 고정 (예: Pretendard) — 재작곡이 폰트 변경 금지
- **GM 라인** 유지 (콘텐츠 슬라이드 하단 1줄 요약)
- **`#slides-root`** 유지 (pptx-compare 캡처 의존)
- **THEME:START/END 마커 모델** — 레이아웃 토큰도 마커 안에만
- **라이트 모드 전용** — 완화는 **cover/section/closing의 네이비 밴드까지만**. 콘텐츠 슬라이드 본문 영역은 라이트 유지.
- 사전 git 브랜치 + `npm run build` 통과 + 커밋 흐름 유지 (Step 0/5/6)

### Step 4.6: DESIGN.md 초안 + 사용자 검토 (HARD RULE) ⚠️

**처리 주체:** LLM → 사용자 검토

slide-plan 스킬이 입력으로 소비할 `DESIGN.md`를 생성하는 단계. **반드시 사용자 검토 체크포인트를 거친다** (가이드 §살아남은 염려점 #4 — 디자인 가이드가 빈약하면 부정확한 DESIGN.md 발생 위험).

1. `references/design-md-template.md` 읽기 + Step 2에서 준비한 초안 종합
2. 입력 종합 → DESIGN.md 10개 섹션 채우기:
   - §1 Visual theme — 가이드 MD의 철학 / "anti-slop" / "tone" 추출
   - §2 Palette — Step 1의 토큰 컨트랙트 결과
   - §3 Typography — Step 1의 시맨틱 클래스 / 스케일
   - §4 Spacing — `--space-*` 값 + density rules (사용자 가이드 또는 default)
   - §5 Layout grammar — **Step 4.5에서 재작곡된 시그니처 레이아웃 어휘**(cover/closing/feature-board 등) + Step 2 #4의 patterns/ 결과 → 13 family 매핑 (어휘 변경 시 사용자 명시 confirm)
   - §6 Header/body/footer — 가이드 MD의 GM·footer 언급 / 추론 + Step 4.5 네이비 밴드 등 신규 헤더/푸터 레이아웃 반영
   - §7 Page flow — 사용자 제공 시드 또는 5종 default 패턴 기반
   - §8 Chart/table — 표준 9종 + custom 어휘를 본 테마 패턴에 매핑. 누락 시 `custom` fallback
   - §9 Icon system — 가이드 MD의 아이콘 스타일 / 추론
   - §10 Anti-patterns — Step 1 #5의 "금지/지양" 추출 결과
3. 누락 정보는 `<!-- TODO: 사용자 검토 -->` 주석으로 명시
4. 사용자에게 markdown preview:
   ```
   <new-theme> DESIGN.md 초안 — 검토 요청

   slide-plan 스킬이 이 문서를 입력으로 소비합니다. 다음 항목을 확인해주세요:

   - §2 컬러 토큰 — accent 빈도 룰 ("슬라이드당 1~2회") 적합한가?
   - §5 Layout family 13개 — 본 테마에 맞는 어휘인가? 추가/제거할 family?
   - §8 Chart strategy 9종 매핑 — 본 테마 패턴 부족 시 'custom' fallback 사용했음
   - §10 Anti-patterns — 가이드 MD에서 추출한 금지 항목 누락 없는가?
   - <!-- TODO --> 주석 N개 — 각 항목 confirm 또는 수정

   확정: y
   수정: 어떤 섹션을 바꿀지 알려주세요
   ```
5. **사용자 confirm** 후 `references/<new-theme>/DESIGN.md`에 저장 (Write tool)
6. 사용자 거부 시 → 수정 후 재검토 (최대 3회). 그래도 합의 안 되면 사용자에게 수동 작성 안내

### Step 5: 빌드 + 시각 검증

1. `npm run build` 실행
   - 실패 시 에러 로그 확인 → 자동 수정 시도 (최대 2회) → 그래도 실패 시 사용자 이관
2. 샘플 슬라이드 5종(가능하면 기존 `src/slides/SlideAgent01~05`) 스크린샷 캡처:
   - Playwright로 `dist/index.html` 열기
   - 1920×1080 해상도로 각 슬라이드 캡처 (슬라이드 컨테이너는 1280×720이지만 CSS 스케일이 있을 수 있어 풀 해상도)
   - `.claude/skills/export-pdf/` 또는 `.claude/skills/export-pptx/` 기존 스크린샷 스크립트 재활용 가능
3. 사용자에게 5장 스크린샷 제시 + "이대로 커밋할까요? (y/n)"

### Step 6: 커밋 또는 롤백

- **y**:
  ```bash
  git add -A
  git commit -m "chore(theme): replace <active-theme> with <new-theme>"
  ```
  완료 메시지 + "master로 병합하려면 `git checkout master && git merge theme-init/<new-theme>`" 안내
- **n**: 변경은 브랜치에 남음. 안내:
  ```
  롤백: git checkout <original-branch> && git branch -D theme-init/<new-theme>
  또는 브랜치에서 직접 수정 후 새 커밋
  ```

---

## 수동 편집 가이드 (slide-system.tsx)

Step 4 완료 후 반드시 사용자에게 제시. 상세 체크리스트는 `references/manual-edit-guide.md` 참조. 요약:

1. **Governing Message(GM)** — 새 테마에 있는가? 없으면 `<GuidingMessage>` 및 `SlideShell`의 `gm` prop 제거
2. **카드 tone** — default/alt/accent 3종 유지? 다르면 `Card` 유니온 타입 + 스타일 분기 재작성
3. **프리미티브 필요 여부** — NumberBadge / Metric / Pill / AccentBadge / RuleLine 중 불필요한 것 제거
4. **새 프리미티브 추가** — 새 테마에만 있는 요소(Callout, Timeline 등) 필요 시 추가
5. **신규 레이아웃 프리미티브 (Step 4.5 연계)** — 재작곡한 시그니처(centered hero / CTA / navy-band / brand-spectrum dot)가 요구하는 프리미티브를 manual-edit-guide.md "5. 신규 레이아웃 프리미티브" 섹션 따라 추가. CSS는 4.5에서 더한 레이아웃 토큰만 참조.

수정 후 `npm run build` 통과 확인.

---

## 실패/중단 처리

| 상황 | 대응 |
|------|------|
| 가이드 MD에 핵심 토큰(accent, 폰트, 사이즈) 누락 | 사용자에게 정확한 항목 질문. 3회 공백 시 스킬 중단 |
| Step 5 빌드 실패 | 에러 로그 + 자동 수정 2회 시도 → 실패 시 사용자 이관 |
| Step 3 diff 3회 반려 | "수동 편집이 효율적일 수 있습니다" + 생성된 드래프트 파일 경로 안내 |
| 사용자 강제 중단 | `git checkout <original-branch> && git branch -D theme-init/<new-theme>` 안내 |

---

## references/ 로드 조건

| 파일 | 로드 시점 |
|------|----------|
| `docs/theme-replacement-map.md` | Step 0 (사전 안전장치) |
| `references/theme-rules-template.md` | Step 2 (theme-rules.md 생성 시 템플릿) |
| `references/design-md-template.md` | Step 2 + Step 4.6 (DESIGN.md 초안 생성) |
| `references/manual-edit-guide.md` | Step 4.5 (신규 레이아웃 프리미티브) + Step 4 완료 후 사용자에게 제시 |

---

## DESIGN.md — slide-plan과의 연결

`/theme-init`은 `references/<new-theme>/DESIGN.md`를 자동 생성하지만, **사용자 검토 없이 저장 금지** (Step 4.6). 이 문서는 `slide-plan` 스킬의 핵심 입력이며 부정확하면 plan 품질이 떨어진다.

기존 jangpm DESIGN.md는 **수동 1회 작성**되었다 (`.claude/skills/slide/references/jangpm/DESIGN.md`). 자동 추출보다 정확도 우선 — 신규 테마부터 자동 모드 적용.
