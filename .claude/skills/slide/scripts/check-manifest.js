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
        if (element.x < -5 || element.y < -5 || right > 1930 || bottom > 1090) {
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
  const cardErrors = []
  ;(manifest.slides || []).forEach((slide, slideIndex) => {
    const elements = slide.elements || []
    const cards = elements.filter(
      (el) =>
        el.type === 'rect' &&
        el.cornerRadius > 0 &&
        // 전체 슬라이드 배경(1280×720 또는 그에 준하는 큰 rect) 제외
        !(el.x <= 5 && el.y <= 5 && el.w >= 1260 && el.h >= 700),
    )
    const texts = elements.filter((el) => el.type === 'text')

    cards.forEach((card, cardIndex) => {
      const hasCoveringText = texts.some((text) => {
        const cx = text.x + text.w / 2
        const cy = text.y + text.h / 2
        return cx >= card.x && cx <= card.x + card.w && cy >= card.y && cy <= card.y + card.h
      })
      if (!hasCoveringText) {
        cardErrors.push(`S${slideIndex + 1} card${cardIndex} rect(${card.x},${card.y},${card.w},${card.h}) has no text inside`)
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
  const yOrderErrors = []
  ;(manifest.slides || []).forEach((slide, slideIndex) => {
    const elements = slide.elements || []
    const cards = elements.filter(
      (el) =>
        el.type === 'rect' &&
        el.cornerRadius > 0 &&
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
      for (let i = 1; i < innerTexts.length; i++) {
        if (innerTexts[i].y < innerTexts[i - 1].y) {
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
    detail: yOrderErrors.length === 0 ? 'All card texts in y-order' : yOrderErrors.slice(0, 5).join('; '),
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

  if (results.some((result) => !result.pass)) {
    process.exit(1)
  }
}

main()
