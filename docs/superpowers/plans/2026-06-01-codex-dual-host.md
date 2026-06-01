# Codex Dual-Host Implementation Plan (slide-pencil)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** slide-pencil을 Claude Code · Codex 양쪽에서 동등 품질로 실행 가능하게 만들되, Claude 경로(`.claude/skills`)는 추가만 하고 디자인/품질 로직은 무손상으로 유지한다.

**Architecture:** `.claude/skills`를 정본으로 두고 `sync_codex_mirror.py`가 `.codex/skills`를 생성(텍스트 파일의 `.claude/skills`→`.codex/skills` 치환). 루트 `AGENTS.md`가 Codex에 SKILL.md를 절차로 실행하도록 강제하고, `verify_deck.py`(하드 페일 게이트)가 골든 산출물(카운트 정합·Pencil 실행 증명·`pipeline_status.json`·`_eval` PNG·`@source`)을 검사한다. drift-check는 pre-commit hook + 게이트에 연결.

**Tech Stack:** Python 3.14 (게이트/싱크 스크립트), Node 18+ (기존 `convert.js`/`check-manifest.js`), Tailwind v4 (`@tailwindcss/vite`), git hooks.

**Conventions used throughout:**
- 모든 신규 Python 스크립트는 repo root를 **마커 기반 walk-up**으로 찾는다 (가장 가까운 조상 중 `package.json` 과 `.claude/` 를 동시에 가진 디렉터리). `.claude`/`.codex` 깊이가 같으므로 두 트리에서 동일 동작.
- 테스트는 pytest 의존성 없이 **순수 Python `assert` 스크립트**로 작성하고 `python tests/<name>.py`로 실행, 실패 시 exit≠0.
- 커밋 메시지 끝에 다음 줄 포함: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
- 작업 브랜치: `feat/codex-dual-host` (이미 생성됨, 스펙 커밋 5b7e54c 존재).

**Spec:** `docs/superpowers/specs/2026-06-01-codex-dual-host-design.md`

---

## File Structure

| 파일 | 책임 | 신규/수정 |
|------|------|-----------|
| `.claude/skills/slide/scripts/dev/sync_codex_mirror.py` | `.codex/skills` 생성형 미러 + `--check` 드리프트 검사 | 신규 |
| `.claude/skills/slide/scripts/preflight.py` | 파이프라인 시작 전 환경 게이트(node/pencil/codex-image/mirror/@source) | 신규 |
| `.claude/skills/slide/scripts/verify_deck.py` | 완료 전 하드 페일 게이트(골든 산출물 검사) | 신규 |
| `AGENTS.md` (root) | Codex 진입점 + 실행 규율 강제 | 신규 |
| `.codex/skills/**` | 생성형 미러 (커밋, hand-edit 금지) | 신규(생성물) |
| `scripts/install-hooks.mjs` | pre-commit hook 설치(`core.hooksPath`) | 신규 |
| `.githooks/pre-commit` | 커밋 시 미러 `--check` | 신규 |
| `src/index.css` | `@source "./slides"`, `@source "./components"` 등록 | 수정(추가) |
| `CLAUDE.md` | pipeline_status.json 필드 명문화 + 완료 시 작성 규칙 + dual-host/sync 워크플로 | 수정(추가) |
| `README.md` | "Claude Code / Codex dual-host" 섹션 | 수정(추가) |
| `tests/test_codex_mirror.py` | 미러 동기성·치환·경로 해석 통합 테스트 | 신규 |
| `tests/test_verify_helpers.py` | verify_deck 헬퍼 단위 테스트(zip 카운트·이미지 휴리스틱) | 신규 |

**Task 순서 근거:** sync 스크립트(Task 1) → @source(Task 2) → preflight(Task 3) → verify_deck(Task 4) → pipeline_status 계약(Task 5) → AGENTS.md(Task 6) → Node 경로 감사(Task 7) → 문서(Task 8) → **미러 생성 + hook + 통합 테스트 + 커밋(Task 9)**. 미러는 `.claude/skills` 변경이 모두 끝난 Task 9에서 한 번에 생성한다(preflight/verify가 미러에 포함돼야 하므로).

---

## Task 1: `sync_codex_mirror.py` — 생성형 미러 + drift-check

**Files:**
- Create: `.claude/skills/slide/scripts/dev/sync_codex_mirror.py`
- Test: `tests/test_sync_mirror.py`

- [ ] **Step 1: Write the failing test**

Create `tests/test_sync_mirror.py`:

```python
import sys, subprocess, tempfile, shutil
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / ".claude/skills/slide/scripts/dev/sync_codex_mirror.py"

def _import_module():
    import importlib.util
    spec = importlib.util.spec_from_file_location("sync_codex_mirror", SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

def test_substitution_and_idempotence():
    mod = _import_module()
    with tempfile.TemporaryDirectory() as td:
        td = Path(td)
        src = td / ".claude" / "skills"
        (src / "slide").mkdir(parents=True)
        # text file with the token + a binary file
        (src / "slide" / "SKILL.md").write_text(
            "run `node .claude/skills/slide/scripts/convert.js`\n", encoding="utf-8")
        (src / "slide" / "logo.png").write_bytes(b"\x89PNG\r\n\x1a\n\x00\x01\x02\x03binary.claude/skills")
        dst = td / ".codex" / "skills"

        mod.build_mirror(src, dst)
        out_md = (dst / "slide" / "SKILL.md").read_text(encoding="utf-8")
        assert ".codex/skills/slide/scripts/convert.js" in out_md, "text token not substituted"
        assert ".claude/skills" not in out_md, "leftover .claude/skills in text"
        # binary unchanged (token inside bytes NOT substituted)
        assert (dst / "slide" / "logo.png").read_bytes().endswith(b".claude/skills"), "binary was altered"
        # marker present
        assert (dst / "_GENERATED.md").exists(), "marker missing"
        # idempotent: --check style diff is empty right after build
        assert mod.diff_against(src, dst) == [], "fresh mirror should match"

        # mutate canonical -> drift detected
        (src / "slide" / "SKILL.md").write_text("changed .claude/skills\n", encoding="utf-8")
        assert mod.diff_against(src, dst) != [], "drift not detected"

if __name__ == "__main__":
    test_substitution_and_idempotence()
    print("PASS test_sync_mirror")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python tests/test_sync_mirror.py`
Expected: FAIL — `FileNotFoundError`/`ImportError` (script doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `.claude/skills/slide/scripts/dev/sync_codex_mirror.py`:

```python
#!/usr/bin/env python3
"""Generate the .codex/skills mirror from canonical .claude/skills.

Canonical source : .claude/skills/   (humans edit ONLY here)
Generated output : .codex/skills/     (committed; DO NOT hand-edit)

Transform rule (the ONLY transform): in text files, replace the literal
substring '.claude/skills' -> '.codex/skills'. Binary files are copied
byte-for-byte. This keeps the mirror self-contained for Codex while the
canonical tree stays the single source of truth.

Usage:
  python sync_codex_mirror.py           # (re)generate .codex/skills
  python sync_codex_mirror.py --check   # exit 1 if mirror is stale
"""
import sys
import shutil
import tempfile
from pathlib import Path

TEXT_EXTS = {".md", ".py", ".sh", ".mjs", ".js", ".cjs", ".ts", ".tsx",
             ".jsx", ".json", ".jsonc", ".css", ".txt", ".html", ".yml",
             ".yaml", ".toml"}
EXCLUDE_DIRS = {"__pycache__", "node_modules", ".venv", ".git", ".pytest_cache"}
EXCLUDE_SUFFIX = {".pyc", ".pyo"}
SRC_TOKEN = ".claude/skills"
DST_TOKEN = ".codex/skills"
MARKER_NAME = "_GENERATED.md"
MARKER_BODY = (
    "# GENERATED — DO NOT EDIT\n\n"
    "이 트리는 `.claude/skills/slide/scripts/dev/sync_codex_mirror.py`의 생성물입니다.\n"
    "직접 편집하지 마세요. `.claude/skills`를 수정한 뒤 sync를 재실행하세요:\n\n"
    "    python .claude/skills/slide/scripts/dev/sync_codex_mirror.py\n"
)


def repo_root() -> Path:
    here = Path(__file__).resolve()
    for p in [here] + list(here.parents):
        if (p / "package.json").exists() and (p / ".claude").exists():
            return p
    raise SystemExit("repo root (package.json + .claude) not found")


def _iter_files(base: Path):
    for p in base.rglob("*"):
        if not p.is_file():
            continue
        rel_parts = p.relative_to(base).parts
        if any(part in EXCLUDE_DIRS for part in rel_parts):
            continue
        if p.suffix.lower() in EXCLUDE_SUFFIX:
            continue
        yield p


def _is_text(p: Path) -> bool:
    return p.suffix.lower() in TEXT_EXTS


def build_mirror(src_root: Path, dst_root: Path) -> None:
    if dst_root.exists():
        shutil.rmtree(dst_root)
    dst_root.mkdir(parents=True, exist_ok=True)
    for f in _iter_files(src_root):
        rel = f.relative_to(src_root)
        out = dst_root / rel
        out.parent.mkdir(parents=True, exist_ok=True)
        if _is_text(f):
            text = f.read_text(encoding="utf-8")
            out.write_text(text.replace(SRC_TOKEN, DST_TOKEN), encoding="utf-8")
        else:
            shutil.copy2(f, out)
    (dst_root / MARKER_NAME).write_text(MARKER_BODY, encoding="utf-8")


def _collect(base: Path) -> dict:
    if not base.exists():
        return {}
    out = {}
    for f in _iter_files(base):
        out[f.relative_to(base).as_posix()] = f.read_bytes()
    return out


def diff_against(src_root: Path, dst_root: Path) -> list:
    """Return sorted list of relative paths that would change if regenerated."""
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td) / "skills"
        build_mirror(src_root, tmp)
        want = _collect(tmp)
        have = _collect(dst_root)
    keys = set(want) | set(have)
    return sorted(k for k in keys if want.get(k) != have.get(k))


def main() -> None:
    root = repo_root()
    src = root / ".claude" / "skills"
    dst = root / ".codex" / "skills"
    check = "--check" in sys.argv[1:]
    if check:
        bad = diff_against(src, dst)
        if bad:
            print("STALE .codex/skills mirror — 다음 파일이 낡았습니다:", file=sys.stderr)
            for b in bad:
                print(f"  - .codex/skills/{b}", file=sys.stderr)
            print("\n재생성: python .claude/skills/slide/scripts/dev/sync_codex_mirror.py",
                  file=sys.stderr)
            sys.exit(1)
        print("mirror fresh")
        return
    build_mirror(src, dst)
    print(f"generated {dst} from {src}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python tests/test_sync_mirror.py`
Expected: `PASS test_sync_mirror`

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/slide/scripts/dev/sync_codex_mirror.py tests/test_sync_mirror.py
git commit -m "feat(codex): generative .codex/skills mirror + drift-check

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `@source` 등록 (Tailwind 스캔 안정화)

**Files:**
- Modify: `src/index.css:1` (직후에 추가)

- [ ] **Step 1: Add `@source` directives**

`src/index.css`의 1번째 줄 `@import "tailwindcss";` 직후에 추가 (THEME 블록 **밖**, 인프라 영역):

Edit `src/index.css` — change:
```css
@import "tailwindcss";
```
to:
```css
@import "tailwindcss";

/* 슬라이드/컴포넌트 워킹 카피는 .gitignore 대상이라 Tailwind 자동 소스 탐색에서
   누락될 수 있다. 명시적 @source로 두 호스트 모두에서 스타일 스캔을 보장한다. */
@source "./slides";
@source "./components";
```

- [ ] **Step 2: Verify build still succeeds**

Run: `npm run build`
Expected: 빌드 성공(에러 없음). `src/slides/`가 비어 있어도 `@source`는 에러를 내지 않는다.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "fix(build): register @source ./slides,./components for Tailwind scan

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: `preflight.py` — 시작 전 환경 게이트

**Files:**
- Create: `.claude/skills/slide/scripts/preflight.py`
- Test: `tests/test_preflight_helpers.py`

- [ ] **Step 1: Write the failing test**

Create `tests/test_preflight_helpers.py`:

```python
import importlib.util
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / ".claude/skills/slide/scripts/preflight.py"

def _mod():
    spec = importlib.util.spec_from_file_location("preflight", SCRIPT)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m

def test_pencil_active_parsing():
    m = _mod()
    assert m.is_pencil_active("● Active\nsome other line") is True
    assert m.is_pencil_active("Not authenticated") is False
    assert m.is_pencil_active("") is False

def test_repo_root_finds_markers():
    m = _mod()
    root = m.repo_root()
    assert (root / "package.json").exists()
    assert (root / ".claude").exists()

if __name__ == "__main__":
    test_pencil_active_parsing()
    test_repo_root_finds_markers()
    print("PASS test_preflight_helpers")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python tests/test_preflight_helpers.py`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `.claude/skills/slide/scripts/preflight.py`:

```python
#!/usr/bin/env python3
"""Pre-pipeline environment gate for slide-pencil (host-neutral).

Run BEFORE generating a deck. Exit != 0 on any hard failure with a
clear remediation message. No silent fallback.

Usage:
  python preflight.py            # base checks
  python preflight.py --images   # also require codex-image availability
"""
import sys
import shutil
import subprocess
from pathlib import Path


def repo_root() -> Path:
    here = Path(__file__).resolve()
    for p in [here] + list(here.parents):
        if (p / "package.json").exists() and (p / ".claude").exists():
            return p
    raise SystemExit("repo root (package.json + .claude) not found")


def is_pencil_active(status_output: str) -> bool:
    return "● Active" in (status_output or "")


def _which(name: str):
    return shutil.which(name) or shutil.which(name + ".cmd")


def main() -> None:
    root = repo_root()
    needs_images = "--images" in sys.argv[1:]
    fails = []

    # 1. node / npm
    if not _which("node"):
        fails.append("node 미설치 — Node.js 18+ 설치 필요")
    if not _which("npm"):
        fails.append("npm 미설치")

    # 2. pencil status == ● Active (HARD)
    pencil = _which("pencil")
    if not pencil:
        fails.append("pencil CLI 미설치 — `npm install -g @pencil.dev/cli` 후 `pencil login`")
    else:
        try:
            out = subprocess.run([pencil, "status"], capture_output=True,
                                 text=True, timeout=60)
            combined = (out.stdout or "") + (out.stderr or "")
            if not is_pencil_active(combined):
                fails.append("pencil 미인증/비활성 — `pencil login` 필요 "
                             "(status에 '● Active' 표시돼야 함). 출력: "
                             + combined.strip()[:200])
        except Exception as e:  # noqa: BLE001
            fails.append(f"pencil status 실행 실패: {e}")

    # 3. codex-image availability (이미지 필요 데크에서만)
    if needs_images and not _which("codex"):
        fails.append("codex CLI 미설치 — 진짜 이미지 생성 불가. "
                     "placeholder 금지 → HALT (codex login 필요)")

    # 4. @source "./slides" 등록 확인
    css = root / "src" / "index.css"
    if not css.exists() or '@source "./slides"' not in css.read_text(encoding="utf-8"):
        fails.append('src/index.css에 `@source "./slides"` 누락 (Task: @source 등록)')

    # 5. mirror freshness
    sync = root / ".claude/skills/slide/scripts/dev/sync_codex_mirror.py"
    r = subprocess.run([sys.executable, str(sync), "--check"],
                       capture_output=True, text=True)
    if r.returncode != 0:
        fails.append(".codex/skills 미러 stale — "
                     "`python .claude/skills/slide/scripts/dev/sync_codex_mirror.py` 재실행\n"
                     + (r.stdout + r.stderr).strip())

    if fails:
        print("PREFLIGHT FAIL:", file=sys.stderr)
        for f in fails:
            print("  - " + f, file=sys.stderr)
        sys.exit(1)
    print("preflight OK")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python tests/test_preflight_helpers.py`
Expected: `PASS test_preflight_helpers`

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/slide/scripts/preflight.py tests/test_preflight_helpers.py
git commit -m "feat(codex): preflight env gate (node/pencil/codex-image/mirror/@source)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: `verify_deck.py` — 완료 전 하드 페일 게이트

**Files:**
- Create: `.claude/skills/slide/scripts/verify_deck.py`
- Test: `tests/test_verify_helpers.py`

- [ ] **Step 1: Write the failing test**

Create `tests/test_verify_helpers.py`:

```python
import importlib.util, zipfile, tempfile
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / ".claude/skills/slide/scripts/verify_deck.py"

def _mod():
    spec = importlib.util.spec_from_file_location("verify_deck", SCRIPT)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m

def test_pptx_slide_count():
    m = _mod()
    with tempfile.TemporaryDirectory() as td:
        pptx = Path(td) / "x.pptx"
        with zipfile.ZipFile(pptx, "w") as z:
            z.writestr("ppt/slides/slide1.xml", "<x/>")
            z.writestr("ppt/slides/slide2.xml", "<x/>")
            z.writestr("ppt/slides/slide10.xml", "<x/>")
            z.writestr("ppt/slides/_rels/slide1.xml.rels", "<x/>")  # must NOT count
            z.writestr("docProps/app.xml", "<x/>")
        assert m.pptx_slide_count(pptx) == 3

def test_counts_consistent():
    m = _mod()
    assert m.counts_consistent({"tsx": 12, "pptx": 12, "plan": 12}) is True
    assert m.counts_consistent({"tsx": 12, "pptx": 11}) is False
    assert m.counts_consistent({"tsx": 12}) is True   # single source ok
    assert m.counts_consistent({}) is True

def test_image_too_small_is_placeholder():
    m = _mod()
    with tempfile.TemporaryDirectory() as td:
        tiny = Path(td) / "a.png"
        tiny.write_bytes(b"\x89PNG\r\n\x1a\n" + b"\x00" * 50)
        assert m.image_is_suspect(tiny, size_floor=3000)[0] is True
        big = Path(td) / "b.png"
        big.write_bytes(b"\x89PNG\r\n\x1a\n" + b"\x11" * 9000)
        # size ok; variance check is best-effort (None when PIL absent) -> not suspect
        suspect, _ = m.image_is_suspect(big, size_floor=3000)
        assert suspect is False

if __name__ == "__main__":
    test_pptx_slide_count()
    test_counts_consistent()
    test_image_too_small_is_placeholder()
    print("PASS test_verify_helpers")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python tests/test_verify_helpers.py`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `.claude/skills/slide/scripts/verify_deck.py`:

```python
#!/usr/bin/env python3
"""Hard-fail completion gate for slide-pencil decks (host-neutral).

Checks the GOLDEN ARTIFACTS that a correct Claude run leaves and a
shortcutting Codex run omits. Any failure -> exit 1, no silent pass.

Usage:
  python verify_deck.py <slug> [request_text...]

Operates on output/<slug>/. Pass the original request text as trailing
args so plan-bypass keywords (간단히/빠르게/quick/simple) can be honored.
"""
import sys
import json
import re
import zipfile
import subprocess
from pathlib import Path

PLAN_THRESHOLD = 10
IMG_SIZE_FLOOR = 3000          # bytes; below -> likely placeholder
IMG_VAR_FLOOR = 5.0            # pixel std-dev; below -> likely solid color
BYPASS_KEYWORDS = ("간단히", "빠르게", "quick", "simple", "plan 없이", "plan없이")
STATUS_OK = {"built", "pptx_ready", "verified"}
STATUS_BAD = {"fallback", "partial", "blocked"}
REQUIRED_STATUS_FIELDS = ["pencil_native_frames", "manifest_check",
                          "triple_gate", "embedded_images", "status"]
_SLIDE_XML = re.compile(r"^ppt/slides/slide\d+\.xml$")


def repo_root() -> Path:
    here = Path(__file__).resolve()
    for p in [here] + list(here.parents):
        if (p / "package.json").exists() and (p / ".claude").exists():
            return p
    raise SystemExit("repo root (package.json + .claude) not found")


def pptx_slide_count(pptx: Path) -> int:
    with zipfile.ZipFile(pptx) as z:
        bad = z.testzip()
        if bad is not None:
            raise ValueError(f"corrupt zip entry: {bad}")
        return sum(1 for n in z.namelist() if _SLIDE_XML.match(n))


def counts_consistent(counts: dict) -> bool:
    present = {k: v for k, v in counts.items() if isinstance(v, int) and v > 0}
    return len(set(present.values())) <= 1


def image_is_suspect(png: Path, size_floor: int = IMG_SIZE_FLOOR):
    """Return (suspect: bool, reason: str|None)."""
    sz = png.stat().st_size
    if sz < size_floor:
        return True, f"파일 과소({sz}B < {size_floor}B) — placeholder 의심"
    var = _png_std(png)
    if var is not None and var < IMG_VAR_FLOOR:
        return True, f"픽셀 분산 과소({var:.1f}) — 단색 의심"
    return False, None


def _png_std(png: Path):
    """Best-effort pixel std-dev via PIL; None if PIL unavailable."""
    try:
        from PIL import Image, ImageStat  # type: ignore
        with Image.open(png) as im:
            stat = ImageStat.Stat(im.convert("L"))
            return stat.stddev[0]
    except Exception:  # noqa: BLE001
        return None


def _first(paths):
    return paths[0] if paths else None


def main() -> None:
    if len(sys.argv) < 2:
        print("usage: verify_deck.py <slug> [request_text...]", file=sys.stderr)
        sys.exit(2)
    slug = sys.argv[1]
    request_text = " ".join(sys.argv[2:])
    bypass = any(k in request_text for k in BYPASS_KEYWORDS)

    root = repo_root()
    proj = root / "output" / slug
    fails = []
    if not proj.exists():
        print(f"output/{slug}/ 디렉터리 없음", file=sys.stderr)
        sys.exit(1)

    # ---- discover artifacts (recursive, layout-tolerant) ----
    pptx = _first(sorted(proj.rglob("*.pptx")))
    manifest = _first(sorted(proj.rglob("*-manifest.json")))
    plan = _first(sorted(proj.rglob("slide_plan.json")))
    status_f = _first(sorted(proj.rglob("pipeline_status.json")))
    tsx = sorted(proj.rglob("Slide*.tsx"))
    evals = [p for p in proj.rglob("*.png") if "_eval" in p.parts]
    pen = _first(sorted(proj.rglob("*.pen")))
    images = [p for p in proj.rglob("*.png") if "images" in p.parts]

    tsx_count = len(tsx)
    man_slides = -1
    pptx_count = -1
    plan_count = -1
    status = {}

    # ---- 1. manifest + check-manifest 5/5 ----
    if not manifest:
        fails.append("manifest(*-manifest.json) 없음")
    else:
        cm = root / ".claude/skills/slide/scripts/check-manifest.js"
        r = subprocess.run(["node", str(cm), str(manifest)],
                           capture_output=True, text=True)
        if r.returncode != 0 or "5/5" not in (r.stdout + r.stderr):
            fails.append("check-manifest 미통과: " + (r.stdout + r.stderr).strip()[:300])
        try:
            man_slides = len(json.loads(manifest.read_text(encoding="utf-8")).get("slides", []))
        except Exception as e:  # noqa: BLE001
            fails.append(f"manifest 파싱 실패: {e}")

    # ---- 2. PPTX zip integrity + slide count ----
    if not pptx:
        fails.append("PPTX(*.pptx) 없음")
    else:
        try:
            pptx_count = pptx_slide_count(pptx)
        except Exception as e:  # noqa: BLE001
            fails.append(f"PPTX zip 무결성/카운트 실패: {e}")

    # ---- 3. pipeline_status.json + required fields ----
    if not status_f:
        fails.append("pipeline_status.json 없음 — 절차 미준수 의심 (완료 시 작성 필수)")
    else:
        try:
            status = json.loads(status_f.read_text(encoding="utf-8"))
        except Exception as e:  # noqa: BLE001
            fails.append(f"pipeline_status.json 파싱 실패: {e}")
        for k in REQUIRED_STATUS_FIELDS:
            if k not in status:
                fails.append(f"pipeline_status.json 필드 누락: {k}")
        if status.get("status") not in STATUS_OK:
            fails.append(f"pipeline_status.status 비정상: {status.get('status')!r} "
                         f"(허용: {sorted(STATUS_OK)})")
        tg = str(status.get("triple_gate", "")).lower()
        if tg in ("fail", "false", "fallback", "partial"):
            fails.append(f"triple_gate 미통과: {status.get('triple_gate')!r}")

    # ---- 4. plan 강제 ----
    base_count = next((c for c in (man_slides, pptx_count, tsx_count) if c and c > 0), tsx_count)
    if base_count >= PLAN_THRESHOLD and not plan and not bypass:
        fails.append(f"슬라이드 {base_count}장 ≥ {PLAN_THRESHOLD} 인데 slide_plan.json 부재 "
                     f"(우회 키워드 없음)")
    if plan:
        try:
            pj = json.loads(plan.read_text(encoding="utf-8"))
            plan_count = len(pj.get("slides", []))
        except Exception as e:  # noqa: BLE001
            fails.append(f"slide_plan.json 파싱 실패: {e}")

    # ---- 5. 카운트 정합 (Pencil 실제 실행 강제) ----
    counts = {"tsx": tsx_count, "pptx": pptx_count, "manifest": man_slides}
    pnf = status.get("pencil_native_frames")
    if isinstance(pnf, int):
        counts["pencil_native_frames"] = pnf
    if plan_count > 0:
        counts["plan"] = plan_count
    if not counts_consistent(counts):
        present = {k: v for k, v in counts.items() if isinstance(v, int) and v > 0}
        fails.append(f"카운트 불일치(=Pencil 우회/누락 의심): {present}")

    # ---- 6. _eval PNG 수 ----
    if base_count > 0 and len(evals) < base_count:
        fails.append(f"_eval PNG {len(evals)}개 < 슬라이드 {base_count}장 (시각 검증 누락)")

    # ---- 7. Pencil 실제 실행 ----
    if not pen:
        fails.append(".pen 파일 없음 — Pencil-native 미실행(React fallback) 의심")
    elif pen.stat().st_size == 0:
        fails.append(".pen 0바이트 — save()~exit() 사이 sleep 1 누락 (references/pencil-cli.md)")
    if str(status.get("status")) in STATUS_BAD:
        fails.append(f"status={status.get('status')!r} — Pencil 우회/부분/차단")

    # ---- 8. 이미지 진위 ----
    for im in images:
        suspect, reason = image_is_suspect(im)
        if suspect:
            fails.append(f"이미지 {im.relative_to(root).as_posix()}: {reason}")

    # ---- 9. @source 등록 ----
    css = root / "src" / "index.css"
    if not css.exists() or '@source "./slides"' not in css.read_text(encoding="utf-8"):
        fails.append('src/index.css에 `@source "./slides"` 누락')

    # ---- 10. mirror freshness ----
    sync = root / ".claude/skills/slide/scripts/dev/sync_codex_mirror.py"
    r = subprocess.run([sys.executable, str(sync), "--check"],
                       capture_output=True, text=True)
    if r.returncode != 0:
        fails.append(".codex/skills 미러 stale — sync 재실행 필요")

    if fails:
        print(f"VERIFY FAIL ({slug}): {len(fails)}건", file=sys.stderr)
        for f in fails:
            print("  - " + f, file=sys.stderr)
        sys.exit(1)
    print(f"verify_deck OK: {slug} ({base_count} slides)")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python tests/test_verify_helpers.py`
Expected: `PASS test_verify_helpers`

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/slide/scripts/verify_deck.py tests/test_verify_helpers.py
git commit -m "feat(codex): hard-fail verify_deck gate (golden artifacts + count parity)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: `pipeline_status.json` 계약 — CLAUDE.md 명문화 (양쪽 호스트)

> `verify_deck.py`가 요구하는 필드를 **두 호스트 모두** 완료 시 기록하도록 CLAUDE.md에 추가한다. 기존 디자인 규칙은 건드리지 않고, "완료 산출물" 계약만 추가한다.

**Files:**
- Modify: `CLAUDE.md` (WorkOS 3-pipeline 운영 게이트 > 상태 파일 schema 블록)

- [ ] **Step 1: 기존 schema 블록 확장**

`CLAUDE.md`의 `### 상태 파일 schema` JSON 블록을 찾아, 아래 필드를 포함하도록 교체한다. (기존 필드는 유지하고 4개 게이트 필드를 추가.)

기존:
```json
{
  "pipeline": "slide-pencil",
  "project_slug": "",
  "status": "preflight|initialized|content_ready|built|pptx_ready|verified|uploaded|blocked|partial|fallback",
  "updated_at": "",
  "planned_slide_count": 0,
  "actual_content_count": 0,
  "pptx_path": null,
  "verification": {},
  "blocked_reason": null,
  "source_artifacts": []
}
```
교체:
```json
{
  "pipeline": "slide-pencil",
  "project_slug": "",
  "status": "preflight|initialized|content_ready|built|pptx_ready|verified|uploaded|blocked|partial|fallback",
  "updated_at": "",
  "planned_slide_count": 0,
  "actual_content_count": 0,
  "pencil_native_frames": 0,
  "manifest_check": "0/0",
  "triple_gate": "pass|fail|partial|fallback",
  "embedded_images": 0,
  "pptx_path": null,
  "verification": {},
  "blocked_reason": null,
  "source_artifacts": []
}
```

- [ ] **Step 2: 완료 시 작성 규칙 한 줄 추가**

`### 상태 파일 schema` 블록 바로 위(또는 "Pencil-native / Export 단계 분리" 절 시작 전)에 다음 문장을 추가:

```markdown
- **완료 산출물 (HARD, 두 호스트 공통):** 덱 생성이 끝나면 `output/<slug>/pipeline_status.json`을 위 schema로 기록한다. 최소 `pencil_native_frames`(= 활성 TSX 수 = PPTX 슬라이드 수 = plan slide 수), `manifest_check`("5/5" 형태), `triple_gate`(R2/R5/R6 결과), `embedded_images`, `status`를 채운다. `verify_deck.py`가 이 값을 실제 산출물과 교차 검증하므로 임의 값은 통과하지 못한다.
```

- [ ] **Step 3: 정합성 확인**

Read `CLAUDE.md`로 두 편집이 적용됐고 JSON이 유효한지 육안 확인. (실행 검증 없음 — 문서.)

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude): pipeline_status.json 게이트 필드 명문화 + 완료 작성 규칙

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: 루트 `AGENTS.md` — Codex 실행 규율

**Files:**
- Create: `AGENTS.md` (repo root)

- [ ] **Step 1: Write `AGENTS.md`**

Create `AGENTS.md`:

```markdown
# AGENTS.md — slide-pencil (Codex 진입점)

이 파일은 **Codex(클라우드/웹)** 가 이 repo를 실행할 때 읽는 진입 지시다.
Claude Code는 `/slide` Skill 런타임으로 동일 절차를 자동 수행하므로 이 파일이 필요 없다.

**전체 규칙의 단일 원천은 `CLAUDE.md`다 — 먼저 읽고 그대로 따른다.**
아래는 Codex에 슬래시-스킬 런타임이 없으므로 그 역할을 대신하는 실행 규율이다.

## 0. 핵심 원칙
품질 차이의 근원은 경로가 아니라 **"SKILL.md를 절차로 실행하지 않고 문서로 읽고 즉흥 구현(fallback)"** 하는 것이다. 아래를 **단계대로 실행**하고, 어떤 단계도 수기 재구현으로 대체하지 않는다.

## 1. 라우팅
슬라이드/덱/프레젠테이션/PPT 요청("슬라이드", "덱", "PPT", "make slides", "/slide") 감지 시:
→ **반드시 `.codex/skills/slide/SKILL.md`를 단계대로 실행**한다.
→ 문서를 요약만 하고 즉흥 구현하는 것 금지. **직접 React/manifest/PPTX 생성 같은 fallback 재구현 금지.**

## 2. 사전 단계 (자동 진입)
- 시작 시 `python .codex/skills/slide/scripts/preflight.py [--images]` 실행. 실패(exit≠0)면 **HALT**.
- 데크가 **외부보고·강의·세일즈·사용자 파일 기반·≥10장·명시적 품질요구** → 먼저 `.codex/skills/slide-plan/SKILL.md` 실행 → `output/<slug>/slide_plan.json` 생성.
  - 예외: 요청에 우회 키워드(`간단히`, `빠르게`, `quick`, `simple`, `plan 없이`)가 있을 때만 plan 생략.

## 3. Pencil CLI 규율 (slide-pencil 최대 품질 레버)
- 시작 전 `pencil status` 실제 실행 — `● Active`만 ready. 아니면 `npm install -g @pencil.dev/cli` + `pencil login` 안내 후 **HALT**.
- **Pencil-native frame이 실제로 생성돼야 한다 — React-only 우회 금지.** Pencil 단계 실패 시 `pipeline_status.json` status를 `fallback`/`partial`로 기록하고 완료 선언 금지.
- 저장된 `.pen`이 0바이트면 `save()`~`exit()` 사이 `sleep 1` 누락(`references/pencil-cli.md`) — 재구성 후 재시도.

## 4. 이미지 규율
- `/codex-image`(codex `image_gen`)만 사용. 시작 전 codex 로그인/가용성 선검사.
- 이미지가 필요한데 진짜 생성이 불가하면 **HALT** — PIL/placeholder/단색 이미지로 silent fallback 금지.
- 산출물 `src/images/<slot>.png`, 슬롯명 = 파일명.

## 5. 빌드/Export 규율
- `.codex/skills/slide/references/pptx-build.md` 룰(매니페스트 핸드크래프트, R2/R5/R6, `content` 필드) 준수.
- `node .codex/skills/slide/scripts/check-manifest.js <manifest>` 5/5 → `convert.js`로 PPTX 변환.
- `src/index.css`에 `@source "./slides"` 등록 유지.

## 6. 완료 게이트 (done 선언 전 필수)
- `output/<slug>/pipeline_status.json`을 CLAUDE.md schema로 기록(`pencil_native_frames`/`manifest_check`/`triple_gate`/`embedded_images`/`status`).
- `python .codex/skills/slide/scripts/verify_deck.py <slug> "<원본 요청문>"` 통과 필수. 실패 시 **완료 선언 금지** — 우회가 아니라 수정으로 해결.

## 7. 미러 주의
`.codex/skills`는 **생성물**이다. 직접 편집하지 말 것. 스킬을 고치려면 `.claude/skills`를 편집하고
`python .claude/skills/slide/scripts/dev/sync_codex_mirror.py`를 재실행한다.
```

- [ ] **Step 2: 링크 무결성 확인**

Run: `python - <<'PY'`
```python
from pathlib import Path
root = Path(".").resolve()
refs = [
    ".codex/skills/slide/SKILL.md",
    ".codex/skills/slide-plan/SKILL.md",
    ".codex/skills/slide/references/pptx-build.md",
    ".codex/skills/slide/references/pencil-cli.md",
]
missing = [r for r in refs if not (root / r).exists()]
print("MISSING:", missing if missing else "none (mirror 생성 후 재확인)")
PY
```
Expected: 미러를 아직 생성하지 않았으면 MISSING 목록이 나온다(정상 — Task 9에서 미러 생성 후 0건이어야 함). 이 단계는 경로 철자 확인용.

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md
git commit -m "feat(codex): root AGENTS.md — Codex 실행 규율 강제기

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Node 스크립트 경로 감사

> Explore 결과 `check-manifest.js`(findProjectRoot→package.json walk-up)와 `convert.js`(argv 기반)는 이미 경로 무관. `rasterize-svg-images.mjs`만 확인하고, 기능적 `.claude` 하드코딩이 있으면 교정한다.

**Files:**
- Inspect: `.claude/skills/slide/scripts/rasterize-svg-images.mjs`, `convert.js`, `check-manifest.js`

- [ ] **Step 1: `.claude` 리터럴 전수 확인**

Run (Grep tool 또는):
```bash
grep -n "\.claude" .claude/skills/slide/scripts/*.js .claude/skills/slide/scripts/*.mjs
```
Expected: 각 히트가 (a) 주석/usage 문자열(무수정 OK — 미러 치환이 처리) 인지 (b) 기능적 경로 해석(교정 대상)인지 분류.

- [ ] **Step 2: rasterize 경로 해석 확인**

Read `.claude/skills/slide/scripts/rasterize-svg-images.mjs` 상단(argv 파싱 + 입력 경로 해석). manifest 경로를 `process.argv`에서 받아 상대 처리하면 경로 무관 → 무수정. `.claude` 기준 절대경로를 만들면 → `import.meta.url` 파생으로 교정.

- [ ] **Step 3: (조건부) 교정**

기능적 하드코딩 발견 시에만: 해당 경로 계산을 다음 패턴으로 교체.
```javascript
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
const __dirname = dirname(fileURLToPath(import.meta.url))
// repo root = scripts/ 에서 4단 위 (slide/skills/.claude(or .codex)/<root>)
// 단, 가능하면 입력 인자(manifest 경로) 기준 상대 해석을 우선한다.
```
하드코딩이 없으면 이 Task는 "확인됨" 메모만 남기고 변경 없음.

- [ ] **Step 4: Commit (변경이 있을 때만)**

```bash
git add .claude/skills/slide/scripts/rasterize-svg-images.mjs
git commit -m "fix(codex): make rasterize path-independent (import.meta.url)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```
변경이 없으면 커밋 생략하고 다음 Task로.

---

## Task 8: 문서 — README + CLAUDE.md dual-host 워크플로

**Files:**
- Modify: `README.md` (섹션 추가)
- Modify: `CLAUDE.md` (sync 워크플로 한 줄)

- [ ] **Step 1: README dual-host 섹션 추가**

`README.md` 끝부분(또는 "사용 모드" 관련 섹션 뒤)에 추가:

```markdown
## Claude Code / Codex dual-host

이 repo는 Claude Code와 Codex(클라우드/웹) 양쪽에서 동작한다.

- **정본:** `.claude/skills/` — 사람이 편집하는 단일 원천.
- **미러:** `.codex/skills/` — `sync_codex_mirror.py` 생성물(커밋됨). **직접 편집 금지.**
- **Codex 진입점:** 루트 `AGENTS.md` — SKILL.md를 절차로 실행하도록 강제(즉흥 fallback 금지).
- **품질 게이트:** `preflight.py`(시작 전) / `verify_deck.py <slug>`(완료 전) — 하드 페일.

### 스킬을 고친 뒤 (중요)
`.claude/skills`를 편집했으면 반드시 미러를 재생성한다:

    python .claude/skills/slide/scripts/dev/sync_codex_mirror.py

pre-commit hook이 stale 미러 커밋을 차단한다. 훅 설치: `node scripts/install-hooks.mjs`.
```

- [ ] **Step 2: CLAUDE.md sync 워크플로 한 줄 추가**

`CLAUDE.md`의 "주요 경로 > 스킬" 섹션 또는 상단 운영 노트에 추가:

```markdown
- **dual-host:** 루트 `AGENTS.md`가 Codex 진입점. `.claude/skills` 수정 후 반드시 `python .claude/skills/slide/scripts/dev/sync_codex_mirror.py` 재실행(미러 `.codex/skills` 재생성). pre-commit hook이 stale을 차단.
```

- [ ] **Step 3: Commit**

```bash
git add README.md CLAUDE.md
git commit -m "docs: Claude Code / Codex dual-host 운영 가이드

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: 미러 생성 + pre-commit hook + 통합 테스트 + 최종 커밋

> 모든 `.claude/skills` 변경(Task 1·3·4·7)이 끝났으므로 이제 미러를 생성한다. 그 다음 hook을 설치하고, 통합 테스트로 동기성/링크/경로 해석을 검증한 뒤 커밋한다.

**Files:**
- Create: `scripts/install-hooks.mjs`, `.githooks/pre-commit`
- Create: `tests/test_codex_mirror.py`
- Generate: `.codex/skills/**`

- [ ] **Step 1: 미러 생성**

Run: `python .claude/skills/slide/scripts/dev/sync_codex_mirror.py`
Expected: `generated .../.codex/skills from .../.claude/skills`. 이후 `.codex/skills/slide/scripts/`에 `verify_deck.py`/`preflight.py`/`dev/sync_codex_mirror.py`와 `_GENERATED.md`가 존재.

- [ ] **Step 2: 미러 freshness 확인**

Run: `python .claude/skills/slide/scripts/dev/sync_codex_mirror.py --check`
Expected: `mirror fresh` (exit 0).

- [ ] **Step 3: pre-commit hook 파일 작성**

Create `.githooks/pre-commit`:
```sh
#!/bin/sh
# slide-pencil: .codex/skills 미러 staleness 차단
python .claude/skills/slide/scripts/dev/sync_codex_mirror.py --check || {
  echo ""
  echo "커밋 차단: .codex/skills 미러가 낡았습니다."
  echo "재생성: python .claude/skills/slide/scripts/dev/sync_codex_mirror.py"
  echo "그 다음 'git add .codex/skills' 후 다시 커밋하세요."
  exit 1
}
```

Create `scripts/install-hooks.mjs`:
```javascript
#!/usr/bin/env node
// git pre-commit hook을 .githooks/ 로 향하게 설정 (core.hooksPath)
import { execSync } from 'node:child_process'
import { chmodSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const hook = join(root, '.githooks', 'pre-commit')
if (!existsSync(hook)) {
  console.error('missing .githooks/pre-commit')
  process.exit(1)
}
try { chmodSync(hook, 0o755) } catch {}
execSync('git config core.hooksPath .githooks', { cwd: root, stdio: 'inherit' })
console.log('installed: core.hooksPath -> .githooks (pre-commit checks mirror freshness)')
```

- [ ] **Step 4: hook 설치 + 동작 확인**

Run: `node scripts/install-hooks.mjs`
Expected: `installed: core.hooksPath -> .githooks ...`

Run: `git config core.hooksPath`
Expected: `.githooks`

- [ ] **Step 5: 통합 테스트 작성**

Create `tests/test_codex_mirror.py`:
```python
import sys, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SYNC = ROOT / ".claude/skills/slide/scripts/dev/sync_codex_mirror.py"

def test_mirror_is_fresh():
    r = subprocess.run([sys.executable, str(SYNC), "--check"],
                       capture_output=True, text=True)
    assert r.returncode == 0, f"mirror stale:\n{r.stdout}\n{r.stderr}"

def test_agents_md_targets_exist():
    refs = [
        ".codex/skills/slide/SKILL.md",
        ".codex/skills/slide-plan/SKILL.md",
        ".codex/skills/slide/scripts/verify_deck.py",
        ".codex/skills/slide/scripts/preflight.py",
        ".codex/skills/slide/scripts/dev/sync_codex_mirror.py",
        ".codex/skills/slide/references/pptx-build.md",
        ".codex/skills/slide/references/pencil-cli.md",
    ]
    missing = [r for r in refs if not (ROOT / r).exists()]
    assert not missing, f"AGENTS.md targets missing in mirror: {missing}"

def test_mirror_substituted_paths():
    skill = (ROOT / ".codex/skills/slide/SKILL.md").read_text(encoding="utf-8")
    assert ".claude/skills" not in skill, "미러에 .claude/skills 잔존(치환 누락)"

def test_scripts_resolve_root_from_codex_depth():
    # .codex 깊이에서도 repo_root()가 동일 루트를 찾는지
    import importlib.util
    p = ROOT / ".codex/skills/slide/scripts/verify_deck.py"
    spec = importlib.util.spec_from_file_location("verify_deck_codex", p)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    assert m.repo_root() == ROOT

if __name__ == "__main__":
    test_mirror_is_fresh()
    test_agents_md_targets_exist()
    test_mirror_substituted_paths()
    test_scripts_resolve_root_from_codex_depth()
    print("PASS test_codex_mirror")
```

- [ ] **Step 6: 전체 테스트 실행**

Run:
```bash
python tests/test_sync_mirror.py && \
python tests/test_preflight_helpers.py && \
python tests/test_verify_helpers.py && \
python tests/test_codex_mirror.py
```
Expected: 네 줄 모두 `PASS ...`.

- [ ] **Step 7: 빌드 회귀 확인**

Run: `npm run build`
Expected: 성공(스타일 적용). dual-host 변경이 빌드를 깨지 않음을 확인.

- [ ] **Step 8: 최종 커밋 (미러 + hook + 통합 테스트)**

```bash
git add .codex/skills scripts/install-hooks.mjs .githooks/pre-commit tests/test_codex_mirror.py
git commit -m "feat(codex): generate .codex/skills mirror + pre-commit drift lock + integration tests

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: 최종 검증 (수동 end-to-end, 선택)

> 실제 덱 1개를 두 호스트 관점에서 게이트에 통과시켜 회귀가 없는지 확인. 산출물이 없으면 SKIP하고 사용자에게 "다음 실제 `/slide` 실행 후 `verify_deck.py`로 검증" 안내.

- [ ] **Step 1: 기존/신규 덱으로 verify 스모크**

`output/<slug>/`가 있으면:
Run: `python .claude/skills/slide/scripts/verify_deck.py <slug>`
Expected: PASS, 또는 실패 시 어떤 골든 산출물이 빠졌는지 명확한 메시지(게이트가 정상 동작함을 입증).

- [ ] **Step 2: 결과 요약**

게이트 출력(통과/실패 항목)을 사용자에게 보고. 실패면 그 항목이 "Codex가 빠뜨리던 흔적"과 일치하는지 대조.

---

## Self-Review (완료)

**Spec coverage:** 기둥 1(Task 1·9), 기둥 2/AGENTS.md(Task 6), 기둥 3 게이트(Task 3·4) + pipeline_status 계약(Task 5), 기둥 4 경로 무관(Task 1·3·4 walk-up + Task 7 Node 감사), 기둥 5 문서/테스트(Task 8·9). `@source`(Task 2), 드리프트 락 pre-commit(Task 9). spec 산출 파일 목록 전부 대응됨.

**보정 메모:** spec은 `pipeline_status.json`이 이미 emit된다고 가정했으나, 실제로는 slide 스킬이 emit하지 않음 → Task 5에서 "완료 시 작성" 계약을 CLAUDE.md에 추가하고 verify_deck가 실제 산출물과 교차검증해 위조 불가하게 함. `check-manifest.js`는 "5/5" 출력(스펙의 "N/N"을 5/5로 구체화).

**Placeholder scan:** 코드 단계 전부 완전한 코드 포함. "TBD"/"적절히 처리" 없음. Task 7·10은 조건부(변경 없으면 커밋 생략 / 산출물 없으면 SKIP)임을 명시.

**Type/이름 일관성:** `repo_root()`(3개 스크립트 동일 시그니처), `build_mirror`/`diff_against`/`pptx_slide_count`/`counts_consistent`/`image_is_suspect`/`is_pencil_active` 함수명이 테스트와 구현에서 일치. `pipeline_status.json` 필드명(`pencil_native_frames`/`manifest_check`/`triple_gate`/`embedded_images`/`status`)이 CLAUDE.md·verify_deck·AGENTS.md에서 동일.
