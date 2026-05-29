# {{THEME_NAME}} 테마 룰 (템플릿)

> 이 파일은 `/theme-init`이 새 테마의 `theme-rules.md`를 생성할 때 사용하는 템플릿. `{{PLACEHOLDER}}` 섹션을 실제 값으로 치환한다. 구조는 Jangpm 원본(`.claude/skills/slide/references/jangpm/theme-rules.md`)을 따른다.

---

# {{THEME_NAME}} 테마 룰

활성 테마(`{{THEME_SLUG}}`)의 슬라이드 제작 세부 룰. `/slide` 스킬이 Step 1 시작 시 반드시 이 파일을 로드한다. `/theme-init` 실행 시 이 파일이 새 테마의 `theme-rules.md`로 교체된다.

## 커버 슬라이드 기본 전략

{{COVER_PHILOSOPHY_PARAGRAPH — 예: "커버는 첫인상을 결정한다. 고임팩트 커버를 기본으로 사용한다."}}

- **{{COVER_IMAGE_POLICY}}:** {{예: AI 이미지 기본 사용 또는 텍스트 전용 허용 등}}
- **타이포 범위:** 커버 제목은 {{COVER_TITLE_MIN}}~{{COVER_TITLE_MAX}}px 범위에서 사용
- **액센트 컬러 강조:** 커버에서 accent 컬러가 시각적으로 눈에 띄어야 함
- **덱별 차별화:** 같은 레이아웃 패턴 2회 이상 반복 금지
- **Pencil `layout: "none"` 필수:** 절대 위치 필요 시

커버 유형 예시 ({{N}}종 중 덱마다 다른 유형 선택):

- **A. {{COVER_TYPE_A_NAME}}** — {{설명}}
- **B. {{COVER_TYPE_B_NAME}}** — {{설명}}
- **C. {{COVER_TYPE_C_NAME}}** — {{설명}}
- ... (최소 3종)

**커버 내부 최소 요소:** {{LIST_OF_REQUIRED_ELEMENTS — 예: "태그 + 제목 + 부제목 + 메타 + 구분선 = 5요소"}}

**Layout Re-authoring 시그니처 (Step 4.5에서 재작곡 시 기입):** {{SIGNATURE_LAYOUTS — 예: "cover/closing 네이비 히어로 + 브랜드 스펙트럼 닷 + 퍼플 CTA, 파스텔 피처보드. 라이트 완화는 cover/section/closing 네이비 밴드까지만." 재작곡 안 하면 "표준 reskin"}}

## 액센트 컬러 전략

- **덱당 {{N}}개 accent 컬러** ({{MONOCHROME_OR_DUOTONE}} + {{N}} accent)
- **사용 위치:** {{ACCENT_USAGE_LOCATIONS — 예: "커버 태그, 섹션 타이틀, KPI 숫자, Before/After 강조, 텍스트 레벨 하이라이트"}}
- **텍스트 레벨 하이라이트:** {{INLINE_HIGHLIGHT_POLICY — 있으면 설명, 없으면 "없음"}}
- **고정 컬러:** {{ACCENT_HEX}} (모든 덱에서 동일)

## 폰트 웨이트 + 크기 기준표

시맨틱 클래스 사용을 권장. 하드코드는 예시/특수 용도에 한해 허용.

| 역할 | 클래스 | fontSize | fontWeight | 색상 토큰 |
|------|--------|----------|-----------|----------|
| 커버 타이틀 (대형) | `.display` | {{FS_DISPLAY}}px | {{FW_DISPLAY}} | `--text` |
| 섹션/커버 대형 타이틀 | — | {{FS_SECTION_RANGE}}px | {{FW_DISPLAY}} | `--text` |
| 섹션 제목 (h2) | `.headline` | {{FS_HEADLINE}}px | {{FW_HEADLINE}} | `--text` |
| KPI 대형 숫자 | `.display-sm` | {{FS_DISPLAY_SM}}px | {{FW_DISPLAY}} | `--accent` 또는 `--text` |
| 카드 제목 (앵커 텍스트) | — | {{FS_CARD_TITLE_RANGE}}px | {{FW_HEADLINE}} | `--text` |
| 카드 서브 타이틀 | `.title` | {{FS_TITLE}}px | {{FW_TITLE}} | `--text` |
| 본문 / 불릿 | `.body` | {{FS_BODY}}px | {{FW_BODY}} | `--text` |
| 뮤트 설명 | `.body` + `text-secondary` | {{FS_BODY}}px | {{FW_BODY}} | `--text-secondary` |
| 메타 / 날짜 / 라벨 | `.caption` | {{FS_CAPTION}}px | {{FW_CAPTION}} | `--text-secondary` |
| pill / 태그 | `.body` (Pill 컴포넌트) | {{FS_BODY}}px | {{FW_TITLE}} | `--accent-ink` on `--accent-soft` |
| 코드 | `.mono` | 0.9em | {{FW_BODY}} | `--text` |

**하드코드 허용 예외:** {{HARDCODE_EXCEPTIONS — 예: "커버 초대형 장식 숫자(200~260px)"}}

## 카드 내부 구성 규칙

**카드는 빈 껍데기가 아니다.** 모든 카드 내부에 최소 3개 요소를 포함하여 밀도감과 완성도를 확보한다.

**카드 최소 구성 (HARD RULE)** ⚠️:
- **아이콘/비주얼** (상단 또는 인라인): {{CARD_ICON_OPTIONS — 예: "SVG 아이콘, 원형 번호, 이니셜 배지, 색상 도트 중 1개"}}
- **제목** (bold, {{CARD_TITLE_SIZE}}px): 핵심 메시지 1줄
- **본문** ({{CARD_BODY_SIZE}}px, 2-3줄): 구체적 설명 또는 데이터

**카드 강화 요소** (필수는 아니지만 적극 권장):
- **KPI 숫자** ({{CARD_KPI_SIZE}}px, bold): 카드 상단이나 좌측에 큰 숫자로 시각적 앵커
- **pill 태그** ({{PILL_SIZE}}px, rounded-full): 카테고리/상태 표시, 카드 상단 우측
- **인사이트 바**: 카드 하단에 1줄 요약 — 다른 배경색(accent 또는 연한 회색)
- **진행률 바**: 숫자와 함께 시각적 비율 표현
- **구분선**: 카드 내부 섹션을 나눌 때 1px 라인

**안티 패턴 (금지):**
- 제목만 있는 빈 카드 (아이콘+본문 없이 제목만)
- 모든 카드가 동일한 내부 구조 (변화를 줄 것)
- 카드 내부에 문단 (3줄 초과 텍스트)

## 헤드 메시지 표준화 규칙

**모든 콘텐츠 슬라이드(커버·클로징 제외)의 메인 헤딩은 동일한 규격을 유지한다.**

- **크기**: `.headline` 클래스 또는 `text-[{{FS_HEADLINE}}px] font-[{{FW_HEADLINE}}]` — 덱 내에서 하나의 사이즈로 통일
- **굵기**: `font-bold` (font-weight: {{FW_HEADLINE}}) 필수
- **위치**: 슬라이드 상단 고정 — 슬라이드 패딩 직후 첫 번째 텍스트 요소
- **NO supertitle (HARD RULE)**: 헤딩 **위에** 소형 카테고리 라벨 별도 div 배치 금지. 카테고리 태그가 필요하면 헤딩과 같은 flex-row(flex items-center gap-4)로 헤딩 **오른쪽** 또는 헤딩 **하단**에 배치.

**올바른 헤더 구조 (React — 토큰 사용):**
```tsx
{/* 헤딩 + 태그가 같은 행에. 하드코드 hex 금지, 토큰만 사용 */}
<div className="flex items-center gap-[16px] mb-[32px]">
  <h2 className="headline text-[var(--text)] leading-tight">슬라이드 제목</h2>
  <span className="text-[{{PILL_SIZE}}px] bg-[var(--accent)] text-[var(--surface)] rounded-full px-[20px] py-[8px]">태그</span>
</div>
```

**금지 패턴:**
```tsx
{/* ❌ flex-col 스택에서 heading 위에 어떤 요소도 금지 */}
<div className="flex flex-col gap-[16px]">
  <div className="rounded-full bg-[var(--text)] text-[var(--surface)]">카테고리</div>  {/* ❌ heading 위 pill */}
  <h2 className="headline">슬라이드 제목</h2>
</div>

{/* ✅ 올바른 패턴: flex-row로 나란히 */}
<div className="flex flex-row items-center gap-[16px]">
  <h2 className="headline">슬라이드 제목</h2>
  <div className="rounded-full bg-[var(--text)] text-[var(--surface)] text-[{{PILL_SIZE}}px]">카테고리</div>
</div>
```

**핵심 판단 기준:** 헤딩 div보다 먼저(JSX 위쪽에) 어떤 요소든 위치하면 supertitle이다.

## 폰트 / 허용 스케일 / Pill 최솟값

- **폰트**: {{FONT_FAMILY}} 고정
- **최소 fontSize**: {{MIN_FONT_SIZE}}px. 단, `rounded-full` pill/badge 컨테이너 **안에** 있는 텍스트는 {{PILL_MIN_SIZE}}px 허용. **절대 최솟값: {{PILL_MIN_SIZE}}px**.
- **허용 스케일만 사용**: {{ALLOWED_SCALE — 예: "{22, 24, 28, 32, 36, 40, 44, 48, 56, 64, 72, 80, 96, 100+}"}}. 이 집합 외의 값 사용 금지.
- **pill/tag 최솟값 강제 (HARD RULE)** ⚠️: `rounded-full` 또는 tag 형태의 텍스트는 반드시 `text-[{{PILL_MIN_SIZE}}px]` 이상.
- **색상 팔레트**: 2~3 코어 + 중립색, 고대비 필수. {{COLOR_MODE — 예: "라이트 모드 전용"}}.
  - 슬라이드 배경: `bg-[var(--bg)]` — `SlideShell`이 기본 적용
  - 카드 배경: `bg-[var(--surface)]` / `bg-[var(--surface-alt)]` / `bg-[var(--accent-soft)]`
  - **하드코드 hex 금지.** 모든 색상은 `var(--*)` 토큰 참조. 토큰 이름 계약은 `docs/theme-replacement-map.md` 참조

---

## 플레이스홀더 참조

`/theme-init` Step 2에서 다음 값들이 대입된다:

| 플레이스홀더 | 출처 |
|---|---|
| `THEME_NAME` | 사용자 입력 (표시용 이름, 예: "Brutalist") |
| `THEME_SLUG` | 사용자 입력 (kebab-case, 예: `brutalist`) |
| `ACCENT_HEX` | `src/index.css`의 `--accent` 값 |
| `FS_*`, `FW_*` | `src/index.css`의 타이포 토큰 |
| `CARD_TITLE_SIZE`, `CARD_BODY_SIZE`, `CARD_KPI_SIZE` | 카드 내부 요소 크기 — 가이드 MD 또는 사용자 질문 |
| `PILL_SIZE`, `PILL_MIN_SIZE`, `MIN_FONT_SIZE` | pill/tag/본문 최솟값 — 가이드 MD 또는 표준값 |
| `FONT_FAMILY` | `src/index.css`의 `--font-sans` 값 |
| `ALLOWED_SCALE` | 가이드 MD의 타이포 스케일 정의. 없으면 표준 Fibonacci/8px 그리드 제안 |
| `COLOR_MODE` | 라이트/다크/auto — 가이드 MD |
| `COVER_*`, `ACCENT_USAGE_*` | 디자인 가이드 MD에서 파싱 |
| `SIGNATURE_LAYOUTS` | Step 4.5 Layout Re-authoring 결과 (재작곡한 cover/closing/feature-board 시그니처). 재작곡 안 하면 "표준 reskin" |
| `MONOCHROME_OR_DUOTONE` | 가이드 MD의 컬러 철학 문장 |
| `CARD_ICON_OPTIONS` | 가이드 MD의 카드 철학 — 없으면 기본 "SVG 아이콘, 원형 번호, 이니셜 배지, 색상 도트 중 1개" |
| `HARDCODE_EXCEPTIONS` | 가이드 MD의 예외 규칙 |

파싱 실패 시 사용자에게 개별 질문 (최대 5개).

**6개 섹션 완결성 체크**: 이 템플릿은 `.claude/skills/slide/references/jangpm/theme-rules.md`의 6개 섹션 구조를 그대로 따른다. 누락 섹션이 있으면 `/slide` 스킬 Step 1 로드 시 해당 룰이 부재 → 슬라이드 품질 저하. 모든 섹션이 채워졌는지 Step 3 diff 미리보기에서 사용자 확인 필수.
