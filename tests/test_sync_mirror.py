import tempfile
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
        (src / "slide" / "SKILL.md").write_text(
            "run `node .claude/skills/slide/scripts/convert.js`\n", encoding="utf-8")
        (src / "slide" / "logo.png").write_bytes(b"\x89PNG\r\n\x1a\n\x00\x01\x02\x03binary.claude/skills")
        dst = td / ".codex" / "skills"

        mod.build_mirror(src, dst)
        out_md = (dst / "slide" / "SKILL.md").read_text(encoding="utf-8")
        assert ".codex/skills/slide/scripts/convert.js" in out_md, "text token not substituted"
        assert ".claude/skills" not in out_md, "leftover .claude/skills in text"
        assert (dst / "slide" / "logo.png").read_bytes().endswith(b".claude/skills"), "binary was altered"
        assert (dst / "_GENERATED.md").exists(), "marker missing"
        assert mod.diff_against(src, dst) == [], "fresh mirror should match"

        (src / "slide" / "SKILL.md").write_text("changed .claude/skills\n", encoding="utf-8")
        assert mod.diff_against(src, dst) != [], "drift not detected"

if __name__ == "__main__":
    test_substitution_and_idempotence()
    print("PASS test_sync_mirror")
