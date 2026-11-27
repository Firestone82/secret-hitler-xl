"""Builds the borderless boards (public/cards/boards/borderless/*.pdf) from the boards with border (public/cards/boards/*.pdf).

A borderless board is the inner track of a board, cut just outside its dotted rope edge, with a new
narrow frame drawn around it in the board's own colours: a light band, a thin light line and a dark
edge that runs on into the bleed. The track itself stays at 100 %, so the tiles fit its slots.

Run from the project root, then refresh the previews and the sizes in plan.ts (INSERT_MM):
    python3 tools/export/borderless_boards.py
    python3 tools/export/card_images.py boards/borderless/liberal boards/borderless/fascist_5-6 boards/borderless/fascist_7-8 \
        boards/borderless/fascist_9-10 boards/borderless/communist
Needs pdftoppm (poppler-utils), Pillow and reportlab.
"""
import io
import json
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[2]
BOARDS_DIR = ROOT / 'public/cards/boards'
PX = 10          # pixels per mm, about what the board pictures have
BLEED = 3.0      # mm, as every piece file
BAND, LINE, EDGE = 1.2, 1.0, 2.0   # mm: the new frame, from the track outwards

# The track of each board plus its footer strip (mm on the 395 x 134 mm board): the box starts just outside the dotted rope
# and runs down past the footer (the election tracker, or the player-count note) to the board's inner rule,
# and the colours of the frame: dark edge, light line, band (the colour just outside the rope).
LIB = dict(dark=(0, 77, 107), line=(247, 254, 255), band=(97, 200, 217), back=(97, 201, 217))
FAS = dict(dark=(150, 2, 1), line=(255, 250, 176), band=(230, 100, 68), back=(230, 100, 68))
COM = dict(dark=(150, 2, 1), line=(255, 251, 177), band=(230, 73, 66), back=(230, 72, 66))
BOARDS = {
    'liberal': ((55.7, 27.4, 339.2, 125.0), LIB, 'Liberal board (borderless)'),
    'fascist_5-6': ((28.5, 28.0, 365.8, 123.5), FAS, 'Fascist board 5-6 players (borderless)'),
    'fascist_7-8': ((28.5, 28.0, 365.8, 123.5), FAS, 'Fascist board 7-8 players (borderless)'),
    'fascist_9-10': ((28.5, 28.0, 365.8, 123.5), FAS, 'Fascist board 9+ players (borderless)'),
    'communist': ((29.1, 28.8, 365.8, 122.6), COM, 'Communist board (borderless)'),
}


def render_board(key: str, tmp: Path) -> Image.Image:
    """Page 1 of b_<key>.pdf at PX pixels per mm, bleed included."""
    prefix = tmp / key
    subprocess.run(['pdftoppm', '-r', str(round(PX * 25.4)), '-f', '1', '-l', '1', '-singlefile', '-png',
                    str(BOARDS_DIR / f'{key}.pdf'), str(prefix)], check=True)
    return Image.open(f'{prefix}.png').convert('RGB')


def build(key: str, tmp: Path) -> tuple[float, float]:
    (x0, y0, x1, y1), c, _ = BOARDS[key]
    src = render_board(key, tmp)
    sx = src.width / (395 + 2 * BLEED)        # the render is exactly PX per mm, but measure to be safe
    track = src.crop(tuple(round((v + BLEED) * sx) for v in (x0, y0, x1, y1)))
    frame = BAND + LINE + EDGE
    w, h = round(x1 - x0 + 2 * frame, 1), round(y1 - y0 + 2 * frame, 1)
    W, H = w + 2 * BLEED, h + 2 * BLEED
    img = Image.new('RGB', (round(W * PX), round(H * PX)), c['dark'])
    d = ImageDraw.Draw(img)
    def box(inset: float, colour):
        d.rectangle([round(inset * PX), round(inset * PX), round((W - inset) * PX) - 1, round((H - inset) * PX) - 1], fill=colour)
    box(BLEED + EDGE, c['line'])
    box(BLEED + EDGE + LINE, c['band'])
    img.paste(track.resize((round((x1 - x0) * PX), round((y1 - y0) * PX)), Image.LANCZOS), (round((BLEED + frame) * PX), round((BLEED + frame) * PX)))

    out = BOARDS_DIR / 'borderless' / f'{key}.pdf'
    pdf = canvas.Canvas(str(out), pagesize=(W * mm, H * mm))
    buf = io.BytesIO(); img.save(buf, 'JPEG', quality=90); buf.seek(0)
    pdf.drawImage(ImageReader(buf), 0, 0, W * mm, H * mm); pdf.showPage()
    pdf.setFillColorRGB(*[v / 255 for v in c['back']]); pdf.rect(0, 0, W * mm, H * mm, stroke=0, fill=1); pdf.showPage()
    pdf.save()
    return w, h


def main() -> None:
    sizes = {}
    with tempfile.TemporaryDirectory() as t:
        for key in BOARDS:
            sizes[key] = build(key, Path(t))
            print(f'borderless/{key}: {sizes[key][0]} x {sizes[key][1]} mm', file=sys.stderr)
    # keep cards.json in step with the new sizes
    pj = ROOT / 'public/data/cards.json'
    data = json.loads(pj.read_text())
    for key, (w, h) in sizes.items():
        data[f'boards/borderless/{key}'].update(w=w, h=h, label=BOARDS[key][2])
    pj.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
    print('INSERT_MM = {', ', '.join(f"'{k}': [{w}, {h}]" for k, (w, h) in sizes.items()), '}', file=sys.stderr)


if __name__ == '__main__':
    main()
