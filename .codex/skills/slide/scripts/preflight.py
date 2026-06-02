#!/usr/bin/env python3
"""Pre-pipeline environment gate for slide-pencil (host-neutral).

Run BEFORE generating a deck. Exit != 0 on any hard failure with a
clear remediation message. No silent fallback.

Usage:
  python preflight.py            # base checks
  python preflight.py --images   # also require host-specific image availability
"""
import sys
import shutil
import subprocess
from pathlib import Path

CANONICAL_SKILLS = "." + "claude/skills"


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


def running_from_codex_mirror() -> bool:
    return ".codex" in Path(__file__).resolve().parts


def main() -> None:
    root = repo_root()
    needs_images = "--images" in sys.argv[1:]
    codex_mirror = running_from_codex_mirror()
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
                                 text=True, encoding="utf-8", errors="replace",
                                 timeout=60)
            combined = (out.stdout or "") + (out.stderr or "")
            if not is_pencil_active(combined):
                fails.append("pencil 미인증/비활성 — `pencil login` 필요 "
                             "(status에 '● Active' 표시돼야 함). 출력: "
                             + combined.strip()[:200])
        except Exception as e:  # noqa: BLE001
            fails.append(f"pencil status 실행 실패: {e}")

    # 3. image availability (이미지 필요 데크에서만)
    # Claude Code uses the vendored CLI-backed image skill. The generated
    # .codex mirror uses Codex's built-in imagegen skill, so there is no CLI
    # binary to preflight there.
    if needs_images and not codex_mirror and not _which("codex"):
        fails.append("codex CLI 미설치 — 진짜 이미지 생성 불가. "
                     "placeholder 금지 → HALT (codex login 필요)")

    # 4. @source "./slides" 등록 확인
    css = root / "src" / "index.css"
    if not css.exists() or '@source "./slides"' not in css.read_text(encoding="utf-8"):
        fails.append('src/index.css에 `@source "./slides"` 누락 (Task: @source 등록)')

    # 5. mirror freshness
    sync = root / CANONICAL_SKILLS / "slide/scripts/dev/sync_codex_mirror.py"
    r = subprocess.run([sys.executable, str(sync), "--check"],
                       capture_output=True, text=True, encoding="utf-8",
                       errors="replace", timeout=120)
    if r.returncode != 0:
        fails.append(".codex/skills 미러 stale — "
                     f"`python {CANONICAL_SKILLS}/slide/scripts/dev/sync_codex_mirror.py` 재실행\n"
                     + (r.stdout + r.stderr).strip())

    if fails:
        print("PREFLIGHT FAIL:", file=sys.stderr)
        for f in fails:
            print("  - " + f, file=sys.stderr)
        sys.exit(1)
    print("preflight OK")


if __name__ == "__main__":
    main()
