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
        suspect, _ = m.image_is_suspect(big, size_floor=3000)
        assert suspect is False

if __name__ == "__main__":
    test_pptx_slide_count()
    test_counts_consistent()
    test_image_too_small_is_placeholder()
    print("PASS test_verify_helpers")
