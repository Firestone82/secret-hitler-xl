/**
 * Renders the Role Briefing cards to JPEG: public/cards/briefing/<role>.jpg and blank_<palette>.jpg, cut size at
 * 12 px/mm, with 5 px/mm copies in public/cards/thumb/briefing/. The PDFs themselves are drawn from the role
 * files when you build them; only the pictures on the site (print preview, assets page) need these.
 *
 * Run from the project root after changing briefing text in public/data/roles/:
 *   npx tsx tools/export/briefing_images.mts
 * Needs pdftoppm (poppler-utils) and Python with Pillow.
 */
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadRoles } from '../../src/app/core/load-data';
import { Renderer } from '../../src/app/print/render';
import type { Face, Slot } from '../../src/app/print/plan';

const OUT = 'public/cards/briefing', THUMB = 'public/cards/thumb/briefing';
const BLEED = 3, W = 63.5, H = 88;
const data = await loadRoles(async (p) => JSON.parse(await readFile('public/' + p, 'utf8')));
const r = new Renderer((p) => readFile('public/' + p).then((b) => new Uint8Array(b)));
const faces: [string, Face][] = [
  ...data.roles.map((x) => [x.id, { type: 'briefing', role: x.id }] as [string, Face]),
  ...['lib', 'fas', 'com', 'neu'].map((p) => ['blank_' + p, { type: 'blankBriefing', palette: p }] as [string, Face]),
];
await mkdir(OUT, { recursive: true });
await mkdir(THUMB, { recursive: true });
const tmp = await mkdtemp(join(tmpdir(), 'briefing-'));
try {
  for (const [name, face] of faces) {
    const slot: Slot = { front: face, back: face, name, size: 'card' };
    // facePdf is the renderer's own one-piece export: the card with its full 3 mm bleed
    const pdf: Uint8Array = await (r as unknown as { facePdf(s: Slot, f: Face, d: unknown): Promise<Uint8Array> }).facePdf(slot, face, data);
    const src = join(tmp, name + '.pdf');
    await writeFile(src, pdf);
    execFileSync('pdftoppm', ['-r', '381', '-singlefile', '-png', src, join(tmp, name)]);
    // crop the bleed, then save the full size and the thumbnail
    execFileSync('python3', ['-c', `
import sys
from PIL import Image, ImageFilter
src, full, thumb, b, w, h = sys.argv[1], sys.argv[2], sys.argv[3], *map(float, sys.argv[4:])
im = Image.open(src).convert('RGB'); s = im.width / (w + 2 * b)
im = im.crop((round(b * s), round(b * s), round((b + w) * s), round((b + h) * s)))
sharp = lambda x, p: x.filter(ImageFilter.UnsharpMask(radius=1.0, percent=p, threshold=2))
sharp(im.resize((round(w * 12), round(h * 12)), Image.LANCZOS), 70).save(full, quality=86, optimize=True, progressive=True)
sharp(im.resize((round(w * 5), round(h * 5)), Image.LANCZOS), 40).save(thumb, quality=82, optimize=True, progressive=True)
`, join(tmp, name + '.png'), join(OUT, name + '.jpg'), join(THUMB, name + '.jpg'), String(BLEED), String(W), String(H)]);
  }
  console.error(`${faces.length} briefing pictures in ${OUT}`);
} finally {
  await rm(tmp, { recursive: true, force: true });
}
