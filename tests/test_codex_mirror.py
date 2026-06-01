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
    import importlib.util
    p = ROOT / ".codex/skills/slide/scripts/verify_deck.py"
    spec = importlib.util.spec_from_file_location("verify_deck_codex", p)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    assert m.repo_root() == ROOT

def test_codex_sync_script_checks_canonical_source():
    sync = ROOT / ".codex/skills/slide/scripts/dev/sync_codex_mirror.py"
    r = subprocess.run([sys.executable, str(sync), "--check"],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    assert r.returncode == 0, f"codex-entry sync check failed:\n{r.stdout}\n{r.stderr}"

if __name__ == "__main__":
    test_mirror_is_fresh()
    test_agents_md_targets_exist()
    test_mirror_substituted_paths()
    test_scripts_resolve_root_from_codex_depth()
    print("PASS test_codex_mirror")
