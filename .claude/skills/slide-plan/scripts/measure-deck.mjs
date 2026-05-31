#!/usr/bin/env node
// measure-deck.mjs — PIPELINE_UPDATE_PLAN P5 정량 측정
// ---------------------------------------------------------------------------
// 동일 brief의 변경 전/후 slide_plan.json 을 받아 '비주얼=근거' 효과를 정량화한다.
// 이 결과가 (a) warn→gate 승격, (b) slide-html/slide-svg 전파 판단의 게이트.
//
// 측정 지표 (plan json 에서 계산 — 렌더 불필요):
//   - cardRowRatio      : 콘텐츠 슬라이드 중 card-row 계열(point-grid/kpi-dashboard) 비율 (낮을수록 개선)
//   - visualPrimary     : 비주얼이 지배하는 슬라이드 수/비율 (차트·표·lead-bound·지배형 비주얼 블록)
//   - distinctLeadTypes : 선언된 lead.type 의 distinct 수 + 채택률
//   - unboundVisuals    : 지배형 비주얼인데 근거 미바인딩(R7 would-warn) 수 (낮을수록 개선)
//   - leadSkew          : 가장 흔한 lead.type 의 점유율 (낮을수록 다양)
//   - 여백률(whitespace): 렌더타임 지표 — 여기선 N/A. Playwright 스크린샷 픽셀 분석으로 별도 측정.
//
// Usage:
//   node measure-deck.mjs <plan.json>                 # 단일 덱 측정
//   node measure-deck.mjs <before.json> <after.json>  # before/after 비교 + delta
// ---------------------------------------------------------------------------

import { readFileSync } from 'fs'

const CARD_ROW_FAMILIES = new Set(['point-grid', 'kpi-dashboard'])
const DOMINANT_VISUAL_BLOCKS = new Set(['image', 'infographic', 'diagram_flow'])

function loadSlides(path) {
  const plan = JSON.parse(readFileSync(path, 'utf-8'))
  const slides = Array.isArray(plan.slides) ? plan.slides : []
  return slides
}

function blocksOf(s) {
  return Array.isArray(s.content_blocks) ? s.content_blocks.filter((b) => b && typeof b === 'object') : []
}

function hasChart(s) {
  return Boolean(s.chart_strategy)
}
function hasTable(s) {
  return Boolean(s.table_strategy) || blocksOf(s).some((b) => b.block_type === 'table')
}
function leadObj(s) {
  return s.lead && typeof s.lead === 'object' ? s.lead : null
}
function dominantVisualBlocks(s) {
  return [...new Set(blocksOf(s).map((b) => b.block_type).filter((t) => DOMINANT_VISUAL_BLOCKS.has(t)))]
}

function isVisualPrimary(s) {
  if (hasChart(s) || hasTable(s)) return true
  const lead = leadObj(s)
  if (lead && (lead.carries === 'evidence' || lead.carries === 'explanation')) return true
  return dominantVisualBlocks(s).length > 0
}

// R7 would-warn: 지배형 비주얼 블록이 있는데 lead 미선언이고 차트·표도 아님
function isUnboundVisual(s) {
  if (leadObj(s)) return false
  if (hasChart(s) || hasTable(s)) return false
  return dominantVisualBlocks(s).length > 0
}

function measure(path) {
  const slides = loadSlides(path)
  const n = slides.length
  const content = slides.filter((s) => s.page_family === 'body')
  const cN = content.length || 1

  const cardRow = content.filter((s) => CARD_ROW_FAMILIES.has(s.recommended_layout_family)).length
  const visualPrimary = slides.filter(isVisualPrimary).length
  const unbound = slides.filter(isUnboundVisual).length

  const leadTypes = slides.map((s) => leadObj(s)?.type).filter(Boolean)
  const leadDeclared = slides.filter((s) => leadObj(s)).length
  const typeCounts = {}
  for (const t of leadTypes) typeCounts[t] = (typeCounts[t] || 0) + 1
  const topLeadShare = leadTypes.length ? Math.max(...Object.values(typeCounts)) / leadTypes.length : 0

  return {
    path,
    slides: n,
    contentSlides: content.length,
    cardRowRatio: round(cardRow / cN),
    cardRowCount: cardRow,
    visualPrimary,
    visualPrimaryRatio: round(visualPrimary / (n || 1)),
    unboundVisuals: unbound,
    leadAdoption: round(leadDeclared / (n || 1)),
    distinctLeadTypes: new Set(leadTypes).size,
    leadSkew: round(topLeadShare),
    whitespaceRatio: 'N/A (render-time — Playwright)',
  }
}

function round(x) {
  return Math.round(x * 1000) / 1000
}

function fmt(m) {
  return [
    `  slides            : ${m.slides} (content ${m.contentSlides})`,
    `  cardRowRatio      : ${pct(m.cardRowRatio)} (${m.cardRowCount} card-row 계열, 낮을수록 ↑)`,
    `  visualPrimary     : ${m.visualPrimary} (${pct(m.visualPrimaryRatio)}, 높을수록 ↑)`,
    `  unboundVisuals    : ${m.unboundVisuals} (R7 would-warn, 낮을수록 ↑)`,
    `  leadAdoption      : ${pct(m.leadAdoption)}`,
    `  distinctLeadTypes : ${m.distinctLeadTypes}`,
    `  leadSkew          : ${pct(m.leadSkew)} (top lead.type 점유, 낮을수록 다양)`,
    `  whitespaceRatio   : ${m.whitespaceRatio}`,
  ].join('\n')
}
function pct(x) {
  return typeof x === 'number' ? `${Math.round(x * 100)}%` : x
}

function delta(a, b, key, betterLower) {
  const d = round(b[key] - a[key])
  if (d === 0) return '±0'
  const sign = d > 0 ? '+' : ''
  const good = betterLower ? d < 0 : d > 0
  return `${sign}${typeof a[key] === 'number' && a[key] <= 1 ? pct(d) : d} ${good ? '✓' : '✗'}`
}

function main() {
  const argv = process.argv.slice(2)
  if (argv.length < 1) {
    console.error('usage: measure-deck.mjs <plan.json> [after.json]')
    process.exit(2)
  }
  if (argv.length === 1) {
    const m = measure(argv[0])
    console.log(`\n[measure] ${argv[0]}`)
    console.log(fmt(m))
    console.log('\n' + JSON.stringify(m, null, 2))
    return
  }
  const a = measure(argv[0])
  const b = measure(argv[1])
  console.log(`\nBEFORE  ${argv[0]}`)
  console.log(fmt(a))
  console.log(`\nAFTER   ${argv[1]}`)
  console.log(fmt(b))
  console.log('\nDELTA (after - before)')
  console.log(`  cardRowRatio      : ${delta(a, b, 'cardRowRatio', true)}`)
  console.log(`  visualPrimaryRatio: ${delta(a, b, 'visualPrimaryRatio', false)}`)
  console.log(`  unboundVisuals    : ${delta(a, b, 'unboundVisuals', true)}`)
  console.log(`  leadAdoption      : ${delta(a, b, 'leadAdoption', false)}`)
  console.log(`  distinctLeadTypes : ${delta(a, b, 'distinctLeadTypes', false)}`)
  console.log(`  leadSkew          : ${delta(a, b, 'leadSkew', true)}`)
  console.log('\n게이트 판단: cardRowRatio↓ + visualPrimaryRatio↑ + unboundVisuals↓ 가 뚜렷하면')
  console.log('  (a) R7/취향 규칙 warn→gate 승격, (b) slide-html/slide-svg 전파를 진행한다.')
}

main()
