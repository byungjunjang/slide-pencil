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
