#!/usr/bin/env python3
"""Generate the .codex/skills mirror from canonical .codex/skills.

Canonical source : .codex/skills/   (humans edit ONLY here)
Generated output : .codex/skills/     (committed; DO NOT hand-edit)

Transform rule (the ONLY transform): in text files, replace the literal
substring '.codex/skills' -> '.codex/skills'. Binary files are copied
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
# NOTE: "assets"는 repo .gitignore의 `assets/` 규칙에 걸려 git add가 무시한다.
# 미러에 생성하면 커밋에서 누락돼 fresh clone의 drift-check가 영구 실패하므로
# 미러링에서 제외한다. Codex는 필요 시 .claude/.../assets를 직접 참조(디스크 공존).
EXCLUDE_DIRS = {"__pycache__", "node_modules", ".venv", ".git", ".pytest_cache", "assets"}
EXCLUDE_SUFFIX = {".pyc", ".pyo"}
# Build these strings without the literal source token so the generated
# .codex copy can still compare canonical .claude sources correctly.
SRC_TOKEN = "." + "claude/skills"
DST_TOKEN = "." + "codex/skills"
MARKER_NAME = "_GENERATED.md"
MARKER_BODY = (
    "# GENERATED — DO NOT EDIT\n\n"
    "이 트리는 `" + SRC_TOKEN + "/slide/scripts/dev/sync_codex_mirror.py`의 생성물입니다.\n"
    "직접 편집하지 마세요. `" + SRC_TOKEN + "`를 수정한 뒤 sync를 재실행하세요:\n\n"
    "    python " + SRC_TOKEN + "/slide/scripts/dev/sync_codex_mirror.py\n"
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
            print("\n재생성: python .codex/skills/slide/scripts/dev/sync_codex_mirror.py",
                  file=sys.stderr)
            sys.exit(1)
        print("mirror fresh")
        return
    build_mirror(src, dst)
    print(f"generated {dst} from {src}")


if __name__ == "__main__":
    main()
