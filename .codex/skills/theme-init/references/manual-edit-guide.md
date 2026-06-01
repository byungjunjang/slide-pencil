# slide-system.tsx 수동 편집 가이드

`/theme-init`은 `src/components/slide-system.tsx`를 **자동 수정하지 않는다.** 이 파일은 프리미티브 컴포넌트의 구조(JSX 계층, props 시그니처, 조건부 렌더링)를 담고 있어 기계적 치환이 리스크가 크다. Step 4 완료 후 아래 체크리스트를 따라 직접 편집한다.

## 편집 컨텍스트

- 파일 경로: `src/components/slide-system.tsx`
- CSS 변수는 자동 반영 — 이 파일은 `var(--accent)`, `var(--surface)` 등을 참조하므로 토큰 값만 바뀌면 스타일은 따라옴. **구조적 결정**만 수동으로 판단.
- 수정 후 반드시 `npm run build` + 기존 슬라이드 시각 검증

---

## 체크리스트

### 1. Governing Message (GM)

Jangpm은 콘텐츠 슬라이드 하단에 1줄 요약(`.gm`)을 강제한다. 새 테마에도 이 개념이 있는가?

- **있음 (1줄 푸터 요약을 철학으로 채택):** `<GuidingMessage>` 컴포넌트와 `<SlideShell gm="...">` prop 유지. 수정 불요.
- **없음:** 다음 3가지를 제거:
  1. `SlideShell` 컴포넌트의 `gm` prop 시그니처
  2. `SlideShell` 내부의 GM 렌더링 블록 (보통 하단 absolute 영역)
  3. `GuidingMessage` 컴포넌트 export 전체
  4. 기존 슬라이드(`src/slides/SlideAgent*.tsx`)에서 `gm=...` 사용처 일괄 제거
  5. `CLAUDE.md`(THEME 블록)의 "Governing Message" 규칙 삭제 (이미 교체됐어야 정상)

### 2. 카드 tone (Card 컴포넌트)

Jangpm의 `Card`는 `tone="default" | "alt" | "accent"` 3종.

- **동일:** 수정 불요
- **다른 조합 (예: `tone="solid" | "outlined"`):**
  1. `Card`의 props 유니온 타입 수정
  2. 내부 스타일 분기(`switch(tone)` 또는 조건부 클래스) 재작성
  3. 기존 슬라이드의 `tone=` prop 값 일괄 치환 (`rg -l 'tone='` 로 검색 후 치환)

### 3. 프리미티브 필요 여부

기존 export 목록: `SlideShell`, `SlideBody`, `SectionHeader`, `Card`, `NumberBadge`, `Metric`, `Pill`, `AccentBadge`, `GuidingMessage`, `RuleLine`.

각 프리미티브에 대해 판단:

| 프리미티브 | 용도 | 제거 가능한 경우 |
|---|---|---|
| `SlideShell` | 1280×720 + relative 루트 | 거의 항상 유지 |
| `SlideBody` | 내부 패딩 래퍼 | 거의 항상 유지 |
| `SectionHeader` | 헤드라인 + 태그 | 거의 항상 유지 |
| `Card` | 카드 컨테이너 | 테마가 "카드" 개념을 쓰지 않으면 제거 |
| `NumberBadge` | 원형 번호 (01/02) | 번호 앵커 사용 안 하면 제거 |
| `Metric` | KPI 숫자 블록 | KPI 패턴 안 쓰면 제거 |
| `Pill` | 태그/필 | 태그 철학 없으면 제거 |
| `AccentBadge` | accent 컬러 배지 | accent 컬러 포인트가 다른 스타일이면 제거 |
| `GuidingMessage` | GM 푸터 | GM 없으면 제거 (위 1번 참조) |
| `RuleLine` | 구분선 | 구분선 사용 안 하면 제거 |

제거 시:
1. `slide-system.tsx`의 컴포넌트 정의 + export 삭제
2. `CLAUDE.md` (THEME 블록)의 "공통 UI" 목록에서 제거
3. 기존 슬라이드의 import + 사용처 정리

### 4. 새 프리미티브 추가

새 테마에만 있는 요소(예: `Callout`, `Timeline`, `Quote`)가 필요하면:

1. `slide-system.tsx`에 컴포넌트 추가
2. CSS는 `var(--*)` 토큰 사용 (하드코드 hex 금지)
3. `CLAUDE.md` (THEME 블록)의 "공통 UI" 목록에 추가
4. `.codex/skills/slide/references/<new-theme>/theme-rules.md`에 사용 예시 문서화

### 5. 신규 레이아웃 프리미티브 (Layout Re-authoring 연계)

`/theme-init` Step 4.5(Layout Re-authoring)에서 재작곡한 시그니처 레이아웃이 프리미티브를 요구하면 아래를 수동 추가한다. CSS는 **Step 4.5에서 추가한 레이아웃 토큰**(`var(--navy)`, `var(--cta)`, `var(--on-dark)` 등)만 참조 — 하드코드 금지.

| 레이아웃 | 추가 프리미티브 (예) | 핵심 |
|---|---|---|
| centered hero (cover) | `<Hero>` | 1280×720 중앙정렬, navy-band 위 `--on-dark` 텍스트 |
| navy-band (cover/section/closing) | `SlideShell`에 `band="navy"` variant | **라이트 완화 허용 범위 = 이 3종 한정.** 콘텐츠 슬라이드 본문은 라이트 유지. CSS는 `.slide.navy-band` 복합 선택자로 (bare `.navy-band`는 `.slide` 기본 배경에 우선순위로 져서 밴드 미적용) |
| CTA (closing) | `<CtaButton>` | `--cta`/`--cta-ink`, 라운드, 1슬라이드 1회 |
| brand-spectrum dot | `<SpectrumDots>` | `.dot-*` 토큰 순환 |

**락 (재작곡 프리미티브가 깨면 안 됨):** 뷰포트 1280×720, 테마 폰트 고정, GM 라인, `#slides-root`, THEME:START/END 마커, 라이트 모드(네이비 밴드까지만). 추가 후 `npm run build` 통과 + 기존 슬라이드 비파괴 확인.

---

## 검증

수정 완료 후:

```bash
npm run build
```

- TypeScript 에러 없음
- 기존 `src/slides/SlideAgent*.tsx`가 깨지지 않음 (import 에러 / prop 타입 에러 없음)
- `dist/index.html`을 브라우저에서 열어 시각 확인

깨진 슬라이드가 있으면 `src/slides/SlideAgent*.tsx`를 새 프리미티브 시그니처에 맞게 수정하거나 `_archive/`로 이동.
