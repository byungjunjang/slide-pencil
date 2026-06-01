# Jangpm Slide Design System

A clean, report-style design system for **Jangpm (장피엠) lecture slide decks** — Korean business-lecture presentations built around a monochrome base with a single restrained indigo accent (`#4633E3`).

The system is optimized for:
- **1280×720** fixed-ratio slides (16:9 lecture deck)
- **Arial** typography (project-wide hard rule — see root `CLAUDE.md`)
- **Report / evidence-first** layouts over SaaS dashboard aesthetics

---

## Inventory

- `README.md` — this file
- `reference/` — upstream markdown references (tokens, patterns, skeleton, libraries, anti-slop, visual-assets, export)
- `patterns/` — 29 completed HTML slide pattern samples (canonical visual references)
- `assets/jangpm-character.png` — author/lecturer character (1024×1024, transparent), used by `patterns/01-title.html`, `12-closing.html`, `13-cover-vertical.html`

---

## CONTENT FUNDAMENTALS

Jangpm decks are **Korean-first lecture slides**, typically delivered as structured business / educational reports. Copywriting tone:

- **Language:** Korean primary (한국어), occasional English terms kept in English (e.g., "LTV", "ROI", "D2C", "KPI").
- **Voice:** Declarative, analytical, third-person institutional. No "you/I" direct-address. Prefer noun phrases and verb endings like `~입니다`, `~합니다`, `~해야 합니다`.
- **Casing:** Korean uses no casing; for English tokens, use **Title Case** for proper nouns and **lowercase** for generic tech terms (`chart`, `metric`).
- **Titles:** Fragmentary, noun-led, no trailing period.
  - ✅ `2030년 한눈에 보기`, `시장 및 트렌드 전망`, `수익성 및 비용구조`
  - ❌ `2030년 한눈에 보겠습니다.`
- **Subtitles / body:** Full sentences with Korean polite endings. Max ~4 lines per block.
- **Emoji:** **Never.** The system explicitly forbids emoji — iconography is SVG line-art only.
- **Data vocabulary:** Numbers always carry a unit + optional delta.
  - ✅ `58억 원 (+21% vs 전년)`, `재고 회전율 5.5회`, `경고 기준 60점 이하`
- **Governing Message (`.gm`):** Every content slide ends with a one-line editorial takeaway at the bottom — the "so-what" statement, 문장형, 1줄 ideal.

---

## VISUAL FOUNDATIONS

### Colors
- **Base palette is achromatic.** Warm off-white `#FAFAF9` background, near-black `#1A1A1A` text, neutral grays for borders and secondary text.
- **One accent: `#4633E3` (indigo-violet).** Used ≤ 1–2 times per slide — a headline emphasis, a highlighted table column, a single badge. Accent-soft `#E8E5FC` fills accent pill backgrounds and recommended columns.
- **Semantic colors (positive `#059669`, negative `#E11D48`, warning `#D97706`) are for data meaning only** — never decorative.
- **Charts** use a single accent with opacity ladders (`0.85 / 0.6 / 0.4 / 0.25`), never rainbow.

### Typography
- **Arial** — system font, project-wide hard rule. Falls back to `'Helvetica Neue', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif`.
- Strong weight contrast: Display 800, Headline 700, Title 600, Body 400.
- Tight tracking on large type: `-0.03em` on Display, `-0.02em` on Headline.
- Line-heights: Display 1.08, Headline 1.2, Title 1.3, Body 1.6, Caption 1.4.

### Spacing
- Strict **8 px grid** (`--space-1` = 4 px … `--space-16` = 64 px).
- Slide padding: `3.5rem` sides, `4rem` bottom (reserve for GM).
- Card padding & inter-card gap: `1.5rem` (`--space-6`).

### Backgrounds
- **Solid warm off-white only.** No gradients, no orbs, no textures.
- No full-bleed imagery on content slides.

### Imagery
- Monochrome / muted; flat illustration style; transparent PNG when possible.
- The author character (`assets/jangpm-character.png`) is the canonical brand illustration — warm peach skin, dark gray vest, round glasses, line-art style.
- Stock / generated illustrations follow the same "minimal, flat, clean, pastel/muted, transparent background" prompt recipe (see `reference/visual-assets.md`).

### Iconography
- **Lucide-style SVG line-art, stroke `currentColor`, 2 px weight.** `.icon` = 20 px, `.icon-lg` = 32 px, `.icon-xl` = 48 px.
- **Bare icons only** — no circle wrappers, no colored icon badges, no icon backgrounds.
- No emoji, no unicode glyphs as icons.
- Common glyphs enumerated in `reference/libraries.md` (arrow-right, check-circle, zap, brain, users, trending-up, etc.).

### Corner radii
- Cards: **`12 px` (`--radius-lg`)**.
- Small chips / badges: `4–6 px`.
- Pills (accent badges, number circles): fully rounded.

### Borders
- Always `1px solid var(--border)` (`#E5E7EB`).
- **No decorative partial borders** (no colored left-strip cards). Borders are structural, not ornamental.
- Accent-emphasis columns use full `accent-soft` fill, not a colored border.

### Shadows
- Used **sparingly** on cards with data/KPI emphasis.
- 3-step system: `--shadow-sm` / `--shadow-md` / `--shadow-lg`. Default card has **no shadow** and relies on border.

### Animation & motion
- **None on content.** No hover scale, no translateY, no pulse, no float, no glow.

### Transparency / blur
- **Not used.** Keep opacity at 1 and let structure carry the design.

### Layout rules
- Title at top (`.headline`) + `.slide-body` fills middle + `.gm` absolutely positioned at bottom.
- Use **CSS Grid `gap`** for all multi-element layouts. Never margin hacks.
- Cards are a *secondary* tool — text blocks + rule lines are the primary report-style layout.
- Max 1–2 accent events per slide. Slide must work in grayscale first.
- Max 4–5 bullets / 3–4 cards per slide. Dense interiors forbidden.

---

## ICONOGRAPHY

Jangpm uses **Lucide-style inline SVG** line-art icons drawn at 24×24 viewBox with `stroke="currentColor"`, `stroke-width="2"`, `stroke-linecap="round"`, `stroke-linejoin="round"`. Icons always inherit text color; there are no colored icon backgrounds, no circle wrappers, no filled badges.

- **No emoji, ever.** The system forbids decorative emoji across all patterns.
- **No unicode pseudo-icons** (no `→`, `✓`, `★` as standalone marks — use the SVG equivalents).
- **No raster icons** (no PNG sprites).
- **Sizes:** `.icon` = 20 px, `.icon-lg` = 32 px, `.icon-xl` = 48 px.

Brand images:
- `assets/jangpm-character.png` — author/lecturer character (1024×1024, transparent)

For slide illustrations beyond the character, the system follows the generator prompts in `reference/visual-assets.md`: "minimal flat illustration", "transparent background", "muted / pastel tones".
