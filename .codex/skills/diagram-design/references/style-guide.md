# Style Guide

**The single source of truth for the diagram skin.** Every diagram draws from this — not from hex values inlined in other reference files or in the code samples throughout the skill. If you want to change the visual skin of these diagrams, change this file.

> **⚠️ slide-pencil integration — read first.**
> In this project, diagrams are **not** standalone HTML files. They are **inline SVG embedded inside React slide components** (`src/slides/Slide*.tsx`), produced *only* inside the `/slide` pipeline for diagram slides (architecture, flowchart, sequence, ER, timeline, swimlane, etc.). Therefore:
> - **No Google Fonts `<link>`, no standalone `.html` wrapper, no `<script>`.** The diagram is SVG markup that lives in the slide's JSX.
> - **Colors come from the active-theme CSS tokens, not hardcoded hex.** Use `var(--accent)`, `var(--text)`, `var(--border)`, etc. The hex values in this file (and in the code samples across `SKILL.md` / `type-*.md` / `assets/`) are **illustrative of the current skin only** — when you author an SVG, reference the token, not the hex.
> - **Font is the active theme's `--font-sans` (Arial for Jangpm).** The upstream serif/sans/mono split collapses to **weight + size + letter-spacing** distinctions on one family. See Typography below.
> - The default editorial skin, the first-run style-guide gate, and the website-onboarding flow from upstream are **disabled** here — the skin is locked to the active design theme and is re-skinned automatically by `/theme-init`. Do **not** run onboarding or ask the user to pick brand colors.

<!-- THEME:START name=jangpm
     활성 테마 = jangpm. 아래 마커 사이(토큰 + 타이포 + 노드 트리트먼트)는
     /theme-init이 새 테마 값으로 교체하는 영역이다 (교체 지점 #8).
     값은 src/index.css THEME 블록의 토큰 컨트랙트 v1과 동일하게 유지한다.
     동기화 규칙: .codex/skills/theme-init/references/theme-replacement-map.md 참조. -->

## Active theme: Jangpm

Monochrome editorial report system — warm off-white paper, near-black ink, a **single** indigo-violet accent `#4633E3`, hairline borders, **Arial only**, **light mode only**. No second hue, no dark variant, no shadows beyond the deck's `shadow-sm/md/lg` scale (diagrams stay borderless/flat).

---

## Tokens

### Semantic roles → active-theme token

Every token is referred to by **semantic role** in the type references (`type-*.md` say `accent`, not `#4633E3`). The role maps to a CSS variable; **author SVG against the `var(--*)` column.**

| Role | Purpose | CSS var (use this) | Jangpm value |
|---|---|---|---|
| `paper` | Page background | `var(--bg)` | `#FAFAF9` |
| `paper-2` | Container / secondary fill | `var(--surface-alt)` | `#F5F5F4` |
| `node` | Default node fill (backend/step) | `var(--surface)` | `#FFFFFF` |
| `ink` | Primary text, primary stroke | `var(--text)` | `#1A1A1A` |
| `muted` | Secondary text, **default arrow stroke** | `var(--text-secondary)` | `#6B7280` |
| `soft` | Sublabels, boundary labels | `var(--text-tertiary)` | `#9CA3AF` |
| `rule` | Hairline borders, legend separators | `var(--border)` | `#E5E7EB` |
| `rule-solid` | Stronger borders, baselines | `var(--border-strong)` | `#D4D4D4` |
| `accent` | Focal / 1–2 max per diagram | `var(--accent)` | `#4633E3` |
| `accent-tint` | Fill for accent-bordered boxes | `var(--accent-soft)` | `#E8E5FC` |
| `accent-ink` | Pressed / darker accent (sparingly) | `var(--accent-ink)` | `#2E1FB3` |
| `link` | HTTP/API / external arrows | **collapses to `var(--text-secondary)`** | `#6B7280` |

> **Single-accent rule (Jangpm HARD RULE).** This is a **monochrome + one accent** system. There is **no second hue.** The upstream `link`-blue role does **not** exist here — external/API arrows use `muted` (same as default arrows), distinguished by a **dashed** stroke (`stroke-dasharray="4,3"`) rather than by color. `accent` is reserved for the 1–2 focal elements per diagram; never use it as a signaling system across many nodes.

> **Light mode only (Jangpm HARD RULE).** There is no dark variant. Ignore upstream `template-dark.html` / `example-*-dark.html` — those assets are stale editorial fixtures (see note under "Assets" in `SKILL.md`). Never emit a dark-background diagram.

---

## Typography

**Arial only.** Jangpm fixes the family to `var(--font-sans)` (`'Arial', 'Helvetica Neue', 'Apple SD Gothic Neo', 'Malgun Gothic', …`). The upstream three-family split (Instrument Serif / Geist / Geist Mono) collapses onto Arial — the **hierarchy is carried by weight + size + letter-spacing**, not by swapping families.

| Role | Family | Size | Weight | Usage |
|---|---|---|---|---|
| `title` | `var(--font-sans)` (Arial) | 28–32px | 700–800 | Diagram/slide heading (usually the slide `.headline`, drawn outside the SVG) |
| `node-name` | `var(--font-sans)` (Arial) | 12–14px | 600 | Human-readable node labels |
| `sublabel` | `var(--font-sans)` (Arial) | 9–10px | 400 | Port, protocol, URL, field type |
| `eyebrow` | `var(--font-sans)` (Arial) | 8–9px | 600, tracked `0.12em`, UPPERCASE | Type tags, axis labels |
| `arrow-label` | `var(--font-sans)` (Arial) | 8–9px | 500, tracked `0.06em`, UPPERCASE | Arrow annotations |
| `callout` | `var(--font-sans)` (Arial) *italic* | 13–14px | 400 italic | Editorial asides only (see `primitive-annotation.md`) |

- **No Google Fonts link, no `font-family` overrides.** Let the slide inherit Arial from the deck. If you must set it on an SVG `<text>`, use `font-family="var(--font-sans)"`.
- `var(--font-mono)` exists in the theme but Jangpm's HARD RULE is **Arial fixed** — do not introduce a mono face for sublabels. Keep them Arial, smaller and tracked.
- **Never JetBrains Mono / Geist Mono** as a blanket "dev" font.

---

## Node type → treatment

Semantic role combinations — reference these by name in type specs. (Author against the `var(--*)` tokens above.)

| Type | Fill | Stroke |
|---|---|---|
| `focal` (1–2 max) | `accent-tint` (`var(--accent-soft)`) | `accent` (`var(--accent)`) |
| `backend` / `step` | `node` (`var(--surface)`, white) | `ink` (`var(--text)`) |
| `store` / `state` | `ink @ 0.05` | `muted` (`var(--text-secondary)`) |
| `external` / `cloud` | `ink @ 0.03` | `ink @ 0.30` |
| `input` / `user` | `muted @ 0.10` | `soft` (`var(--text-tertiary)`) |
| `optional` / `async` | `ink @ 0.02` | `ink @ 0.20` dashed `4,3` |
| `security` / `boundary` | `accent @ 0.05` | `accent @ 0.50` dashed `4,4` |

> **Accent-card chrome (Jangpm).** A focal node uses `accent-tint` fill + `accent` border + **ink text kept dark** — never a solid indigo fill with white text (matches the deck's `.card-accent` rule).

<!-- THEME:END -->

---

## Stroke, radius, spacing (geometry — theme-agnostic)

These are diagram-grammar geometry, not theme tokens — they stay constant across themes.

| Token | Value | Use |
|---|---|---|
| `stroke-thin` | `0.8` | Tag-box outlines, leaf nodes |
| `stroke-default` | `1` | Most strokes |
| `stroke-strong` | `1.2` | Emphasis strokes |
| `radius-sm` | `4` | Small tags |
| `radius-md` | `6` | Node boxes |
| `radius-lg` | `8` | Containers, rings |
| `grid` | `4` | Every coord, size, and gap is divisible by 4 (hard rule) |

---

## How this file is re-skinned

You do **not** edit this file by hand to change themes, and you do **not** run website onboarding. The `THEME:START … THEME:END` block above is replaced automatically by **`/theme-init`** (replacement point **#8** — see `.codex/skills/theme-init/references/theme-replacement-map.md`). When the active theme changes, theme-init rewrites the token + typography + node-treatment tables to the new theme's `src/index.css` token values, keeping the diagram skin in lockstep with the slide deck.

### Constraints carried across any theme (don't break these)

- **Author against `var(--*)` tokens**, never inline hex — that is what lets one theme swap re-skin every diagram.
- **One accent.** Whatever the theme's accent is, it stays the single focal color. No second hue (no `link`-blue).
- **Inherit the deck font.** Don't load fonts or hardcode families; use `var(--font-sans)`.
- **Match the deck mode.** Jangpm is light-only; never emit dark-background diagrams.
- **Contrast**: `ink` must hit WCAG AA on `paper`; `muted` must hit AA on `paper` for 11px+ text. (Jangpm values already pass.)
