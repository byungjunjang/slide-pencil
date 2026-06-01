# Codex Dual-Host 설계 (slide-pencil)

> 상태: 승인됨(설계) · 작성일 2026-06-01 · 대상 repo: `slide-pencil`
> 목표: 이 repo를 **Claude Code · Codex(클라우드/웹) 양쪽**에서 사용 가능하게 하면서, **현재 Claude Code 품질을 한 글자도 손대지 않고** 유지한다.
> 출처: `slide-svg/docs/superpowers/specs/2026-06-01-codex-dual-host-design.md` 부록 A(이식 패턴)를 slide-pencil 파이프라인에 적용.

---

## 1. 배경 / 문제

동일 repo를 Claude Code와 Codex에서 각각 `/slide`로 돌렸을 때 Codex 결과물이 현저히 낮았다(예: PPTX 1.8MB↔308KB, manifest 2.1MB↔159KB, `pipeline_status.json`·`_eval/*.png` 부재). 사용자 Codex 자기분석은 일부를 "Claude 전용 repo"로 귀인했으나 **실제 원인은 그게 아니다**:

- 루트에 `AGENTS.md` 없음, `.codex/` 없음 → Codex가 잡을 진입점이 전무.
- patterns(29개 canonical HTML)는 **이미 추적됨** → 클론 환경도 시각 레퍼런스 확보. (초기 가정 오류 정정.)
- 핵심 병목은 *경로 하드코딩*이 아니라:
  1. **실행 규율 부재** — Codex가 `SKILL.md`를 런타임 절차로 실행하지 않고 "문서로 읽고 즉흥 구현(fallback)"했다. slide-plan 자동 진입을 건너뛰고, **Pencil CLI 단계를 우회해 직접 React/manifest를 만들었으며**, 이미지 로그인 실패 시 placeholder로 silent fallback 했고, 검증 루프를 돌지 않았다.
  2. **우회를 막을 강제 장치 부재** — 즉흥 우회를 해도 파이프라인이 실패하지 않으니 shortcut이 "성공"으로 보였다.

slide-pencil 특유로, **Pencil CLI 우회(직접 React 생성)가 가장 큰 품질 차이 원인**이었다. 따라서 게이트가 `pipeline_status.json`과 frame 수 정합을 반드시 검사해야 한다.

## 2. 목표 / 비목표

**목표**
- Codex(클라우드/웹)가 이 repo에서 슬라이드 생성을 Claude Code와 동등한 절차로 실행하게 한다.
- Claude Code 경로(`.claude/skills/`)는 **정본(canonical)으로 불변** — 기존 디자인 규칙·품질 로직 무손상. (신규 게이트 스크립트 + status 필드 명문화 같은 **추가만** 허용.)
- Codex가 절차를 우회하면(특히 Pencil 우회) **하드 페일**로 막는다.

**비목표 (이번 범위 밖)**
- slide-html / slide-svg repo 수정 (단, 패턴은 slide-svg에서 이미 이식해 옴).
- 디자인 테마 교체 (theme-init은 그대로 미러에 포함하되 별도 작업 아님).
- Codex 클라우드의 `image_gen`/codex-image 백엔드 자체 구현 (가용성 검증 + 실패 시 halt만 담당).

## 3. 핵심 결정 (확정)

| 항목 | 결정 |
|------|------|
| Codex 실행 환경 | **클라우드/웹** (root `AGENTS.md`를 진입점으로 읽고, repo 클론해 컨테이너 실행) |
| 호스트 연결 구조 | **`.codex/skills` 미러** — 손수 복제가 아닌 **생성형 미러**(canonical=`.claude/skills`, 텍스트 파일 경로 문자열만 치환) |
| 작업 범위 | **slide-pencil 이 repo만** |
| 품질 게이트 | **하드 페일** (산출물 누락·Pencil 우회·placeholder·미러 stale 시 중단) |
| 스크립트 언어 | **Python-all** (`sync_codex_mirror.py`/`verify_deck.py`/`preflight.py`) — slide-svg 1:1 정합, Python 3.14 확인, `zipfile`로 PPTX 무결성 검사. 기존 Node 검사기(`check-manifest.js`)는 subprocess로 오케스트레이션(재구현 X) |

### 3.1 "생성형 미러" 보정 (중요)

미러를 손으로 두 벌 유지하면 드리프트가 발생하고 그게 새 품질 차이의 원인이 된다. 따라서:

- **`.claude/skills` = 정본.** 사람은 여기만 편집한다.
- **`.codex/skills` = 생성물.** `sync_codex_mirror.py`가 `.claude/skills`에서 통째로 재생성한다. git에 커밋한다(클라우드가 클론 즉시 발견해야 하므로).
- **drift-check(`--check`)** 가 미러가 낡았으면 검증 게이트에서 exit 1.
- `.codex/skills`는 **hand-edit 금지** — AGENTS.md와 미러 마커에 명시.

이로써 ① Codex는 `.codex/skills`에서 발견·실행, ② 정본 무손상, ③ 드리프트 물리적 차단.

## 4. 아키텍처 — 5개 기둥

### 기둥 1 — 생성형 `.codex/skills` 미러 + 드리프트 락

**파일:** `.claude/skills/slide/scripts/dev/sync_codex_mirror.py` (slide-svg 설계 재사용; 파이프라인 무관)

**동작:**
- 입력: repo root에서 `.claude/skills/` 전체.
- 출력: `.codex/skills/`를 삭제 후 재생성(멱등).
- **변환 규칙(유일):** 텍스트 파일(`.md`, `.py`, `.sh`, `.mjs`, `.js`, `.ts`, `.tsx`, `.json`, `.css`, `.txt`, `.html`) 내 문자열 `.claude/skills` → `.codex/skills` 치환. 그 외 바이트는 그대로. 바이너리(폰트/이미지/`.pen`/PNG) 무변환 복사.
- **제외:** `__pycache__`, `*.pyc`, `node_modules`, `.venv`, OS 잡파일.
- 미러 루트에 `_GENERATED.md` 마커: "이 트리는 sync_codex_mirror.py 생성물. 직접 편집 금지. `.claude/skills`를 고치고 sync 재실행."
- **`--check` 모드:** 임시 디렉터리에 재생성 → `.codex/skills`와 diff. 다르면 stderr에 낡은 파일 목록 + 재실행 명령 출력 후 exit 1.

**드리프트 강제(확정):** `--check`를 **git pre-commit hook**에 연결해 미러가 낡은 채 커밋되는 것을 차단한다(stale → 커밋 거부). 훅은 committed 설치 스크립트(`scripts/install-hooks` 또는 `core.hooksPath`)로 배포하고, `verify_deck.py`의 `--check`(기둥 3-9)가 2차 방어선이 된다.

**경로 깊이 불변식:** `.codex`와 `.claude`는 둘 다 repo root 직속 → `.../skills/slide/scripts/X` 깊이가 동일 → walk-up 가정 보존. sync는 깊이를 바꾸지 않는다.

### 기둥 2 — 루트 `AGENTS.md` (Codex 실행 규율의 핵심)

**파일:** `AGENTS.md` (repo root). 짧게 유지하고 전체 제약은 `CLAUDE.md`/`SKILL.md`를 SSOT로 참조. 핵심 강제 항목:

1. **라우팅:** 슬라이드 요청("슬라이드", "프레젠테이션", "PPT", "덱", "make slides", "/slide") → **반드시** `.codex/skills/slide/SKILL.md`를 단계대로 실행. 문서로 요약만 하고 즉흥 구현 금지. **fallback 재구현(직접 React/manifest/PPTX 생성) 금지.**
2. **계획 자동 진입:** 데크가 **외부보고·강의·세일즈·사용자 파일 기반·≥10장·명시적 품질요구** → 먼저 `.codex/skills/slide-plan/SKILL.md` 실행 → `output/<slug>/slide_plan.json` 생성. 우회 키워드(`간단히`, `빠르게`, `quick`, `simple`, `plan 없이`)만 예외. (`/slide`는 Step 1.0에서 `slide_plan.json` 존재로 plan 모드를 자동 분기하므로, 먼저 plan을 만들면 그대로 렌더된다.)
3. **Pencil CLI 규율 (slide-pencil 최대 품질 레버):**
   - 시작 전 `pencil status`를 실제 셸에서 실행 — `● Active`만 ready. 아니면 `npm install -g @pencil.dev/cli` + `pencil login` 안내 후 **HALT**(`pipeline_status.json`에 blocked 기록).
   - **Pencil-native frame이 실제로 생성돼야 한다 — React-only 우회 금지.** Pencil-native 단계가 실패했는데 Export만 성공하면 `verified` 금지, `fallback`/`partial`로 기록.
   - 저장된 `.pen`이 0바이트면 `save()`~`exit()` 사이 `sleep 1` 누락 — `references/pencil-cli.md`로 재구성 후 재시도.
4. **이미지 규율:** `/codex-image`만 사용. codex 로그인/가용성 선검사. 이미지가 필요한데 진짜 생성이 불가하면 **HALT** — PIL/placeholder/단색 이미지로 silent fallback 금지. 산출물 `src/images/<slot>.png`, 슬롯명=파일명.
5. **빌드/Export 규율:** `references/pptx-build.md` 룰(매니페스트 핸드크래프트, R2/R5/R6) 준수, `convert.js`로 변환. `src/index.css`에 `@source "./slides"` 등록 유지.
6. **완료 게이트:** "done" 선언 전 `python .codex/skills/slide/scripts/verify_deck.py <slug>` 통과 필수. 실패 시 완료 선언 금지.
7. **미러 주의:** `.codex/skills`는 생성물. 편집은 `.claude/skills`에서 하고 `sync_codex_mirror.py` 재실행.

> Claude Code는 이 규율을 Skill 런타임으로 "공짜로" 얻는다(Skill 도구가 SKILL.md를 절차로 로드). Codex는 그 런타임이 없으므로 AGENTS.md가 그 역할을 대신한다 — 이것이 품질 차이의 핵심 교정점.

### 기둥 3 — 하드 페일 품질 게이트 (두 호스트 공용)

**파일:** `.claude/skills/slide/scripts/verify_deck.py`, `.claude/skills/slide/scripts/preflight.py` (sync로 `.codex`에도 미러됨).

**`preflight.py` (파이프라인 시작 전):**
- Node/npm 사용 가능 + 의존성 설치 확인.
- **`pencil status` == `● Active`** (slide-pencil HARD) → 실패 시 loud halt + 복구 runbook 안내.
- codex-image 로그인/가용성(이미지 필요 데크일 때) → 실패 시 halt.
- 미러 freshness(`sync_codex_mirror.py --check`).
- `src/index.css`에 `@source "./slides"` 존재(조기 경고).

**`verify_deck.py <slug>` (대상 `output/<slug>/`, 완료 전):** 아래 중 하나라도 실패 → exit 1.
1. **계획 강제:** 페이지 ≥ 10 인데 `slide_plan.json` 부재 → FAIL (우회 키워드 기록 시 제외). 있으면 plan 구조 검증.
2. **`pipeline_status.json` 존재 + 필드:** `pencil_native_frames`, `manifest_check`(N/N), `triple_gate`, `embedded_images` + status ∈ {built, pptx_ready, verified}.
3. **카운트 정합:** `pencil_native_frames` == 활성 TSX 수(`src/slides/Slide*.tsx`) == plan slide 수(plan 모드 시) == PPTX 슬라이드 수(`ppt/slides/slide*.xml`). ← 진짜 Pencil 실행 강제.
4. **eval 산출물:** `_eval/slide*.png` 수 == 슬라이드 수.
5. **Pencil 실제 실행:** `.pen` 존재 & 0바이트 아님, status가 `fallback`/`partial` 아님.
6. **네이티브 PPTX:** `<slug>.pptx` 존재 + `zipfile.testzip()` 무결성 + `node check-manifest.js` 오케스트레이션해 N/N 통과(이미지-플래튼 데크 거부).
7. **이미지 진위:** `src/images/` 각 파일이 placeholder/degenerate 아님 — size 하한 + (PIL 가용 시) 픽셀 분산 하한; 단색·저분산·과소 파일 거부.
8. **Tailwind:** `src/index.css`에 `@source "./slides"` 등록 확인.
9. **미러 freshness:** `sync --check` 통과.

**재사용 원칙:** 새 검증 로직을 중복 구현하지 않는다. 기존 `check-manifest.js`(매니페스트 N/N)와 plan 검증을 오케스트레이션하고, 게이트는 host-parity + 산출물 존재 + Pencil-native 증명 + 이미지 진위만 추가한다.

### 기둥 4 — 경로/호스트 감사

- 신규 Python 스크립트는 `Path(__file__).resolve().parents[N]` walk-up으로 repo root를 찾는다(.claude/.codex 동일 깊이 → 동일 동작).
- 기존 Node 스크립트(`convert.js`, `check-manifest.js`, `rasterize-svg-images.mjs`)의 기능적 `.claude` 하드코딩을 전수 감사 — docstring/주석/문서면 무수정(치환이 처리), 기능 경로면 `import.meta.url` 파생으로 교정.
- `.codex/skills`에서 핵심 스크립트가 동일 동작하는지 스모크 확인.

### 기둥 5 — 문서 + 회귀 테스트

- `README.md`: "Claude Code / Codex dual-host" 섹션 추가.
- `CLAUDE.md`: AGENTS.md 존재 + **"`.claude/skills` 수정 후 `sync_codex_mirror.py` 재실행"** 워크플로 한 줄 + `pipeline_status.json` rich 필드(`pencil_native_frames`/`manifest_check`/`triple_gate`/`embedded_images`) 스키마 명문화(양쪽 호스트가 동일 기록하도록).
- `tests/test_codex_mirror.py`: ① `sync --check` 통과, ② AGENTS.md가 가리키는 `.codex/skills/...` 경로 실재, ③ `.codex` 깊이에서 핵심 스크립트 경로 해석 가능.

## 5. 제어 흐름 — Codex 클라우드 실행 경로

```
Codex 클라우드: repo 클론 → root AGENTS.md 읽음
  → 슬라이드 요청 감지 → preflight.py (node/pencil status/codex-image/mirror/@source)
  → (외부보고·강의·≥10장 등) slide-plan/SKILL.md → output/<slug>/slide_plan.json
  → slide/SKILL.md 단계 실행 (Pencil 디자인 → React 변환 → Vite 빌드 → manifest → PPTX)
  → verify_deck.py <slug> (하드 페일 게이트)
  → 통과 시에만 "완료"
```

## 6. 에러 처리

모든 게이트 실패는 **exit ≠ 0 + 명확한 교정 메시지**(무엇이 빠졌는지 + 실행할 명령). silent fallback 일절 없음. AGENTS.md가 "게이트 실패 시 완료 선언 금지"를 명시하므로 Codex는 우회 대신 수정으로 유도된다. Pencil 우회·placeholder 이미지·미러 stale은 모두 비가역 하드 페일.

## 7. 테스트 전략

- 단위: `sync_codex_mirror.py`(멱등성, `--check` 정확도, 치환 정확도), 이미지 진위 휴리스틱, 카운트 파서.
- 통합: `tests/test_codex_mirror.py`(미러 동기성 + 경로 해석).
- 회귀: `npm run build` 정상(스타일 적용) + 기존 Claude 빌드 검증 룰(R2/R5/plan-count) 유지.

## 8. 산출 파일 목록

| 파일 | 신규/수정 |
|------|-----------|
| `.claude/skills/slide/scripts/dev/sync_codex_mirror.py` | 신규 |
| `.claude/skills/slide/scripts/verify_deck.py` | 신규 |
| `.claude/skills/slide/scripts/preflight.py` | 신규 |
| `AGENTS.md` (root) | 신규 |
| `.codex/skills/**` | 신규(생성물, 커밋) |
| `.git/hooks` pre-commit (sync `--check`) + 설치 스크립트 | 신규 |
| `src/index.css` (`@source "./slides"`, `@source "./components"`) | 수정(추가) |
| `tests/test_codex_mirror.py` | 신규 |
| `README.md`, `CLAUDE.md` | 수정(섹션 추가) |

## 9. 가정 / 리스크

- **(가정)** Codex 클라우드가 root `AGENTS.md`를 진입 지시로 읽고, `.codex/skills`에서 스킬을 발견한다. (사용자 직접 경험 기반.)
- **(가정)** `pipeline_status.json`의 rich 필드(`pencil_native_frames` 등)는 Claude 실행이 이미 기록함(사용자 transcript 확인). 스키마 명문화로 Codex도 동일 기록.
- **(리스크) Codex 클라우드 이미지 생성** — codex-image 가용성이 CLI와 다를 수 있다. 완화: preflight 선검사 + verify placeholder 거부 → "진짜 이미지 or halt".
- **(리스크) pre-commit hook 미설치 환경** — 완화: 설치 스크립트 + `verify_deck.py`의 `--check`가 2차 방어선.
- **(리스크) Codex가 `.codex/skills` 직접 편집** → 역드리프트. 완화: `_GENERATED.md` 마커 + AGENTS.md 경고 + drift-check.

---

## 부록 — 이식 출처

이 설계는 `slide-svg`의 dual-host 패턴(4원칙: ① 정본+생성형 미러, ② AGENTS.md 실행 규율, ③ 골든 산출물 하드 페일 게이트, ④ 경로 무관 스크립트)을 slide-pencil 파이프라인(Pencil CLI → React/TSX → Vite → PPTX)에 적용한 것이다. slide-pencil 고유의 골든 산출물은 `pipeline_status.json`·frame 수 정합·`_eval/slide*.png`·Pencil CLI 실제 실행·`@source "./slides"` 등록이다.
