# 소스 deck ingest 스키마

`/theme-init`이 사용자의 **레퍼런스 덱**(기존 HTML 슬라이드)을 받았을 때, `scripts/ingest-deck.mjs`가 레이아웃 디바이스를 추출해 내보내는 JSON의 스키마. LLM이 이 JSON을 **card_style 토큰 선택**과 **DESIGN.md §5(layout grammar)/§6(header·body·footer)** 시드로 사용한다.

> **이 스키마는 slide-pencil 단독 정의다.** slide-html·slide-svg는 독립 프로젝트이므로 스키마를 공유·정합시키지 않는다. (다른 프로젝트가 유사 기능을 만들 때 강제로 맞출 필요 없음.)
>
> **모든 값은 휴리스틱(정규식)이다.** confidence를 함께 내며, `high`라도 LLM/사용자가 실제 덱을 보고 **확정**해야 한다. 추출은 *대화의 시드*이지 최종 결정이 아니다.

## 호출

```bash
node .codex/skills/theme-init/scripts/ingest-deck.mjs <file.html | dir/> [--css <extra.css>]... [--out ingest.json]
```

- 디렉토리면 `*.html`을 모두(정렬) 읽는다. 파일이면 그 파일만.
- CSS는 각 HTML의 `<style>`·`<link rel=stylesheet>`·(CSS 내) `@import`를 1단계 따라가며 자동 수집한다. 토큰이 외부 파일에 있으면 `--css`로 추가 지정.
- `:root`의 CSS 변수는 1차 재귀 해석한다(예: `var(--card-bg)` → `var(--surface)` → `#FFFFFF`).

## 출력 JSON

```jsonc
{
  "source": ["path/to/slide1.html", "..."],   // 읽은 HTML (cwd 상대, 정렬)
  "slide_count": 29,

  // 카드 base chrome 추론 → /theme-init Step 1의 --card-bg/--card-border-color 시드
  "card_style": {
    "value": "hairline",          // filled | hairline | borderless | unknown
    "confidence": "high",         // high | medium | low
    "evidence": "dominant card class .card (10회) → bg=#FFFFFF, border=1px solid #E5E7EB"
  },

  // 흰/연회색 등 서로 다른 카드 표면색 교차 사용 여부 → DESIGN.md §5 surface 규칙
  "surface_alternation": { "value": true, "confidence": "high", "evidence": "distinct card bg=3, --surface-alt 토큰=true" },

  // 1px 얇은 보더(hairline) 사용 → card_style=hairline 근거 보강
  "hairline": { "value": true, "confidence": "medium", "evidence": "카드 1px 보더 탐지" },

  // CTA(버튼) 존재 → DESIGN.md §6 footer/closing, 신규 CTA 프리미티브 필요성
  "cta": { "value": false, "confidence": "low", "evidence": "button/btn/cta 토큰" },

  // 헤딩 위 소형 라벨(kicker/eyebrow) 존재 → DESIGN.md §6 header 패턴 (NO supertitle 룰과 교차 검토)
  "kicker": { "value": true, "confidence": "medium", "evidence": "kicker/eyebrow/label-caption 클래스" },

  // 거친 레이아웃 디바이스 플래그 → DESIGN.md §5 layout family 후보
  "devices": {
    "grid": true,          // display:grid / grid-template-columns / grid-cols-N
    "two_column": true,    // 1fr 1fr / grid-cols-2
    "kpi": true,           // kpi/stat-number/metric/display-sm
    "table": true          // <table>
  },

  "notes": ["휴리스틱 — 확정 필요", "..."]
}
```

## 필드별 추출 규칙 (요약)

| 필드 | 규칙 | confidence 기준 |
|---|---|---|
| `card_style` | 가장 많이 쓰인 카드형 클래스(`.card`/`.tile`/`.panel`/`*-card`)의 해석된 `background`·`border`로 추론. bg+border=hairline / bg-only=filled / 둘 다 없음=borderless | 카드 클래스 해석 성공=high, 인라인 추정=low |
| `surface_alternation` | 카드 배경의 distinct opaque 색 ≥2 또는 `--surface-alt` 토큰 + alt/muted 사용 | distinct≥2=high, 토큰만=low |
| `hairline` | 카드 보더 width가 1px | medium |
| `cta` | `<button>` 또는 `btn`/`button`/`cta` 클래스 | 존재=medium |
| `kicker` | `kicker`/`eyebrow`/`overline`/`supertitle`/`label-caption` 클래스 | 존재=medium |
| `devices.*` | CSS/HTML의 grid·1fr 1fr·kpi/metric·`<table>` 시그널 | 불리언 |

## /theme-init에서의 사용 (Step 1)

1. 사용자가 레퍼런스 덱을 제공하면 `ingest-deck.mjs`를 돌려 `ingest.json` 생성.
2. `card_style.value`를 Step 1 토큰 매핑의 `--card-bg`/`--card-border-color` 기본값 제안으로 사용(confidence가 낮으면 사용자에게 질문).
3. `surface_alternation`·`devices`·`kicker`·`cta`를 Step 4.6 DESIGN.md §5/§6 초안 시드로 사용.
4. 모든 항목은 Step 3 diff 미리보기/Step 4.6 검토에서 사용자가 확정. 휴리스틱 오탐은 여기서 교정.

## 한계

- 정규식 기반이라 복잡/난독화된 CSS, 런타임 생성 스타일, 빌드 후 클래스명 등은 놓칠 수 있다.
- Tailwind 유틸리티(`border`, `bg-white`)만 쓰는 덱은 클래스→스타일 해석이 제한적 → `card_style.confidence`가 낮게 나온다. 이 경우 LLM이 HTML을 직접 읽어 보강.
