# PPTX 빌드 룰 (single source of truth)

이 문서는 React 슬라이드 컴포넌트를 PowerPoint(.pptx) 파일로 변환할 때의 모든 디테일 규칙을 담는다. `slide` 스킬의 Step 6(PPTX 자동 변환)과 `export-pptx` 단독 호출이 모두 이 문서를 참조한다.

> **테마 비의존 주의:** 이 문서의 예시 폰트(Arial)·색(#4633E3 / #E8E5FC 등)은 **현재 활성 테마(jangpm)** 기준이다. 실제 값은 `src/index.css`의 `--font-sans`(폰트)와 테마 토큰(`--accent` / `--accent-soft` / `--text` 등, 색)에서 해석한다 — 매니페스트의 `fontFamily` / `fonts` · 색은 활성 테마의 `src/index.css`에서 읽어 채운다(Arial·jangpm hex 하드코드 금지). `/theme-init`으로 테마를 바꾸면 이 값들도 함께 바뀐다.

스크립트 위치: `.claude/skills/slide/scripts/`
- `convert.js` — manifest → PPTX 변환 (pptxgenjs)
- `check-manifest.js` — 매니페스트 5/5 검증
- `rasterize-svg-images.mjs` — SVG → PNG data URI 래스터화

## 사전 조건

- `src/slides/Slide01.tsx` ~ `SlideN.tsx` 파일이 존재할 것
- `src/index.css`에 디자인 토큰(CSS 변수)이 정의되어 있을 것
- `pptxgenjs` 패키지가 설치되어 있을 것 (`npm install` 완료)

## 워크플로우

### Step 1: 슬라이드 소스 분석

1. `src/slides/` 디렉토리의 모든 `Slide*.tsx` 파일을 읽는다
2. `src/index.css`에서 CSS 변수(색상, 폰트)를 읽는다
3. 각 슬라이드의 구조를 파악한다:
   - Flexbox 레이아웃 방향 (`flex-col` / `flex-row`), `gap`, `padding`
   - 텍스트 요소: 내용, `fontSize`, `fontWeight`, `fontFamily`, `color`
   - 카드/프레임: `fill` (bg-[#HEX]), `cornerRadius` (rounded-[Npx]), padding
   - 이미지/SVG: 인라인 SVG 마크업 또는 이미지 URL
   - 태그/뱃지: 배경색, 텍스트, pill 형태 (rounded-full)
   - 정렬: `items-center`, `justify-center` 등 Tailwind 클래스

**데이터 확장 HARD RULE (최우선)** ⚠️: TSX의 `.map()`/`.forEach()`는 **반복되는 JSX를 실제 데이터로 확장한 N개의 요소**이다. 매니페스트에는 TSX 템플릿 리터럴(`{c.vendor}`, `{stage.timeframe}`, `{s.label}`, `{String(i+1).padStart(2,'0')}` 등)을 **그대로 문자열로 저장하면 안 된다**. 반드시:

1. 컴포넌트 내부에서 선언된 상수 배열(예: `const CARDS = [...]`, `const STAGES = [...]`)의 **실제 값**을 읽는다
2. `.map(c => ...)`의 콜백 안에서 사용된 템플릿 표현식을 배열의 각 원소 값으로 치환해 N개의 실제 매니페스트 요소를 생성한다
3. 템플릿 리터럴/삼항/함수 호출(`String(i+1).padStart(2,'0')`)은 빌드 시 평가된 문자열로 대체한다 (예: `'01'`, `'02'`, `'03'`)
4. 조건부 클래스(`accent ? 'bg-[var(--accent-soft)]' : 'bg-[var(--surface)]'`) → 각 원소의 실제 분기 결과로 `fill` 값 결정
5. **매니페스트 저장 직전 검증**: 모든 text 요소의 `content`에 `{`, `}`, `$`, `()` 같은 JS 문법 문자가 남아있으면 FAIL → 데이터 확장 미수행으로 판정하고 즉시 재작성

예시 (Slide05 CARDS 5개 확장):
```
// TSX: CARDS.map((c) => (<div>{c.vendor}</div>, <div>{c.title}</div>, <p>{c.body}</p>))
// 매니페스트: 5개 × (vendor/title/body) = 15개 text 요소, 각 content에 실제 문자열
{"type": "text", "content": "OpenAI", ...}, {"type": "text", "content": "Codex", ...}, {"type": "text", "content": "비개발자 대상 바이브 코딩 커리큘럼 적합...", ...}, ...
```

### Step 1.5: Layout Intent Pre-flight (HARD RULE 최우선) ⚠️

매니페스트 생성 **전**에, 각 슬라이드의 레이아웃 의도를 한 줄로 선언한다. TSX의 `// pattern="..."` 주석 + JSX 구조에서 추출. 이후 매니페스트는 이 의도와 일치해야 한다.

**선언 타입(하나 선택)**:
- **title**: 좌측 텍스트 블록(x≈100) + 우측 원형/비주얼(x≈700~900) — 2개 x bucket 필수
- **key-statement**: 중앙 헤드라인 + 하이라이트 pill + 좌측 accent bar + 본문 — pill/divider가 최소 2개 x 값 생성
- **section**: 중앙 eyebrow + 두 색상 분할 헤드라인 — align:center, 최소 2개 색상
- **C-column (C=3|4|5)**: C개 카드, `x = container_x + c*(cell_w+gap_x)` — 컬럼마다 다른 x 값
- **2x2-grid**: 4개 카드 2행 2열, x/y 각 2개 유일값
- **dual-column**: 좌측 텍스트 + 우측 패널(표/카드) — 2개 큰 x bucket
- **closing**: dual-column의 특수형 (badge + 좌 타이틀 + 우 스택 테이블)

**검증**: 매니페스트 저장 직전, 선언한 의도와 요소 배치 일치 확인. 불일치(예: C-column인데 unique x가 1개) → 즉시 재작성. Step 2.5.0 Layout-Collapse Detector와 쌍으로 작동한다.

### Step 2: 매니페스트 생성

매니페스트 스키마는 `manifest-schema.md`(같은 references 폴더)를 참조한다.

**핸드크래프트 강제 (HARD RULE — 최우선)** ⚠️: 매니페스트는 반드시 슬라이드별로 직접 JSON elements 배열을 작성한다. 다음은 **금지**:

- `.mjs`/`.js`/`.ts` 빌더 스크립트로 N개 슬라이드를 일괄 생성하는 행위 (예: `build-manifest.mjs`로 `tools.map(...)` 식의 프로그래매틱 확장)
- `for` 루프 / `Array.from` / `.map()` 으로 동일 컴포넌트가 반복되는 카탈로그형 덱의 매니페스트 elements를 자동 생성하는 코드
- TSX의 데이터 배열을 읽어 코드로 매니페스트 객체를 찍어내는 모든 형태의 빌더

**올바른 방법**: 9장이든 15장이든 한 슬라이드씩 Step 1.5(Layout Intent 선언) → Step 2(elements 배열을 손으로 JSON에 적기) → 다음 슬라이드, 순서로 반복. 같은 컴포넌트가 반복되는 덱이라도 슬라이드마다 텍스트 길이·줄 수·카드 높이가 달라 LLM이 슬라이드 단위로 직접 결정해야 Layout-Collapse Detector와 텍스트 오버플로우를 잡아낼 수 있다.

**Why**: 빌더 스크립트는 데이터 매핑은 빠르지만 슬라이드별 미세 조정(각 카드의 본문 줄 수에 따른 h 계산, pill 폭 산정, KPI/본문 간격 등)을 빠뜨려 일괄 결함을 만든다. 핸드크래프트보다 토큰·시간이 적게 들지만 시각 퀄리티가 떨어진다 — 사용자는 명시적으로 퀄리티 > 시간/토큰을 선택했다.

**검증**: 매니페스트 작업 중간에 빌더 `.mjs`/`.js` 스크립트가 출력 폴더에 생성됐다면 즉시 삭제하고 슬라이드별 직접 작성으로 전환한다.

---

**필드 이름 HARD RULE (최우선)** ⚠️: text 요소는 반드시 `"content"` 키로 문자열을 담는다 (`"text"`, `"value"`, `"label"`, `"body"` 금지). convert.js는 `el.content`만 읽으므로 다른 키로 저장하면 해당 요소가 전부 무시되어 PPTX가 빈 슬라이드로 출력된다. image 요소는 `"src"` (data URI 필수). rect/ellipse는 `"fill"`. 색은 `"color"` / `"fill"` / `"stroke"`. **매니페스트 파일 저장 직전, 모든 `type==="text"` 요소가 `"content"` 필드를 갖는지 자가 검증하고, 없으면 즉시 `text`/`value`/`label` 등을 `content`로 리네임한 뒤 저장한다.**

```json
{"type": "text", "content": "본문", "x": 100, "y": 100, "w": 800, "h": 60, "fontSize": 28, "fontWeight": "400", "fontFamily": "Arial", "color": "#111111", "align": "left", "valign": "top"}
```

**인라인 강조 (`runs` 배열) HARD RULE** ⚠️: HTML 원본에 `<span style="color:var(--accent)">` 또는 `<strong>`/`<b>` 같은 인라인 강조가 있으면 단일 `content` 대신 `runs` 배열로 변환한다. pptxgenjs는 runs로 각 구간에 개별 color/bold/italic/fontSize를 적용할 수 있고, `content` 문자열 하나로는 이런 강조가 전부 사라진다.

```json
{"type": "text", "x": 56, "y": 92, "w": 1100, "h": 44, "fontSize": 34, "fontWeight": "700", "fontFamily": "Arial", "color": "#111111", "align": "left", "valign": "top",
 "runs": [
   {"text": "에이전트는 "},
   {"text": "세 역할", "color": "#4633E3"},
   {"text": "로 쪼개 설계합니다."}
 ]}
```

Run 속성: `text`(필수), `color`, `bold`, `italic`, `underline`, `fontSize`, `fontFamily`, `breakLine`(multi-line 타이틀에서 `\n` 대신 사용). 외곽 `color`/`fontWeight`/`fontSize`는 runs 미지정 구간의 기본값. **runs를 쓸 땐 `content` 필드를 넣지 않는다** (두 개 동시 정의 금지).

**KPI sup 패턴**: "24개", "87%" 같이 숫자+단위가 붙은 KPI는 runs로 단위를 55% 크기로 축소한다: `[{text:"24"}, {text:"개", fontSize: baseFs*0.55}]`.

**핵심 변환 규칙:**

1. **레이아웃 평탄화**: Flexbox → 절대 좌표 계산
   - 슬라이드 크기: 1280×720px
   - padding, gap, flex 방향에 따라 각 자식 요소의 (x, y, w, h) 계산
   - `flex-1` → 남은 공간을 균등 분배
   - `items-center` / `justify-center` → 중앙 정렬 좌표 계산

   **Multi-row 그리드 변환 (HARD RULE)** ⚠️:
   HTML에서 `flex-col > flex-row + flex-row` 패턴은 **다행(multi-row) 그리드**이다. 반드시 원본의 행/열 구조를 보존한다.

   변환 공식 (2×2 그리드 예시):
   ```
   컨테이너: x=80, y=headerH, w=1120, h=availableH
   gap_x=24, gap_y=24
   cell_w = (1120 - 24) / 2 = 548
   cell_h = (availableH - 24) / 2

   [0,0] → x=100,           y=headerH
   [0,1] → x=100+848+24,    y=headerH
   [1,0] → x=100,           y=headerH+cell_h+24
   [1,1] → x=100+848+24,    y=headerH+cell_h+24
   ```

   일반화: R행×C열 그리드일 때:
   - `cell_w = (container_w - gap_x*(C-1)) / C`
   - `cell_h = (container_h - gap_y*(R-1)) / R`
   - `cell[r][c].x = container_x + c*(cell_w + gap_x)`
   - `cell[r][c].y = container_y + r*(cell_h + gap_y)`

   **절대 금지**: multi-row를 single-row로 변환하거나 레이아웃 구조를 변경하지 않는다. HTML이 2×2이면 PPTX도 2×2여야 한다.

2. **z-order**: 배경 요소(rect) 먼저, 전경 요소(text) 나중에 배치

3. **SVG 처리 (HARD RULE)** ⚠️: 인라인 JSX `<svg>` 요소를 **용도별로 분기**하여 처리한다.

   **3-A. 차트 / 다이어그램 SVG → 반드시 image 요소로 변환 (HARD RULE)** ⚠️

   다음 SVG는 **반드시** `type: "image"`로 base64 변환해 매니페스트에 포함한다:
   - 라인 차트 / 막대 차트 / 영역 차트 (path/polyline/line으로 그린 데이터 시각화)
   - Forecast / trend / KPI 시계열 (`viewBox` 폭 ≥ 400 정도 큰 SVG)
   - 다이어그램 / 매트릭스 (multiple `<path>` + 텍스트 라벨이 같이 있는 SVG)

   **이유**: pptx-build.md는 `text / rect / ellipse / image`만 지원하며 `line / path` element가 없다. SVG의 path를 매니페스트로 옮길 표현 수단이 없어 점만 변환하면 line이 통째로 사라진다(과거 사고 사례: 차트 데크 Slide 4·8 — 차트 line 누락).

   **변환 절차**: 차트 SVG markup 전체(축 라벨·legend·dot·path 포함)를 하나의 SVG 문자열로 직렬화 → base64 → matrix image element 1개로 등록한다. 차트 영역의 카드 rect 내부 좌표(헤더 영역 제외)를 image의 x/y/w/h로 사용.

   ```json
   {"type": "image", "x": 100, "y": 280, "w": 1080, "h": 170,
    "src": "data:image/svg+xml;base64,..."}
   ```

   직렬화 시 JSX→HTML 속성 변환 필수: `strokeWidth` → `stroke-width`, `strokeLinecap` → `stroke-linecap`, `strokeDasharray` → `stroke-dasharray`, `viewBox` 유지, `xmlns="http://www.w3.org/2000/svg"` 첨가.

   **이후 Step 2.7 SVG 래스터화에서 PNG로 자동 변환되어 LibreOffice 회색 렌더 버그를 회피한다.**

   **3-B. 아이콘 SVG → image 요소로 변환** (기존 룰 유지)

   탐지 패턴: TSX에서 다음 패턴이 있으면 아이콘 SVG가 존재한다:
   - `icon: (<svg ...>` 또는 `icon: <svg ...>` (카드 배열의 icon 프로퍼티)
   - 컴포넌트 내부의 `{item.icon}` 렌더링
   - JSX에서 직접 `<svg width="N" height="N">` (N ≤ 80, 정사각) 사용 — Lucide 등 small icon

   변환 절차: 위 3-A와 동일. SVG width/height를 image w/h로 사용.

   **3-C. Cover / Closing 우측 장식 도형 SVG → 매니페스트에 포함하지 않는다 (HARD RULE)** ⚠️

   슬라이드의 첫 장(cover, pattern: `01-title`)과 마지막 장(closing, pattern: `12-closing` / `21-closing-big`)의 **우측 시각 영역**에 React가 그린 도형(동심원 ellipse, 코너마크 path, 데코 rect, brand emblem)은 PPTX 매니페스트에 **omit**한다.

   **이유**:
   - React inline SVG의 `<path stroke="currentColor">` 코너 마크는 LibreOffice EMF 변환에서 stroke 색이 누락돼 회색으로 렌더되거나 사라지는 경우가 잦다(누적 사고: Slide 1·10 코너 마크 누락).
   - Cover/Closing 장식은 의미 정보가 없는 시각 부속물 — PPTX에서 누락되어도 메시지 손실이 없다.
   - PPTX는 인쇄·편집·배포가 주된 용도 — HTML 같은 풍부한 데코보다 텍스트 명료성 우선.

   **omit 대상 (HARD RULE):**
   - cover slide의 우측(x ≥ 700) 영역의 모든 ellipse(동심원), 데코용 rect(rounded square frame), 코너 마크 path
   - closing slide의 우측(x ≥ 700) 영역의 모든 ellipse, 데코용 rect, brand emblem
   - 위 영역에 들어가는 로고 텍스트(예: 회사명, 슬로건)도 함께 omit (단독으로 두면 의미 없음)

   **유지 대상**:
   - cover/closing의 좌측 텍스트 블록 (pill, 타이틀, 본문, 메타) — 100% 유지
   - 슬라이드 footer 메타 (좌하단 라벨 + 우하단 페이지 번호)
   - 좌측 accent rule line (작은 가로선)

   **레이아웃 보정**: cover/closing 좌측 텍스트 블록의 `w`를 우측 장식 폭만큼 확장해 빈 공간을 줄인다. 예) 좌측 콘텐츠 w=600 → w=900~1100 으로 확장.

   ```json
   // ❌ 금지: cover 우측 장식 ellipse 포함
   {"type": "ellipse", "x": 870, "y": 220, "w": 280, "h": 280, "fill": "#FFFFFF"}

   // ✅ 올바름: cover 우측 영역을 비우고 좌측 텍스트만 유지
   ```

   **검증**: cover/closing 슬라이드의 매니페스트에서 `x ≥ 700` 영역에 `ellipse` 또는 `rect(decorative)` 가 등장하면 즉시 제거. (footer 페이지 번호 text는 예외.)

4. **텍스트 줄바꿈 (HARD RULE)** ⚠️: HTML/JSX의 줄바꿈은 매니페스트에서 **runs의 `breakLine: true`로 변환**한다.

   - JSX `<br />` 또는 `{'\n'}` → 직전 run에 `breakLine: true` 추가
   - 단일 `content` 문자열의 `\n`은 **fontSize ≥ 60 타이틀에서만** 허용. 본문(fontSize ≤ 48)은 자동 wrap에 맡긴다 (R6 룰)
   - JSX 멀티라인 타이틀 예시:
     ```jsx
     // TSX
     <h1>대주전자재료<br/><span style={{color:'var(--accent)'}}>미래를 선도하는</span> 전자재료</h1>
     ```
     ```json
     // 매니페스트 — breakLine 필수
     "runs": [
       { "text": "대주전자재료", "breakLine": true },
       { "text": "미래를 선도하는", "color": "#4633E3" },
       { "text": " 전자재료" }
     ]
     ```
   - **검증**: 슬라이드 TSX의 `<br` count == 매니페스트 해당 슬라이드의 `breakLine: true` count. 불일치 시 누락된 run에 추가.

5. **텍스트 내용 보존 (HARD RULE)** ⚠️: HTML 원본의 텍스트를 **그대로 복사**한다. 숫자, 통화 기호, 단위를 절대 변경/생략하지 않는다.
   - 예: `$876B` → 매니페스트에 `"$876B"` (숫자 생략 금지, 통화 기호 생략 금지)
   - KPI 숫자: `340%`, `89%`, `4.7x` 등 → HTML에서 보이는 그대로 매니페스트에 기록
   - 줄임/요약 금지: 본문 텍스트를 임의로 줄이거나 재작성하지 않는다

6. **CSS 변수 해석**: Tailwind `font-display` → `@theme --font-display` → 실제 폰트명

7. **이미지 data URI 필수 삽입** ⚠️: 매니페스트의 image 요소 `src`에는 반드시 base64 data URI를 넣어야 한다. 빈 문자열(`""`)이나 상대 경로는 PptxGenJS에서 에러 발생.
   - `src/images/` 디렉토리의 PNG 파일을 읽어서 base64로 변환:
     ```bash
     base64 -i src/images/{nodeId}.png
     ```
   - 매니페스트에 삽입: `"src": "data:image/png;base64,{base64문자열}"`
   - 이미지가 없는 슬라이드는 image 요소를 아예 생략 (빈 src 금지)
   - Unsplash 등 외부 URL도 사용 가능하지만, 오프라인 환경에서 깨짐

8. **색상 포맷: 6자리 RGB만 사용** ⚠️: PptxGenJS는 8자리 RGBA hex(`#FFFFFF99`)를 지원하지 않는다. 반드시 6자리 RGB로 변환.
   - `#FFFFFF99` (white 60%) → `color: "#999999"` (회색으로 근사) 또는 `color: "#FFFFFF"` + `opacity: 0.6`을 별도 표현
   - `#FFFFFF26` (white 15%) → 해당 요소를 제거하거나 `"#3A3A3A"` 등 배경과 블렌딩된 불투명 색상으로 대체
   - Tailwind `text-white/60`, `bg-white/15` 같은 투명도 클래스 → 매니페스트에서 불투명 6자리 hex로 변환
   - **검증**: 매니페스트의 모든 `color`, `fill` 값이 `#RRGGBB` 6자리인지 확인. 8자리가 있으면 즉시 수정

매니페스트를 `output/{제목}/{제목}-manifest.json`에 저장한다 (한 덱의 모든 산출물 — manifest, html, pptx, src 스냅샷 — 을 같은 폴더에 둔다).

### Step 2.5: 매니페스트 자동 검증-수정 루프 (R2+R5+H5 강화)

매니페스트 생성 후, **자동 검증 스크립트**를 실행하고 FAIL 항목을 자동 수정한다.

**2.5.0 — Layout-Collapse Detector (HARD RULE — 최우선)** ⚠️:

매니페스트 저장 직전, 각 슬라이드를 자가 검사하여 **flat-stack 붕괴 패턴**을 탐지한다. TSX가 `flex-row` + `.map()` (다열 그리드)인데 매니페스트가 전부 x=100에 수직 스택으로 쌓였으면 **레이아웃이 무너진 상태** → 즉시 재작성 필수.

**탐지 공식 (슬라이드별 자가 수행):**
1. 슬라이드의 모든 `type==="text"` 요소를 모은다.
2. `unique_x_count` = 서로 다른 x 값 개수 (오차 ±5px은 같은 x로 간주)
3. `stacked_count` = x ∈ [95, 105]에 있는 text 요소 개수
4. `monotonic_stack_pairs` = 같은 x를 가진 인접 text 쌍 중 y 델타가 60~100px 범위인 개수
5. `card_rect_count` = 같은 슬라이드의 `type==="rect"` 요소 중 `w >= 200 && h >= 140` 개수

**flat-stack FAIL 조건 (아래 중 하나라도 해당):**
- `unique_x_count <= 2` AND `stacked_count >= 6`
- `monotonic_stack_pairs >= 5` AND 해당 슬라이드 TSX에 `flex-row` + (`.map(` 또는 `grid-cols-`) 존재
- 해당 TSX에 `grid-cols-3|grid-cols-4|grid-cols-5` 또는 `flex flex-row` + N개 카드 배열이 있는데 `card_rect_count < 2`

**FAIL 시 재작성 (HARD RULE — 슬라이드 전체 교체):**
- 해당 슬라이드 전체를 Step 1의 데이터 확장 HARD RULE + Step 2의 Multi-row 그리드 공식으로 **처음부터 다시 생성**한다
- 재작성 시 반드시 포함: N개 카드 rect (fill, cornerRadius, 동일 y, 동일 h) + 각 카드 내부 text (x가 카드별로 다름) + 배지/아이콘 + 행 레벨 섹션 헤더 + 푸터
- x 좌표 공식: `card[r][c].x = container_x + c*(cell_w + gap_x)` — 카드 컬럼마다 x가 달라야 한다
- 재작성 후 다시 2.5.0 탐지 실행 → PASS 확인 (최대 2회 반복)

**flat-stack 허용 예외 (검사 통과 간주):**
- TSX pattern이 `title`, `key-statement`, `section`, `closing` 중 하나이며 단일 컬럼 중앙 배치를 의도한 경우 (`items-center justify-center` + 단일 컬럼) — 이 경우에도 최소 2개 이상의 x 값(또는 중앙 정렬 x값 + 우측 시각 요소)이 존재해야 한다
- Slide01 (title 패턴): 좌측 텍스트 블록(x≈100) + 우측 원형 시각 요소(x≈780) 필수
- Slide10 (closing 패턴): 좌측 텍스트 + 우측 카테고리 스택 테이블 (rect + N개 row text) 필수

**검증**: 이 검사를 통과하지 못한 매니페스트는 Step 3으로 진행 금지.

**2.5.1 — 스크립트 검증 실행:**
```bash
node .claude/skills/slide/scripts/check-manifest.js "output/{제목}/{제목}-manifest.json"
```
- 5개 assertion (valid, slideCount, hexColors, fontFamily, bounds)을 검사
- 5/5 PASS → Step 3으로 진행
- FAIL 있으면 → 2.5.2 자동 수정

**2.5.2 — FAIL 항목별 자동 수정 규칙:**

**스크립트 검증 항목 (check-manifest.js):**

| FAIL ID | 수정 방법 |
|---------|----------|
| **valid** | slides 배열이 비었거나 없음 → 매니페스트 재생성 |
| **slideCount** | 슬라이드 수 불일치 → 누락된 슬라이드 추가 또는 초과분 제거 |
| **hexColors** | 8자리 RGBA → 6자리 RGB로 변환 (투명도 제거 또는 배경과 블렌딩) |
| **fontFamily** | 해당 text 요소의 `fontFamily`를 활성 테마 폰트(`manifest.fonts[0]`)로 교체 |
| **bounds** | 요소가 1280×720 영역 밖 → x/y/w/h 조정 |

**수동 검증 항목 (스크립트 미커버):**

| 항목 | 수정 방법 |
|------|----------|
| TextBoundingBox | text h가 부족하면 본 문서 h 계산 공식으로 재계산 |
| CardOverlap | 같은 카드(rect) 안의 text 요소를 y 순서대로 다시 배치 |
| CardBounds | 카드 하단을 넘은 text를 같은 카드 내부에서 위로 재배치하고, 마지막 요소의 `h`를 카드 안으로 축소 |
| CornerRadius | w===h + cornerRadius 999 → `type`을 `"ellipse"`로 변경, cornerRadius 제거 |
| ImageSrc | 빈/잘못된 src → `src/images/`에서 base64로 재생성, 없으면 요소 제거 |
| ElementDensity | 부족한 슬라이드에 보조 텍스트/도형 추가 |

**2.5.3 — 수정 방식: 카드 스코프 우선, 필요 시 슬라이드 단위 재작성 (HARD RULE)** ⚠️:

FAIL이 발생한 슬라이드는 먼저 **같은 카드(rect) 내부에서만 수정**하고, 카드 스코프로 해결되지 않을 때만 해당 슬라이드 전체를 재작성한다.

- **splice/delete 금지**: `elements.splice()`로 요소를 제거하면 배열 인덱스가 밀려 다른 카드의 제목/본문/배지가 누락되거나 엉뚱한 위치로 이동한다. 이 버그는 check-manifest가 감지하지 못하므로 PPTX에서만 발견된다.
- **인덱스 기반 패치 금지**: `elements[N].y = ...` 식으로 인덱스로 접근하여 개별 속성을 수정하면, 이전 splice나 다른 수정으로 인덱스가 어긋났을 때 엉뚱한 요소를 수정하게 된다.
- **올바른 수정 방법**:
  - 해당 text가 들어 있는 카드(rect)를 찾는다.
  - 그 카드 안의 text 요소만 모아 `y` 순으로 다시 배치한다.
  - 그래도 카드 경계를 넘으면 본문 길이 또는 `h`를 줄인다.
  - 카드 스코프로 해결되지 않을 때만 `m.slides[N] = { background: "...", elements: [...] }` 로 슬라이드 전체를 교체한다.
- 슬라이드 재작성 시 모든 요소(카드 rect, 아이콘 ellipse, 제목 text, 본문 text, 배지 rect+text)를 빠짐없이 포함한다.

**2.5.4 — 수정 후 재검증 (최대 3회 반복):**
1. 매니페스트 JSON을 수정하여 파일에 다시 저장
2. check-manifest.js 재실행
3. 5/5 PASS → Step 3 진행
4. 3회 반복 후에도 FAIL → 실패 항목을 사용자에게 보고하고 수동 수정 요청

> **HARD RULE**: 5/5 통과하기 전에는 절대 Step 3(PPTX 변환)으로 진행하지 않는다.

### Step 2.7: SVG 래스터화 (HARD RULE)

검증된 매니페스트의 인라인 SVG `image` 요소를 PNG data URI로 변환한다.

**이유**: PowerPoint와 LibreOffice가 PPTX 내부 SVG를 EMF 벡터로 변환할 때 `stroke` 색 정보를 종종 누락(회색 렌더)한다. accent 색 아이콘이 통째로 회색으로 나오는 문제는 항상 이 경로에서 발생하므로 비트맵으로 pre-bake한다.

실행:

```bash
node .claude/skills/slide/scripts/rasterize-svg-images.mjs output/{제목}/{제목}-manifest.json
```

- 4x devicePixelRatio로 캡처하여 scale-up 시에도 선명
- 투명 배경 유지 (omitBackground: true)
- data URI(`data:image/svg+xml;base64,...`)만 대상이며 외부 URL이나 기존 PNG는 건너뜀
- 결과는 매니페스트를 in-place 갱신
- 이 단계 이후 매니페스트의 모든 `image` 요소는 PNG data URI여야 한다

**HARD RULE**: 매니페스트에 SVG image 요소가 하나라도 있으면 Step 3(PPTX 변환) 전에 반드시 이 스크립트를 실행한다. 이 단계를 생략하면 accent 색 아이콘 회색 버그가 재발한다.

---

### Step 3: PPTX 변환

**파일명 규칙 (HARD RULE)** ⚠️: PPTX는 반드시 덱의 슬러그(`{제목}`)를 따른다. `output.pptx` 같은 제너릭 이름 금지.

매니페스트를 `output/{제목}/{제목}-manifest.json`으로 저장했다면 output 경로를 **생략**해도 convert.js가 자동으로 같은 디렉토리에 `output/{제목}/{제목}.pptx`로 저장한다 (manifest와 동일 폴더, 동일 슬러그):

```bash
# 권장: output 경로 생략 → 자동 유도 (foo-manifest.json → foo.pptx)
node .claude/skills/slide/scripts/convert.js "output/{제목}/{제목}-manifest.json"

# 명시적 지정도 가능 (2번째 인자)
node .claude/skills/slide/scripts/convert.js "output/{제목}/{제목}-manifest.json" "output/{제목}/{제목}.pptx"
```

### Step 4: 검증 + 리포트

1. 변환 스크립트의 콘솔 출력에서 warning 확인
2. PPTX 파일을 열어 확인:
   ```bash
   open "output/{제목}/{제목}.pptx"
   ```
3. 사용자에게 변환 결과 리포트 제공:
   - 슬라이드 수
   - 사용된 폰트 (시스템에 설치 필요 여부 안내)
   - 변환 warning 목록 (있는 경우)
   - 자동 단순화 항목 (있는 경우)

## R2 필수 규칙 (Round 1 피드백 반영)

### 폰트: 활성 테마 폰트 고정

- **모든 텍스트 요소**에 활성 테마 폰트를 사용한다 — `src/index.css`의 `--font-sans` 첫 패밀리(현재 테마 jangpm = Arial). 그 이름을 `manifest.fonts`에 선언한다
- HTML 원본이 다른 웹폰트를 쓰더라도 manifest에서는 활성 테마 폰트로 교체
- fontWeight로 계층 구분: 제목 800, 소제목 700, 본문 400~500

### 모서리 둥글기: 충실히 반영

- HTML의 `rounded-*` Tailwind 클래스를 cornerRadius 값으로 정확히 매핑
- `cornerRadius > 0` → convert.js가 자동으로 ROUNDED_RECTANGLE shape 사용
- 원형 요소(w===h, rounded-full) → `ellipse` type 사용
- **원형 도형 비율 보존 (HARD RULE)** ⚠️: `ellipse`는 반드시 `w === h`여야 한다 (정원). HTML에서 `rounded-full` + 같은 w/h인 요소를 변환할 때 w와 h를 동일하게 유지. 예: 48×48 원 → ellipse w=48 h=48. w≠h이면 타원이 되어 시각적으로 틀어짐

### 콘텐츠 밀도: 꽉 찬 느낌

- 카드 본문: 최소 2~3줄 설명 텍스트 (키워드만 X)
- 불릿 포인트: 항목당 1~2줄 설명 포함
- 빈 공간은 보조 텍스트, 이모지, 장식 요소로 채울 것
- KPI/숫자 슬라이드: 숫자 + 단위 + 설명 문장 + 출처 등 보조 정보 추가

### 중앙 정렬 정확성 (HARD RULE) ⚠️

요소의 중앙 정렬이 틀어지면 PPTX가 아마추어처럼 보인다. 다음 규칙을 반드시 준수:

**1. Pill/Tag 텍스트 정렬:**
- pill rect 위에 오버레이하는 text는 **rect와 동일한 x, y, w, h**를 사용
- `align: "center"`, `valign: "middle"` 설정
- **잘못된 예**: rect(x=100,w=200) + text(x=120,w=160) → 텍스트가 pill 중심에서 벗어남
- **올바른 예**: rect(x=100,w=200) + text(x=100,w=200) → 완벽 중앙

**2. Ellipse(원) 안 텍스트 정렬:**
- ellipse와 동일한 x, y, w, h 사용
- `align: "center"`, `valign: "middle"` 설정

**NumberBadge 두 자리 숫자 오버플로우 방지 (HARD RULE)** ⚠️: "01"~"99" 같이 두 자리 이상 숫자가 원 안에 들어갈 때, text 박스 w를 **원의 w보다 최소 +32px 크게** 잡고 x도 그만큼 왼쪽으로 당겨서 중심을 맞춘다. pptxgenjs는 원의 w가 2자리 숫자의 실제 폭에 타이트하면 LibreOffice 렌더 시 세로 줄바꿈(0 위에 1)을 발생시킨다. 또한 해당 text에 `wrap: false` 명시.

- 공식: `text.w = ellipse.w + 32`, `text.x = ellipse.x - 16`, `text.y = ellipse.y`, `text.h = ellipse.h`, `wrap: false`, `align: "center"`, `valign: "middle"`
- 예: ellipse(x=80, y=262, w=36, h=36) → text(x=64, y=262, w=68, h=36, wrap:false, align:center, valign:middle, content:"01")
- text 박스가 원 바깥으로 8px씩 삐져나오지만 바탕에 가려 보이지 않고, 줄바꿈만 차단된다.

**3. 슬라이드 레벨 중앙 정렬:**
- HTML에서 `items-center` + `justify-center`로 전체가 중앙인 슬라이드:
  - 텍스트 x = `(1280 - w) / 2`로 계산하여 수평 중앙 배치
  - 여러 요소가 세로로 쌓이면 전체 블록의 y도 `(720 - totalH) / 2`

**4. 같은 행 카드 y 정렬:**
- 같은 행의 카드들은 동일한 y값을 사용 (10px 이내 오차)

### 다크 카드 금지 (HARD RULE) ⚠️

콘텐츠 슬라이드(커버/클로징 제외)의 카드(rect)는 반드시 밝은 배경색을 사용한다.
- 카드 fill: `#F4F4F5`, `#FAFAFA`, `#FFFFFF`, `#F0FDF4` 등 밝은 톤만 허용
- `#1E293B`, `#111111` 같은 다크 fill 금지 — 어둡게 보이는 카드는 아마추어 느낌
- 슬라이드 bg가 다크(커버/클로징)여도 카드 자체는 밝은 색 유지
- 악센트 색상 카드는 테마 accent(`var(--accent)`, 현재 #4633E3) 기준으로 1개까지 허용하나, 전체가 다크인 것은 금지
- 테이블 헤더 행(h < 80px)은 다크 허용 (검정 헤더는 시각적 구분에 효과적)

### 불릿-텍스트 y 정렬 (HARD RULE) ⚠️

불릿 도트(ellipse 12×12~16×16)와 옆의 텍스트는 반드시 같은 줄에 정렬한다.
- 불릿 center_y = `bullet.y + bullet.h / 2`
- 텍스트 firstLine center_y = `text.y + fontSize * 0.5`
- 두 값의 차이가 **12px 이내**여야 함
- 공식: `text.y = bullet.y + (bullet.h - fontSize) / 2` → 불릿과 텍스트 첫 줄이 동일 높이
- 예: bullet(y=400, h=12) + text(fontSize=28) → text.y = 400 + (12-28)/2 = 392

### 시각 다양성: 이모지(절제) + 아이콘 + 다양한 도형

- **이모지는 카드/섹션 타이틀에서만 사용** (예: "🎯 목표 설정", "🔥 핵심 전략")
- 본문, 불릿 항목, 서브타이틀, 클로징에는 이모지 금지
- 덱 전체에서 이모지 4~6개 이내로 절제
- 숫자 배지: `ellipse` (원형 도형 위에 텍스트 오버레이)
- 불릿 도트: 작은 `ellipse` (12×12)
- 인라인 SVG 아이콘은 이미지로 삽입 (lucide-react 등에서 추출)
- **체크박스/버지드 체크 패턴 (HARD RULE)** ⚠️: 연한 accent 배경(테마 accent-soft, 현재 #E8E5FC) 위 체크 아이콘은 stroke만으로 대비가 약하다. 체크 아이콘 뒤에 `accent rect 22×22, cornerRadius:4, fill=테마 accent(현재 #4633E3)` 을 겹쳐 배치하고, SVG는 `stroke="#FFFFFF"` 흰 체크로 생성한다. 매니페스트 순서: rect 먼저, image 뒤에 (rect가 배경, image가 전경). image x = rect.x + 3, y = rect.y + 3.

### 텍스트 오버플로우 및 오버랩 방지 (R5 — Fidelity Exp 1-2 반영) ⚠️

**text 요소 valign 분기 규칙 (HARD RULE)** ⚠️:

PptxGenJS 기본 valign은 `"middle"` → 본문 텍스트에서 h가 텍스트보다 크면 중앙으로 밀려 아래 요소와 겹침. 따라서 용도별로 분기:

| 텍스트 유형 | valign | 이유 |
|-----------|--------|------|
| **카드 내 본문/설명** (fontSize ≤ 48, 멀티라인) | `"top"` | 겹침 방지 |
| **제목/부제목** (슬라이드 레벨) | `"top"` | 겹침 방지 |
| **원(ellipse) 안 숫자/글자** (01~06, R, P 등) | `"middle"` | 원 안에서 수직 중앙 정렬 필수 |
| **pill/tag rect 안 라벨** (fontSize ≤ 28, 단일 라인) | `"middle"` | 태그 안에서 수직 중앙 정렬 필수 |
| **KPI 숫자** (fontSize ≥ 56, 단일 값) | `"top"` | 겹침 방지 |

- **원 안 숫자**: ellipse와 text를 같은 좌표에 배치 + `align: "center"` + `valign: "middle"` → 원 안 정중앙
- **pill/tag 안 텍스트**: rect 위에 text를 같은 좌표에 배치 + `align: "center"` + `valign: "middle"` → 태그 안 정중앙
- 그 외 모든 text → `valign: "top"` (기본값, 생략 금지)

**w(폭) 계산 — 텍스트가 박스를 넘어가지 않도록:**
- 영문 텍스트: `w >= charCount × fontSize × 0.55`
- 한국어 텍스트: `w >= charCount × fontSize × 0.95`
- 혼합 텍스트: 한국어 글자 수 × 0.95 + 영문 글자 수 × 0.55
- **카드 내부 텍스트 w**: `카드_w - (카드_padding × 2)` 를 초과하면 안 됨
- **pill 태그 w**: `charCount × fontSize × 0.7 + 40` (래핑 방지 여유)
- KPI 라벨(한국어 5~7자): `w >= 220` (28px 기준)

**h(높이) 계산 — 폰트 크기별 분리 (HARD RULE)** ⚠️:
- 단일 라인: `h = fontSize × 1.5`
- 멀티라인 줄 수 계산: `N = max(명시적 줄 수, 예상 wrapping 줄 수)`
- 예상 wrapping 줄 수는 가중 문자 폭으로 계산:
  - 한국어 `charCount × 0.95`
  - 영문 `charCount × 0.55`
  - 숫자 `charCount × 0.60`
  - 공백 `charCount × 0.30`
  - 기타 문자 `charCount × 0.65`
  - `estimatedWrappedLines = ceil((가중 문자 폭 합 × fontSize) / w)`
- **디스플레이 폰트 (fontSize > 60px)**: `h = fontSize × lineSpacing × N × 1.15 × (korean ? 1.1 : 1.0)`
- **본문 폰트 (fontSize ≤ 60px)**: `h = fontSize × lineSpacing × N × 1.2 × (korean ? 1.1 : 1.0)`
- **lineSpacing 기본값**: 명시되지 않은 경우 `1.5` 사용
- **h 최솟값 강제 (HARD RULE)** ⚠️: estimatedWrappedLines > 2인 모든 텍스트 요소는 `h >= estimatedWrappedLines × fontSize × 1.5`를 만족해야 한다.
- 카드 내부 desc h는 실제 문자 수 기반으로 계산한다. 고정값(88px 등) 금지. 같은 행 카드는 가장 큰 required_card_h로 통일한다.

**후속 요소 y 재조정 (HARD RULE)** ⚠️:
- text의 h를 늘리면, 반드시 **같은 카드(rect) 안에서 그 아래 요소의 y만 같이 내림**
- 공식: `nextElement.y = prevText.y + prevText.h + gap(16~32px)`
- 다른 카드, 다른 컬럼, 슬라이드 하단의 무관한 요소는 함께 밀지 않는다
- h만 늘리고 y를 안 내리면 겹침 발생 — 가장 흔한 실수

**밀집 영역 겹침 방지 (HARD RULE)** ⚠️:

카드 내부에 세로로 쌓이는 요소가 많을 때, **조정 우선, 제거는 최후 수단:**

1. 카드 안에 배치할 요소의 총 높이를 먼저 계산: `totalH = Σ(각 요소 h + 간격 12px)`
2. `totalH > 카드_h - 상단여백 - 하단여백` 이면 → **순서대로 시도:**
   - ① 본문 텍스트 fontSize를 2px 줄이기 (28→26, 32→30)
   - ② 요소 간 간격을 12→8px로 축소
   - ③ 본문 텍스트를 1줄 줄이기 (문장 축약)
   - ④ ①~③으로도 안 되면 마지막으로 요소 제거 (장식 > 보조텍스트 > pill 순)
3. **절대 카드 밖으로 요소를 밀어내지 않는다**
4. 조정 후 반드시 검증: 모든 인접 요소 쌍에서 `upper.y + upper.h + 8 ≤ lower.y`

**요소 위치 정확성:**
- HTML 원본의 레이아웃 구조(2열, 3열, 상하 배치)를 최대한 보존
- 카드 그리드의 x/y 좌표가 HTML과 동일한 패턴 유지 (예: 2×2 그리드의 4개 카드 위치)
- 요소 순서: HTML 렌더링 순서(위→아래, 왼→오른)를 매니페스트에서도 유지

**KPI 숫자-본문 겹침 방지 (HARD RULE)** ⚠️:
- KPI 숫자(fontSize ≥ 48, 예: "340%", "89%", "$876B")는 반드시 본문 텍스트 아래에 배치
- 공식: `KPI.y ≥ bodyText.y + bodyText.h + 16`
- KPI가 본문과 같은 y 라인에 있으면 안 됨 — 본문이 PPTX에서 더 길게 렌더링되면 겹침 발생
- 본문 마지막 줄과 KPI 첫 줄 사이 최소 16px 간격 확보

**카드 높이 일관성:**
- 같은 행의 카드들은 **동일한 h** 값을 사용 (HTML에서 flex로 높이가 맞춰진 것처럼)
- 카드 h는 HTML의 실제 렌더링 높이를 기준으로 설정. 과도하게 크게 잡지 않는다
- 4열 카드 레이아웃: 모든 카드 h가 동일해야 깔끔한 그리드 유지

**좁은 카드 본문 텍스트 오버플로우 방지 (HARD RULE)** ⚠️:

4열 이상 카드 레이아웃(Process, Icon Row 등)에서 카드 내부 텍스트 폭(w)이 좁아지면 한국어 텍스트가 예상보다 많은 줄로 래핑되어 아래 요소와 겹침이 발생한다.

**사전 계산 (매니페스트 생성 시 필수):**
1. 카드 내부 텍스트 w = `카드_w - (카드_padding × 2)`
2. 한국어 본문의 예상 줄 수 = `ceil(charCount × fontSize × 0.95 / w)`
3. 필요한 h = `줄 수 × fontSize × lineSpacing × 1.4`
4. **w < 350px이면 위험 구간** — 반드시 아래 규칙 적용:
   - 본문 텍스트를 축약하여 3줄 이내로 맞추거나
   - 본문 h를 계산된 값 + 20%로 넉넉히 잡고
   - 배지 y를 `본문.y + 본문.h + 16` 이상으로 배치
   - 전체가 카드 h 안에 들어오는지 검증: `배지.y + 배지.h + 16 ≤ 카드.y + 카드.h`

**4열/5열+ Process 레이아웃 특별 규칙:**
- 4열일 때 카드 w ≈ 380px, 내부 텍스트 w ≈ 316px
- **5열일 때 카드 w ≈ 286px, 내부 텍스트 w ≈ 214px — 극도로 위험 구간**
  - 한국어 24px 본문이 214px 폭에서 한 줄에 약 9자만 들어감
  - 본문 텍스트를 **2줄 이내**로 강제 축약 (핵심 키워드만)
  - 본문 h 최소 160px, 배지(pill) y = 본문.y + 본문.h + 16
  - 모든 요소가 카드 h 안에 들어오는지 반드시 검증
- 한국어 28px 본문이 316px 폭에서 한 줄에 약 12자만 들어감
- **본문 h를 최소 220px로 설정하고, 배지 y를 본문 아래 충분히 배치**

**카드 내 우측 메트릭 배지 겹침 방지 (HARD RULE)** ⚠️:
카드 우상단에 메트릭(숫자+라벨)이 있을 때, 카드 제목/태그 텍스트의 w를 메트릭 영역만큼 줄인다.
- 우측 메트릭 배지 폭 예약: 메트릭 숫자 w + 라벨 w + 좌측 여백(20px) = 약 120~150px
- 제목/태그 텍스트의 `x + w ≤ 카드.x + 카드.w - 메트릭폭 - 20px`
- **예**: 카드(x=120, w=828), 메트릭 폭=140px → 제목 w = 828 - 40(패딩) - 140 - 20 = 628px
- 이 규칙을 어기면 메트릭 숫자가 제목 텍스트와 겹침 발생

**PPTX 시각 검증 (check-manifest 통과 후에도 필수)** ⚠️:
- PPTX → PNG 스크린샷 캡처 후 **시각적 겹침/오버플로우 직접 확인**
- 자동 채점(5/5) 통과여도 시각적 문제가 있으면 매니페스트 수정
- 특히 확인: pill 태그 2줄 래핑, 카드 내부 본문 잘림, KPI 라벨 줄바꿈

### R6 추가 규칙 (Fidelity Exp 3 반영) ⚠️

**본문 텍스트에 `\n` 사용 금지 (HARD RULE)** ⚠️:
- 매니페스트의 body text(fontSize ≤ 48)에 명시적 `\n`을 넣지 않는다
- `\n`은 check-manifest가 multi-line으로 인식 → h를 과도하게 키움 → fix-manifest가 후속 요소를 카드 밖으로 밀어냄
- **본문은 PptxGenJS의 자동 wrapping에 맡긴다** (w를 정확히 설정하면 자연스럽게 줄바꿈)
- `\n`은 **타이틀(fontSize ≥ 60)**에서만 사용 허용

**카드 경계 검증 (HARD RULE)** ⚠️:
- 카드로 취급하는 rect는 `rect.w >= 220 && rect.h >= 140` 수준의 본문 컨테이너만 해당한다
- 작은 pill, badge, 아이콘 박스는 카드로 취급하지 않는다
- check-manifest.js 실행 후, 모든 카드 내 텍스트가 `y + h ≤ card.y + card.h` 인지 반드시 검증
- 위반 시: h를 줄이거나, 텍스트를 축약하거나, 카드 h를 키운다
- 특히 **2-column 레이아웃** (Before/After, Concept+Visual)에서는 한 카드 수정이 다른 칼럼에 전파되지 않도록 카드 스코프를 유지한다

**태그/pill rect 폭 규칙 (HARD RULE — v2 강화)** ⚠️:
- 영문 태그: `w = charCount × fontSize × 0.7 + 48` (fontSize 변동 반영)
- 한국어 태그: `w = charCount × fontSize × 1.10 + 48`
- 혼합(영+한): `w = (영문수 × fontSize × 0.7) + (한글수 × fontSize × 1.10) + (구분기호수 × fontSize × 0.6) + 56`
- **혼합 텍스트는 항상 안전 마진 1.15배 적용** — `w_final = ceil(w_calc × 1.15)`
- 예: "COMPANY INTRODUCTION · 회사 소개" (영문 19, 구분 1, 공백 4, 한글 4) at fontSize=22 → 영문 19×22×0.7=292.6 + 한글 4×22×1.10=96.8 + 구분 1×22×0.6=13.2 + 56 ≈ 458 → ×1.15 ≈ 527
- **매니페스트 생성 후 모든 pill rect를 순회하며 w 검증** — 부족하면 즉시 수정
- 부족하면 PPTX에서 2줄 래핑 발생 → pill 안 텍스트가 위아래 분리

### R7 추가 규칙 (회사소개 데크 시각비교 반영) ⚠️

**slide-system primitive 렌더 순서가 패턴 HTML보다 우선 (HARD RULE)** ⚠️:

매니페스트 작성 시, 슬라이드 TSX가 `slide-system.tsx`의 primitive 컴포넌트(`<Metric>`, `<Card>`, `<SectionHeader>`, `<NumberBadge>` 등)를 사용하면 **컴포넌트 정의의 child 렌더 순서가 단일 진실 원천**이다. 패턴 HTML(`references/jangpm/patterns/*.html`)의 클래스 어휘는 시각 참조용이지만 child 순서가 다를 수 있다.

**Primitive 렌더 순서 (참조표):**

| Primitive | 매니페스트 텍스트 순서 (위 → 아래) |
|-----------|--------------------------------|
| `<Metric value={...} label={...}/>` | **value(숫자) 먼저(위), label(라벨) 다음(아래)** |
| `<NumKickerHead num={...} kicker={...}/>` | 같은 줄 좌→우 (NumberBadge x → kicker x) |
| `<SectionHeader title={...} tag={...}/>` | h2 title 먼저, tag pill을 같은 row 우측에 |
| `<Card>` 자식 노드 | JSX 순서대로 위→아래 |

**과거 사고**: 회사소개 데크 Slide 4에서 매니페스트가 06-stats 패턴(label 위, num 아래)을 따라 작성됐으나 React는 `<Metric>`(value 위, label 아래) 사용 → HTML과 PPTX의 카드 텍스트 순서가 반대로 출력. 매니페스트 작성 전에 슬라이드 TSX의 import 라인에서 primitive 사용 여부를 확인하고, 사용 시 위 표를 따른다.

**검증**: 매니페스트 작성 후 슬라이드 TSX에 `<Metric ` 등장 횟수 == 매니페스트의 KPI 카드 안 "큰 숫자(fontSize ≥ 36) 위, 라벨(fontSize ≤ 16) 아래" 패턴 카운트.

**카드 본문 한국어 wrapping h 안전 마진 (HARD RULE — v2 강화)** ⚠️:

LibreOffice의 한글 fontFamily fallback(Malgun Gothic / Noto Sans KR)이 Arial 영문보다 평균 5~10% 폭이 넓어 매니페스트의 wrapping 줄 수가 underestimate 되어 카드 하단을 침범한다.

- **한글 본문 charWidthFactor**: 0.95 → **1.05** (LibreOffice 실측 반영)
- **카드 내부 마지막 text 안전 검증 공식**: `text.y + text.h + 12 ≤ card.y + card.h`
- 위반 시 우선순위: ① text.h 키우고 후속 요소 y 내림 → ② card.h 키움 → ③ 본문 1줄 축약
- **여러 줄 한국어 본문**: 추정 줄 수 = `ceil(charCount × fontSize × 1.05 / w)`, 그 후 `h = N × fontSize × 1.55`

**과거 사고**: Slide 8 Driver 01 카드(h=120) 안에 본문 3줄이 들어가지 못해 카드 하단 보더와 텍스트가 겹침. v2 룰을 적용하면 사전 계산 단계에서 h 부족이 감지되어 자동 보정.

**accent rule line / 가로 디바이더 위치 보정 (HARD RULE)** ⚠️:

좌측 텍스트 블록 안에서 본문 → accent rule(80×3 라인) → 메타 텍스트 순으로 쌓이는 패턴(cover/closing/key-statement)에서, 본문 텍스트가 wrapping으로 한 줄 늘어나면 rule이 본문 마지막 줄 underline처럼 보인다.

- 매니페스트 작성 시 본문 text.h를 wrapping 후 실제 줄 수 기준으로 계산
- `rule.y >= bodyText.y + bodyText.h + 24` (24px 안전 간격)
- 본문이 길어 rule이 메타 텍스트와 겹칠 위험 있으면 본문 fontSize 22 → 18로 축소하거나 본문 축약

**과거 사고**: Slide 10에서 본문 wrapping이 2→3줄로 늘어나면서 accent rule이 본문 마지막 줄 바로 아래로 깔려 underline처럼 렌더.

**차트 영역 카드 내부 좌표 패딩 (HARD RULE)** ⚠️:

차트 SVG(image)를 매니페스트의 차트 카드 rect 안에 배치할 때 **카드 안쪽 패딩 ≥ 16px**를 유지한다.

- `image.x ≥ card.x + 16`
- `image.y ≥ card.y + headerArea.h + 12` (헤더 라벨 영역 아래)
- `image.x + image.w ≤ card.x + card.w - 16`
- `image.y + image.h ≤ card.y + card.h - 16`

**과거 사고**: Slide 8에서 차트 SVG 마지막 데이터 포인트(26Q2)가 카드 우측 경계 밖으로 약간 빠져나감 — image의 `x + w`가 card의 `x + w`와 같은 값이라 패딩 없음.

## 제약

- 폰트: 활성 테마 폰트(현재 jangpm = Arial)는 대부분 환경에서 기본 제공되지만, 뷰어별 렌더링 차이는 확인 필요:
  - 한국어: Malgun Gothic (맑은 고딕)
  - 영문: Arial/Calibri
  - Google Slides 변환 시: Noto Sans KR로 자동 대체
- 이미지: data URI 기반. 외부 URL은 오프라인에서 깨질 수 있음.
- 레이아웃 정밀도: Flexbox → 절대좌표 변환은 LLM이 수행하므로, 복잡한 레이아웃에서 약간의 위치 차이가 발생할 수 있음.
