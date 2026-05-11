---
name: export-pdf
description: >
  React 슬라이드를 HTML에서 직접 PDF로 변환.
  Playwright로 각 슬라이드(1280×720)를 개별 PDF 페이지로 캡처.
  PPTX 경유 없음. LibreOffice 불필요.
  Trigger on: "/export-pdf", "PDF로 변환", "PDF로 내보내기", "convert to PDF"
---

# /export-pdf — HTML → PDF 직접 변환

## 방식

`npm run build` → Playwright → `page.pdf()` 직접 호출.  
PPTX 경유 없이 브라우저 렌더링 결과를 그대로 PDF로 출력.

## Usage

```
/export-pdf
/export-pdf output/my-deck.pdf
```

인자 없이 실행하면 `output/slides-YYYY-MM-DD.pdf`로 저장.

## Prerequisites

- Playwright 설치됨 (`devDependencies`에 포함)
- Playwright 브라우저 바이너리: `npx playwright install chromium`

## Workflow

### Step 1 — 빌드 확인

```bash
# dist/index.html이 없으면 빌드
npm run build
```

### Step 2 — PDF 변환 스크립트 실행

```bash
node .claude/skills/export-pdf/scripts/html-to-pdf.js [output_path]
```

**내부 동작:**
1. `dist/index.html`을 Playwright Chromium으로 로드 (1280×720 viewport)
2. `#slides-root > *` 각 슬라이드에 `break-after: page` CSS 주입
3. `page.pdf({ width: '1280px', height: '720px', printBackground: true })` 호출
4. 결과 PDF 저장

### Step 3 — 결과 확인

생성된 PDF 경로를 사용자에게 알린다.

```bash
open output/slides-YYYY-MM-DD.pdf   # macOS
```

## Playwright 브라우저 미설치 시

```bash
npx playwright install chromium
```

## PPTX 경유가 필요한 경우

PowerPoint 편집이 필요하면 `/export-pptx` 후 LibreOffice로 변환:

```bash
soffice --headless --convert-to pdf "output/deck.pptx" --outdir "output/"
```
