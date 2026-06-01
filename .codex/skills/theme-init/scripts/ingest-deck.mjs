#!/usr/bin/env node
// ingest-deck.mjs
// ---------------------------------------------------------------------------
// 사용자가 제공한 "레퍼런스 덱"(HTML 슬라이드 파일/디렉토리)을 파싱해 **레이아웃
// 디바이스**를 추출하고 JSON으로 출력한다. /theme-init Step 1에서 LLM이 이 JSON을
// card_style 토큰 선택 + DESIGN.md §5(layout grammar)/§6(header/body/footer) 시드로
// 사용한다. (과거 `--reference`는 기록만 했음 — 이 스크립트가 실제 추출을 담당.)
//
// ⚠️ 휴리스틱(정규식 기반, 의존성 0)이라 정확하지 않다. 모든 결론에 confidence를
//    달고, LLM/사용자가 실제 덱을 보고 최종 확정한다. 스키마는
//    `references/deck-ingest-schema.md` 참조.
//
// 추출 항목: card_style(filled|hairline|borderless), surface_alternation, hairline,
//   cta(있음/없음), kicker(헤딩 위 소형 라벨), 기타 device 플래그(grid/two_column/kpi/table).
//
// Usage:
//   node ingest-deck.mjs <file.html | dir/>  [--css <extra.css>]... [--out <ingest.json>]
//   (CSS는 자동으로 HTML의 <link>·@import 를 1단계 따라가며 수집; --css 로 추가 가능)
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs'
import { resolve, join, dirname, relative } from 'path'

function parseArgs(argv) {
  const opts = { css: [], out: null }
  const pos = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--css') opts.css.push(argv[++i])
    else if (a === '--out') opts.out = argv[++i]
    else if (a.startsWith('--')) throw new Error(`unknown flag: ${a}`)
    else pos.push(a)
  }
  opts.target = pos[0]
  return opts
}

function stripCssComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

// HTML에서 <link rel=stylesheet href> 와 인라인/임포트 CSS를 모은다(1단계).
function collectCss(htmlFiles, extraCssPaths) {
  let css = ''
  const seen = new Set()
  const addFile = (p) => {
    const abs = resolve(p)
    if (seen.has(abs) || !existsSync(abs)) return
    seen.add(abs)
    let text = ''
    try { text = readFileSync(abs, 'utf-8') } catch { return }
    css += '\n' + text
    // @import url('x.css') 1단계 따라가기
    const re = /@import\s+(?:url\()?['"]?([^'")\s]+)['"]?\)?/g
    let m
    while ((m = re.exec(text)) !== null) addFile(resolve(dirname(abs), m[1]))
  }
  for (const f of htmlFiles) {
    const html = readFileSync(f, 'utf-8')
    // <style> 인라인
    const styleRe = /<style[^>]*>([\s\S]*?)<\/style>/gi
    let sm
    while ((sm = styleRe.exec(html)) !== null) css += '\n' + sm[1]
    // <link rel=stylesheet href>
    const linkRe = /<link[^>]+href=['"]([^'"]+\.css)['"][^>]*>/gi
    let lm
    while ((lm = linkRe.exec(html)) !== null) addFile(resolve(dirname(f), lm[1]))
  }
  for (const p of extraCssPaths) addFile(p)
  return stripCssComments(css)
}

// :root 의 CSS 변수 맵을 만들고 var() 를 재귀 해석한다.
function buildVarMap(css) {
  const map = {}
  const rootRe = /:root\s*\{([^}]*)\}/g
  let rm
  while ((rm = rootRe.exec(css)) !== null) {
    const declRe = /--([\w-]+)\s*:\s*([^;]+);/g
    let dm
    while ((dm = declRe.exec(rm[1])) !== null) map[dm[1]] = dm[2].trim()
  }
  return map
}
function resolveVal(val, varMap, depth = 0) {
  if (!val || depth > 10) return val
  return val.replace(/var\(\s*--([\w-]+)\s*(?:,\s*([^)]+))?\)/g, (_, name, fallback) => {
    if (varMap[name] != null) return resolveVal(varMap[name], varMap, depth + 1)
    return fallback ? resolveVal(fallback.trim(), varMap, depth + 1) : ''
  }).trim()
}

const ABSENT = /^(transparent|none|inherit|unset|initial|currentcolor)?$/i
function colorPresent(val) {
  if (val == null) return false
  const v = val.trim()
  if (v === '') return false
  return !ABSENT.test(v)
}

// class -> 병합된 선언({background, border, borderWidth, borderColor, radius, padding})
function buildClassMap(css, varMap) {
  const map = {}
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g
  let rm
  while ((rm = ruleRe.exec(css)) !== null) {
    const selector = rm[1]
    const body = rm[2]
    const classes = selector.match(/\.[A-Za-z_][\w-]*/g)
    if (!classes) continue
    const decls = {}
    const grab = (prop) => {
      const m = body.match(new RegExp(prop.replace(/-/g, '\\-') + '\\s*:\\s*([^;]+)'))
      return m ? resolveVal(m[1].trim(), varMap) : null
    }
    decls.background = grab('background-color') || grab('background')
    decls.borderShorthand = grab('border')
    decls.borderWidth = grab('border-width')
    decls.borderColor = grab('border-color')
    decls.radius = grab('border-radius')
    decls.padding = grab('padding')
    decls.fontSize = grab('font-size')
    for (const c of classes) {
      const name = c.slice(1)
      map[name] = Object.assign({}, map[name], Object.fromEntries(Object.entries(decls).filter(([, v]) => v != null)))
    }
  }
  return map
}

function borderPresent(style) {
  const sh = style.borderShorthand
  if (sh) {
    if (/\bnone\b/i.test(sh) || /(^|\s)0(px)?(\s|$)/.test(sh)) {
      // border: 0 / none → 색까지 봐야 함 (1px solid transparent 도 없음 취급)
    }
    const widthZero = /(^|\s)0(px)?(\s|$)/.test(sh)
    const noneStyle = /\bnone\b/i.test(sh)
    const colorTransparent = /\btransparent\b/i.test(sh)
    if (!widthZero && !noneStyle && !colorTransparent) return true
  }
  if (style.borderWidth && !/^0(px)?$/.test(style.borderWidth.trim())) {
    if (!style.borderColor || colorPresent(style.borderColor)) return true
  }
  return false
}

function inferCardStyle(cardStyle) {
  const bg = colorPresent(cardStyle.background)
  const bd = borderPresent(cardStyle)
  if (bg && bd) return 'hairline'
  if (bg && !bd) return 'filled'
  if (!bg && !bd) return 'borderless'
  return 'unknown' // border만 있고 bg 없음 — 드묾
}

const CARD_CLASS_RE = /(?:^|[-_])(card|tile|panel)(?:$|[-_])|^(card|tile|panel)\d*$|(?:^|[-_])(card)(?:$|[-_])/i
function isCardClass(name) {
  return /(^|[-_])(card|tile|panel)([-_]|$)/i.test(name) || /^(card|tile|panel)/i.test(name)
}

function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (!opts.target) {
    console.error('Usage: node ingest-deck.mjs <file.html|dir> [--css <f>]... [--out <json>]')
    process.exit(1)
  }
  const target = resolve(opts.target)
  if (!existsSync(target)) { console.error(`경로 없음: ${target}`); process.exit(1) }

  let htmlFiles = []
  if (statSync(target).isDirectory()) {
    htmlFiles = readdirSync(target).filter((f) => /\.html?$/i.test(f)).sort().map((f) => join(target, f))
  } else {
    htmlFiles = [target]
  }
  if (htmlFiles.length === 0) { console.error('HTML 파일 없음'); process.exit(1) }

  const css = collectCss(htmlFiles, opts.css.map((p) => resolve(p)))
  const varMap = buildVarMap(css)
  const classMap = buildClassMap(css, varMap)

  // HTML 본문 합치기 (디바이스 탐지용)
  const htmlBodies = htmlFiles.map((f) => readFileSync(f, 'utf-8')).join('\n')

  // 1) 카드 클래스 탐지 + card_style 추론
  const classUse = {}
  const clsRe = /class\s*=\s*['"]([^'"]+)['"]/gi
  let cm
  while ((cm = clsRe.exec(htmlBodies)) !== null) {
    for (const tok of cm[1].split(/\s+/)) classUse[tok] = (classUse[tok] || 0) + 1
  }
  const cardClasses = Object.keys(classUse).filter((c) => isCardClass(c) && classMap[c])
  cardClasses.sort((a, b) => classUse[b] - classUse[a])

  let cardStyleVal = 'unknown', cardConf = 'low', cardEvidence = '카드형 클래스/스타일을 찾지 못함'
  if (cardClasses.length > 0) {
    const dom = cardClasses[0]
    cardStyleVal = inferCardStyle(classMap[dom])
    cardConf = cardStyleVal === 'unknown' ? 'low' : 'high'
    cardEvidence = `dominant card class .${dom} (${classUse[dom]}회) → bg=${classMap[dom].background || '-'}, border=${classMap[dom].borderShorthand || classMap[dom].borderWidth || '-'}`
  } else {
    // 인라인 border-radius + border/bg 박스로 추정
    const inlineRounded = (htmlBodies.match(/style\s*=\s*['"][^'"]*border-radius/gi) || []).length
    if (inlineRounded > 0) { cardStyleVal = 'filled'; cardConf = 'low'; cardEvidence = `인라인 border-radius 박스 ${inlineRounded}개(클래스 미해석) — 추정` }
  }

  // 2) surface alternation — 카드/섹션 배경의 distinct opaque 색 개수
  const bgColors = new Set()
  for (const c of cardClasses) {
    const b = classMap[c].background
    if (colorPresent(b)) bgColors.add(b.toLowerCase())
  }
  // surface-alt 류 토큰 존재도 신호로
  const hasSurfaceAlt = /--surface-alt\b/.test(css)
  const altVal = bgColors.size >= 2 || (hasSurfaceAlt && /surface-alt|alt|muted/i.test(htmlBodies))
  const altConf = bgColors.size >= 2 ? 'high' : hasSurfaceAlt ? 'low' : 'low'

  // 3) hairline (1px 보더)
  const hairlineVal = cardClasses.some((c) => /(^|\s)1px/.test(classMap[c].borderShorthand || '') || /^1px$/.test((classMap[c].borderWidth || '').trim()))

  // 4) CTA
  const ctaVal = /<button[\s>]/i.test(htmlBodies) || /class\s*=\s*['"][^'"]*\b(btn|button|cta)\b/i.test(htmlBodies)
  // 5) kicker (헤딩 위 소형 라벨 클래스, 또는 uppercase 라벨)
  const kickerClassVal = /\b(kicker|eyebrow|overline|supertitle|label-caption)\b/i.test(htmlBodies)
  const kickerVal = kickerClassVal

  // 6) device 플래그
  const devices = {
    grid: /display\s*:\s*grid/i.test(css) || /grid-template-columns/i.test(css) || /\bgrid-(?:cols-)?\d/i.test(htmlBodies),
    two_column: /grid-cols-2\b/i.test(htmlBodies) || /grid-template-columns\s*:\s*[^;]*1fr\s+1fr/i.test(css),
    kpi: /\b(kpi|stat-number|metric|display-sm)\b/i.test(htmlBodies) || /\b(kpi|metric)\b/i.test(css),
    table: /<table[\s>]/i.test(htmlBodies),
  }

  const result = {
    source: htmlFiles.map((f) => relative(process.cwd(), f).split(/[\\/]/).join('/')),
    slide_count: htmlFiles.length,
    card_style: { value: cardStyleVal, confidence: cardConf, evidence: cardEvidence },
    surface_alternation: { value: altVal, confidence: altConf, evidence: `distinct card bg=${bgColors.size}, --surface-alt 토큰=${hasSurfaceAlt}` },
    hairline: { value: hairlineVal, confidence: cardClasses.length ? 'medium' : 'low', evidence: '카드 1px 보더 탐지' },
    cta: { value: ctaVal, confidence: ctaVal ? 'medium' : 'low', evidence: 'button/btn/cta 토큰' },
    kicker: { value: kickerVal, confidence: kickerClassVal ? 'medium' : 'low', evidence: 'kicker/eyebrow/label-caption 클래스' },
    devices,
    notes: [
      '휴리스틱 추출 — LLM/사용자가 실제 덱을 보고 확정할 것.',
      'card_style → /theme-init Step 1 토큰(--card-bg/--card-border-color) + DESIGN.md §5/§6 시드.',
      'CSS 변수는 :root 에서 1차 해석. 외부/런타임 토큰은 미해석일 수 있음.',
    ],
  }

  const json = JSON.stringify(result, null, 2)
  if (opts.out) {
    writeFileSync(resolve(opts.out), json + '\n', 'utf-8')
    console.error(`[ingest-deck] wrote ${opts.out}`)
  }
  console.log(json)
}

main()
