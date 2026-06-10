#!/usr/bin/env node

import { readFileSync, existsSync, readdirSync } from 'fs'
import { resolve, dirname, join } from 'path'

const HEX6 = /^#[0-9A-Fa-f]{6}$/

/**
 * src/index.css THEME 블록에서 디자인 토큰(예: --accent, --accent-soft)의 hex를 읽는다.
 * 폰트/장식-색 검증을 하드코드(과거 Arial / #4633E3)가 아니라 활성 테마에 맞춰
 * 동작시키기 위함. 토큰을 못 찾으면 null을 반환하고, 해당 검사는 graceful degrade한다.
 */
function readThemeColor(projectRoot, varName) {
  if (!projectRoot) return null
  const cssPath = join(projectRoot, 'src', 'index.css')
  if (!existsSync(cssPath)) return null
  const css = readFileSync(cssPath, 'utf-8')
  const themeMatch = css.match(/THEME:START[\s\S]*?THEME:END/)
  const scope = themeMatch ? themeMatch[0] : css
  const m = scope.match(new RegExp('--' + varName + '\\s*:\\s*(#[0-9A-Fa-f]{3,8})'))
  return m ? m[1].toUpperCase() : null
}

/**
 * src/slides/index.ts에서 slideCount를 자동으로 추출한다.
 * slides 배열 내의 SlideNN 항목 수를 세거나, slideCount export를 파싱한다.
 * 파일을 못 찾으면 null 반환 (fallback: --expected-slides 사용).
 */
function readSlideCountFromIndex(projectRoot) {
  const indexPath = join(projectRoot, 'src', 'slides', 'index.ts')
  if (!existsSync(indexPath)) return null
  const src = readFileSync(indexPath, 'utf-8')
  // slides 배열 블록에서 SlideNN 항목 카운트
  const arrayMatch = src.match(/export const slides\s*=\s*\[([\s\S]*?)\]/)
  if (arrayMatch) {
    const items = arrayMatch[1].match(/Slide\d+/g)
    if (items) return items.length
  }
  return null
}

/**
 * src/slides/에 있는 Slide*.tsx 파일 수를 반환한다.
 * index.ts 배열 항목 수와 비교해 불일치를 탐지하는 데 사용.
 */
function readSlideFileCount(projectRoot) {
  const slidesDir = join(projectRoot, 'src', 'slides')
  if (!existsSync(slidesDir)) return null
  const files = readdirSync(slidesDir).filter((f) => /^Slide\d+\.tsx$/.test(f))
  return files.length
}

/**
 * 매니페스트 파일 위치에서 프로젝트 루트를 찾는다.
 * output/ 또는 autoresearch-export-pptx/ 하위에 있다고 가정하고
 * package.json이 있는 디렉토리를 루트로 판정한다.
 */
function findProjectRoot(manifestPath) {
  let dir = dirname(resolve(manifestPath))
  for (let i = 0; i < 5; i++) {
    if (existsSync(join(dir, 'package.json'))) return dir
    dir = dirname(dir)
  }
  return null
}

function main() {
  const argv = process.argv.slice(2)
  const manifestPath = argv[0]
  if (!manifestPath) {
    console.error(
      'Usage: node check-manifest.js <manifest.json> [--expected-slides N] [--expected-font NAME] [--accent #HEX] [--accent-soft #HEX]',
    )
    process.exit(1)
  }

  // 옵션 파싱 (--key value). 폰트/장식-색 검증을 인자 또는 테마 토큰에서 받아 theme-agnostic하게.
  const opts = {}
  for (let i = 1; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2)
      const next = argv[i + 1]
      if (next !== undefined && !next.startsWith('--')) {
        opts[key] = next
        i++
      } else {
        opts[key] = true
      }
    }
  }

  const projectRoot = findProjectRoot(manifestPath)

  // --expected-slides 명시 시 우선, 없으면 index.ts 자동 추출, 둘 다 없으면 manifest 슬라이드 수로 판정
  let expectedSlides
  if (opts['expected-slides'] !== undefined) {
    expectedSlides = Number(opts['expected-slides'])
  } else {
    const fromIndex = projectRoot ? readSlideCountFromIndex(projectRoot) : null
    if (fromIndex !== null) {
      expectedSlides = fromIndex
      console.error(`[check-manifest] slideCount auto-detected from index.ts: ${expectedSlides}`)
    } else {
      // fallback: manifest 자체의 슬라이드 수를 기준으로 (항상 pass)
      expectedSlides = null
    }
  }

  const manifest = JSON.parse(readFileSync(resolve(manifestPath), 'utf-8'))

  // 폰트 허용 목록: --expected-font 우선, 없으면 manifest.fonts. 둘 다 비면 폰트 검사 skip.
  // (과거: Arial 하드코드 → Pretendard 등 비-Arial 테마 매니페스트를 오탐했다.)
  const manifestFonts = Array.isArray(manifest.fonts) ? manifest.fonts : []
  const allowedFonts = opts['expected-font'] ? [String(opts['expected-font'])] : manifestFonts
  // 장식-색 검사용 accent / accent-soft: CLI 인자 우선, 없으면 src/index.css THEME 토큰.
  const accentColorU = (opts.accent ? String(opts.accent) : readThemeColor(projectRoot, 'accent'))
  const accentColor = accentColorU ? accentColorU.toUpperCase() : null
  const accentSoftRaw = opts['accent-soft'] ? String(opts['accent-soft']) : readThemeColor(projectRoot, 'accent-soft')
  const accentSoft = accentSoftRaw ? accentSoftRaw.toUpperCase() : null

  const results = []
  results.push({
    id: 'valid',
    pass: Array.isArray(manifest.slides) && manifest.slides.length > 0,
    detail: Array.isArray(manifest.slides) ? `${manifest.slides.length} slides` : 'No slides array',
  })
  if (expectedSlides !== null) {
    results.push({
      id: 'slideCount',
      pass: Array.isArray(manifest.slides) && manifest.slides.length === expectedSlides,
      detail: `expected ${expectedSlides}, got ${manifest.slides?.length ?? 0}`,
    })
  } else {
    results.push({
      id: 'slideCount',
      pass: true,
      detail: `${manifest.slides?.length ?? 0} slides (index.ts not found, skipped count check)`,
    })
  }

  const colorErrors = []
  const fontErrors = []
  const boundsErrors = []

  ;(manifest.slides || []).forEach((slide, slideIndex) => {
    if (slide.background && !HEX6.test(slide.background)) {
      colorErrors.push(`S${slideIndex + 1} background=${slide.background}`)
    }
    ;(slide.elements || []).forEach((element, elementIndex) => {
      for (const key of ['color', 'fill', 'stroke']) {
        if (element[key] !== undefined && !HEX6.test(element[key])) {
          colorErrors.push(`S${slideIndex + 1} e${elementIndex} ${element.type}.${key}=${element[key]}`)
        }
      }
      if (
        element.type === 'text' &&
        element.fontFamily &&
        allowedFonts.length > 0 &&
        !allowedFonts.includes(element.fontFamily)
      ) {
        fontErrors.push(`S${slideIndex + 1} e${elementIndex} font=${element.fontFamily}`)
      }
      if (element.x !== undefined) {
        const right = element.x + element.w
        const bottom = element.y + element.h
        // 1280×720 캔버스 + 10px 허용 오차 (과거 1930×1090은 1920 레거시 시절 값)
        if (element.x < -5 || element.y < -5 || right > 1290 || bottom > 735) {
          boundsErrors.push(`S${slideIndex + 1} e${elementIndex} bounds=(${element.x},${element.y},${element.w},${element.h})`)
        }
      }
    })
  })

  results.push({
    id: 'hexColors',
    pass: colorErrors.length === 0,
    detail: colorErrors.length === 0 ? 'All colors valid' : colorErrors.slice(0, 5).join('; '),
  })
  results.push({
    id: 'fontFamily',
    pass: fontErrors.length === 0,
    detail:
      fontErrors.length !== 0
        ? fontErrors.slice(0, 5).join('; ')
        : allowedFonts.length > 0
          ? `All in [${allowedFonts.join(', ')}]`
          : 'No font allow-list declared (manifest.fonts empty) — skipped',
  })
  results.push({
    id: 'bounds',
    pass: boundsErrors.length === 0,
    detail: boundsErrors.length === 0 ? 'All elements in bounds' : boundsErrors.slice(0, 5).join('; '),
  })

  // P1-2: cardTextCoverage — splice/delete 부작용 탐지
  // 카드(cornerRadius > 0이고 전체 슬라이드 배경이 아닌 rect)에 대해
  // 그 bounds 안에 텍스트 요소의 중심점이 하나도 없으면 splice 부작용 의심
  // 카드 최소 크기(120×60): 룰라인/디바이더/도트 같은 장식 rect를 카드로 오인 방지
  const CARD_MIN_W = 120
  const CARD_MIN_H = 60
  const cardErrors = []
  ;(manifest.slides || []).forEach((slide, slideIndex) => {
    const elements = slide.elements || []
    const cards = elements.filter(
      (el) =>
        el.type === 'rect' &&
        el.cornerRadius > 0 &&
        (el.w ?? 0) >= CARD_MIN_W &&
        (el.h ?? 0) >= CARD_MIN_H &&
        // 전체 슬라이드 배경(1280×720 또는 그에 준하는 큰 rect) 제외
        !(el.x <= 5 && el.y <= 5 && el.w >= 1260 && el.h >= 700),
    )
    const texts = elements.filter((el) => el.type === 'text')

    // 텍스트뿐 아니라 image(차트 SVG 래스터, 일러스트)도 카드 콘텐츠로 인정
    const contentEls = elements.filter((el) => el.type === 'text' || el.type === 'image')
    cards.forEach((card, cardIndex) => {
      const hasCoveringContent = contentEls.some((el) => {
        const cx = el.x + el.w / 2
        const cy = el.y + el.h / 2
        return cx >= card.x && cx <= card.x + card.w && cy >= card.y && cy <= card.y + card.h
      })
      if (!hasCoveringContent) {
        cardErrors.push(`S${slideIndex + 1} card${cardIndex} rect(${card.x},${card.y},${card.w},${card.h}) has no text/image inside`)
      }
    })
  })

  results.push({
    id: 'cardTextCoverage',
    pass: cardErrors.length === 0,
    detail: cardErrors.length === 0 ? 'All cards have text' : cardErrors.slice(0, 5).join('; '),
  })

  // P2-5a: elementDensity — 슬라이드당 요소 수 최소값 검증
  // 전체 배경 rect를 제외하고 5개 미만이면 콘텐츠 누락 의심
  const densityErrors = []
  const BG_MIN_W = 1880
  const BG_MIN_H = 1040
  ;(manifest.slides || []).forEach((slide, slideIndex) => {
    const nonBg = (slide.elements || []).filter(
      (el) => !(el.type === 'rect' && el.x <= 5 && el.y <= 5 && el.w >= BG_MIN_W && el.h >= BG_MIN_H),
    )
    if (nonBg.length < 5) {
      densityErrors.push(`S${slideIndex + 1} has only ${nonBg.length} elements (min 5)`)
    }
  })

  results.push({
    id: 'elementDensity',
    pass: densityErrors.length === 0,
    detail: densityErrors.length === 0 ? 'All slides meet density' : densityErrors.join('; '),
  })

  // P2-5b: cardYOrder — 카드 내 텍스트 요소가 y 오름차순인지 검증
  // splice/delete 부작용으로 요소 순서가 어긋나면 PPTX에서 텍스트가 겹침
  // 추출 매니페스트(generator=extract-manifest)는 DOM 순서(좌→우 컬럼 우선)라
  // y 오름차순 가정이 성립하지 않음 — 좌표가 실측이므로 검사 자체가 불필요, skip
  const skipYOrder = manifest.generator === 'extract-manifest'
  const yOrderErrors = []
  ;(manifest.slides || []).forEach((slide, slideIndex) => {
    if (skipYOrder) return
    const elements = slide.elements || []
    const cards = elements.filter(
      (el) =>
        el.type === 'rect' &&
        el.cornerRadius > 0 &&
        (el.w ?? 0) >= CARD_MIN_W &&
        (el.h ?? 0) >= CARD_MIN_H &&
        !(el.x <= 5 && el.y <= 5 && el.w >= BG_MIN_W && el.h >= BG_MIN_H),
    )
    cards.forEach((card, cardIndex) => {
      const innerTexts = elements
        .filter((el) => {
          if (el.type !== 'text') return false
          const cx = el.x + el.w / 2
          const cy = el.y + el.h / 2
          return cx >= card.x && cx <= card.x + card.w && cy >= card.y && cy <= card.y + card.h
        })
      // 같은 행(badge+title 등)의 미세한 y 지터(±12px)는 정상 — 큰 역행만 splice 의심
      for (let i = 1; i < innerTexts.length; i++) {
        if (innerTexts[i].y < innerTexts[i - 1].y - 12) {
          yOrderErrors.push(
            `S${slideIndex + 1} card${cardIndex}: text y=[${innerTexts.map((t) => t.y).join(',')}] not ascending`,
          )
          break
        }
      }
    })
  })

  results.push({
    id: 'cardYOrder',
    pass: yOrderErrors.length === 0,
    detail: skipYOrder
      ? 'skipped (extracted manifest: DOM order, measured coords)'
      : yOrderErrors.length === 0
        ? 'All card texts in y-order'
        : yOrderErrors.slice(0, 5).join('; '),
  })

  // R7-1: coverClosingDecorationOmit — 첫/마지막 슬라이드 우측(x ≥ 700)에 장식 도형 금지
  // pptx-build.md "3-C. Cover/Closing 장식 도형 omit" 룰 검증
  // - ellipse 우측 영역에 위치 → 코너마크/동심원/엠블럼으로 간주
  // - cornerRadius ≥ 12 이고 (테마)accent-soft 배경 또는 (테마)accent stroke을 가진 큰 rect → 데코 프레임
  //   색은 src/index.css THEME 토큰(또는 --accent/--accent-soft 인자)에서 읽어 theme-agnostic.
  const decorErrors = []
  const slidesArr = manifest.slides || []
  const decorRectColors = new Set([accentSoft].filter(Boolean))
  const checkDecorationSlide = (slide, slideIdx, label) => {
    ;(slide.elements || []).forEach((el, ei) => {
      if (el.x === undefined) return
      // 우측 영역(x ≥ 700) + 충분히 큰 도형(w ≥ 80) 만 검사
      if (el.x < 700 || (el.w ?? 0) < 80) return
      if (el.type === 'ellipse') {
        decorErrors.push(
          `${label} S${slideIdx + 1} e${ei}: ellipse(${el.x},${el.y},${el.w},${el.h}) on right side — decorative shape forbidden on cover/closing`,
        )
      } else if (
        el.type === 'rect' &&
        (el.cornerRadius ?? 0) >= 12 &&
        ((el.fill && decorRectColors.has(String(el.fill).toUpperCase())) ||
          (accentColor && el.stroke && String(el.stroke).toUpperCase() === accentColor))
      ) {
        decorErrors.push(
          `${label} S${slideIdx + 1} e${ei}: decorative rect(${el.x},${el.y},${el.w},${el.h}, fill=${el.fill}) on right side`,
        )
      }
    })
  }
  if (slidesArr.length > 0) checkDecorationSlide(slidesArr[0], 0, 'cover')
  if (slidesArr.length > 1)
    checkDecorationSlide(slidesArr[slidesArr.length - 1], slidesArr.length - 1, 'closing')

  results.push({
    id: 'coverClosingDecorationOmit',
    pass: decorErrors.length === 0,
    detail:
      decorErrors.length === 0
        ? 'No decorative shapes on cover/closing right'
        : decorErrors.slice(0, 5).join('; '),
  })

  // R7-2: cardInnerOverflow — 카드 내부 마지막 text가 카드 하단 12px 안쪽인지 검증
  // pptx-build.md "카드 본문 한국어 wrapping h 안전 마진" 룰 검증
  const overflowErrors = []
  ;(manifest.slides || []).forEach((slide, slideIndex) => {
    const elements = slide.elements || []
    const cards = elements.filter(
      (el) =>
        el.type === 'rect' &&
        (el.cornerRadius ?? 0) > 0 &&
        (el.w ?? 0) >= 220 &&
        (el.h ?? 0) >= 140 &&
        !(el.x <= 5 && el.y <= 5 && (el.w ?? 0) >= BG_MIN_W && (el.h ?? 0) >= BG_MIN_H),
    )
    cards.forEach((card, cardIndex) => {
      const innerTexts = elements.filter((el) => {
        if (el.type !== 'text') return false
        const cx = el.x + el.w / 2
        const cy = el.y + el.h / 2
        return cx >= card.x && cx <= card.x + card.w && cy >= card.y && cy <= card.y + card.h
      })
      if (innerTexts.length === 0) return
      const lastText = innerTexts.reduce((acc, t) => (t.y + t.h > acc.y + acc.h ? t : acc), innerTexts[0])
      const cardBottom = card.y + card.h
      const textBottom = lastText.y + lastText.h
      if (textBottom > cardBottom - 12) {
        overflowErrors.push(
          `S${slideIndex + 1} card${cardIndex} rect(${card.x},${card.y},${card.w},${card.h}): last text bottom=${textBottom} exceeds card bottom-12=${cardBottom - 12}`,
        )
      }
    })
  })
  results.push({
    id: 'cardInnerOverflow',
    pass: overflowErrors.length === 0,
    detail:
      overflowErrors.length === 0
        ? 'All card-internal texts within bottom-12px margin'
        : overflowErrors.slice(0, 5).join('; '),
  })

  // 단기-7: slideFileSync — index.ts 배열 항목 수 vs src/slides/Slide*.tsx 실제 파일 수 일치 검증
  // SlideNN.tsx를 만들고 index.ts 등록을 빠뜨렸을 때 탐지
  if (projectRoot) {
    const indexCount = readSlideCountFromIndex(projectRoot)
    const fileCount = readSlideFileCount(projectRoot)
    if (indexCount !== null && fileCount !== null) {
      results.push({
        id: 'slideFileSync',
        pass: indexCount === fileCount,
        detail:
          indexCount === fileCount
            ? `index.ts(${indexCount}) matches Slide*.tsx files(${fileCount})`
            : `index.ts has ${indexCount} entries but ${fileCount} Slide*.tsx files exist — missing registration or orphan file`,
      })
    }
  }

  // ===========================================================================
  // 신규 검사 4종 (2026-06-10): textOverlap / textBoxHeuristic / noBodyNewline / flatStack
  // extract-manifest.mjs 산출물(generator 필드 존재)은 실측 좌표이므로
  // textBoxHeuristic을 WARN으로 완화한다 (추정식 vs 실측의 오차 false-positive 방지).
  // ===========================================================================
  const isExtracted = manifest.generator === 'extract-manifest'

  // 문자 폭 추정 (manifest-schema.md "Text bounding box rules" 동일 계수)
  const charWidthFactor = (ch) => {
    const code = ch.codePointAt(0)
    if (
      (code >= 0xac00 && code <= 0xd7af) || // Hangul Syllables
      (code >= 0x1100 && code <= 0x11ff) ||
      (code >= 0x3130 && code <= 0x318f) ||
      (code >= 0x4e00 && code <= 0x9fff) || // CJK
      (code >= 0x3400 && code <= 0x4dbf) ||
      (code >= 0x3040 && code <= 0x30ff) || // Kana
      (code >= 0x3000 && code <= 0x303f) ||
      (code >= 0xff00 && code <= 0xffef)
    )
      return 0.95
    if (ch === ' ') return 0.3
    if ('iljI1!|.,:;\'"'.includes(ch)) return 0.3
    if ('mMwW@'.includes(ch)) return 0.75
    return 0.55
  }
  const estimateRenderWidth = (text, fontSize) => {
    let w = 0
    for (const ch of String(text)) w += fontSize * charWidthFactor(ch)
    return w
  }
  const textContent = (el) =>
    Array.isArray(el.runs) ? el.runs.map((r) => r.text ?? '').join('') : String(el.content ?? '')

  // 1) textOverlap — 같은 슬라이드의 text 쌍 bbox 겹침 (display+label 구성은 폰트비 2.5배로 허용)
  const overlapPairErrors = []
  ;(manifest.slides || []).forEach((slide, slideIndex) => {
    const texts = (slide.elements || []).filter((el) => el.type === 'text')
    for (let i = 0; i < texts.length; i++) {
      for (let j = i + 1; j < texts.length; j++) {
        const a = texts[i]
        const b = texts[j]
        const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x))
        const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))
        const inter = ix * iy
        if (inter <= 0) continue
        const smaller = Math.min(a.w * a.h, b.w * b.h)
        const share = inter / smaller
        const fsRatio = Math.max(a.fontSize, b.fontSize) / Math.max(1, Math.min(a.fontSize, b.fontSize))
        // KPI display + 단위/라벨 조합(폰트 크기 차이 큼)은 의도된 오버레이로 허용
        if (share >= 0.35 && fsRatio < 2.5) {
          overlapPairErrors.push(
            `S${slideIndex + 1}: "${textContent(a).slice(0, 14)}"(${a.x},${a.y}) ⨯ "${textContent(b).slice(0, 14)}"(${b.x},${b.y}) overlap ${Math.round(share * 100)}%`,
          )
        }
      }
    }
  })
  results.push({
    id: 'textOverlap',
    pass: overlapPairErrors.length === 0,
    detail: overlapPairErrors.length === 0 ? 'No text-pair overlap' : overlapPairErrors.slice(0, 5).join('; '),
  })

  // 2) textBoxHeuristic — w/h 추정식 대비 박스 크기 검증 (manifest-schema.md R4)
  //    핸드크래프트: FAIL / 추출(generator=extract-manifest): WARN
  const boxHeuristicErrors = []
  ;(manifest.slides || []).forEach((slide, slideIndex) => {
    ;(slide.elements || []).forEach((el, elementIndex) => {
      if (el.type !== 'text') return
      const text = textContent(el)
      if (!text.trim()) return
      const renderW = estimateRenderWidth(text, el.fontSize)
      if (el.wrap === false) {
        // no-wrap (라인 락): breakLine 세그먼트 단위로 라인별 최대 폭을 추정
        let lines = [[]]
        if (Array.isArray(el.runs)) {
          for (const r of el.runs) {
            lines[lines.length - 1].push(r.text ?? '')
            if (r.breakLine) lines.push([])
          }
        } else {
          lines = [[text]]
        }
        const lineTexts = lines.map((parts) => parts.join('')).filter((t) => t.length > 0)
        const maxLineW = Math.max(...lineTexts.map((t) => estimateRenderWidth(t, el.fontSize)), 0)
        if (maxLineW > el.w * 1.35) {
          boxHeuristicErrors.push(
            `S${slideIndex + 1} e${elementIndex} no-wrap line "${lineTexts.find((t) => estimateRenderWidth(t, el.fontSize) === maxLineW)?.slice(0, 14)}" estW=${Math.round(maxLineW)} > w=${Math.round(el.w)}×1.35`,
          )
        }
        const ls = el.lineSpacing && el.lineSpacing > 0 ? el.lineSpacing : 1.5
        const estLinesH = el.fontSize * ls * lineTexts.length
        if (estLinesH > el.h * 1.35) {
          boxHeuristicErrors.push(
            `S${slideIndex + 1} e${elementIndex} ${lineTexts.length} locked lines estH=${Math.round(estLinesH)} > h=${Math.round(el.h)}×1.35`,
          )
        }
        return
      }
      const lineSpacing = el.lineSpacing && el.lineSpacing > 0 ? el.lineSpacing : 1.5
      const lines = Math.max(1, Math.ceil(renderW / Math.max(1, el.w)))
      const estH = el.fontSize * lineSpacing * lines
      if (estH > el.h * 1.3) {
        boxHeuristicErrors.push(
          `S${slideIndex + 1} e${elementIndex} text "${text.slice(0, 14)}" estH=${Math.round(estH)} (${lines} lines) > h=${el.h}×1.3`,
        )
      }
    })
  })
  results.push({
    id: 'textBoxHeuristic',
    pass: boxHeuristicErrors.length === 0,
    detail:
      boxHeuristicErrors.length === 0
        ? 'All text boxes sized for estimated render width/height'
        : boxHeuristicErrors.slice(0, 5).join('; '),
    ...(isExtracted && boxHeuristicErrors.length > 0 ? { warn: true } : {}),
  })

  // 3) noBodyNewline — R6: 본문(fontSize < 60) content에 \n 금지 (타이틀/runs.breakLine은 허용)
  const newlineErrors = []
  ;(manifest.slides || []).forEach((slide, slideIndex) => {
    ;(slide.elements || []).forEach((el, elementIndex) => {
      if (el.type !== 'text' || el.runs) return
      if (typeof el.content === 'string' && el.content.includes('\n') && el.fontSize < 60) {
        newlineErrors.push(
          `S${slideIndex + 1} e${elementIndex} body text (fontSize=${el.fontSize}) contains \\n — use auto-wrap or runs.breakLine`,
        )
      }
    })
  })
  results.push({
    id: 'noBodyNewline',
    pass: newlineErrors.length === 0,
    detail: newlineErrors.length === 0 ? 'No \\n in body text' : newlineErrors.slice(0, 5).join('; '),
  })

  // 4) flatStack — 레이아웃 붕괴 탐지 (pptx-build.md 2.5.0): 텍스트 6개 이상이
  //    같은 x 버킷(±5px)에 세로로만 쌓이고 슬라이드 전체 x 버킷이 2개 이하면 붕괴
  const flatStackErrors = []
  ;(manifest.slides || []).forEach((slide, slideIndex) => {
    const texts = (slide.elements || []).filter((el) => el.type === 'text')
    if (texts.length < 6) return
    const buckets = new Map()
    texts.forEach((t) => {
      const key = Math.round(t.x / 10) * 10
      buckets.set(key, (buckets.get(key) || 0) + 1)
    })
    const maxBucket = Math.max(...buckets.values())
    if (buckets.size <= 2 && maxBucket >= 6) {
      flatStackErrors.push(
        `S${slideIndex + 1}: ${texts.length} texts collapse into ${buckets.size} x-bucket(s) (max ${maxBucket} stacked) — layout collapse`,
      )
    }
  })
  results.push({
    id: 'flatStack',
    pass: flatStackErrors.length === 0,
    detail: flatStackErrors.length === 0 ? 'No flat-stack collapse' : flatStackErrors.join('; '),
  })

  // 폰트 검증 사각 경고: 허용목록이 전혀 없는데(manifest.fonts 비었고 --expected-font 미지정)
  // fontFamily가 박힌 텍스트가 있으면 fontFamily 검사가 조용히 skip(pass)된다. 비-Arial 테마에서
  // 폰트 없는 요소는 convert.js가 기본 폴백으로 렌더하므로, 이 사각을 비-실패 경고로 surface한다.
  const warnings = []
  const hasTextFont = (manifest.slides || []).some(
    (s) => (s.elements || []).some((e) => e.type === 'text' && e.fontFamily),
  )
  if (allowedFonts.length === 0 && hasTextFont) {
    warnings.push(
      'fontFamily 미검증 — 폰트 허용목록 없음(manifest.fonts 비었고 --expected-font 미지정). ' +
        '비-Arial 테마면 폰트 없는 요소가 convert.js 기본 폴백으로 렌더될 수 있다. ' +
        'manifest.fonts에 활성 테마 폰트(src/index.css --font-sans 첫 패밀리)를 선언하거나 --expected-font를 전달하라.',
    )
  }

  const summary = {
    passRate: `${results.filter((result) => result.pass).length}/${results.length}`,
    results,
    ...(warnings.length ? { warnings } : {}),
  }

  console.log(JSON.stringify(summary, null, 2))
  warnings.forEach((w) => console.error('[check-manifest][warn] ' + w))

  // warn:true 항목은 게이트를 막지 않는다 (추출 매니페스트의 휴리스틱 완화 등)
  if (results.some((result) => !result.pass && !result.warn)) {
    process.exit(1)
  }
}

main()
