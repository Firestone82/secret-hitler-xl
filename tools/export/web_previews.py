"""Renders the JPEG previews the print builder shows: public/preview/<piece>_<page>.jpg for the page,
and sharper ones in public/preview/hd/ for the full-screen view.

Run from the project root after changing anything in public/pieces/:
    python3 tools/export/web_previews.py [piece ids...]
Needs pdftoppm (poppler-utils) and Pillow.
"""
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

# (output folder, pixels per mm, JPEG quality)
SIZES = [('.', 2.5, 72), ('hd', 5, 70)]
ROOT = Path(__file__).resolve().parents[2]
SRC, OUT = ROOT / 'public/pieces', ROOT / 'public/preview'


def main() -> None:
    only = set(sys.argv[1:])   # piece ids to redo, all when empty
    pdfs = [p for p in sorted(SRC.glob('*.pdf')) if not only or p.stem in only]
    for sub, px, q in SIZES:
        render(pdfs, OUT / sub, round(px * 25.4), q)
    total = sum(f.stat().st_size for f in OUT.rglob('*.jpg'))
    print(f'{len(pdfs)} pieces, {total / 1e6:.1f} MB in {OUT}', file=sys.stderr)


def render(pdfs: list, out: Path, dpi: int, quality: int) -> None:
    out.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        for pdf in pdfs:
            prefix = Path(tmp) / pdf.stem
            subprocess.run(['pdftoppm', '-r', str(dpi), '-f', '1', '-l', '2', '-png', str(pdf), str(prefix)], check=True)
            for page in (0, 1):
                matches = sorted(Path(tmp).glob(f'{pdf.stem}-*{page + 1}.png'))
                if not matches:
                    continue
                Image.open(matches[-1]).convert('RGB').save(out / f'{pdf.stem}_{page}.jpg', quality=quality, optimize=True, progressive=True)
            for f in Path(tmp).glob(f'{pdf.stem}-*.png'):
                f.unlink()


if __name__ == '__main__':
    main()
