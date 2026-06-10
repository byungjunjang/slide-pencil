---
name: export-pptx
description: 이미 만들어진 React 슬라이드 컴포넌트(`src/slides/Slide*.tsx`)를 PowerPoint(.pptx) 파일로 단독 변환. 보통은 /slide 스킬이 Step 6에서 같은 변환을 자동으로 수행하므로 이 스킬을 별도로 부를 필요가 없다. 다음 시나리오에서만 사용 — (1) /slide 없이 이미 React가 있는 프로젝트의 PPTX만 빌드, (2) 매니페스트/PPTX 만 재변환하고 싶을 때, (3) 사용자가 "HTML만"이라고 했다가 나중에 PPTX를 추가로 요청.
user-invocable: true
---

# /export-pptx — PPTX 단독 변환 진입점

이 스킬은 `slide` 스킬의 Step 6(매니페스트 추출/핸드크래프트 → PPTX 변환)을 단독으로 실행하는 thin entry point다. 룰과 스크립트의 single source of truth는 `slide` 스킬 안에 있다 — 이 스킬은 사용자가 명시적으로 PPTX 변환만 트리거할 수 있도록 호출 표면만 제공한다.

## 언제 이 스킬을 쓰나

- **이미 React 컴포넌트는 있고 PPTX만 새로** 만들고 싶을 때
- 사용자가 처음에 "HTML만 필요해" 했다가 나중에 PPTX 추가 요청
- 매니페스트만 수정하고 PPTX 재변환
- `/slide` 흐름을 처음부터 다시 돌리지 않고 변환 단계만 반복

`/slide`로 슬라이드를 만드는 일반적인 흐름이라면 별도 호출 불필요 — `/slide` Step 6가 같은 변환을 자동으로 수행한다.

## 사전 조건

- `src/slides/Slide01.tsx` ~ `SlideN.tsx` 파일이 존재할 것
- `src/index.css`에 디자인 토큰(CSS 변수)이 정의되어 있을 것
- `pptxgenjs` 패키지가 설치되어 있을 것 (`npm install` 완료)

## 워크플로우

전체 절차·디테일 룰의 single source는 다음 문서다. 들어가기 전 반드시 로드:

- **`.claude/skills/slide/references/pptx-build.md`** — Step 1(소스 분석) ~ Step 4(검증·리포트), R2/R5/R6 모든 룰
- **`.claude/skills/slide/references/manifest-schema.md`** — 매니페스트 JSON 스키마

요약 절차 (디테일은 위 문서):

1. **매니페스트 생성** — 빌드된 HTML(`output/{slug}/{slug}.html`)이 있으면 자동 추출(기본 경로):
   ```bash
   node .claude/skills/slide/scripts/extract-manifest.mjs "output/{slug}/{slug}.html"
   ```
   HTML이 없으면 React를 먼저 빌드(`npm run build` 후 dist/index.html 복사)해서 추출하는 것을 우선 시도. 그것도 불가능할 때만 슬라이드별 elements 배열을 직접 JSON에 작성(fallback, `pptx-build.md` 경로 B). ad-hoc 빌더 스크립트 일괄 생성 금지(HARD RULE).

2. **자가 검증 + 자동 수정 루프** (최대 3회):
   ```bash
   node .claude/skills/slide/scripts/check-manifest.js "output/{slug}/{slug}-manifest.json"
   ```

3. **SVG 래스터화** (매니페스트에 SVG image 요소가 있을 때 필수):
   ```bash
   node .claude/skills/slide/scripts/rasterize-svg-images.mjs output/{slug}/{slug}-manifest.json
   ```

4. **PPTX 변환**:
   ```bash
   node .claude/skills/slide/scripts/convert.js "output/{slug}/{slug}-manifest.json" --strict
   ```
   출력: `output/{slug}/{slug}.pptx` (자동 유도, 같은 폴더 같은 슬러그). `--strict`는 warning 발생 시 exit 1.

5. **검증 + 리포트** — PPTX 열어 확인, 사용자에게 슬라이드 수 / 폰트 / warning 보고.

## 시각 비교 (선택)

이미 만들어진 React HTML과 변환된 PPTX의 시각 일치도를 검사하려면:

- `references/eval.md` — 시각 비교 워크플로우
- `scripts/pptx-compare.js`, `scripts/pptx-screenshot.js` — 슬라이드별 PNG 캡처 + diff 도구

## 제약

- 폰트: 활성 테마 폰트 고정 — `src/index.css`의 `--font-sans` 첫 패밀리(현재 jangpm = Arial), `manifest.fonts`에 선언 (`pptx-build.md` R2 참조). 한국어는 뷰어 기본 폰트로 폴백.
- 이미지: data URI 기반. 외부 URL은 오프라인에서 깨짐.
- 레이아웃 정밀도: 기본 경로(extract-manifest.mjs)는 브라우저 실측 좌표라 정밀. fallback(LLM 핸드크래프트)에서만 복잡한 레이아웃의 미세 위치 차이 발생 가능.
