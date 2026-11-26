import { readFile, writeFile } from 'node:fs/promises';
import { makePlan } from '../src/app/print/plan';
import { layout } from '../src/app/print/layout';
import { Renderer } from '../src/app/print/render';
import { DEFAULT_OPTIONS, normalise, PrintOptions } from '../src/app/print/options';

const pub = (p: string) => readFile('public/' + p).then((b) => new Uint8Array(b));
const data = JSON.parse(await readFile('public/data/roles.json', 'utf8'));
const extra = Object.fromEntries(data.roles.filter((r: any) => r.module === 'roles').map((r: any) => [r.id, true]));
const cases: [string, Partial<PrintOptions>][] = [
  ['full_A3', { paper: 'A3', roles: extra }],
  ['full_A4', { paper: 'A4', roles: extra }],
  ['base_A4', { paper: 'A4', xl: false, players: 10 }],
  ['expansion_A4', { paper: 'A4', base: false, refSize: 'small', roles: extra }],
  ['borderless_A4', { paper: 'A4', boardStyle: 'borderless' }],
  ['borderless_A3', { paper: 'A3', boardStyle: 'both', refSize: 'small', spares: { tiles: 1, roles: 1, memberships: 2, ballots: 1 }, refCards: { r_round: 4, r_contents: 0 } }],
];
const r = new Renderer(pub);
for (const [name, o] of cases) {
  const opts = normalise({ ...DEFAULT_OPTIONS, ...o }, (id) => data.roles.find((x: any) => x.id === id)?.needsCommunists);
  const plan = makePlan(opts, data);
  const files = layout(plan, opts.paper);
  console.log(name, plan.counts.map((c) => `${c.label}:${c.count}`).join(', '));
  for (const f of files) {
    const t = Date.now();
    const bytes = await r.render(f, opts.paper, data);
    await writeFile(`/tmp/webtest_${name}_${f.key}.pdf`, bytes);
    console.log('  ', f.name, f.sheets.length, 'sheets', (bytes.length / 1e6).toFixed(1), 'MB', Date.now() - t, 'ms');
  }
}
const b = await r.briefingPdf('jester', '', data); await writeFile('/tmp/webtest_jester.pdf', b);
