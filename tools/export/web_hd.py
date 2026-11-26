"""Full-size pictures for the rulebook lightbox: public/rb/hd/<name>.jpg.

The pictures in public/rb are small, sized for the page. When one is opened at full size, the
rulebook loads public/rb/hd/<same name> instead, if it exists. These are taken from the
print-quality images inside public/pieces/*.pdf (page 1, the front, with the 3 mm bleed and any white margin cut off),
or from public/cards when no piece PDF has the picture.

Run from the repository root: python3 tools/export/web_hd.py  (needs pdfimages and Pillow)
"""
import glob, os, subprocess, tempfile
from PIL import Image, ImageChops

PIECES, OUT = 'public/pieces', 'public/rb/hd'
BLEED_PT = 3 / 25.4 * 72
# rulebook picture -> piece PDF (or a cards/ image)
SOURCES = {
    'c015': 'c_ja', 'c038': 'c_nein', 'c061': 'c_h_061', 'c069': 'c_069', 'c077': 'c_draw', 'c079': 'c_discard',
    'c086': 'c_086', 'c093': 'c_h_093', 'c095': 'c_h_095', 'c098': 'c_098',
    'c176': 'cards/176.jpg', 'c200': 'cards/200.jpg',
    'p005': 't_p005', 'p018': 't_p018', 'p104': 't_p104',
    'board_liberal': 'b_liberal', 'board_communist': 'b_communist', 'board_fascist_7-8': 'b_fascist_7-8',
    **{f'r_{r}': f'c_h_r_{r}' for r in ('anarchist', 'bodyguard', 'bureaucrat', 'capitalist', 'centrist_a', 'centrist_b',
                                         'detective', 'fascist_spy', 'jester', 'liberal_spy', 'monarchist', 'propagandist')},
}

def page_size(pdf):
    out = subprocess.run(['pdfinfo', pdf], capture_output=True, text=True, check=True).stdout
    w, _, h = next(l for l in out.splitlines() if l.startswith('Page size')).split(':')[1].split()[:3]
    return float(w), float(h)

def front(pdf):
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(['pdfimages', '-f', '1', '-l', '1', '-j', pdf, f'{tmp}/i'], check=True)
        im = Image.open(sorted(glob.glob(f'{tmp}/i-*'))[0]).convert('RGB')
    if os.path.basename(pdf).startswith('b_'):
        return im                                   # boards: the picture is the board art itself, no bleed
    pw, ph = page_size(pdf)
    dx, dy = round(im.width * BLEED_PT / pw), round(im.height * BLEED_PT / ph)
    return trim(im.crop((dx, dy, im.width - dx, im.height - dy)))

def trim(im):
    """Cuts the white margin some pieces keep around the card."""
    diff = ImageChops.difference(im, Image.new('RGB', im.size, 'white')).convert('L').point(lambda v: 255 if v > 24 else 0)
    box = diff.getbbox()
    return im.crop(box) if box else im

os.makedirs(OUT, exist_ok=True)
for name, src in SOURCES.items():
    im = Image.open(f'public/{src}').convert('RGB') if '/' in src else front(f'{PIECES}/{src}.pdf')
    im.thumbnail((2400, 2400) if name.startswith('board') else (1200, 1200), Image.LANCZOS)
    im.save(f'{OUT}/{name}.jpg', quality=85, optimize=True, progressive=True)
    print(name, im.size)
