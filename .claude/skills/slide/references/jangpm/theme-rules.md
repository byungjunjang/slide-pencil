# Jangpm 테마 룰

활성 테마(`jangpm`)의 슬라이드 제작 세부 룰. `/slide` 스킬이 Step 1 시작 시 반드시 이 파일을 로드한다. `/theme-init` 실행 시 이 파일이 새 테마의 `theme-rules.md`로 교체된다.

## 커버 슬라이드 기본 전략

커버 슬라이드는 첫인상(1.5점 배점) 점수를 직접 결정한다. 기본으로 고임팩트 커버를 사용한다.

- **AI 이미지 기본 사용:** `G(imageFrame, "ai", "...")` 연산으로 커버에 이미지 생성. 텍스트만인 커버는 지양
- **타이포 실험 허용:** 커버 제목은 100~200px 범위에서 대담하게 사용. 단어 1~2개 + 부제목 조합
- **액센트 컬러 강조:** 커버에서 accent 컬러가 시각적으로 눈에 띄어야 함 (버튼, 선, 하이라이트 등)
- **덱별 차별화:** 매 덱의 커버가 다른 느낌이어야 함. 같은 레이아웃 패턴 반복 금지
- **`layout: "none"` 필수:** 커버 슬라이드 프레임은 항상 `layout: "none"` (→ pencil-workflow.md 참조)

커버 유형 예시 (매 덱에서 다른 유형 선택):

> **패턴 매핑:** `title`(중앙 정렬)은 B/E 유형에 적합. `cover-vertical`(세로 강조)은 C/D 유형에 적합. A 유형은 `title` 기반으로 좌우 분할 커스텀.

- **A. Split Cover** → `title` 기반: 좌측 50% 텍스트 + 우측 50% AI 이미지. 제목 56px (`.display`), accent 태그 + accent 구분선
- **B. Full Bleed** → `title` 기반: 전체 AI 이미지 + 단색 오버레이. 제목 56px 중앙 또는 하단 배치
- **C. Bold Typography** → `cover-vertical` 기반: 흰색 배경, accent 컬러 대형 타이포 1~2단어. 이미지 없이 타이포가 주인공
- **D. Accent Block** → `cover-vertical` 기반: 좌측에 accent 컬러 블록(30%w) + 우측에 제목/부제목
- **E. Diagonal Split** → `title` 기반: 대각선으로 분할된 이미지 + 텍스트 영역

**커버 내부 최소 요소**: accent 태그(pill) + 제목 + 부제목 + 메타(날짜/슬라이드 수) + accent 구분선 또는 장식 요소 = 최소 5요소

## 액센트 컬러 전략

- **덱당 1개 accent 컬러** (모노크롬 + 1 accent)
- **사용 위치:** 커버(배경/텍스트 블록), 섹션 브레이크(타이틀), KPI 숫자, Before/After 우측 컬럼, 비교 차트 강조, **텍스트 레벨 하이라이트**
- **텍스트 레벨 하이라이트**: 핵심 키워드나 구문에 accent 컬러 배경 하이라이트(bg + 흰색/검정 텍스트) 또는 볼드+컬러로 **단어/구문 단위** 강조. 박스/카드 단위가 아닌 인라인 수준에서 시선을 끄는 방식. 타이틀, 클로징 인사이트, Key Statement에서 특히 효과적
- **고정 컬러:** #4633E3 (모든 덱에서 동일하게 사용)

## 폰트 웨이트 + 크기 기준표

시맨틱 클래스 사용을 권장. 하드코드는 예시/특수 용도에 한해 허용.

| 역할 | 클래스 | fontSize | fontWeight | 색상 토큰 |
|------|--------|----------|-----------|----------|
| 커버 타이틀 (대형) | `.display` | 56px | 800 | `--text` |
| 섹션/커버 대형 타이틀 | — | 44–56px | 800 | `--text` |
| 섹션 제목 (h2) | `.headline` | 32px | 700 | `--text` |
| KPI 대형 숫자 | `.display-sm` | 40px | 800 | `--accent` 또는 `--text` |
| 카드 제목 (앵커 텍스트) | — | 20–24px | 800 | `--text` |
| 카드 서브 타이틀 | `.title` | 18.4px | 600 | `--text` |
| 본문 / 불릿 | `.body` | 15.2px | 400 | `--text` |
| 뮤트 설명 | `.body` + `text-secondary` | 15.2px | 400 | `--text-secondary` |
| 메타 / 날짜 / 라벨 | `.caption` | 12.8px | 500 | `--text-secondary` |
| 카테고리 라벨 (UPPERCASE) | `.label-caption` | 12.8px | 600 | `--text-secondary` |
| pill / 태그 | `.body` (Pill 컴포넌트) | 15.2px | 600 | `--accent-ink` on `--accent-soft` |
| 코드 | `.mono` | 0.9em | 400 | `--text` |

**`.label-caption` 보충 (UPPERCASE letter-spacing 0.05em):** 카드 위 카테고리 라벨, 표지 "Speaker · 발표자"처럼 **고정 라벨**에 사용. 본문(`.caption`)과 다른 점은 텍스트가 항상 짧고 분류적이라는 것. h2 위에 supertitle로 배치하지 말 것 (NO supertitle 룰).

**하드코드 허용 예외:** 커버 초대형 배경 숫자·장식 텍스트(200~260px), 숫자 앵커(24~32px).

## 카드 내부 구성 규칙

**카드는 빈 껍데기가 아니다.** 모든 카드 내부에 최소 3개 요소를 포함하여 밀도감과 완성도를 확보한다.

**카드 최소 구성 (HARD RULE)** ⚠️:
- **아이콘/비주얼** (상단 또는 인라인): SVG 아이콘, 원형 번호, 이니셜 배지, 색상 도트 중 1개
- **제목** (bold, 36-48px): 핵심 메시지 1줄
- **본문** (28-32px, 2-3줄): 구체적 설명 또는 데이터

**카드 강화 요소** (필수는 아니지만 적극 권장):
- **KPI 숫자** (56-72px, bold): 카드 상단이나 좌측에 큰 숫자로 시각적 앵커
- **pill 태그** (22-24px, rounded-full): 카테고리/상태 표시, 카드 상단 우측
- **인사이트 바**: 카드 하단에 1줄 요약 — 다른 배경색(accent 또는 연한 회색)
- **진행률 바**: 숫자와 함께 시각적 비율 표현
- **구분선**: 카드 내부 섹션을 나눌 때 1px 라인

**안티 패턴 (금지):**
- 제목만 있는 빈 카드 (아이콘+본문 없이 제목만)
- 모든 카드가 동일한 내부 구조 (변화를 줄 것)
- 카드 내부에 문단 (3줄 초과 텍스트)

## 헤드 메시지 표준화 규칙

**모든 콘텐츠 슬라이드(커버·클로징 제외)의 메인 헤딩은 동일한 규격을 유지한다.**

- **크기**: `.headline` 클래스 또는 `text-[32px] font-[700]` — 덱 내에서 하나의 사이즈로 통일
- **굵기**: `font-bold` (font-weight: 700) 필수
- **위치**: 슬라이드 상단 고정 — 슬라이드 패딩 직후 첫 번째 텍스트 요소
- **NO supertitle (HARD RULE)**: 헤딩 **위에** 소형 카테고리 라벨(22~32px) 별도 div 배치 금지. 카테고리 태그가 필요하면 헤딩과 같은 flex-row(flex items-center gap-4)로 헤딩 **오른쪽** 또는 헤딩 **하단**에 배치.

**올바른 헤더 구조 (React — 토큰 사용):**
```tsx
{/* 헤딩 + 태그가 같은 행에. 하드코드 hex 금지, 토큰만 사용 */}
<div className="flex items-center gap-[16px] mb-[32px]">
  <h2 className="headline text-[var(--text)] leading-tight">슬라이드 제목</h2>
  <span className="text-[22px] bg-[var(--accent)] text-[var(--surface)] rounded-full px-[20px] py-[8px]">태그</span>
</div>
```

**금지 패턴 (pill/badge 포함 모두 금지):**
```tsx
{/* ❌ flex-col 스택에서 heading 위에 어떤 요소도 금지 */}
<div className="flex flex-col gap-[16px]">
  <div className="rounded-full bg-[var(--text)] text-[var(--surface)]">카테고리</div>  {/* ❌ heading 위 pill */}
  <h2 className="headline">슬라이드 제목</h2>
</div>

{/* ✅ 올바른 패턴: flex-row로 나란히 */}
<div className="flex flex-row items-center gap-[16px]">
  <h2 className="headline">슬라이드 제목</h2>
  <div className="rounded-full bg-[var(--text)] text-[var(--surface)] text-[22px]">카테고리</div>  {/* ✅ 헤딩 오른쪽 */}
</div>
```

**핵심 판단 기준:** 헤딩 div보다 먼저(JSX 위쪽에) 어떤 요소든 위치하면 supertitle이다. 이를 피하려면 카테고리 태그를 항상 헤딩 JSX 다음에 배치하거나 flex-row로 나란히 배치한다.

## 폰트 / 허용 스케일 / Pill 최솟값

- **폰트**: Arial 고정 (`'Arial', 'Helvetica Neue', sans-serif`)
- **최소 fontSize**: 28px. 단, `rounded-full` pill/badge 컨테이너 **안에** 있는 텍스트는 22px 허용. **절대 최솟값: 22px** — 배지 내부 아이콘 텍스트, 스텝 번호, 약어 텍스트 등 모든 경우에 22px 미만 금지.
- **허용 스케일만 사용**: {22, 24, 28, 32, 36, 40, 44, 48, 56, 64, 72, 80, 96, 100+}. 이 집합 외의 값(18px, 20px, 30px, 37px 등) 사용 금지.
- **pill/tag 최솟값 강제 (HARD RULE)** ⚠️: `rounded-full` 또는 tag 형태의 텍스트는 반드시 `text-[22px]` 이상. 20px 이하 절대 금지. 올바른 예: `<span className="text-[22px] font-[600] rounded-full px-[12px] py-[4px]">태그</span>`
- **색상 팔레트**: 2~3 코어 + 중립색, 고대비 필수. 라이트 모드 전용.
  - 슬라이드 배경: `bg-[var(--bg)]` (`#FAFAF9` warm off-white) — `SlideShell`이 기본 적용
  - 카드 배경: `bg-[var(--surface)]` (흰색) / `bg-[var(--surface-alt)]` (`#F5F5F4`) / `bg-[var(--accent-soft)]` (accent 카드)
  - **하드코드 hex 금지.** 모든 색상은 `var(--*)` 토큰 참조. 토큰 이름 계약은 `docs/theme-replacement-map.md` 참조

## 그림자 / 엘리베이션 (sparse)

3곳 동기화 룰(`docs/theme-replacement-map.md`)에 따라 CLAUDE.md·`slide/SKILL.md`와 동일한 그림자 정책을 단일 진실 원천으로 명시한다.

- **3단계만 사용**: `shadow-sm` / `shadow-md` / `shadow-lg` (`src/index.css` THEME 토큰 `--shadow-sm/md/lg`, 계열 `0 1px 2px` / `0 2px 8px` / `0 8px 24px`). 임의 그림자 값 금지.
- **sparse 적용**: KPI·데이터 강조 카드 등 **시선 앵커에만**. 일반 카드는 1px hairline 보더로 구분하고 그림자 없음.
- **그라디언트 / 글로우 금지 (HARD RULE)**: 깊이는 그림자 3단계로만 표현. `from-*`/`to-*` 그라디언트·glow·3D 금지.
