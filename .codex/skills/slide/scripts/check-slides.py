#!/usr/bin/env python3
"""check-slides.py — /slide Step 4 빌드 검증 일괄 실행.

SKILL.md에 인라인으로 흩어져 있던 python -c 검증 블록 ~20개를 단일 스크립트로 통합.
plan 모드(output/*/slide_plan.json 존재)와 간단 모드를 자동 분기한다.

Usage:
    python3 .codex/skills/slide/scripts/check-slides.py [--pencil-count N|SKIP] [--slug SLUG]

    --pencil-count  Pencil get_editor_state에서 센 Slide* 프레임 수.
                    미지정 시 PENCIL_SLIDE_COUNT env를 읽는다.
                    SKIP은 sol-20260424-001 위반 위험이 있으므로 권장하지 않음.
    --slug          현재 작업 슬러그. 지정 시 output/<slug>/slide_plan.json만 plan으로
                    인정한다 (다른 프로젝트의 옛 plan 오매칭 방지 — 강력 권장).

Exit code: FAIL이 하나라도 있으면 1, WARN만 있으면 0.
"""

import glob
import json
import os
import re
import sys

# ---------------------------------------------------------------------------
# THEME:START name=jangpm
# 테마 의존 상수 — /theme-init으로 테마 교체 시 이 블록을 새 테마의
# theme-rules.md 수치에 맞춰 갱신한다 (theme-replacement-map.md 교체 지점 #3).
MIN_FONT_PX = 12              # B4: 최소 하드코드 폰트 크기 (jangpm 캡션 12.8px)
HEADLINE_PX = 32              # B9: 콘텐츠 h2 하드코드 허용 크기
GRID_PATTERNS = r'(four-point|six-point|matrix-trends|kpi-dashboard|numbered-grid)'  # B7
MIN_GRID_SLIDES = 3           # B7: 고밀도 grid 패턴 최소 장수
# THEME:END
# ---------------------------------------------------------------------------

MIN_ELEMENTS = 12             # B-elements: 콘텐츠 슬라이드 최소 JSX 요소 수 (정본 기준선)

COVER_RE = r'pattern="(title|cover|cover-vertical)"|Bold Cover|COVER'
SECTION_CLOSING_RE = r'pattern="(section|closing|closing-big)"|Section Break|Closing'
NON_CONTENT_RE = r'pattern="(title|section|closing|cover-vertical|closing-big)"|Bold Cover|Section Break|Closing|Cover'
NON_CONTENT_EMPH_RE = r'pattern="(title|cover|section|closing|cover-vertical|closing-big)"'

results = []  # (level, id, detail) — level: PASS / WARN / FAIL


def report(check_id, ok, detail='', warn_only=False):
    level = 'PASS' if ok else ('WARN' if warn_only else 'FAIL')
    results.append((level, check_id, detail))


def slide_files():
    return sorted(glob.glob('src/slides/Slide[0-9]*.tsx'))


def read(path):
    with open(path, encoding='utf-8') as f:
        return f.read()


def find_plan(slug=None):
    if slug:
        p = f'output/{slug}/slide_plan.json'
        return p if os.path.exists(p) else None
    plans = glob.glob('output/*/slide_plan.json')
    if len(plans) > 1:
        print(f'[warn] slide_plan.json {len(plans)}개 발견 — --slug로 현재 프로젝트를 지정하라. 최신 수정본 사용.')
        plans.sort(key=os.path.getmtime, reverse=True)
    return plans[0] if plans else None


def is_non_content(content, pattern=NON_CONTENT_RE):
    return bool(re.search(pattern, content[:300]))


# === 공통 검증 (두 모드) ====================================================

def b_pencil(pencil_count):
    n = len(slide_files())
    if pencil_count is None:
        report('B-pencil', False, f'PENCIL_SLIDE_COUNT 미지정 — Pencil 프레임 수를 세서 --pencil-count로 전달 (TSX={n})')
    elif pencil_count == 'SKIP':
        report('B-pencil', False, f'SKIP (TSX={n}) — sol-20260424-001 위반 위험', warn_only=True)
    elif int(pencil_count) != n:
        report('B-pencil', False, f'Pencil={pencil_count} vs TSX={n}')
    else:
        report('B-pencil', True, f'{n} frames == {n} TSX')


def b4_min_font():
    v = [(os.path.basename(f), s) for f in slide_files()
         for s in re.findall(r'text-\[(\d+)px\]', read(f)) if int(s) < MIN_FONT_PX]
    report('B4', not v, f'{MIN_FONT_PX}px 미만 하드코드: {v}' if v else f'no font < {MIN_FONT_PX}px')


def b5_emoji():
    c = sum(len(re.findall(r'[\U0001F300-\U0001FAFF\U00002600-\U000026FF\U00002700-\U000027BF]', read(f)))
            for f in slide_files())
    report('B5', c == 0, f'{c} emoji found' if c else 'no emoji')


def b6_legacy_viewport():
    fails = [os.path.basename(f) for f in slide_files() if re.search(r'w-\[1920px\]|h-\[1080px\]', read(f))]
    report('B6', not fails, str(fails) if fails else 'no 1920×1080 legacy viewport')


def b7_grid_quota():
    # 고밀도 쿼터 — DESIGN.md §5: 콘텐츠 슬라이드의 30% 이상이 고밀도 grid 패턴.
    # 콘텐츠 슬라이드 수에 비례한 동적 임계치 (최소 2, 상한 MIN_GRID_SLIDES).
    import math
    files = slide_files()
    content = [f for f in files if not is_non_content(read(f))]
    threshold = min(MIN_GRID_SLIDES, max(2, math.ceil(len(content) * 0.3))) if content else MIN_GRID_SLIDES
    count = sum(1 for f in files if re.search(GRID_PATTERNS, read(f)[:300]))
    report('B7', count >= threshold, f'{count}/{threshold} grid-pattern slides (content={len(content)})')


def b9_headline():
    fails = []
    for f in slide_files():
        c = read(f)
        if is_non_content(c):
            continue
        if not re.search(r'<h2[^>]*(?:headline|text-\[' + str(HEADLINE_PX) + r'px\])|<SectionHeader', c):
            fails.append(os.path.basename(f))
    report('B9', not fails, str(fails) if fails else 'all content h2 use .headline/SectionHeader')


def b_gm():
    fails = []
    for f in slide_files():
        c = read(f)
        if is_non_content(c):
            continue
        if not re.search(r'<SlideShell[^>]*\sgm=|<GuidingMessage', c):
            fails.append(os.path.basename(f))
    report('B-gm', not fails, str(fails) if fails else 'all content slides have gm')


def b10_supertitle():
    fails = []
    for f in slide_files():
        c = read(f)
        if is_non_content(c):
            continue
        if re.search(r'flex-col[^"\']*["\']\S*>[\s]*<(?:div|span)[^>]*>[\s]*[가-힣A-Za-z][^<\n]{0,80}[\s]*</(?:div|span)>[\s]*<h2', c):
            fails.append(os.path.basename(f))
    report('B10', not fails, str(fails) if fails else 'no supertitle pattern')


def b_dark():
    fails = [os.path.basename(f) for f in slide_files()
             if re.search(r'w-\[1280px\].*?bg-\[#[0-2][0-9a-fA-F]', read(f)[:800], re.DOTALL)]
    report('B-dark', not fails, str(fails) if fails else 'no dark slide roots')


# === Plan 모드 검증 =========================================================

def plan_checks(plan_path):
    d = json.load(open(plan_path))
    plan_slides = d.get('slides', [])
    n_tsx = len(slide_files())

    # B-plan-count
    report('B-plan-count', len(plan_slides) == n_tsx,
           f'plan={len(plan_slides)} vs TSX={n_tsx}')

    # B-r2: chart 슬라이드 strategy + takeaway + chart_data (type-aware 최소 포인트)
    MIN = {'single-line-trend': 6, 'two-line-cross-over': 6, 'forecast-dashed': 6,
           'bar-comparison': 4, 'stacked-bar': 4, 'scatter': 4,
           'matrix-2x2': 4, 'matrix-3x3': 9, 'funnel': 3}
    fails = []
    for s in plan_slides:
        n = s.get('slide_number')
        if s.get('chart_strategy'):
            if not s.get('chart_takeaway'):
                fails.append(f'{n}:no-takeaway')
            cd = s.get('chart_data')
            if not cd:
                fails.append(f'{n}:no-chart_data')
            else:
                ctype = cd.get('type', 'custom')
                threshold = MIN.get(ctype, 0)
                series = cd.get('series', [])
                if not series and ctype != 'custom':
                    fails.append(f'{n}:empty-series')
                for ser in series:
                    vals = ser.get('values', [])
                    if threshold and len(vals) < threshold:
                        fails.append(f'{n}:series-{ser.get("name")}-len{len(vals)}<{threshold}({ctype})')
        if s.get('table_strategy') and not s.get('table_takeaway'):
            fails.append(f'{n}:no-table_takeaway')
    report('B-r2', not fails, str(fails) if fails else 'chart/table strategy+takeaway+data ok')

    # B-r5: evidence_to_use 비어있지 않음
    fails = [s.get('slide_number') for s in plan_slides
             if not s.get('content_constraints', {}).get('evidence_to_use')]
    report('B-r5', not fails, f'no-evidence: {fails}' if fails else 'all slides have evidence')

    # B-r6: pattern_id / min_lines_estimate / required_primitives 채워짐
    fails = []
    for s in plan_slides:
        n = s.get('slide_number')
        missing = []
        if not s.get('recommended_pattern_id'):
            missing.append('pattern_id')
        mle = s.get('min_lines_estimate')
        if not isinstance(mle, (int, float)) or mle < 40:
            missing.append(f'min_lines={mle}')
        rp = s.get('required_primitives')
        if not isinstance(rp, list) or len(rp) < 1:
            missing.append('required_primitives')
        if missing:
            fails.append(f'{n}:{missing}')
    report('B-r6', not fails, str(fails) if fails else 'plan fields complete')

    # B-density (plan): min_lines_estimate vs TSX 줄 수 + required_primitives grep
    fails = []
    for s in plan_slides:
        n = s.get('slide_number')
        tsx = f'src/slides/Slide{n:02d}.tsx'
        if not os.path.exists(tsx):
            fails.append(f'{n}:no-tsx')
            continue
        content = read(tsx)
        lines = content.count('\n') + 1
        mle = s.get('min_lines_estimate', 60)
        if lines < mle:
            fails.append(f'{n}:lines={lines}<{mle}')
        for prim in s.get('required_primitives', []):
            ok = prim in content
            if not ok and prim == 'Card':
                # 생짜 카드 div(rounded-[12px]+border)도 Card 충족으로 인정
                ok = ('rounded-[12px]' in content) and ('border' in content)
            if not ok:
                fails.append(f'{n}:missing-{prim}')
    report('B-density(plan)', not fails, str(fails) if fails else 'density + primitives ok')

    # B-plan-fidelity: core_message 키워드가 TSX에 등장 (heuristic)
    stopwords = {'있다', '없다', '한다', '하는', '되는', '된다', '대한', '위한', '수', '것', '이', '그', '저', '등', '및', '또는',
                 'that', 'this', 'with', 'from', 'have', 'will', 'they', 'your', 'their', 'about'}
    fails = []
    for s in plan_slides:
        n = s.get('slide_number')
        tsx = f'src/slides/Slide{n:02d}.tsx'
        if not os.path.exists(tsx):
            fails.append(f'{n}:no-tsx')
            continue
        content = read(tsx)
        keywords = set(re.findall(r'[가-힣]{2,}|[A-Za-z]{4,}', s.get('core_message', ''))) - stopwords
        if keywords and not any(k in content for k in keywords):
            fails.append(f'{n}:core_message keywords {sorted(keywords)[:5]} NOT in TSX')
    report('B-plan-fidelity', not fails, str(fails) if fails else 'core_message reflected')


# === 간단 모드 보강 검증 =====================================================

def simple_checks():
    files = slide_files()

    # B-r2-simple: chart/svg 슬라이드는 takeaway 텍스트 필요
    fails = []
    for f in files:
        c = read(f)
        has_visual = bool(re.search(r'recharts|<LineChart|<BarChart|<svg|<Chart\b|<canvas|chart_data', c, re.I))
        has_takeaway = bool(re.search(
            r'<GuidingMessage|gm=|c-secondary[^>]*>[^<]{30,}|className="[^"]*body[^"]*"[^>]*>[^<]{40,}', c, re.I))
        if has_visual and not has_takeaway:
            fails.append(f'{os.path.basename(f)}: visual but no takeaway text')
    report('B-r2-simple', not fails, str(fails) if fails else 'visual slides have takeaway')

    # B-family-diversity-simple: ≥6장이면 distinct pattern ≥3
    if len(files) < 6:
        report('B-family-diversity-simple', True, f'SKIP (<6 slides: {len(files)})')
    else:
        patterns = set()
        for f in files:
            c = read(f)
            if 'NumberBadge' in c and 'grid-cols-3' in c:
                patterns.add('three-point')
            if 'NumberBadge' in c and 'grid-cols-4' in c:
                patterns.add('four-point')
            if 'Metric' in c:
                patterns.add('kpi')
            if '<table' in c or ('grid-cols-' in c and 'border' in c):
                patterns.add('table')
            if 'SectionHeader' in c and 'col-span-2' in c:
                patterns.add('split')
            if '<LineChart' in c or '<BarChart' in c:
                patterns.add('chart')
            m = re.search(r'pattern="([a-z0-9-]+)"', c)
            if m:
                patterns.add(m.group(1))
        report('B-family-diversity-simple', len(patterns) >= 3,
               f'{len(patterns)} distinct patterns in {len(files)} slides: {sorted(patterns)}')

    # B-density-simple: 콘텐츠 ≥60줄 (chart ≥100, cover ≥60, section/closing ≥40)
    fails = []
    for f in files:
        c = read(f)
        lines = c.count('\n') + 1
        name = os.path.basename(f)
        if re.search(COVER_RE, c[:400]):
            thr, kind = 60, 'cover'
        elif re.search(SECTION_CLOSING_RE, c[:400]):
            thr, kind = 40, 'section/closing'
        elif re.search(r'recharts|<svg|d3|chart_data|<Chart|<LineChart|<BarChart', c, re.I):
            thr, kind = 100, 'chart'
        else:
            thr, kind = 60, 'general'
        if lines < thr:
            fails.append(f'{name}:lines={lines}<{thr}({kind})')
    report('B-density-simple', not fails, str(fails) if fails else 'all slides meet line floor')


# === WARN-only 검증 (두 모드 공통) ===========================================

def warn_checks():
    files = slide_files()

    # B-chart-theme: 차트 슬라이드의 하드코딩 색 리터럴 (chartTheme/var(--accent) 권장)
    warns = []
    for f in files:
        c = read(f)
        if not re.search(r'recharts|<svg|d3|chart_data|<Chart|<LineChart|<BarChart', c, re.I):
            continue
        lits = (set(re.findall(r'rgba?\([0-9 ]+,[0-9 ]+,[0-9 ]+', c)) |
                set(re.findall(r'#[0-9a-fA-F]{6}', c)) |
                set(re.findall(r'hsl\(', c)))
        if lits:
            warns.append(f'{os.path.basename(f)}:{sorted(lits)[:4]}')
    report('B-chart-theme', not warns, str(warns) if warns else 'no hardcoded chart colors', warn_only=True)

    # B-emphasis: 콘텐츠 슬라이드 인라인 강조(accent/bold) 부재
    warns = []
    for f in files:
        c = read(f)
        if re.search(NON_CONTENT_EMPH_RE, c[:300]):
            continue
        has_accent = 'text-[var(--accent)]' in c or ('var(--accent)' in c and 'color' in c)
        has_bold = bool(re.search(r'font-\[(700|800)\]|font-bold', c))
        if not (has_accent or has_bold):
            warns.append(os.path.basename(f))
    report('B-emphasis', not warns, str(warns) if warns else 'inline emphasis present', warn_only=True)

    # B-elements: 콘텐츠 슬라이드 JSX 요소 수 플로어
    warns = []
    for f in files:
        c = read(f)
        if re.search(NON_CONTENT_EMPH_RE, c[:300]):
            continue
        n = len(re.findall(r'<[A-Za-z][A-Za-z0-9]*[ />\n\t]', c))
        if n < MIN_ELEMENTS:
            warns.append(f'{os.path.basename(f)}:{n}<{MIN_ELEMENTS}')
    report('B-elements', not warns, str(warns) if warns else f'all >= {MIN_ELEMENTS} JSX elements', warn_only=True)

    # B-card-only: 카드 그리드 단독 (지배 비주얼 없음 — anti-slop Rule 19)
    warns = []
    for f in files:
        c = read(f)
        if re.search(NON_CONTENT_EMPH_RE, c[:300]):
            continue
        card_grid = bool(re.search(r'grid-cols-[345]|grid-rows-2', c)) and bool(re.search(r'<Card\b|rounded-\[12px\]', c))
        literal_cards = len(re.findall(r'<Card\b', c)) + len(re.findall(r'rounded-\[12px\]', c))
        visual = bool(re.search(r'<svg|<table|RuledList|RuledColumns|MetricBar|<img', c, re.I))
        if (card_grid or literal_cards >= 4) and not visual:
            warns.append(os.path.basename(f))
    report('B-card-only', not warns, str(warns) if warns else 'no card-grid-only slides', warn_only=True)


def main():
    pencil_count = os.environ.get('PENCIL_SLIDE_COUNT')
    slug = None
    argv = sys.argv[1:]
    for i, a in enumerate(argv):
        if a == '--pencil-count' and i + 1 < len(argv):
            pencil_count = argv[i + 1]
        elif a == '--slug' and i + 1 < len(argv):
            slug = argv[i + 1]

    if not slide_files():
        print('FAIL no-slides — src/slides/Slide*.tsx 없음')
        sys.exit(1)

    plan_path = find_plan(slug)
    mode = 'plan' if plan_path else 'simple'
    print(f'mode: {mode}' + (f' ({plan_path})' if plan_path else ''))

    b_pencil(pencil_count)
    b4_min_font()
    b5_emoji()
    b6_legacy_viewport()
    b7_grid_quota()
    b9_headline()
    b_gm()
    b10_supertitle()
    b_dark()

    if plan_path:
        plan_checks(plan_path)
    else:
        simple_checks()

    warn_checks()

    fails = [r for r in results if r[0] == 'FAIL']
    warns = [r for r in results if r[0] == 'WARN']
    for level, check_id, detail in results:
        print(f'{level:4} {check_id:28} {detail}')
    print(f'\nsummary: {len(results) - len(fails) - len(warns)} PASS / {len(warns)} WARN / {len(fails)} FAIL')
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
