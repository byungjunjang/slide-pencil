---
name: theme-init
description: 활성 디자인 테마를 새로운 디자인 시스템으로 일회성 교체. 사용자가 제공한 디자인 가이드 MD(필수)와 선택적으로 .pen 파일을 받아 src/index.css 토큰, CLAUDE.md HARD RULES, SKILL.md 테마 요약, references/<테마>/ 디렉토리, 루트 .pen 파일을 일괄 교체한다. 사전 git branch 생성 + 빌드 검증 + 스크린샷 확인 후 커밋. Trigger on "/theme-init", "테마 교체", "테마 초기화", "디자인 시스템 바꿔", "새 디자인 적용", "디자인 가이드 올렸어".
---

# /theme-init — 활성 테마 일회성 교체

이 프로젝트는 **하나의 에이전트 = 하나의 테마**를 전제로 한다. `/theme-init`은 포크 직후 또는 리브랜딩 시점에 **한 번** 실행하여 기본 테마(현재 Jangpm)를 사용자의 디자인 시스템으로 영구 교체한다. **런타임 스위칭은 지원하지 않는다.** 여러 테마를 동시에 쓰려면 리포지토리를 각각 포크하여 각자 `/theme-init`을 돌린다.

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

1. **git working tree 확인**: `git status --porcelain`
   - clean이면 Step 2 진행
   - dirty면 사용자에게 세 가지 옵션 제시:
     - **(권장) 스태시**: `git stash push -m "pre-theme-init"` → /theme-init 완료 후 `git stash pop`으로 복구
     - **먼저 커밋**: 관련 변경을 먼저 커밋 후 재시도
     - **강행(비권장)**: 이 경우 현재 dirty 변경이 theme-init 커밋에 섞여 rollback이 어려워짐. 명시적 사용자 동의 필요
2. 현재 브랜치명 기록: `git rev-parse --abbrev-ref HEAD` → 복귀용
3. 새 브랜치 생성: `git checkout -b theme-init/<new-theme-name>`
4. `docs/theme-replacement-map.md` 로드하여 교체 대상 6개 지점 확인 (Phase 1에서 정의됨)

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
- 경로: `jangpm-design-system.pen` → `<new-theme>-design-system.pen`

**(4) `.claude/skills/slide/references/<new-theme>/` 디렉토리**
- `references/theme-rules-template.md`를 읽어 플레이스홀더를 새 값으로 채워 `theme-rules.md` 생성
- `references/design-md-template.md`를 읽어 채워서 `DESIGN.md` 초안 준비 (Step 4.5에서 사용자 검토 후 저장)
- 옵션: `reference/` 하위 design-system.md / anti-slop.md / patterns.md / libraries.md / visual-assets.md / export.md (기존 jangpm 구조 복제)
- `patterns/` 디렉토리:
  - 사용자가 HTML 샘플 제공 → 해당 HTML들을 5종 시드 중 적합한 자리에 배치
  - 없음 → 기본 5종 템플릿(cover/content/kpi/comparison/closing) 생성. 새 테마 토큰 사용.

**(5) 루트 `.pen` 파일**
- 사용자가 제공한 `.pen`을 `<new-theme>-design-system.pen`로 복사
- 제공하지 않으면 기존 `jangpm-design-system.pen`을 삭제만 하고 빈 슬롯 안내 (사용자가 나중에 Pencil로 새 파일 생성 가능)

**(6) `src/components/slide-system.tsx`**
- **자동 수정 금지.** Step 4 완료 후 사용자에게 수동 편집 가이드 제시 (아래 "수동 편집 가이드" 섹션 참조)

### Step 3: diff 미리보기

사용자에게 변경 요약을 표 형태로 제시:

```
제안된 교체: jangpm → <new-theme>

TOKEN 변경:
  --accent         #4633E3  →  #XXXXXX
  --font-sans      Arial    →  <new-font>
  --fs-display     56px     →  <N>px
  --fs-headline    32px     →  <N>px
  ... (주요 토큰 10개 정도만 요약)

FILE 교체 (6곳):
  · src/index.css — THEME 블록 전체
  · CLAUDE.md — THEME 블록 전체
  · .claude/skills/slide/SKILL.md — THEME 블록
  · .claude/skills/slide/references/jangpm/  →  .../<new-theme>/
  · .claude/skills/slide/references/<new-theme>/DESIGN.md (신규 — slide-plan 입력)
  · jangpm-design-system.pen  →  <new-theme>-design-system.pen

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
4. 디렉토리 이동: `git mv .claude/skills/slide/references/jangpm .claude/skills/slide/references/<new-theme>`
5. 새 테마 디렉토리의 `theme-rules.md` 덮어쓰기 (Write)
6. `.claude/skills/slide/references/<new-theme>/patterns/` 내용 교체(옵션)
7. `.pen` 교체: `git mv jangpm-design-system.pen <new-theme>-design-system.pen` + 사용자 업로드 파일로 덮어쓰기 (`cp <uploaded.pen> <new-theme>-design-system.pen`)
8. **내부 경로 참조 일괄 치환** (문서만 대상, 바이너리/.pen 제외):
   ```bash
   # .pen 바이너리, node_modules, dist, output 제외하고 텍스트 파일만 매치
   rg -l "references/jangpm" . --glob='!*.pen' --glob='!node_modules' --glob='!dist' --glob='!output' --glob='!src/images'
   ```
   결과 파일들에서 `references/jangpm` → `references/<new-theme>`로 Edit replace_all.
   **주의**: 루트 `<old-theme>-design-system.pen` 파일명 자체는 이 치환 대상 아님 (Step 4 #7에서 git mv로 처리). rg 결과가 파일명 자체를 잡아낸 경우 그건 건너뛰기.
9. `CLAUDE.md`, `README.md`, `docs/theme-replacement-map.md`의 `jangpm-design-system.pen` 언급을 `<new-theme>-design-system.pen`으로 치환
10. `docs/theme-replacement-map.md`의 "현재 활성 테마" 섹션 업데이트

### Step 4.5: DESIGN.md 초안 + 사용자 검토 (HARD RULE) ⚠️

**처리 주체:** LLM → 사용자 검토

slide-plan 스킬이 입력으로 소비할 `DESIGN.md`를 생성하는 단계. **반드시 사용자 검토 체크포인트를 거친다** (가이드 §살아남은 염려점 #4 — 디자인 가이드가 빈약하면 부정확한 DESIGN.md 발생 위험).

1. `references/design-md-template.md` 읽기 + Step 2에서 준비한 초안 종합
2. 입력 종합 → DESIGN.md 10개 섹션 채우기:
   - §1 Visual theme — 가이드 MD의 철학 / "anti-slop" / "tone" 추출
   - §2 Palette — Step 1의 토큰 컨트랙트 결과
   - §3 Typography — Step 1의 시맨틱 클래스 / 스케일
   - §4 Spacing — `--space-*` 값 + density rules (사용자 가이드 또는 default)
   - §5 Layout grammar — Step 2 #4의 patterns/ 결과 → 13 family 매핑 (어휘 변경 시 사용자 명시 confirm)
   - §6 Header/body/footer — 가이드 MD의 GM·footer 언급 / 추론
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
  git commit -m "chore(theme): replace jangpm with <new-theme>"
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
| `references/design-md-template.md` | Step 2 + Step 4.5 (DESIGN.md 초안 생성) |
| `references/manual-edit-guide.md` | Step 4 완료 후 사용자에게 제시 |

---

## DESIGN.md — slide-plan과의 연결

`/theme-init`은 `references/<new-theme>/DESIGN.md`를 자동 생성하지만, **사용자 검토 없이 저장 금지** (Step 4.5). 이 문서는 `slide-plan` 스킬의 핵심 입력이며 부정확하면 plan 품질이 떨어진다.

기존 jangpm DESIGN.md는 **수동 1회 작성**되었다 (`.claude/skills/slide/references/jangpm/DESIGN.md`). 자동 추출보다 정확도 우선 — 신규 테마부터 자동 모드 적용.
