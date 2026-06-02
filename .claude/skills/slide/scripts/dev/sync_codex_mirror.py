#!/usr/bin/env python3
"""Generate the .codex/skills mirror from canonical .claude/skills.

Canonical source : .claude/skills/   (humans edit ONLY here)
Generated output : .codex/skills/     (committed; DO NOT hand-edit)

Transform rules:
  - Skip Claude-only vendored skills that Codex already has natively.
  - In text files, replace the literal substring '.claude/skills' ->
    '.codex/skills'.
  - In text files, rewrite Claude-only image-backend references to Codex's
    built-in imagegen skill.
Binary files are copied byte-for-byte. This keeps the mirror self-contained
for Codex while the canonical tree stays the single source of truth.

After generating, build_mirror() asserts the mirror is free of Claude-only
image-backend leaks (see _assert_mirror_clean). The drift --check alone cannot
catch a silently-failed transform — it compares regeneration to the commit,
and both run the same transform — so this post-condition is the real guard.

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
# Build without the literal skill name so the generated .codex copy still
# excludes the Claude-only skill if someone runs the mirrored script.
CODEX_IMAGE_SKILL = "codex" + "-image"
CODEX_IMAGE_COMMAND = "/" + CODEX_IMAGE_SKILL
CODEX_MIRROR_EXCLUDE_SKILLS = {CODEX_IMAGE_SKILL}
# Sentinels that must NEVER survive into the generated Codex mirror. Each marks
# Claude-only image-backend content the transform is supposed to strip/rewrite.
# They live in canonical .claude only where the transform removes them (the
# Step 3.5 Claude-only preflight + the vendored skill name), so any occurrence
# in the mirror (outside the verbatim self-script) means a transform replace()
# silently no-op'd — e.g. someone reworded the canonical text out from under it.
CODEX_MIRROR_FORBIDDEN = (
    CODEX_IMAGE_SKILL,                 # vendored Claude-only image skill name
    "npm install -g @openai/codex",    # Claude-only image preflight
    "Logged in using ChatGPT",         # Claude-only image preflight
    "codex login status",              # Claude-only image preflight
)
EXCLUDE_SUFFIX = {".pyc", ".pyo"}
# Build these strings without the literal source token so the generated
# .codex copy can still compare canonical .claude sources correctly.
SRC_TOKEN = "." + "claude/skills"
DST_TOKEN = "." + "codex/skills"
MARKER_NAME = "_GENERATED.md"
MIRROR_SELF_PATH = "slide/scripts/dev/sync_codex_mirror.py"
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
        if rel_parts and rel_parts[0] in CODEX_MIRROR_EXCLUDE_SKILLS:
            continue
        if any(part in EXCLUDE_DIRS for part in rel_parts):
            continue
        if p.suffix.lower() in EXCLUDE_SUFFIX:
            continue
        yield p


def _is_text(p: Path) -> bool:
    return p.suffix.lower() in TEXT_EXTS


def _transform_text_for_codex(text: str) -> str:
    """Apply all text transforms for generated Codex skill files."""
    text = text.replace(SRC_TOKEN, DST_TOKEN)

    # Host-specific image backend rewrite. Keep the Codex mirror free of the
    # Claude-only vendored image skill while preserving the shared
    # src/images/<slot>.png output contract.
    text = text.replace(
        f"Claude Code에서는 vendored `{CODEX_IMAGE_COMMAND}` 스킬, Codex에서는 기본 `imagegen` 스킬(내장 `image_gen` tool)을 사용한다.",
        "Codex에서는 기본 `imagegen` 스킬(내장 `image_gen` tool)을 사용한다.",
    )
    text = text.replace(
        f" (Claude Code `{CODEX_IMAGE_COMMAND}`, Codex `imagegen`; 그 외 백엔드 금지)",
        " (Codex `imagegen`; 그 외 백엔드 금지)",
    )
    text = text.replace(
        f"""Claude Code에서만 `{CODEX_IMAGE_COMMAND}` 의존성인 Codex CLI 인증을 확인한다.

```bash
which codex 2>/dev/null && codex --version 2>/dev/null || echo "NOT_FOUND"
codex login status 2>&1 | head -1
```

- `NOT_FOUND` → 사용자에게 `npm install -g @openai/codex` 안내 후 **즉시 중단**. React 컴포넌트에서 빈 자리(placeholder div)로 진행하거나 사용자에게 해결을 요청.
- `Logged in using ChatGPT` 표시가 없으면 → `codex login` 안내 후 **즉시 중단**.
- Codex에서는 기본 `imagegen` tool 가용성을 별도 CLI로 확인하지 않는다. 실제 `image_gen` 호출이 실패하면 해당 실행은 HALT이며 placeholder로 대체하지 않는다.""",
        "Codex에서는 기본 `imagegen` tool 가용성을 별도 CLI로 확인하지 않는다. 실제 `image_gen` 호출이 실패하면 해당 실행은 HALT이며 placeholder로 대체하지 않는다.",
    )
    text = text.replace(f"Claude Code에서만 `{CODEX_IMAGE_COMMAND}` 의존성인 Codex CLI 인증을 확인한다.", "")
    text = text.replace(
        f"- Claude Code: 위 명령 형태로 `{CODEX_IMAGE_COMMAND}`를 호출한다. `--size`는 아래 \"사이즈 매핑\" 표, 프롬프트의 `<style anchor>` / `Avoid:`는 \"슬롯 타입별 스타일 앵커 어댑터\" 표를 따른다.\n",
        "",
    )
    text = text.replace(
        f"- Claude Code `{CODEX_IMAGE_COMMAND}`: `auth expired` / 401 → 사용자에게 `codex login` 재실행 안내 후 같은 슬롯 1회 재시도\n",
        "",
    )
    text = text.replace(
        f"- Claude Code `{CODEX_IMAGE_COMMAND}`: 트러스트 오류 → `--skip-git-repo-check` 누락 의심, 명령 재구성\n",
        "",
    )
    text = text.replace("**호출 예 (Claude Code illustration 슬롯, 16:9 헤로):**", "**프롬프트 예 (illustration 슬롯, 16:9 헤로):**")
    text = text.replace(CODEX_IMAGE_COMMAND, "imagegen")
    text = text.replace(CODEX_IMAGE_SKILL, "imagegen")
    text = text.replace("/imagegen", "imagegen")
    text = text.replace(
        "imagegen --size <size> --quality high --out <project_root>/src/images --filename <slot> \"<style anchor> <subject prompt> Avoid: <negative list>\"",
        "Use built-in imagegen once for `<slot>` with size intent `<size>` and prompt: \"<style anchor> <subject prompt> Avoid: <negative list>\". Then copy/move the selected PNG to `<project_root>/src/images/<slot>.png`.",
    )
    text = text.replace(
        "imagegen --size 1536x1024 --quality high --out src/images --filename cover-hero \"minimal flat illustration, line-art style, muted pastel tones aligned with #4633E3 indigo accent, clean solid off-white background, no gradients, no glow, no 3D rendering. Subject: abstract knowledge network connecting nodes, conceptual. Avoid: text, watermark, logo, photograph, photorealistic, 3D render, gradient, glow, neon, rainbow, stock photo, low quality, blurry\"",
        "Use built-in imagegen once with size intent `1536x1024` and prompt: \"minimal flat illustration, line-art style, muted pastel tones aligned with #4633E3 indigo accent, clean solid off-white background, no gradients, no glow, no 3D rendering. Subject: abstract knowledge network connecting nodes, conceptual. Avoid: text, watermark, logo, photograph, photorealistic, 3D render, gradient, glow, neon, rainbow, stock photo, low quality, blurry\". Save the selected PNG as `src/images/cover-hero.png`.",
    )
    text = text.replace("Skill tool, skill=imagegen", "built-in imagegen skill")
    text = text.replace("skill=imagegen", "built-in imagegen")
    return text


def _assert_mirror_clean(dst_root: Path) -> None:
    """Fail loudly if any Claude-only image-backend content leaked into the mirror.

    The verbatim self-script defines these sentinels on purpose, so it is the
    one file exempt from the scan.
    """
    leaks = []
    for p in _iter_files(dst_root):
        rel = p.relative_to(dst_root).as_posix()
        if rel == MIRROR_SELF_PATH or not _is_text(p):
            continue
        text = p.read_text(encoding="utf-8")
        for token in CODEX_MIRROR_FORBIDDEN:
            if token in text:
                leaks.append((rel, token))
    if leaks:
        detail = "\n".join(f"  - {DST_TOKEN}/{rel}: 금지 토큰 '{tok}'" for rel, tok in leaks)
        raise SystemExit(
            "미러 누출 감지 — Codex 미러에 Claude 전용 이미지 백엔드 내용이 남았습니다.\n"
            "host-specific transform이 (canonical 텍스트 변경 등으로) 매칭에 실패했을 수 있습니다.\n"
            "_transform_text_for_codex의 치환 타겟을 canonical 원문과 다시 맞추세요:\n" + detail
        )


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
            if rel.as_posix() == MIRROR_SELF_PATH:
                out.write_text(text, encoding="utf-8")
            else:
                out.write_text(_transform_text_for_codex(text), encoding="utf-8")
        else:
            shutil.copy2(f, out)
    (dst_root / MARKER_NAME).write_text(MARKER_BODY, encoding="utf-8")
    _assert_mirror_clean(dst_root)


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
