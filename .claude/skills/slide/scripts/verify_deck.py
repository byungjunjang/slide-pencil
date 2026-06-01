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
TRIPLE_GATE_OK = {"pass", "true", "verified"}
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

    # NOTE: slug당 산출물 1개를 가정. 중복 파일이 있으면 정렬상 첫 항목이 선택됨(사용자 오류).
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
        try:
            r = subprocess.run(["node", str(cm), str(manifest)],
                               capture_output=True, text=True, timeout=120)
            if r.returncode != 0:
                fails.append("check-manifest 미통과: " + (r.stdout + r.stderr).strip()[:300])
        except subprocess.TimeoutExpired:
            fails.append("check-manifest 타임아웃(120s) — 응답 없음")
        except FileNotFoundError:
            fails.append("node 실행 불가 — Node.js 설치 확인")
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
        if tg not in TRIPLE_GATE_OK:
            fails.append(f"triple_gate 미통과/미상: {status.get('triple_gate')!r} "
                         f"(허용: {sorted(TRIPLE_GATE_OK)})")

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
    try:
        r = subprocess.run([sys.executable, str(sync), "--check"],
                           capture_output=True, text=True, timeout=120)
        if r.returncode != 0:
            fails.append(".codex/skills 미러 stale — sync 재실행 필요")
    except subprocess.TimeoutExpired:
        fails.append(".codex/skills 미러 --check 타임아웃(120s)")

    if fails:
        print(f"VERIFY FAIL ({slug}): {len(fails)}건", file=sys.stderr)
        for f in fails:
            print("  - " + f, file=sys.stderr)
        sys.exit(1)
    print(f"verify_deck OK: {slug} ({base_count} slides)")


if __name__ == "__main__":
    main()
