# Export PPTX Eval

이 문서는 `slide-pencil` 저장소에서 `export-pptx` 스킬의 시각 비교 방법을 설명한다.

목적은 React/Vite HTML 결과와 로컬 `.pptx` 결과를 같은 슬라이드 인덱스로 캡처해서 나란히 비교하는 것이다.

## 환경 Setup (최초 1회)

`pptx-compare.js`는 Playwright, LibreOffice(`soffice`), `pdftoppm` 세 가지에 의존한다. 하나라도 없으면 eval이 조용히 실패하므로 먼저 설치한다.

### 1. Playwright

```bash
# 프로젝트 루트에서 (node_modules에 이미 있으면 생략)
npx playwright install chromium
```

### 2. LibreOffice (`soffice`) — PPTX → PDF 변환

```bash
# macOS
brew install --cask libreoffice

# 설치 확인
soffice --version
```

> **주의:** LibreOffice를 `/Applications/LibreOffice.app`에 설치했지만 `soffice` 명령이 없으면:
> ```bash
> sudo ln -s /Applications/LibreOffice.app/Contents/MacOS/soffice /usr/local/bin/soffice
> ```

### 3. `pdftoppm` — PDF → PNG 변환

```bash
# macOS (poppler 패키지에 포함)
brew install poppler

# 설치 확인
pdftoppm -v
```

### 설치 확인 스크립트

```bash
echo "=== Playwright ===" && node -e "require('playwright')" && echo "OK"
echo "=== soffice ===" && soffice --version
echo "=== pdftoppm ===" && pdftoppm -v 2>&1 | head -1
```

세 항목 모두 출력이 나오면 eval 파이프라인 준비 완료.

---

## Pre-step: SVG 래스터화

매니페스트에 SVG image 요소가 있으면 비교 전에 반드시 PNG로 변환한다. PPTX 쪽 렌더만 rasterize되어 HTML 쪽과 구조가 달라지는 걸 방지한다.

```bash
node .codex/skills/slide/scripts/rasterize-svg-images.mjs output/{제목}/{제목}-manifest.json
node .codex/skills/slide/scripts/convert.js output/{제목}/{제목}-manifest.json
```

---

## Entry Point

```bash
node .codex/skills/export-pptx/scripts/pptx-compare.js --input output/<slug>/<slug>.html
```

커스텀 출력 경로를 주고 싶으면:

```bash
node .codex/skills/export-pptx/scripts/pptx-compare.js \
  --input output/<slug>/<slug>.html \
  --output-dir output/<slug>/compare
```

## What It Does

1. Playwright로 HTML 슬라이드를 캡처
2. HTML 옆의 `.pptx` 파일을 찾음
3. `soffice`로 `.pptx -> .pdf`
4. `pdftoppm`으로 PDF 페이지를 PNG로 렌더
5. HTML/PPTX 이미지를 같은 인덱스로 정리
6. `manifest.json`, `report.json`, `index.html` 생성

## DOM Contract

`pptx-compare.js`는 HTML에서 아래 계약을 기대한다.

- 슬라이드 루트 컨테이너가 `#slides-root` 이어야 함
- 각 슬라이드는 `#slides-root`의 직계 자식이어야 함
- 비교 시 각 슬라이드 직계 자식 노드를 개별 캡처함

이 계약이 깨지면 슬라이드 수 계산과 슬라이드별 캡처가 틀어진다.

## Output Structure

기본 출력 위치는 `--output-dir`로 지정한다. 예시 (`--output-dir output/<slug>/compare`):

- `output/<slug>/compare/report.json`
- `output/<slug>/compare/index.html`
- `output/<slug>/compare/<slug>/manifest.json`
- `output/<slug>/compare/<slug>/html/slide-*.png`
- `output/<slug>/compare/<slug>/pptx/slide-*.png`

## Requirements

- 루트 `node_modules/playwright`
- 로컬 `soffice`
- 로컬 `pdftoppm`
- `src/App.tsx`에서 `#slides-root` 계약 유지
