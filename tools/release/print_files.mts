/**
 * Builds the files of a GitHub release into release/ (or the folder given as the first argument):
 *
 *   npx tsx tools/release/print_files.mts [out dir]
 *
 * - the full game as one print-ready PDF for A3 and one for A4, with the print builder's default options
 *   (19 players, every module and role, the Role Briefings);
 * - the same set as single-piece PDFs for a print service, zipped with manifest.csv and README.txt;
 * - the rulebook PDFs from public/rulebook/pdf/ (rebuild them first with tools/export/rulebook_pdf.mjs
 *   when the rules changed);
 * - release-notes.md, from the rulebook's changelog entry for the current version.
 *
 * It runs the same generator as the print builder page (src/app/print/), so the files are what the
 * site makes with the default options.
 */
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import JSZip from 'jszip';
import { setCardCatalog } from '../../src/app/core/assets';
import { loadCards, loadRoles, loadRulebook } from '../../src/app/core/load-data';
import { layout } from '../../src/app/print/layout';
import { DEFAULT_OPTIONS, Paper, PrintOptions, normalise } from '../../src/app/print/options';
import { pieceLabel, pieceReadme } from '../../src/app/print/pieces-readme';
import { makePlan, setSeatTables } from '../../src/app/print/plan';
import { Renderer } from '../../src/app/print/render';

const OUT = process.argv[2] ?? 'release';
const PUB = 'public/';
const json = async <T,>(p: string): Promise<T> => JSON.parse(await readFile(PUB + p, 'utf8'));

const [roles, rulebook, cards] = await Promise.all([loadRoles(json), loadRulebook(json), loadCards(json)]);
setSeatTables(rulebook.setup);
setCardCatalog(cards);
const version = rulebook.version;
const tag = `v${version}`;

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const renderer = new Renderer(async (p) => new Uint8Array(await readFile(PUB + p)));
const options = (o: Partial<PrintOptions>) =>
  normalise({ ...DEFAULT_OPTIONS, ...o }, (id) => !!roles.roles.find((r) => r.id === id)?.needsCommunists);
const mb = (n: number) => `${(n / 1e6).toFixed(1)} MB`;
const written: string[] = [];
const put = async (name: string, bytes: Uint8Array | string) => {
  await writeFile(join(OUT, name), bytes);
  written.push(name);
  console.log(`  ${name}${typeof bytes === 'string' ? '' : ` (${mb(bytes.length)})`}`);
};

console.log(`Secret Hitler XL ${tag} -> ${OUT}/`);

// one imposed PDF per paper size, the way the page downloads it
for (const paper of ['A3', 'A4'] as Paper[]) {
  const o = options({ paper, output: 'sheets' });
  const files = layout(makePlan(o, roles), paper);
  for (const f of files) {
    const bytes = await renderer.render(f, paper, roles);
    const suffix = files.length > 1 ? `_${f.key}` : '';
    await put(`Secret_Hitler_XL_${tag}_print_${paper}${suffix}.pdf`, bytes);
  }
}

// print service: one PDF per piece and side, the count in the file name
{
  const o = options({ output: 'pieces', perCopy: false });
  const plan = makePlan(o, roles);
  const ex = await renderer.pieceFiles(plan, roles, { perCopy: false, label: (s) => pieceLabel(s, cards) });
  const zip = new JSZip();
  for (const f of ex.files) zip.file(f.path, f.bytes);
  zip.file('manifest.csv', ex.manifest);
  zip.file('README.txt', pieceReadme(o, ex.pieces, ex.copies));
  const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  await put(`Secret_Hitler_XL_${tag}_print_service_pieces.zip`, bytes);
}

// the rulebook, as the site offers it
const pdfDir = PUB + 'rulebook/pdf';
for (const name of (await readdir(pdfDir)).filter((n) => n.endsWith('.pdf')).sort()) {
  const target = name.replace(/\.pdf$/, `_${tag}.pdf`);
  await copyFile(join(pdfDir, name), join(OUT, target));
  written.push(target);
  console.log(`  ${target}`);
}

// release notes: what changed in this version, then what the files are
const entry = rulebook.changelog.find((c) => c.version === version);
if (!entry) throw new Error(`No changelog entry for ${version} in public/data/rulebook/changelog.json`);
const notes = [
  `Secret Hitler XL ${version} (${entry.date}).`, '',
  '## Changes', '',
  ...entry.changes.map((c) => `- ${c}`), '',
  '## Files', '',
  '- `Secret_Hitler_XL_Rulebook_*.pdf`: the rulebook in A5 and A4, in reading order and as booklets to fold.',
  `- \`Secret_Hitler_XL_${tag}_print_A3.pdf\` and \`_print_A4.pdf\`: the whole game for up to 19 players, every module, role and Role Briefing, on imposed sheets. Print at 100 %, double-sided, flip on the long edge.`,
  `- \`Secret_Hitler_XL_${tag}_print_service_pieces.zip\`: the same set as one PDF per piece and side, cut size plus 3 mm bleed, for a print service. The number of copies is in each file name and in manifest.csv.`, '',
  'For another table size or a different set of modules, use the print builder on the website.', '',
  'Game content is licensed CC BY-NC-SA 4.0: not for commercial use.',
].join('\n') + '\n';
await writeFile(join(OUT, 'release-notes.md'), notes);
console.log(`  release-notes.md`);
console.log(`${written.length} files`);
