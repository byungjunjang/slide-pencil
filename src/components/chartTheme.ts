// chartTheme.ts — 차트 색상을 테마 토큰(--accent)에서 런타임 파생 (Fix3)
// ---------------------------------------------------------------------------
// 문제: 차트(특히 Chart.js canvas)는 paint 타임에 CSS 변수(var(--accent))를 못 푼다.
//       그래서 관습적으로 rgba(70, 51, 227, 0.85) 같은 리터럴을 하드코딩하는데,
//       이러면 테마를 바꿔도 차트 색이 옛 accent에 묶여 드리프트한다.
// 해결: 런타임에 getComputedStyle 으로 --accent 값을 읽어 단일 hue + opacity ramp 를
//       만든다. CSS 변수 의존이 아니라 *값을 읽어 리터럴로 변환*하므로 Chart.js/canvas와
//       Playwright 스크린샷 캡처 모두에서 동작하고, 동시에 테마 교체를 자동으로 따라간다.
//
// 사용:
//   import { chartTheme } from '../components/chartTheme'
//   const [c0, c1, c2, c3] = chartTheme.ramp()      // accent opacity ramp (4단계)
//   ctx.strokeStyle = chartTheme.accent()            // accent 100%
//   backgroundColor: chartTheme.ramp([0.85, 0.4])    // 임의 opacity 목록
//
// inline SVG 라면 chartTheme 없이 fill="var(--accent)" + opacity 속성으로도 충분하다.
// chartTheme 은 (a) Chart.js/canvas, (b) ramp 리터럴이 여러 곳에서 필요할 때 쓴다.
// ---------------------------------------------------------------------------

// 활성 테마(jangpm) 기준 ramp. theme-init 교체 시에도 *opacity 단계*는 유지(값만 --accent에서 파생).
export const ACCENT_OPACITY_RAMP = [0.85, 0.6, 0.4, 0.25] as const

// SSR/빌드/headless 안전 fallback — jangpm accent #4633E3
const FALLBACK_RGB: [number, number, number] = [70, 51, 227]

/** "#4633E3" / "#abc" / "rgb(70,51,227)" / "rgba(...)" → [r,g,b]. 파싱 실패 시 null. */
export function parseColorToRGB(input: string): [number, number, number] | null {
  if (!input) return null
  const c = input.trim()

  const hex6 = c.match(/^#([0-9a-f]{6})$/i)
  if (hex6) {
    const h = hex6[1]
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
  }

  const hex3 = c.match(/^#([0-9a-f]{3})$/i)
  if (hex3) {
    const h = hex3[1]
    return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)]
  }

  const rgb = c.match(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i)
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]

  return null
}

/** 런타임에 --accent 를 [r,g,b] 로 읽는다. 브라우저 밖이면 fallback. */
function readAccentRGB(): [number, number, number] {
  if (typeof document === 'undefined' || typeof getComputedStyle === 'undefined') return FALLBACK_RGB
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--accent')
  return parseColorToRGB(raw) ?? FALLBACK_RGB
}

/** accent 단일 hue 를 주어진 opacity 로. 예: accent(0.6) → "rgba(70, 51, 227, 0.6)" */
export function accent(opacity = 1): string {
  const [r, g, b] = readAccentRGB()
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

/** accent opacity ramp. 기본 4단계(0.85/0.6/0.4/0.25), 또는 임의 opacity 목록. */
export function accentRamp(opacities: readonly number[] = ACCENT_OPACITY_RAMP): string[] {
  const [r, g, b] = readAccentRGB()
  return opacities.map((a) => `rgba(${r}, ${g}, ${b}, ${a})`)
}

export const chartTheme = {
  OPACITY: ACCENT_OPACITY_RAMP,
  accent,
  ramp: accentRamp,
  parseColorToRGB,
}

export default chartTheme
