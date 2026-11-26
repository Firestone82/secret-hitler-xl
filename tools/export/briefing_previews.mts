/**
 * Renders the Role Briefing cards to JPEG for the print builder's preview: public/preview/briefing/<role>.jpg
 * and blank_<palette>.jpg, cut size plus 3 mm bleed at 8 px/mm. The PDFs themselves are drawn from roles.json
 * when you build them; only the preview needs these pictures.
 *
 * Run from the project root after changing briefing text in public/data/roles.json:
 *   npx tsx tools/export/briefing_previews.mts
 * Needs pdftoppm (poppler-utils).
 */
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Renderer } from '../../src/app/print/render';
import type { Face, Slot } from '../../src/app/print/plan';

const OUT = 'public/preview/briefing';
const data = JSON.parse(await readFile('public/data/roles.json', 'utf8'));
const r = new Renderer((p) => readFile('public/' + p).then((b) => new Uint8Array(b)));
const faces: [string, Face][] = [
  ...data.roles.map((x: { id: string }) => [x.id, { type: 'briefing', role: x.id }] as [string, Face]),
  ...['lib', 'fas', 'com', 'neu'].map((p) => ['blank_' + p, { type: 'blankBriefing', palette: p }] as [string, Face]),
];
await mkdir(OUT, { recursive: true });
const tmp = await mkdtemp(join(tmpdir(), 'briefing-'));
try {
  for (const [name, face] of faces) {
    const slot: Slot = { front: face, back: face, name, size: 'card' };
    // facePdf is the renderer's own one-piece export: the card with its full 3 mm bleed
    const pdf: Uint8Array = await (r as unknown as { facePdf(s: Slot, f: Face, d: unknown): Promise<Uint8Array> }).facePdf(slot, face, data);
    const src = join(tmp, name + '.pdf');
    await writeFile(src, pdf);
    execFileSync('pdftoppm', ['-r', '203', '-singlefile', '-jpeg', '-jpegopt', 'quality=82,progressive=y', src, join(OUT, name)]);
  }
  console.error(`${faces.length} briefing previews in ${OUT}`);
} finally {
  await rm(tmp, { recursive: true, force: true });
}
