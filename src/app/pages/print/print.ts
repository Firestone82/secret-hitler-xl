import { Component, computed, inject, signal } from '@angular/core';
import { DataService } from '../../core/data.service';
import { Role } from '../../core/types';
import { DEFAULT_OPTIONS, Paper, PrintOptions, normalise } from '../../print/options';
import { CountLine, makePlan } from '../../print/plan';
import { layout } from '../../print/layout';
import { Renderer, fetchLoader } from '../../print/render';
import { SafeHtmlPipe } from '../../shared/safe-html.pipe';

type Flag = 'briefings' | 'boards' | 'inserts' | 'referenceCards' | 'placards' | 'pileCards' | 'blanks' | 'splitFiles' | 'rulebook';

@Component({
  selector: 'app-print',
  imports: [SafeHtmlPipe],
  templateUrl: './print.html',
  styleUrl: './print.scss',
})
export class PrintPage {
  data = inject(DataService);
  private stored = (() => { try { return JSON.parse(localStorage.getItem('sh-print-options') ?? 'null'); } catch { return null; } })();
  raw = signal<PrintOptions>({ ...DEFAULT_OPTIONS, ...(this.stored ?? {}) });
  busy = signal(false);
  progress = signal(0);
  status = signal('');
  error = signal('');

  extraRoles = computed(() => (this.data.roles()?.roles ?? []).filter((r) => r.module === 'roles'));
  opts = computed(() => {
    const rf = this.data.roles();
    const o = normalise(this.raw(), (id) => !!rf?.roles.find((r) => r.id === id)?.needsCommunists);
    try { localStorage.setItem('sh-print-options', JSON.stringify(o)); } catch { /* private mode */ }
    return o;
  });
  plan = computed(() => { const rf = this.data.roles(); return rf ? makePlan(this.opts(), rf) : null; });
  files = computed(() => { const p = this.plan(); return p ? layout(p, this.opts().paper, this.opts().splitFiles) : []; });
  groups = computed(() => {
    const g = new Map<string, CountLine[]>();
    for (const c of this.plan()?.counts ?? []) g.set(c.group, [...(g.get(c.group) ?? []), c]);
    return [...g.entries()];
  });
  totalSheets = computed(() => this.files().reduce((s, f) => s + f.sheets.length, 0));
  flags: { k: Flag; label: string; hint: string }[] = [
    { k: 'briefings', label: 'Role Briefing cards', hint: 'One per Secret Role card: explains that role on its own.' },
    { k: 'boards', label: 'Boards with border', hint: 'The classic boards, 134 × 395 mm.' },
    { k: 'inserts', label: 'Borderless boards', hint: 'For the 3D-printed frames, 130 × 390 mm.' },
    { k: 'referenceCards', label: 'Reference cards', hint: 'Setup and night script, round, powers (XL only).' },
    { k: 'placards', label: 'President and Chancellor placards', hint: 'Fold-in-half tents.' },
    { k: 'pileCards', label: 'Draw and discard pile cards', hint: 'Card size; the tile decks sit on them.' },
    { k: 'blanks', label: 'Blank cards', hint: 'Tiles, roles, briefings and memberships to write your own.' },
  ];

  set<K extends keyof PrintOptions>(k: K, v: PrintOptions[K]) { this.raw.update((o) => ({ ...o, [k]: v })); }
  toggleRole(r: Role, on: boolean) {
    this.raw.update((o) => {
      const roles = { ...o.roles, [r.id]: on };
      if (r.pair) roles[r.pair] = on;
      return { ...o, roles };
    });
  }
  allRoles(on: boolean) { this.raw.update((o) => ({ ...o, roles: Object.fromEntries(this.extraRoles().map((r) => [r.id, on])) })); }
  roleAllowed(r: Role) { const o = this.opts(); return o.xl && (!r.needsCommunists || o.communists); }
  reset() { this.raw.set({ ...DEFAULT_OPTIONS }); }

  async generate() {
    const rf = this.data.roles(); if (!rf) return;
    this.busy.set(true); this.error.set(''); this.progress.set(0);
    try {
      const o = this.opts(), files = this.files(), r = new Renderer(fetchLoader);
      const out: { name: string; bytes: Uint8Array }[] = [];
      for (const [i, f] of files.entries()) {
        this.status.set(`Building ${f.name} (${f.sheets.length} sheets)…`);
        out.push({ name: f.name, bytes: await r.render(f, o.paper, rf, (d, t) => this.progress.set((i + d / t) / files.length)) });
      }
      if (o.rulebook) {
        this.status.set('Adding the rulebook…');
        const rb = o.paper === 'A3'
          ? ['Secret_Hitler_XL_Rulebook_A4_booklet_on_A3.pdf', 'Secret_Hitler_XL_Rulebook_A4.pdf', 'Secret_Hitler_XL_Rulings_one_sheet_A3.pdf']
          : ['Secret_Hitler_XL_Rulebook_A5_booklet_on_A4.pdf', 'Secret_Hitler_XL_Rulebook_A5.pdf', 'Secret_Hitler_XL_Rulings_and_balance_notes.pdf'];
        for (const n of rb) out.push({ name: 'Rulebook/' + n, bytes: await fetchLoader('pdf/' + n) });
      }
      if (out.length === 1) { save(out[0].bytes, out[0].name, 'application/pdf'); }
      else {
        this.status.set('Packing the zip…');
        const JSZip = (await import('jszip')).default; const zip = new JSZip();
        for (const f of out) zip.file(f.name, f.bytes);
        zip.file('README.txt', readme(o, files.map((f) => `${f.name}: ${f.sheets.length} sheets, ${f.title}`)));
        save(await zip.generateAsync({ type: 'uint8array' }), `Secret_Hitler_XL_${o.paper}_print_set.zip`, 'application/zip');
      }
      this.status.set('Done. Print at 100 %, double-sided, flip on the long edge.'); this.progress.set(1);
    } catch (e: any) {
      this.error.set(String(e?.message ?? e)); this.status.set('');
    } finally { this.busy.set(false); }
  }
  setPaper(p: Paper) { this.set('paper', p); }
  num(v: string) { return +v; }
}

function save(bytes: Uint8Array, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name.split('/').pop()!; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function readme(o: PrintOptions, files: string[]): string {
  return [
    'SECRET HITLER + XL - PRINT SET', '',
    `Paper: ${o.paper}. Players: up to ${o.players}. ${o.xl ? 'Secret Hitler XL' + (o.communists ? ' with the Communists' : '') : 'Original game only'}.`, '',
    ...files, '',
    'Print at 100 % (no "fit to page"), double-sided, flip on the long edge.',
    'Odd pages are fronts, even pages are backs. Cut along the crop marks.',
    'Hold a sheet against the light: the registration targets should cover each other.', '',
    'Secret Hitler by Mike Boxleiter, Tommy Maranges, Max Temkin and Mac Schubert. Secret Hitler XL by Lord_Roguy.',
    'Licensed CC BY-NC-SA 4.0: not for commercial use.',
  ].join('\n');
}
