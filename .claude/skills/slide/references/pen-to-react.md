# .pen → React + Tailwind 변환 규칙

## 변환 흐름

1. **패턴 HTML 로드 (필수 선행 단계)**: 해당 슬라이드에 선택된 패턴 `references/jangpm/patterns/<id>-<name>.html`을 Read tool로 읽는다. 이 HTML이 레이아웃·시맨틱 클래스·간격의 단일 진실 원천이다
2. **노드 트리 + 시각 참조 수집** (한 번의 `pencil interactive` 호출, `references/pencil-cli.md` 패턴):
   ```bash
   ( cat <<PENCIL
   batch_get({ nodeIds: ["<slideFrameId>"], readDepth: 10 })
   export_nodes({ nodeIds: ["<slideFrameId>"], outputDir: "output/<slug>/_eval", format: "png", scale: 2 })
   PENCIL
   sleep 1; echo "exit()" ) | pencil interactive --in output/<slug>/pencil-new.pen --out output/<slug>/pencil-new.pen
   ```
   - `batch_get` 결과 → 텍스트 콘텐츠·배치 추출
   - `output/<slug>/_eval/<slideFrameId>.png` → Claude Read tool로 시각 참조
3. **패턴 HTML의 구조를 `slide-system.tsx` 프리미티브로 매핑**한 뒤, 텍스트/이미지만 노드 트리에서 주입. 패턴 HTML에 없는 장식 요소 추가 금지
4. `src/slides/SlideNN.tsx` 작성

## 패턴 HTML → 프리미티브 매핑

| 패턴 HTML 요소 | React 변환 |
|---|---|
| `<section class="slide">` | `<SlideShell gm="...">` |
| `<div class="slide-body">` | `<SlideBody>` |
| `<h1 class="display">` / `<h2 class="headline">` | `<h1 className="display">` / `<h2 className="headline">` (또는 `<SectionHeader title=... />`) |
| `<span class="accent-badge">` | `<AccentBadge>` |
| `<hr class="rule-accent">` | `<RuleLine className="bg-[var(--accent)]" />` |
| Card/Box 영역 | `<Card>` / `<Card accent>` |
| 숫자 배지 | `<NumberBadge>` |
| KPI/Stat 블록 | `<Metric value label />` |
| Pill/태그 | `<Pill tone="soft">` |

## 컴포넌트 기본 구조

```tsx
import { SlideShell, SlideBody, SectionHeader, Card } from '../components/slide-system'

export default function Slide01() {
  return (
    <SlideShell gm="이 슬라이드의 한 줄 핵심 메시지">
      <SlideBody>
        <SectionHeader title="섹션 타이틀" subtitle="부연 설명" />
        <div className="mt-[32px] grid grid-cols-3 gap-[24px]">
          <Card>...</Card>
          <Card accent>...</Card>
          <Card>...</Card>
        </div>
      </SlideBody>
    </SlideShell>
  )
}
```

## 노드 → JSX 매핑

| .pen 노드 타입 | JSX 요소 |
|---------------|---------|
| `type: "frame"` | `<div>` |
| `type: "text"` | `<div>` 또는 `<p>` |
| 이미지 fill이 있는 frame | `<div>` with `<img>` 자식 또는 background-image |

## 레이아웃 → Tailwind 클래스

| .pen 속성 | Tailwind 클래스 |
|-----------|----------------|
| `layout: "vertical"` | `flex flex-col` |
| `layout: "horizontal"` | `flex flex-row` |
| `layout: "center"` | `flex items-center justify-center` |
| `width: "fill_container"` | `flex-1` |
| `width: N` (숫자) | `w-[Npx]` |
| `height: "fill_container"` | `flex-1` |
| `height: N` (숫자) | `h-[Npx]` |
| `gap: N` | `gap-[Npx]` |
| `padding: N` | `p-[Npx]` |
| `padding: [T, R, B, L]` | `pt-[Tpx] pr-[Rpx] pb-[Bpx] pl-[Lpx]` |
| `padding: [V, H]` | `py-[Vpx] px-[Hpx]` |

## 스타일 → Tailwind 클래스

| .pen 속성 | Tailwind 클래스 |
|-----------|----------------|
| `fill: "#HEX"` | `bg-[#HEX]` |
| `fill: "var(--name)"` | `bg-[var(--name)]` |
| `cornerRadius: N` | `rounded-[Npx]` |
| `fontSize: N` | `text-[Npx]` |
| `fontWeight: "W"` | `font-[W]` |
| `color: "#HEX"` | `text-[#HEX]` |
| `color: "var(--name)"` | `text-[var(--name)]` |
| `fontFamily: "var(--font-display)"` | `font-[var(--font-display)]` (또는 CSS 변수 참조) |
| `lineHeight: N` | `leading-[N]` |
| `letterSpacing: N` | `tracking-[Npx]` |
| `textAlign: "center"` | `text-center` |
| `textAlign: "left"` | `text-left` |

## CSS 변수 연동

Pencil CLI `set_variables`로 등록한 디자인 토큰은 `src/index.css`의 `:root`에 CSS 변수로 정의:

```css
:root {
  --color-primary: #000000;
  --color-muted: #71717A;
  --color-card-bg: #F4F4F5;
  --font-display: 'Arial', sans-serif;
  --font-body: 'Arial', sans-serif;
}
```

컴포넌트에서 참조:
```tsx
<div className="bg-[var(--color-card-bg)] font-[var(--font-display)]">
```

## 이미지 처리 ⚠️ (가장 흔한 실수 — 반드시 읽을 것)

> **경고:** `batch_get` 결과로 노드의 `fill.url` 값 (예: `"./images/generated-1773380957390.png"`)이 보이더라도, 그 값을 React 코드에 직접 복붙하면 안 된다. 이 URL은 Pencil 내부 참조이며 실제 파일이 존재하지 않는다. 반드시 아래 `export_nodes` → ES import 흐름을 사용해야 한다.

G() 연산으로 생성된 이미지는 **반드시 ES import**로 사용해야 `vite-plugin-singlefile`이 base64로 인라인한다.
CSS string `url('./...')` 방식은 Vite가 처리하지 못해 최종 HTML에서 누락된다.

### 올바른 방법 (Step 4 시작 전)

1. Pencil CLI `export_nodes` 로 이미지 노드를 `src/images/` 에 저장:
   ```bash
   ( cat <<PENCIL
   export_nodes({ nodeIds: ["<imgNodeId>"], outputDir: "src/images", format: "png", scale: 1 })
   PENCIL
   sleep 1; echo "exit()" ) | pencil interactive --in output/<slug>/pencil-new.pen --out output/<slug>/pencil-new.pen
   ```
   → 파일명은 Pencil이 노드ID로 자동 생성: `src/images/{nodeId}.png`

2. 컴포넌트에서 ES import:
   ```tsx
   import bgImage from '../images/{nodeId}.png'
   ```

3. 사용:
   - 배경 이미지: `style={{ backgroundImage: \`url(\${bgImage})\` }}`
   - 전경 이미지: `<img src={bgImage} className="w-full h-full object-cover" alt="" />`

### ❌ 사용 금지 패턴
```tsx
// 이 방식은 viteSingleFile이 인라인 불가 — 최종 HTML에서 이미지 누락
style={{ backgroundImage: "url('./images/someFile.png')" }}
```

## 텍스트 처리

- `content` 속성의 텍스트 → JSX 텍스트 노드
- 줄바꿈이 포함된 경우:
  ```tsx
  <div className="text-[28px] font-[400] text-[#71717A] leading-[1.5]">
    첫 번째 줄<br />
    두 번째 줄
  </div>
  ```
- 최소 fontSize: 28 (태그/뱃지 보조 요소는 22px 허용)

## 변환 예시: 3-Column Card (layout-07)

Pencil 노드:
```
frame (layout: horizontal, gap: 40)
├── frame (layout: vertical, padding: 40, fill: #F4F4F5, cornerRadius: 24, width: fill_container)
│   ├── frame (width: 72, height: 72, fill: #000, cornerRadius: 36)
│   │   └── text (content: "→", color: #FFF, fontSize: 32)
│   ├── text (content: "HTTP", fontSize: 48, fontWeight: 800)
│   └── text (content: "설명 텍스트", fontSize: 28, color: #71717A)
├── (card 2 ...)
└── (card 3 ...)
```

React + Tailwind:
```tsx
<div className="flex flex-row gap-[40px]">
  <div className="flex-1 flex flex-col gap-[20px] p-[40px] bg-[#F4F4F5] rounded-[24px]">
    <div className="w-[72px] h-[72px] bg-black rounded-full flex items-center justify-center">
      <span className="text-[32px] font-[700] text-white">→</span>
    </div>
    <div className="text-[48px] font-[800] text-black">HTTP</div>
    <div className="text-[28px] font-[400] text-[#71717A]">설명 텍스트</div>
  </div>
  {/* card 2, card 3 동일 구조 */}
</div>
```

## 검증 체크리스트

변환 후 확인:
- [ ] 모든 시각 속성(fill, cornerRadius, padding, gap, fontSize 등)이 Tailwind로 매핑됨
- [ ] layout + gap 조합이 flex + gap과 정확히 일치
- [ ] fill_container 속성이 flex-1로 변환됨
- [ ] **이미지가 있는 슬라이드: Pencil CLI `export_nodes` → `src/images/` → ES `import` 패턴을 사용했는가** ← 이미지 누락 방지 핵심
- [ ] **`url('./images/...')` 문자열이 코드에 없는가** (있으면 즉시 ES import로 교체)
- [ ] CSS 변수가 index.css에 정의되고 컴포넌트에서 참조됨
- [ ] TypeScript 컴파일 에러 없음
