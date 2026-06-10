# Slide Manifest Schema

The manifest is a JSON file that describes a slide deck in absolute-positioned elements.
**Default path:** `extract-manifest.mjs` generates it automatically from the built HTML
(measured coordinates; the manifest carries `"generator": "extract-manifest"`).
**Fallback path:** the LLM handcrafts it by reading `src/slides/Slide*.tsx` + `src/index.css`.
`convert.js` reads this manifest and creates a PPTX file. Canvas is **1280×720**.

> **Theme-agnostic note:** the example fonts (`Arial`) and colors (`#4633E3`, `#1A1A1A`, …) throughout this doc are the **current active theme (jangpm)**. The real values live in `src/index.css` — the primary font in `--font-sans`, colors in the theme tokens (`--accent`, `--text`, …). When `/theme-init` swaps the theme, resolve `fontFamily` / `fonts` / colors from the new theme's `src/index.css`; do not hardcode Arial or jangpm hex. `convert.js` defaults any element with no `fontFamily` to `fonts[0]`, and `check-manifest.js` validates fonts against `manifest.fonts` (or `--expected-font`).

## Top-level structure

```json
{
  "title": "Presentation Title",
  "fonts": ["Arial"],
  "generator": "extract-manifest",
  "slides": [ ... ]
}
```

- `title`: Used as PPTX file title metadata
- `fonts`: Font family names used. **Use the active theme's primary font** (the first family in `src/index.css` `--font-sans`). convert.js falls back to `fonts[0]` for any text element that omits `fontFamily`. 모노 코드 텍스트는 PPT-safe `Courier New`로 매핑해 추가 선언
- `generator` (optional): `"extract-manifest"`이면 실측 좌표 매니페스트 — check-manifest.js가 일부 휴리스틱 검사(textBoxHeuristic)를 WARN으로 완화하고 cardYOrder를 skip한다. 핸드크래프트 매니페스트에는 넣지 않는다
- `slides`: Array of slide objects, in presentation order

## Slide object

```json
{
  "background": "#FFFFFF",
  "elements": [ ... ]
}
```

- `background`: Hex color string for slide background
- `elements`: Array of elements in back-to-front z-order (first = bottommost)

## Element types

### Text element

```json
{
  "type": "text",
  "content": "Hello World",
  "x": 80, "y": 56, "w": 1120, "h": 70,
  "fontSize": 56,
  "fontWeight": "800",
  "fontFamily": "Arial",
  "color": "#1A1A1A",
  "align": "left",
  "valign": "top",
  "lineSpacing": 1.15
}
```

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `content` | string | yes | — | Plain text. `\n` is **title only** (fontSize ≥ 60); body text relies on auto-wrap (check-manifest `noBodyNewline`이 검증). **이모지 금지** — 활성 테마 정책(CLAUDE.md "이모지/유니코드 장식 기호 금지", B5 게이트)과 동일 |
| `x`, `y` | number | yes | — | Position in px from top-left of slide |
| `w`, `h` | number | yes | — | Bounding box in px. **Add 40% vertical padding** to h for multi-line text |
| `fontSize` | number | yes | — | In px (converted to pt by script: px × 0.5) |
| `fontWeight` | string | yes | — | "400", "500", "700", "800" |
| `fontFamily` | string | yes | — | **The active theme font** (matches `fonts[0]`, from `src/index.css` `--font-sans`). Do NOT use web fonts not declared in `fonts` |
| `color` | string | yes | — | 6-digit hex only (`#RRGGBB`). 8-digit RGBA 금지 |
| `align` | string | no | "left" | "left", "center", "right" |
| `valign` | string | no | "top" | "top", "middle", "bottom" |
| `lineSpacing` | number | no | 1.5 | Line height multiplier |
| `letterSpacing` | number | no | 0 | In px. Mapped to charSpacing in pt |
| `runs` | array | no | — | Inline-styled text runs. When present, `content` is ignored. See **Runs schema** below |
| `wrap` | boolean | no | true | Set `false` to disable auto-wrap. `extract-manifest.mjs`는 **라인 락** 정책으로 모든 텍스트를 `false`로 내보내고, 줄바꿈은 측정된 지점의 `runs[].breakLine`으로만 표현한다 (PPT 재줄바꿈 차단) |
| `margin` | number | no | (PPT 기본) | Text inset in pt. `extract-manifest.mjs`는 실측 bbox 보존을 위해 `0`을 명시한다 |


#### Runs schema

Use `runs` instead of `content` for inline-styled text (accent color, bold keyword, multi-line title with `breakLine`, KPI with small unit). Each run inherits the parent text element's style by default and overrides only the specified fields.

```json
{
  "type": "text",
  "x": 56, "y": 92, "w": 1100, "h": 44,
  "fontSize": 34, "fontWeight": "700", "fontFamily": "Arial",
  "color": "#111111", "align": "left", "valign": "top",
  "runs": [
    { "text": "에이전트는 " },
    { "text": "세 역할", "color": "#4633E3" },
    { "text": "로 쪼개 설계합니다." }
  ]
}
```

| Run field | Type | Notes |
|-----------|------|-------|
| `text` | string | Required. The run content |
| `color` | string | 6-digit hex. Overrides outer `color` |
| `bold` | boolean | Direct bold toggle |
| `fontWeight` | string | Alternative to `bold`; ≥700 interpreted as bold |
| `italic` | boolean | — |
| `underline` | boolean | — |
| `fontSize` | number | In px. Useful for KPI sup pattern |
| `fontFamily` | string | Rarely needed; defaults to outer `fontFamily` |
| `breakLine` | boolean | Force a line break **after** this run. Preferred over `\n` inside `text` for multi-line titles |

Common patterns:

- **Accent color span**: `[{text:"a "}, {text:"accent", color:"#4633E3"}, {text:" b"}]`
- **Inline bold**: `[{text:"lead "}, {text:"keyword", bold:true}, {text:" trail"}]`
- **Multi-line title**: `[{text:"Line 1", breakLine:true}, {text:"Line 2", breakLine:true}, {text:"Line 3"}]`
- **KPI sup**: `[{text:"24"}, {text:"개", fontSize: Math.round(baseFs*0.55)}]`

### Rect element

```json
{
  "type": "rect",
  "x": 200, "y": 300, "w": 500, "h": 400,
  "fill": "#F4F4F5",
  "cornerRadius": 24,
  "stroke": "#E4E4E7",
  "strokeWidth": 1
}
```

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `x`, `y`, `w`, `h` | number | yes | — | Position and size in px |
| `fill` | string | yes | — | Hex color |
| `cornerRadius` | number | no | 0 | In px. **Preserve from HTML** — uses ROUNDED_RECTANGLE shape in PPTX |
| `stroke` | string | no | — | Border hex color |
| `strokeWidth` | number | no | 0 | Border width in px |

**Corner radius guide:**
- Cards: 활성 테마의 `--card-radius` 값 (jangpm: `cornerRadius: 12`)
- Badges/pills: `cornerRadius: 999` (rounded-full → capsule shape)
- Icon containers: HTML 소스의 rounded-* 값 그대로
- Never omit cornerRadius when the HTML source has rounded corners

### Ellipse element

For circles and ovals (numbered badges, bullet dots, decorative circles).

```json
{
  "type": "ellipse",
  "x": 160, "y": 328, "w": 72, "h": 72,
  "fill": "#4633E3",
  "stroke": "#E4E4E7",
  "strokeWidth": 1
}
```

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `x`, `y`, `w`, `h` | number | yes | — | Position and size in px. w===h for perfect circle |
| `fill` | string | yes | — | Hex color |
| `stroke` | string | no | — | Border hex color |
| `strokeWidth` | number | no | 0 | Border width in px |

**When to use ellipse vs rect:**
- Numbered badges (1, 2, 3): `ellipse` (w===h) + centered `text` overlay
- Bullet dots: small `ellipse` (12×12 or 16×16)
- Pill/capsule shapes: `rect` with `cornerRadius: 999`

### Image element

```json
{
  "type": "image",
  "src": "data:image/svg+xml;base64,...",
  "x": 680, "y": 160, "w": 520, "h": 400
}
```

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `src` | string | yes | — | Data URI (base64) or HTTPS URL. **Empty string forbidden** — omit element if no image |
| `x`, `y`, `w`, `h` | number | yes | — | Position and size in px |

## Layout flattening rules

The LLM must convert flexbox layouts to absolute coordinates:

1. **Read the React component** and understand the flex layout (direction, gap, padding, alignment)
2. **Calculate absolute positions** for each child element
3. **Cards with content inside**: Create a `rect` element for the card, then `text` elements positioned inside the card's bounds (accounting for card padding)

Example — a card at (200, 300) with size 500×400, padding 40px, containing title and body:

```json
[
  { "type": "rect", "x": 200, "y": 300, "w": 500, "h": 400, "fill": "#F4F4F5", "cornerRadius": 24 },
  { "type": "text", "x": 240, "y": 340, "w": 420, "h": 60, "content": "Card Title", "fontSize": 48, "fontWeight": "800", "fontFamily": "Arial", "color": "#1A1A1A", "align": "left", "valign": "top" },
  { "type": "text", "x": 240, "y": 420, "w": 420, "h": 200, "content": "Card body text goes here with enough detail to fill the space.", "fontSize": 28, "fontWeight": "400", "fontFamily": "Arial", "color": "#71717A", "align": "left", "valign": "top" }
]
```

## SVG handling

For inline SVGs in React components (e.g., diagrams, icons):
1. Extract the SVG markup
2. Convert to base64 data URI: `data:image/svg+xml;base64,{base64_encoded_svg}`
3. Add as an `image` element

## Font mapping

Use the **active theme font** for every text element — read it from `src/index.css` `--font-sans` and declare it in `fonts`. The table shows the fallback chain for the current theme (jangpm = Arial); a different theme substitutes its own font and fallbacks.

| Font | PPTX fallback (if not installed) |
|------|--------------------------------|
| Active theme font, English (jangpm: Arial) | Arial / Calibri |
| Active theme font, Korean | Malgun Gothic (맑은 고딕) |
| Active theme font, Google Slides 변환 | Noto Sans KR (자동 대체) |

**IMPORTANT:** set `"fontFamily"` to the active theme font in every manifest text element and list it in `fonts`. Do NOT introduce web fonts not declared in `fonts`. Viewer 환경별 렌더링 차이는 위 폴백 참조.

## Content density guidelines

**Minimum element counts per slide:**
- Content slides: at least 7~10 elements (rects + texts combined)
- Use 4~6 cards per grid slide, not just 2~3
- Cards should contain title + body text (2~3 lines minimum)
- Bullet lists: at least 4~6 items with descriptive text, not just keywords

**Text length guidelines:**
- Card body text: 2~4 lines (40~120 chars)
- Bullet point text: 1~2 lines with specific detail
- Subtitles/descriptions: complete sentences, not fragments

**Layout density:**
- Mix high-density slides (4~6 card grids, 2×3 matrices) with standard 2~3 card layouts
- At least 30% of content slides should use 4+ card layouts
- Avoid large empty areas — fill with supporting text, decorative elements, or expand existing elements
- Numbered/icon badges should use `ellipse` (circles) not `rect` (squares) for visual variety

## Emoji 정책

**이모지·유니코드 장식 기호(→ ✓ ★ 등) 금지.** 활성 테마(jangpm)의 CLAUDE.md HARD RULE 및 빌드 게이트 B5와 동일 — TSX에 없던 이모지를 매니페스트에서 추가하지 않는다. 아이콘이 필요한 자리는 TSX의 인라인 SVG가 래스터화되어 image 요소로 들어온다.

## Text overlap prevention

When a title or heading might wrap to multiple lines inside a card:

1. **Calculate actual line count:** `lines = ceil(textLength * fontSize * 0.5 / boxWidth)`
   - Korean: multiply by 0.9 instead of 0.5
2. **If lines > 1:** Push all subsequent elements down by `(lines - 1) * fontSize * lineSpacing`
3. **Safety margin:** Add 10px gap between title bottom and next element top
4. **Validation:** For every card, verify: `title.y + title.h + 10 <= body.y`

## Text bounding box rules (R4 강화) ⚠️

**CRITICAL:** Prevent text overflow by calculating bounding box size carefully.

### Width (w) calculation:
1. **Measure expected render width:** `renderW = Σ(charWidth per character)` where `charWidth = fontSize × charWidthFactor`

   **Classify each character by its Unicode codepoint (not by "looks Korean" heuristics):**

   | Script | Unicode block | charWidthFactor |
   |---|---|---|
   | Hangul Syllables | `U+AC00–U+D7AF` | **0.95** |
   | Hangul Jamo | `U+1100–U+11FF`, `U+3130–U+318F`, `U+A960–U+A97F`, `U+D7B0–U+D7FF` | **0.95** |
   | CJK Unified Ideographs | `U+4E00–U+9FFF`, `U+3400–U+4DBF` | **0.95** |
   | Hiragana / Katakana | `U+3040–U+30FF` | **0.95** |
   | CJK Symbols / Fullwidth | `U+3000–U+303F`, `U+FF00–U+FFEF` | **0.95** |
   | Space | — | 0.30 |
   | Narrow Latin (i, l, j, 1, !) | — | 0.30 |
   | Wide Latin (m, M, w, W) | — | 0.75 |
   | Default Latin / digits / punctuation | — | 0.55 |

   **Do NOT** lump all "Korean"-looking text into a single 0.55 factor — Hangul Syllables live in `U+AC00–U+D7AF`, which is a separate block from CJK Unified Ideographs. A codepoint-based check (`0xAC00 <= ord(ch) <= 0xD7AF`) is the only reliable test.

2. **Mixed text:** iterate character by character, sum `charWidth` per character. For a title like `"AI 코딩 에이전트"` at 56px: `A(30.8) + I(16.8) + ' '(16.8) + 코(53.2) + 딩(53.2) + ' '(16.8) + 에(53.2) + 이(53.2) + 전(53.2) + 트(53.2) ≈ 416px`. Plan `w ≥ renderW × 1.25` headroom so mobile PPTX viewers don't force-wrap even when `wrap: 'none'` is set.

3. **If renderW > w:** Either increase w, reduce fontSize, or insert explicit `\n` line breaks
3. **Card-internal text:** `w = card.w - (card.padding × 2)` — never exceed card inner width
4. **Short labels (dates, tags):** `w >= charCount × fontSize × 0.7` to prevent unintended wrapping

### Height (h) calculation:
1. **Single line:** `h = fontSize × 1.5`
2. **Display font (fontSize > 60):** `h = fontSize × lineSpacing × N × 1.15` (Korean: × 1.1 추가)
3. **Body font (fontSize ≤ 60):** `h = fontSize × lineSpacing × N × 1.4` (Korean: × 1.3 추가)
4. **Long wrapping text:** `N = ceil(charCount / charsPerLine)`
   - `charsPerLine ≈ w / (fontSize × 0.55)` for English
   - `charsPerLine ≈ w / (fontSize × 0.95)` for Korean
5. **Always add 40% padding** to calculated h to prevent clipping
6. **Line breaks:** Title (fontSize ≥ 60)만 `\n` 허용. Body text는 auto-wrap에 맡긴다 (see SKILL.md R6)

### Post-generation validation (필수):
After generating the full manifest, loop through ALL text elements and verify:
- `w >= renderW` (text fits horizontally)
- `h >= calculatedH` (text fits vertically)
- For card interiors: `title.y + title.h + 10 <= body.y` (no overlap)
- Fix any violations before saving the manifest
