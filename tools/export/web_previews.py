"""Renders the small JPEG previews the print builder shows: public/preview/<piece>_<page>.jpg.

Run from the project root after changing anything in public/pieces/:
    python3 tools/export/web_previews.py
Needs pdftoppm (poppler-utils) and Pillow.
"""
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

PX_PER_MM = 2.5
DPI = round(PX_PER_MM * 25.4)
ROOT = Path(__file__).resolve().parents[2]
SRC, OUT = ROOT / 'public/pieces', ROOT / 'public/preview'


def main() -> None:
    OUT.mkdir(exist_ok=True)
    pdfs = sorted(SRC.glob('*.pdf'))
    with tempfile.TemporaryDirectory() as tmp:
        for pdf in pdfs:
            prefix = Path(tmp) / pdf.stem
            subprocess.run(['pdftoppm', '-r', str(DPI), '-f', '1', '-l', '2', '-png', str(pdf), str(prefix)], check=True)
            for page in (0, 1):
                matches = sorted(Path(tmp).glob(f'{pdf.stem}-*{page + 1}.png'))
                if not matches:
                    continue
                Image.open(matches[-1]).convert('RGB').save(OUT / f'{pdf.stem}_{page}.jpg', quality=72, optimize=True, progressive=True)
            for f in Path(tmp).glob(f'{pdf.stem}-*.png'):
                f.unlink()
    total = sum(f.stat().st_size for f in OUT.glob('*.jpg'))
    print(f'{len(pdfs)} pieces, {total / 1e6:.1f} MB in {OUT}', file=sys.stderr)


if __name__ == '__main__':
    main()
