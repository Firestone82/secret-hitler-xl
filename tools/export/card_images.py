"""Renders the pictures of every printable piece from its PDF in public/cards/.

For each entry of public/data/cards.json (key = path under public/cards, without extension):
    <id>.jpg          the front at full size, 12 px/mm (about 300 dpi), cut size without the bleed
    thumb/<id>.jpg    the same at 5 px/mm, for pages that show many pieces at once
and for the back (page 2 of the PDF), named by the entry's "back":
    backs/<name>.jpg  a back that many pieces share (all Secret Role cards, all policy tiles, ...)
    <id>_back.jpg     a back of its own, when "back" is missing
An entry whose "back" is its own id has the same picture on both sides.

Run from the project root after changing anything in public/cards/:
    python3 tools/export/card_images.py [card ids...]
Needs pdftoppm (poppler-utils) and Pillow.
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
CARDS = ROOT / 'public/cards'
FULL, THUMB = 12, 5      # pixels per mm
BLEED = 3.0              # mm, as every piece file


def back_name(cid: str, info: dict) -> str:
    return info.get('back') or cid + '_back'


def main() -> None:
    cards = json.loads((ROOT / 'public/data/cards.json').read_text())
    only = set(sys.argv[1:])
    done_backs: set = set()
    for cid, info in cards.items():
        if only and cid not in only:
            continue
        pdf = CARDS / f'{cid}.pdf'
        size = (info['w'], info['h'])
        render(pdf, 1, size, cid)
        back = back_name(cid, info)
        if back != cid and back not in done_backs:
            render(pdf, 2, size, back)
            done_backs.add(back)
    total = sum(f.stat().st_size for f in CARDS.rglob('*.jpg') if 'portraits' not in f.parts)
    print(f'{total / 1e6:.1f} MB of card pictures in {CARDS}', file=sys.stderr)


def render(pdf: Path, page: int, size: tuple, name: str) -> None:
    w, h = size
    with tempfile.TemporaryDirectory() as tmp:
        # render a little larger than needed, then crop the bleed and scale to the exact size
        dpi = round(FULL * 25.4 * 1.25)
        subprocess.run(['pdftoppm', '-r', str(dpi), '-f', str(page), '-l', str(page), '-singlefile', '-png',
                        str(pdf), f'{tmp}/p'], check=True)
        im = Image.open(f'{tmp}/p.png').convert('RGB')
    sx, sy = im.width / (w + 2 * BLEED), im.height / (h + 2 * BLEED)
    im = im.crop((round(BLEED * sx), round(BLEED * sy), round((BLEED + w) * sx), round((BLEED + h) * sy)))
    save(sharpen(im.resize((round(w * FULL), round(h * FULL)), Image.LANCZOS)), CARDS / f'{name}.jpg', 86)
    save(sharpen(im.resize((round(w * THUMB), round(h * THUMB)), Image.LANCZOS), 0.6), CARDS / 'thumb' / f'{name}.jpg', 82)


def sharpen(im: Image.Image, amount: float = 1.0) -> Image.Image:
    """A light unsharp mask: the art is flat colour with crisp edges, so a small radius is enough."""
    return im.filter(ImageFilter.UnsharpMask(radius=1.0, percent=round(70 * amount), threshold=2))


def save(im: Image.Image, path: Path, quality: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, quality=quality, optimize=True, progressive=True)


if __name__ == '__main__':
    main()
