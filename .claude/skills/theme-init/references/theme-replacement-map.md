# 테마 교체 맵

`/theme-init` 스킬(Phase 2)이 활성 테마를 다른 디자인 시스템으로 교체할 때 **어디를 건드려야 하는지**를 정의한 문서. 이 맵 밖의 파일/영역은 테마와 무관한 인프라로 간주하여 `/theme-init`이 건드리지 않는다.

## 현재 활성 테마

`jangpm` — Jangpm Slide Design System (모노크롬 + 단일 accent `#4633E3`, Arial, 리포트형 레이어)

> **활성 테마는 동적 — `jangpm` 하드코드 가정 금지.** `/theme-init`은 from-theme를 이 줄에 고정하지 않고 **Step 0에서 자동 감지**한다(1순위 `CLAUDE.md`의 `THEME:START name=` 마커, 2순위 `references/*/theme-rules.md`를 가진 디렉토리명). 한 번 교체된 리포지토리(예: `jangpm`→`montage`)에서 다시 `/theme-init`을 돌려도 깨지지 않는다. 아래 지점 설명에 등장하는 `jangpm`/`references/jangpm`은 **현재 상태의 예시**이며, 실제 실행 시엔 감지된 `<active-theme>`로 읽는다.

## 교체 대상 (8개 지점)

### 1. `src/index.css` — CSS 토큰 블록
- **범위:** `/* THEME:START name=jangpm */` ~ `/* THEME:END */` 사이 전체
- **포함:** `:root` 디자인 토큰(색상, 타이포, spacing, radius, shadow), `@layer base` 바디 폰트, 시맨틱 타이포 클래스(`.display`, `.headline`, `.title`, `.body`, `.caption`, `.label-caption`), 유틸리티 컬러 클래스
- **유지(블록 외):** `@import "tailwindcss";`
- **교체 방식:** 마커 사이 전체를 새 테마의 CSS로 덮어쓰기
- **Layout Re-authoring(Step 4.5):** 마커 안에 **레이아웃 토큰 그룹**(navy / brand-spectrum / link / on-dark / cta / `.dot-*` 등)을 추가로 정의할 수 있다. v1 코어 토큰 이름은 고정, 레이아웃 토큰은 테마-스코프 additive (아래 "레이아웃 토큰" 절 참조).

### 2. `CLAUDE.md` — 디자인 시스템 제약 섹션
- **범위:** `<!-- THEME:START name=jangpm -->` ~ `<!-- THEME:END -->` 사이
- **포함:** "디자인 시스템: Jangpm" 소개 문장, "## 핵심 제약 (HARD RULES)" 섹션, "## 구현 원칙" 섹션, "## 디자인 참고 자산" 섹션
- **유지(블록 외):** 프로젝트 제목, 워크플로우 설명, "## 빌드", "## 주요 경로", 꼬리말
- **교체 방식:** 마커 사이를 새 테마의 룰·참고 자산으로 재작성

### 3. `.claude/skills/slide/SKILL.md` — 테마 요약 섹션 + Step 5 bash 검증
- **THEME 블록 범위:** `<!-- THEME:START name=jangpm -->` ~ `<!-- THEME:END -->` 사이 — "## 디자인 시스템 (Jangpm)" 섹션 (뷰포트·폰트·accent·타이포 스케일·카드 규칙·GM·그림자·참고 자산 요약)
- **Step 5 bash 검증 블록 (THEME 블록 외부, 교체 필수):** Step 4의 `src/slides/index.ts` 업데이트 후 실행되는 bash 검증 스크립트. B4 (최소 fontSize), B7 (grid 패턴 이름), B9 (Headline 수치)에 **활성 테마 특정 값**이 하드코드됨. `/theme-init`이 반드시 새 테마의 `theme-rules.md`에 맞춰 업데이트 필요. SKILL.md 본문에 ⚠️ 알림으로 표시됨.
- **Phase 2에서 수행됨:** "커버 슬라이드 기본 전략", "액센트 컬러 전략", "폰트 웨이트 + 크기 기준표", "카드 내부 구성 규칙", "헤드 메시지 표준화 규칙", "핵심 제약" 총 6개 섹션을 `.claude/skills/slide/references/jangpm/theme-rules.md`로 이관 완료. SKILL.md에서는 원칙만 남기고 외부 참조로 대체.
- **Step 1/4 체크리스트의 시맨틱 클래스 참조**: Phase 1+2+추가 리팩터링 후 체크리스트는 시맨틱 클래스 이름(`.display` 등)과 외부 참조(`theme-rules.md`)만 사용. 수치 하드코드 대부분 제거.

### 4. `.claude/skills/slide/references/jangpm/` — 레퍼런스 디렉토리
- **범위:** 디렉토리 전체
- **포함:** `theme-rules.md`(Phase 2에서 추가됨 — 커버 전략/액센트 전략/폰트 기준표), `reference/` 하위 MD 문서들, `patterns/` 하위 29개 완성 HTML 샘플, `assets/`, `README.md`
- **교체 방식:** `git mv references/jangpm references/<new-theme-name>` 후 `theme-rules.md`를 새 테마 값으로 덮어쓰기. SKILL.md의 참조 경로(`references/jangpm/theme-rules.md` 등)도 `references/<new-theme-name>/theme-rules.md`로 치환. 이 디렉토리 이동 + 경로/.pen 문자열 치환은 `scripts/rename-theme.mjs`가 자동 수행하며, 경로/.pen 형태로 안 잡히는 **bare 테마명 잔여**(운영 문서)는 같은 스크립트가 "수동 검토" 목록으로 출력한다(아래 "드라이런 결과" GAP-2 참조).
- **Layout Re-authoring(Step 4.5):** `patterns/*.html`은 단순 reskin이 아니라 cover / closing / feature-board **최소 3종이 브랜드 레이아웃으로 재작곡**된다(색만 바꾸지 않음). 재작곡된 레이아웃 어휘는 `theme-rules.md`(커버 전략·레이아웃)와 `DESIGN.md` §5/§6에 동기화한다.
- **패턴 토큰 CSS (`colors_and_type.css`) — 교체 대상:** `patterns/_slide.css`가 `@import`하는 `colors_and_type.css`가 v1 코어 토큰 + 시맨틱 클래스(`.display` 등) + (Step 4.5) 레이아웃 토큰을 담는다. 값은 `src/index.css` THEME 블록과 **동일하게 유지**(패턴 프리뷰=빌드 일치). `/theme-init` **Step 4 #6**이 `scripts/gen-colors-and-type.mjs`로 `src/index.css` THEME 블록에서 **자동 생성 + 클래스 패리티 검증**한다(수동 Write/awk·comm 대체, Windows 동작). 자동 생성물이므로 직접 편집 금지 — 토큰 변경은 `src/index.css`에서. (과거 jangpm 디렉토리에 이 파일이 누락돼 패턴 standalone 렌더가 깨져 있던 것을 백필 완료 — 드라이런 발견 GAP-1.)

### 5. `jangpm-design-system.pen` — Pencil 시각 레퍼런스
- **범위:** 프로젝트 루트의 `.pen` 파일
- **교체 방식:** 사용자가 새 테마의 `.pen` 파일 업로드 → 이름을 `<new-theme>-design-system.pen`으로 변경하여 루트에 배치. CLAUDE.md(THEME 블록 내)와 SKILL.md(THEME 블록 내)의 파일명 참조도 치환.

### 6. `src/components/slide-system.tsx` — 수동 편집 (자동화 제외)
- **현 상태:** `SlideShell`, `GuidingMessage`, `NumberBadge`, `Metric`, `Pill`, `AccentBadge`, `RuleLine` 등 프리미티브가 Jangpm 철학(특히 GM, 카드 3-tone)에 특화됨.
- **결정:** `/theme-init`은 **자동 수정하지 않는다**. 기계적 치환이 JSX 구조를 깨뜨릴 리스크가 큼.
- **Phase 2 산출물:** `.claude/skills/theme-init/references/manual-edit-guide.md` — GM 유무, 카드 tone, 프리미티브 추가/제거 4단계 체크리스트. Step 4 완료 후 사용자에게 제시됨.
- **Layout Re-authoring(Step 4.5) 연계:** 재작곡한 신규 레이아웃(centered hero / CTA / navy-band / brand-spectrum dot)이 프리미티브를 요구하면 manual-edit-guide.md "5. 신규 레이아웃 프리미티브" 섹션을 따라 **수동 추가**(여전히 자동 수정 안 함). CSS는 Step 4.5에서 더한 레이아웃 토큰만 참조.

### 7. `README.md` + `.claude/skills/slide/SKILL.md` + `image-archetypes.md` — codex-image 일러스트 어댑터 팔레트 앵커
- **범위:** codex-image illustration/diagram 이미지 프롬프트 줄(`minimal flat line-art, muted pastel tones aligned with #4633E3 indigo accent, transparent background` 형태). **세 곳**에 동일 패턴이 박혀 있다:
  - `README.md` — illustration/diagram 프롬프트 + 번들 덱 소개의 활성 테마 accent 언급(`accent #4633E3` 등).
  - `.claude/skills/slide/SKILL.md` — Step 3.5 codex-image 어댑터 표(`| illustration |`/`| diagram |` 행)의 프롬프트(`muted pastel tones aligned with #4633E3 indigo accent` / `monochrome with a single #4633E3 indigo accent`)와 그 아래 예시 `/codex-image` 프롬프트 줄. **THEME 블록 밖**이라 토큰 마커로 안 잡히므로 이 지점이 명시적 교체 대상이다.
  - `.claude/skills/slide/references/image-archetypes.md` — 5종 근거형 아키타입의 "테마 결합 토큰" 표 + 각 앵커의 `<ACCENT_HEX>`(=`#4633E3`)/`<ACCENT_HUE>`(=`indigo`)/`<MOOD>`(=`muted pastel`).
- **문제:** 활성 테마 accent/무드에 하드코드돼 있어, 테마만 바꾸면 이미지 생성이 옛 테마(인디고+파스텔) 무드로 나온다.
- **교체 방식:** `/theme-init` **Step 4 #11**이 위 세 파일 **모두** 수행 — `#4633E3`→새 `--accent` hex, `indigo`→새 accent hue 계열, `muted pastel`→새 테마 무드(가이드 MD §1 Visual/tone). **유지(락):** `minimal flat line-art`, `transparent background`, negative의 `photograph/photorealistic` 등 no-gradient/glow/3D/photorealism 락은 보존 — 무드 단어만 교체.
- **드리프트 가드 (Fix2):** Step 5 정적 게이트의 `validate-theme.mjs <new-theme> --stale-hex "#<old-accent>"`가 위 세 파일에 옛 accent hex 잔존을 검사(`imagePromptDrift` — 기본 WARN, `--strict-hex`로 FAIL). 수동 교체 누락을 자동 포착한다.

### 8. `.claude/skills/diagram-design/references/style-guide.md` — 다이어그램 스킨 토큰
- **범위:** `<!-- THEME:START name=<theme> -->` ~ `<!-- THEME:END -->` 사이 — 다이어그램 스킬의 토큰 표(semantic role → `var(--*)`), 타이포 표(폰트·웨이트·트래킹), 노드 트리트먼트 표.
- **포함:** `diagram-design` 스킬(슬라이드 파이프라인 전용 inline-SVG 다이어그램 그래머)이 색·폰트를 끌어 쓰는 단일 진실 원천. 슬라이드에 들어가는 다이어그램이 덱과 동일 스킨을 갖도록 강제.
- **유지(블록 외):** 상단 "slide-pencil integration" 배너, 기하(stroke/radius/4px grid) 섹션, "How this file is re-skinned" 섹션 — 테마 무관 인프라.
- **교체 방식:** 마커 사이 표들을 새 테마의 `src/index.css` THEME 블록 토큰 값으로 재작성(`#1`과 동일 값 매핑). 색은 항상 `var(--*)` 토큰 이름으로 적되, "Jangpm value" 예시 열은 새 테마 hex로 갱신. **단일 accent 룰·라이트 전용 등 테마 제약도 함께 반영**(예: 새 테마가 dark/2-accent면 해당 제약 문구 교체). type-*.md·assets의 에디토리얼 hex 샘플은 배너가 "illustrative only"로 명시하므로 개별 교체 불필요(전수 갱신 금지 — 드리프트 방지).
- **마커 밖 hex 하드코드 재발 금지:** 다이어그램 SVG는 항상 `var(--*)` 참조. 마커 안 표의 "value" 열만 예시로 hex를 보유.

## 토큰 컨트랙트 v1 (테마 간 공유 고정)

모든 테마는 아래 CSS 변수 이름을 **반드시** 정의해야 한다. 슬라이드 컴포넌트가 이 이름에 의존. 값은 테마마다 자유.

```
--bg, --surface, --surface-alt
--text, --text-secondary, --text-tertiary
--border, --border-strong
--accent, --accent-soft, --accent-ink
--positive, --positive-soft, --negative, --negative-soft, --warning, --warning-soft
--font-sans, --font-mono
--fs-display, --fs-display-sm, --fs-headline, --fs-title, --fs-body, --fs-caption
--fw-display, --fw-headline, --fw-title, --fw-body, --fw-caption
--space-1~16, --radius-xs/sm/md/lg/xl/pill
--shadow-sm/md/lg
--card-padding, --card-gap, --card-radius
--card-bg, --card-border-color
```

시맨틱 타이포 클래스도 공유 계약: `.display`, `.display-sm`, `.headline`, `.title`, `.body`, `.caption`, `.label-caption`.

### card_style (카드 base chrome — `--card-bg` / `--card-border-color`)

카드의 기본 톤 chrome는 두 토큰이 결정한다. `_slide.css`의 `.card`와 `src/components/slide-system.tsx`의 `Card`(default/alt 톤)가 모두 이 토큰을 참조하므로, 한 번의 토큰 교체로 덱 전체 카드 스타일이 바뀐다. 디자인 가이드의 카드 스타일(filled / hairline / borderless)을 아래로 매핑한다.

| card_style | `--card-bg` | `--card-border-color` | 비고 |
|---|---|---|---|
| `filled` | `var(--surface)` | `var(--surface)` (= bg, 보더 안 보임) | 채워진 카드 |
| `hairline` (현재 jangpm) | `var(--surface)` | `var(--border)` | bg + 1px 보더 |
| `borderless` | `transparent` | `transparent` | 배경·보더 없이 여백으로 구분 (필요 시 `--card-radius: 0`) |

- `.card-accent`(accent 톤)는 시선 앵커로 **항상 accent 보더**를 유지한다 — card_style 영향 밖.
- v1 코어 토큰이므로 이름은 고정, 값만 교체. `src/index.css`와 `colors_and_type.css` 양쪽에 동일 값.

### 레이아웃 토큰 (테마-스코프 확장, Layout Re-authoring)

`/theme-init` Step 4.5(Layout Re-authoring)는 브랜드 시그니처 레이아웃 구현에 필요한 토큰을 **추가**한다. v1 코어 계약과 다음과 같이 구분된다.

| 구분 | 이름 안정성 | 교차테마 공유 | 위치 |
|---|---|---|---|
| v1 코어 토큰 | **고정** (모든 테마가 정의) | 공유 | THEME 마커 내부 |
| 레이아웃 토큰 | **테마별 자유** (additive) | 공유 안 함 | THEME 마커 내부 |

- 예시: `--navy`, `--brand-spectrum-1..n`, `--link`, `--on-dark`, `--cta` / `--cta-ink`, `.dot-*` 유틸.
- **규칙:** (1) v1 코어 이름과 충돌 금지, (2) **THEME:START/END 마커 안에만** 정의, (3) `src/index.css`와 `patterns/_slide.css`(→ `colors_and_type.css`) **양쪽에 동일하게** 기록, (4) 슬라이드/패턴은 하드코드 hex 금지 — `var(--*)`만 참조.
- 레이아웃 토큰은 테마 고유이므로 v1 고정 목록에 편입하지 않는다(모든 테마에 navy 등을 강제하면 과결합).

## 테마 비의존 자산 (교체 불필요 — 하드코드 재발 금지)

아래는 `/theme-init` 교체 대상이 **아니다**. 활성 테마 값을 토큰/매니페스트/`src/index.css`에서 동적으로 읽으므로 테마가 바뀌어도 그대로 동작한다. **이 파일들에 폰트명·hex를 다시 하드코드하면 테마 교체가 깨진다.**

- **변환/검증 스크립트** — `.claude/skills/slide/scripts/convert.js`, `check-manifest.js`
  - `convert.js`: 폰트 default는 `manifest.fonts[0]`에서 온다(없을 때만 generic 폴백). 하드코드 `'Arial'` 금지.
  - `check-manifest.js`: 폰트 검증은 `manifest.fonts`(또는 `--expected-font`) 허용목록 기준. cover/closing 장식-색 검사는 `src/index.css` THEME 블록의 `--accent` / `--accent-soft`(또는 `--accent`/`--accent-soft` 인자)를 읽는다. 하드코드 `'Arial'` / `#4633E3` / `#E8E5FC` 금지.
- **파이프라인 공용 레퍼런스 (references/ 루트, 테마 디렉토리 밖)** — `pptx-build.md`, `manifest-schema.md`, `pencil-workflow.md`, `pen-to-react.md`, `layout-guide.md`, `export-pptx/SKILL.md`
  - 폰트/색 서술은 "활성 테마 폰트(`--font-sans`)" / "테마 accent(`var(--accent)`)"로 일반화돼 있고, 상단에 "테마 비의존 주의" 배너가 있다. 예시 안의 Arial/#4633E3은 현재 jangpm 값임을 배너가 명시 — 새 prescriptive 하드코드를 추가하지 말 것.

## 마커 사용 규칙

- CSS: `/* THEME:START name=<theme> */` ... `/* THEME:END */`
- Markdown: `<!-- THEME:START name=<theme> -->` ... `<!-- THEME:END -->`
- 마커 사이 내용 전체가 교체 대상. 마커 외부는 인프라로 보존.
- 동일 파일에 여러 THEME 블록을 둘 수 있음(필요 시). 현재는 파일당 1블록만 사용.

## 3곳 동기화 규칙 (중요)

테마 룰은 **세 파일이 동일 사실을 역할별로 다른 형태로 제시**한다. 이는 의도된 중복이고, `/theme-init` 교체 시 **세 곳 모두** 업데이트해야 한다.

| 파일 | 역할 | 로드 시점 | 내용 형태 |
|---|---|---|---|
| `CLAUDE.md` THEME 블록 | 에이전트 세션 시작 시 즉시 습득하는 **최상위 HARD RULES** | Claude Code 세션 시작 | 처방적, 구체 수치 명시 (예: "폰트 Arial 고정", "accent #4633E3") |
| `.claude/skills/slide/SKILL.md` THEME 블록 | `/slide` 호출 시 워크플로우 진입 전 **테마 요약** | `/slide` 스킬 로드 시 | 8줄 이내 요약 (뷰포트·폰트·accent·스케일·카드·GM·그림자·참고 자산) |
| `.claude/skills/slide/references/<theme>/theme-rules.md` | `/slide` Step 1 시작 시 로드하는 **상세 룰 (단일 진실 원천)** | `/slide` Step 1 | 6개 섹션 전체 (커버 전략·액센트·폰트 테이블·카드 구성·헤드 메시지·폰트·스케일·Pill) |

**왜 3곳에 유지하나?**
- CLAUDE.md는 `/slide` 호출 없이도 에이전트가 코드 편집 시 테마 룰을 인지해야 함
- SKILL.md THEME 블록은 스킬 진입 시 빠른 맥락 — 상세 룰을 매번 theme-rules.md에서 꺼내 읽기엔 반복 비용
- theme-rules.md는 상세·예시 중심, 단일 진실 원천

**동기화 체크리스트 (`/theme-init` Step 3 diff 미리보기에서 확인 필수):**
- [ ] 3곳의 accent 컬러 값이 동일
- [ ] 3곳의 폰트 패밀리가 동일
- [ ] 3곳의 타이포 스케일 수치가 동일 (6단계)
- [ ] 3곳의 카드 radius/padding/border 규칙이 동일
- [ ] 3곳의 GM 정책이 동일 (있음/없음)
- [ ] 3곳의 그림자 정책이 동일 (3단계, sparse)

동기화 실패 시 에이전트가 상충하는 지시를 받아 **슬라이드 품질 불안정**해짐.

## Phase 2 완료 상태 (2026-04-22)

- [x] Phase 1 빌드 검증 통과 (`npm run build`)
- [x] 6번 항목(slide-system.tsx) UX 결정: **수동 가이드만 제공**. 가이드는 `.claude/skills/theme-init/references/manual-edit-guide.md`
- [x] `/theme-init` 입력 포맷 확정: **필수** 디자인 가이드 MD + 새 테마 이름 (kebab-case), **선택** `.pen` + 샘플 HTML
- [x] 검증 파이프라인 스펙: Step 5에 명시 (빌드 → 샘플 5종 Playwright 스크린샷 → 사용자 확인 → 커밋)
- [x] SKILL.md의 테마-특정 3개 섹션을 `references/jangpm/theme-rules.md`로 이관
- [x] `.claude/skills/theme-init/SKILL.md` + `references/manual-edit-guide.md` + `references/theme-rules-template.md` 생성

## 드라이런 결과 (2026-05-30, minimal-mono mechanical 스왑)

가상 테마 `minimal-mono`(accent `#2563EB`, Inter)로 임시 브랜치에서 mechanical 파이프라인을 end-to-end로 돌렸다(LLM 디자인 판단·Pencil `.pen` 생성·검토 루프는 제외, 스크립트+토큰 스왑+빌드+프리뷰만). **통과:**

- `rename-theme.mjs jangpm minimal-mono` — `references/jangpm`→`minimal-mono` `git mv` + 경로/.pen 문자열 치환(운영 문서 10개), `theme-init/**` 제외(이 맵 포함 — 자체 `references/jangpm`은 동적 예시).
- `gen-colors-and-type.mjs minimal-mono` — `src/index.css` THEME 블록 → `colors_and_type.css` 재생성(name 헤더·accent·폰트 반영), 클래스 패리티 OK.
- `validate-theme.mjs minimal-mono` — **6/6** (마커 3 + 토큰 컨트랙트 55 + 클래스 패리티 + 값 패리티).
- `npm run build` — 통과(토큰 이름 고정이라 슬라이드/`slide-system.tsx` 무수정 빌드. 빌드는 `src/slides/_archive_v2`를 `src/slides/`로 복사 + `index.ts` 생성 후 수행 — slides가 between-decks `.gitignore`라 정상).
- 패턴 standalone 프리뷰 — 재생성된 `colors_and_type.css`로 새 accent(파랑)가 패턴에 전파, 콘솔 에러 0(favicon 제외). card_style/`.card-chrome` 토큰 flip도 정상.

**발견된 구멍 — GAP-2 (bare 테마명 잔여):** mechanical 치환은 `references/<old>`·`<old>-design-system.pen` 경로 형태만 안전하게 자동 치환한다(슬러그가 산문·배지·트리·`preset_name`에 박혀 있어 일반 치환은 오탐 위험). 그 결과 THEME 마커 밖·경로/.pen 외에 슬러그가 토큰으로 남은 **운영 문서**가 갱신되지 않는다 — README 배지/헤딩/디렉토리 트리, `slide/SKILL.md` 패턴 설명·B4/B7/B9, `slide-plan` `preset_name`·활성테마 언급, `CLAUDE.md` "주요 경로 > 테마 자산" 라벨, 공용 LLM 문서 배너의 "(active-theme)" 괄호.
- **조치(완료):** `rename-theme.mjs`에 **"bare 테마명 잔여" 리포트 패스** 추가 — report-only(자동 치환 안 함), 활성 테마 콘텐츠 디렉토리 `references/<theme>/`는 제외(그 안의 테마명은 reskin/Step 4.5·theme-rules/DESIGN 재작성 담당). theme-init `SKILL.md` Step 4 #4에 이 목록을 수동 갱신하라는 지침 추가.

**남은 선택 작업:** 필요시 SKILL.md의 카드/헤드/핵심 제약 섹션도 theme-rules.md로 추가 이관(원 #3).
