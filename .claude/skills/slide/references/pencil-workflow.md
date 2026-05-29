# Pencil 워크플로우 참조 (CLI 기반)

> Pencil 호출은 모두 **Pencil CLI** (`@pencil.dev/cli`)의 interactive shell을 통한다. VS Code 확장 / MCP transport에 의존하지 않는다. 호출 메커니즘·sleep 룰·실패 모드는 `pencil-cli.md` 단일 진실 원천 참조.

> **테마 비의존 주의:** 아래 batch_design 예시의 색(#4633E3 / #E8E5FC 등)·폰트는 현재 활성 테마(jangpm) 기준이다. 실제 토큰은 `set_variables`로 주입한 값을 `var(--accent)` 등으로 참조하고, 폰트/색의 단일 진실 원천은 `src/index.css`다 — `/theme-init`으로 테마를 바꾸면 함께 바뀐다.

## 도구 호출 순서 (전체)

0. **Preflight** — `pencil status` 셸 호출. `● Active` 떠야 진행. 아니면 사용자에게 `pencil login` 안내 후 중단.
1. **Jangpm SSOT 흡수** — `pencil interactive --in jangpm-design-system.pen --out jangpm-design-system.pen` heredoc 안에서:
   - `get_guidelines({ category: "style" })` → 스타일 기준
   - `get_guidelines({ category: "guide", name: "slides" })` → 슬라이드 디자인 규칙
   - `get_variables()` → 기존 토큰
   - `batch_get({ readDepth: 2 })` → 컴포넌트 구조 파악
   - 이 .pen은 **읽기 전용**으로 취급 — 새 노드 삽입 / `set_variables` / `save()` 금지
2. **출력 .pen 초기화** — `pencil interactive --out output/<slug>/pencil-new.pen` heredoc 안에서:
   - `set_variables({ variables: { ... } })` → Step 1에서 흡수한 토큰을 새 .pen에 주입
   - `save()` (그리고 sleep 1 후 exit)
3. **(슬라이드별 반복)** — `pencil interactive --in output/<slug>/pencil-new.pen --out output/<slug>/pencil-new.pen` heredoc 안에서:
   1. `find_empty_space_on_canvas({ width: 1280, height: 720, padding: 80, direction: "right" })`
   2. `batch_design({ input: '...' })` → 슬라이드 프레임 + 콘텐츠 (1회 호출당 최대 25 연산)
   3. `G()` → 이미지 (필요 시, batch_design 안에서)
   4. `save()` (sleep 1 후 exit)
4. **검증** — 별도 heredoc에서 `export_nodes({ nodeIds: ["<slideFrameId>"], outputDir: "output/<slug>/_eval", format: "png", scale: 2 })` → 생성된 PNG를 Claude가 Read tool로 시각 확인.
5. 수정 필요 시 → 다시 3번 반복 (`batch_design`은 누적 편집)

## batch_design 연산 문법

batch_design의 operations 파라미터에 사용하는 연산들:

### Insert — I(parent, properties)
새 노드를 parent 아래에 삽입.
```
slide=I("documentId", {type: "frame", name: "Slide 1", width: 1280, height: 720, x: 0, y: 0, fill: "#FFFFFF", layout: "vertical", padding: 56})
header=I(slide, {type: "frame", layout: "vertical", gap: 10})
title=I(header, {type: "text", content: "제목", fontSize: 56, fontWeight: "800", color: "#1A1A1A"})
```

변수 할당으로 이후 연산에서 참조 가능.

### Update — U(nodeId, properties)
기존 노드의 속성 수정.
```
U("existingNodeId", {fontSize: 48, color: "#71717A"})
U(title, {content: "수정된 제목"})
```

### Delete — D(nodeId)
노드 삭제.
```
D("nodeToRemove")
```

### Copy — C(sourceId, parent, properties)
노드 복사.
```
copy1=C("sourceCard", slide, {x: 100})
```

### Replace — R(nodeId, properties)
노드 교체.
```
newNode=R("oldNodeId", {type: "text", content: "교체됨"})
```

### Move — M(nodeId, parent, index)
노드 이동.
```
M("nodeId", "newParent", 2)
```

### Generate Image — G(nodeId, type, prompt)
AI/stock 이미지 생성.
```
G(imageFrame, "ai", "abstract minimal geometric shapes, dark background, subtle gradient")
```

## 슬라이드 1개 생성 예시 (layout-07: 3Pillars)

```
slide=I("document", {type: "frame", name: "Slide 3 - Three Pillars", width: 1280, height: 720, x: 0, y: 0, fill: "#FFFFFF", layout: "vertical", padding: [56, 80, 56, 80], gap: 32})

header=I(slide, {type: "frame", layout: "vertical", gap: 10})
title=I(header, {type: "text", content: "세 가지 핵심 전략", fontSize: 56, fontWeight: "800", color: "#1A1A1A", fontFamily: "var(--font-sans)"})
subtitle=I(header, {type: "text", content: "2024년 성장을 위한 로드맵", fontSize: 24, fontWeight: "400", color: "#6B7280", fontFamily: "var(--font-sans)"})

columns=I(slide, {type: "frame", layout: "horizontal", gap: 24, width: "fill_container", height: "fill_container"})

card1=I(columns, {type: "frame", layout: "vertical", gap: 14, padding: 24, fill: "#FFFFFF", cornerRadius: 12, width: "fill_container", borderColor: "#E5E7EB", borderWidth: 1})
icon1=I(card1, {type: "frame", width: 48, height: 48, fill: "#4633E3", cornerRadius: 24, layout: "center"})
iconText1=I(icon1, {type: "text", content: "1", fontSize: 22, fontWeight: "700", color: "#FFFFFF"})
label1=I(card1, {type: "text", content: "전략 A", fontSize: 32, fontWeight: "800", color: "#1A1A1A"})
desc1=I(card1, {type: "text", content: "핵심 설명 텍스트", fontSize: 22, fontWeight: "400", color: "#6B7280", lineHeight: 1.5})

card2=I(columns, {type: "frame", layout: "vertical", gap: 14, padding: 24, fill: "#FFFFFF", cornerRadius: 12, width: "fill_container", borderColor: "#E5E7EB", borderWidth: 1})
icon2=I(card2, {type: "frame", width: 48, height: 48, fill: "#4633E3", cornerRadius: 24, layout: "center"})
iconText2=I(icon2, {type: "text", content: "2", fontSize: 22, fontWeight: "700", color: "#FFFFFF"})
label2=I(card2, {type: "text", content: "전략 B", fontSize: 32, fontWeight: "800", color: "#1A1A1A"})
desc2=I(card2, {type: "text", content: "핵심 설명 텍스트", fontSize: 22, fontWeight: "400", color: "#6B7280", lineHeight: 1.5})

card3=I(columns, {type: "frame", layout: "vertical", gap: 14, padding: 24, fill: "#E8E5FC", cornerRadius: 12, width: "fill_container", borderColor: "#4633E3", borderWidth: 1})
icon3=I(card3, {type: "frame", width: 48, height: 48, fill: "#4633E3", cornerRadius: 24, layout: "center"})
iconText3=I(icon3, {type: "text", content: "3", fontSize: 22, fontWeight: "700", color: "#FFFFFF"})
label3=I(card3, {type: "text", content: "전략 C", fontSize: 32, fontWeight: "800", color: "#1A1A1A"})
desc3=I(card3, {type: "text", content: "핵심 설명 텍스트", fontSize: 22, fontWeight: "400", color: "#6B7280", lineHeight: 1.5})
```

## 커버/히어로 슬라이드 절대 위치 규칙 ⚠️

**Cover, Hero Image, Split Cover, 전체 블리드 배경이 있는 슬라이드에는 반드시 아래 규칙을 적용한다.**

### 문제
Pencil에서 슬라이드 프레임의 `layout` 속성이 `"vertical"` / `"horizontal"`이면, 자식 프레임의 `x`, `y`가 무시되고 자동으로 쌓인다 (flexbox 동작). 커버 슬라이드에서 배경 + 텍스트 오버레이 + 이미지를 수동 배치할 때 이 문제가 발생한다.

### 해결: 슬라이드 프레임에 `layout: "none"` 사용

절대 위치가 필요한 슬라이드는 최상위 슬라이드 프레임을 `layout: "none"`으로 생성한다.
자식 노드에 `x`, `y`, `width`, `height`를 명시적으로 지정한다.

```
// ✅ 올바른 방법 — layout: "none" 사용
slide=I("documentId", {type: "frame", name: "Slide 1 - Cover", width: 1280, height: 720, x: 0, y: 0, fill: "#FAFAF9", layout: "none"})

// 배경 이미지 (전체 블리드)
imgFrame=I(slide, {type: "frame", x: 0, y: 0, width: 1280, height: 720})
G(imgFrame, "ai", "minimal abstract light background")

// 텍스트 오버레이 — 좌측 하단
textBlock=I(slide, {type: "frame", x: 80, y: 480, width: 600, layout: "vertical", gap: 12})
title=I(textBlock, {type: "text", content: "TITLE", fontSize: 80, fontWeight: "800", color: "#1A1A1A"})
sub=I(textBlock, {type: "text", content: "부제목", fontSize: 28, fontWeight: "400", color: "#6B7280"})

// ❌ 잘못된 방법 — layout: "vertical"이면 x/y 무시됨
// slide=I("documentId", {type: "frame", ..., layout: "vertical"})
```

### 적용 대상 레이아웃

| 레이아웃 | 슬라이드 프레임 layout |
|---------|-------------------|
| layout-01 Cover (중앙 오버레이) | `"none"` |
| layout-02 Bold Cover (좌측 텍스트 블록) | `"none"` |
| layout-14 Hero Image (전체 블리드) | `"none"` |
| layout-05/06 Concept+Visual (이미지 분할) | `"none"` |
| layout-18 Before/After (배경 분할) | `"none"` |
| 배경 색상 블록 + 텍스트 오버레이가 있는 모든 슬라이드 | `"none"` |

### 예외: auto-layout 슬라이드

배경이 단색이고 내부를 세로/가로로 쌓기만 하는 슬라이드(3 Pillars, List, Process 등)는 `layout: "vertical"` 유지 가능.

---

## 폰트 기준

- 폰트는 활성 테마 폰트(`src/index.css`의 `--font-sans` 첫 패밀리; 현재 jangpm = Arial) 기준으로 사용한다
- 커스텀 웹폰트 의존은 피한다

## 주의사항

- batch_design 1회 호출에 최대 25개 연산. 초과 시 여러 번 호출
- 변수 할당(slide=, card1= 등)은 같은 batch_design 호출 내에서만 참조 가능
- G() 연산은 batch_design 내에서 실행. 별도 호출 아님
- find_empty_space_on_canvas로 반드시 빈 공간 확보 후 슬라이드 배치
- 모든 슬라이드 프레임은 width: 1280, height: 720 고정
- 콘텐츠는 프레임 가장자리에서 56px 이상 여백 (padding: 56~80)
- set_variables로 등록한 변수는 속성 값에서 var(--변수명)으로 참조
