# 테마 교체 맵

`/theme-init` 스킬(Phase 2)이 활성 테마를 다른 디자인 시스템으로 교체할 때 **어디를 건드려야 하는지**를 정의한 문서. 이 맵 밖의 파일/영역은 테마와 무관한 인프라로 간주하여 `/theme-init`이 건드리지 않는다.

## 현재 활성 테마

`jangpm` — Jangpm Slide Design System (모노크롬 + 단일 accent `#4633E3`, Arial, 리포트형 레이어)

## 교체 대상 (6개 지점)

### 1. `src/index.css` — CSS 토큰 블록
- **범위:** `/* THEME:START name=jangpm */` ~ `/* THEME:END */` 사이 전체
- **포함:** `:root` 디자인 토큰(색상, 타이포, spacing, radius, shadow), `@layer base` 바디 폰트, 시맨틱 타이포 클래스(`.display`, `.headline`, `.title`, `.body`, `.caption`, `.label-caption`), 유틸리티 컬러 클래스
- **유지(블록 외):** `@import "tailwindcss";`
- **교체 방식:** 마커 사이 전체를 새 테마의 CSS로 덮어쓰기

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
- **교체 방식:** `git mv references/jangpm references/<new-theme-name>` 후 `theme-rules.md`를 새 테마 값으로 덮어쓰기. SKILL.md의 참조 경로(`references/jangpm/theme-rules.md` 등)도 `references/<new-theme-name>/theme-rules.md`로 치환.

### 5. `jangpm-design-system.pen` — Pencil 시각 레퍼런스
- **범위:** 프로젝트 루트의 `.pen` 파일
- **교체 방식:** 사용자가 새 테마의 `.pen` 파일 업로드 → 이름을 `<new-theme>-design-system.pen`으로 변경하여 루트에 배치. CLAUDE.md(THEME 블록 내)와 SKILL.md(THEME 블록 내)의 파일명 참조도 치환.

### 6. `src/components/slide-system.tsx` — 수동 편집 (자동화 제외)
- **현 상태:** `SlideShell`, `GuidingMessage`, `NumberBadge`, `Metric`, `Pill`, `AccentBadge`, `RuleLine` 등 프리미티브가 Jangpm 철학(특히 GM, 카드 3-tone)에 특화됨.
- **결정:** `/theme-init`은 **자동 수정하지 않는다**. 기계적 치환이 JSX 구조를 깨뜨릴 리스크가 큼.
- **Phase 2 산출물:** `.claude/skills/theme-init/references/manual-edit-guide.md` — GM 유무, 카드 tone, 프리미티브 추가/제거 4단계 체크리스트. Step 4 완료 후 사용자에게 제시됨.

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
```

시맨틱 타이포 클래스도 공유 계약: `.display`, `.display-sm`, `.headline`, `.title`, `.body`, `.caption`, `.label-caption`.

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

## 다음 단계 (선택)

실제 검증은 2번째 테마를 한 번 돌려봐야 구멍이 드러남. 권장 순서:

1. `/theme-init` 드라이런: 가상의 "minimal-mono" 테마 가이드 MD 작성 → 실제 실행 → 빌드 통과·시각 확인
2. 드라이런 중 발견된 구멍(토큰 컨트랙트 부족, 프롬프트 모호성 등)을 SKILL.md에 피드백
3. 필요시 SKILL.md의 카드/헤드/핵심 제약 섹션도 theme-rules.md로 추가 이관
