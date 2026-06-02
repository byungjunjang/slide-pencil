# 근거형 이미지 아키타입 (5종) — 비주얼=근거

`/slide` Step 3.5(Image_Generator)에서 외부 `<img>` AI 이미지를 만들 때 쓰는 **근거형 아키타입** 시드. slide/SKILL.md Step 3.5의 "슬롯 타입별 스타일 앵커 어댑터"(illustration / diagram / photography)는 *렌더 스타일* 축이고, 이 파일은 *수사적 역할* 축이다 — **이미지가 무엇을 증명/설명하는가**(P1 비주얼=근거)를 먼저 고르고, 그에 맞는 스타일 앵커를 어댑터 표에서 선택한다.

> **장식 이미지 금지(anti-slop Rule 13):** 아래 5종은 전부 *근거/설명을 나르는* 이미지다. "예쁜 배경"이나 의미 없는 추상 사진 단독 배치는 금지. 이미지를 넣기 전에 `lead.what_it_proves`(plan R7)를 먼저 적을 수 있어야 한다.

## 테마 결합 토큰 (theme-init 교체 대상)

아래 프롬프트의 다음 조각은 **활성 테마(jangpm)에 결합**돼 있어 `/theme-init`이 교체한다(교체지점 #7, theme-replacement-map 참조). 드리프트 가드(`validate-theme.mjs --stale-hex`)가 옛 hex 잔존을 검사한다.

| 토큰 | 활성 테마(jangpm) 값 | 교체 |
|---|---|---|
| `<ACCENT_HEX>` | `#4633E3` | 새 `--accent` hex |
| `<ACCENT_HUE>` | `indigo` | 새 accent 색계열 이름 |
| `<MOOD>` | `muted pastel / monochrome` | 새 테마 무드(가이드 §1 Visual/tone) |

**유지(락):** `minimal flat line-art` · `clean solid off-white background` · no-gradient/glow/3D/photorealism 락은 무드와 무관하게 **항상 보존**. 무드 단어만 교체한다.

> ⚠️ **`transparent background` 금지:** gpt-image-2는 진짜 알파를 못 만들어 투명 표시용 **흰/회색 체커보드를 픽셀로 그려버린다**. "배경 제거된 깔끔한 피사체"는 *단색 배경*(`clean solid off-white background`)으로 표현한다. Step 3.5 프롬프트 위생이 마지막에 한 번 더 보정한다.

---

## 1. Documentary (다큐) — 현장/맥락 증거

- **나르는 근거:** "이 일이 실제로 일어난다/존재한다"는 현장 맥락. 사람·공간·작업 현장.
- **언제:** 추상 주장에 현실 앵커가 필요할 때(문제 정의, 케이스, 도입 배경).
- **스타일 축:** `photography` 어댑터(negative에서 `photograph`/`photorealistic` 제거 필수).
- **앵커:** `editorial documentary photography, natural lighting, candid, <MOOD> tones, harmonized with neutral off-white background, shallow depth of field`
- **Subject 가이드:** 구체적 현장 1개(예: "분석가가 모니터 앞에서 데이터를 검토하는 장면"). 익명 가능, 얼굴 클로즈업 지양.
- **Negative:** `text, watermark, logo, 3D render, illustration, cartoon, gradient overlay, neon, oversaturated, stock-photo cliché, low quality, blurry`

## 2. System-info (시스템 인포) — 구조/관계 증거

- **나르는 근거:** 컴포넌트·데이터 흐름·계층 등 **시스템 구조**가 어떻게 맞물리는지.
- **언제:** 아키텍처·파이프라인·관계를 설명할 때. (진짜 다이어그램이면 inline SVG `/diagram-design` 우선 — 이 아키타입은 *일러스트풍 개념도*.)
- **스타일 축:** `diagram` 어댑터.
- **앵커:** `clean schematic system diagram, line-art, monochrome with a single <ACCENT_HEX> <ACCENT_HUE> accent, flat 2D, labeled nodes and connectors, no shadows, no gradients`
- **Subject 가이드:** 노드·연결선이 **의미를 가진** 개념도. 라벨 위치는 React에서 오버레이로 보강.
- **Negative:** `text-heavy, watermark, photograph, photorealistic, 3D render, gradient, glow, vibrant colors, low quality, blurry`

## 3. UI (제품 화면) — 산출물/사용 증거

- **나르는 근거:** "제품/화면이 실제로 이렇게 동작한다"는 산출물 증거.
- **언제:** 데모·기능 설명·before/after 화면 비교.
- **스타일 축:** `illustration`(flat UI mock) 또는 `diagram`.
- **앵커:** `minimal flat UI mockup illustration, clean product interface, <MOOD> palette aligned with <ACCENT_HEX> <ACCENT_HUE> accent, clean solid off-white background, no gradients, no glow, no 3D rendering`
- **Subject 가이드:** 핵심 화면 1개의 단순화 목업. 실제 카피 대신 placeholder 블록.
- **Negative:** `real text, watermark, logo, photograph, photorealistic, 3D render, gradient, glow, neon, rainbow, stock photo, low quality, blurry`

## 4. Multi-evidence (멀티 증거) — 복합 증거 집합

- **나르는 근거:** 여러 작은 증거(아이콘/미니 장면)가 **하나의 주장**으로 수렴.
- **언제:** "여러 신호가 같은 결론을 가리킨다"를 한 장에 압축할 때.
- **스타일 축:** `illustration`(line-art 그리드/콜라주).
- **앵커:** `minimal flat illustration, line-art icon set arranged as a cohesive grid, <MOOD> tones aligned with <ACCENT_HEX> <ACCENT_HUE> accent, clean solid off-white background, consistent stroke weight, no gradients, no glow, no 3D`
- **Subject 가이드:** 3~5개 동일 스트로크의 미니 모티프. 한 모티프만 accent로 앵커(나머지 모노크롬).
- **Negative:** `text, watermark, photograph, photorealistic, 3D render, gradient, glow, mismatched styles, oversaturated, low quality, blurry`

## 5. Data-poster (데이터 포스터) — 수치/규모 증거

- **나르는 근거:** 수치·규모·비율을 **이미지 자체가** 시각적으로 증명(차트가 아니라 포스터형 모티프).
- **언제:** 한 개의 강력한 수치/대비를 임팩트 있게 보여줄 때. (정밀 데이터면 inline SVG 차트 + chartTheme 우선.)
- **스타일 축:** `illustration`(conceptual data motif).
- **앵커:** `minimal flat conceptual illustration of scale/proportion, line-art, single <ACCENT_HEX> <ACCENT_HUE> accent on monochrome, flat 2D, no gradients, no glow, no 3D`
- **Subject 가이드:** 비율·규모를 은유하는 단일 모티프(예: 채워진 막대 군집, 누적 형상). 실제 숫자는 React 오버레이로.
- **Negative:** `embedded numbers as text, watermark, photograph, photorealistic, 3D render, gradient, glow, multi-hue, low quality, blurry`

---

## 사이즈/슬롯

- 사이즈·파일명·호출 절차는 slide/SKILL.md Step 3.5 "사이즈 매핑" + "슬롯별 생성"을 그대로 따른다. 산출물은 항상 `<project_root>/src/images/<slot>.png`.
- 아키타입은 **역할 선택용** — 최종 이미지 프롬프트는 (아키타입 앵커) + (구체 Subject) + (Avoid 리스트) 조합으로 만든다.
