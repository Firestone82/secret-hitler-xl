import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { DataService } from '../../core/data.service';
import { Role } from '../../core/types';
import { BoardStyle, DEFAULT_OPTIONS, Paper, PrintOptions, REF_CARDS, RefSize, SPARE_KINDS, SpareKind, normalise, refCardAllowed } from '../../print/options';
import { CountLine, Slot, makePlan, uniquePieces } from '../../print/plan';
import { layout } from '../../print/layout';
import { PreviewItem, allSheets, previewPiece, previewSheet } from '../../print/preview';
import { Renderer, fetchLoader } from '../../print/render';
import { SafeHtmlPipe } from '../../shared/safe-html.pipe';
import { PreviewSvg } from './preview-svg';

type Flag = 'briefings' | 'placards' | 'pileCards' | 'blanks' | 'splitFiles' | 'rulebook';

@Component({
  selector: 'app-print',
  imports: [SafeHtmlPipe, PreviewSvg],
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

  // ---- preview: the sheets as they will print, or the single pieces for a print service
  back = signal(false);
  private sheetPick = signal(0);
  sheets = computed(() => allSheets(this.files()));
  sheetIndex = computed(() => Math.min(this.sheetPick(), Math.max(0, this.sheets().length - 1)));
  sheetPreview = computed(() => {
    const ref = this.sheets()[this.sheetIndex()], rf = this.data.roles();
    return ref && rf ? previewSheet(ref.sheet, this.opts().paper, this.back(), rf) : null;
  });
  pieces = computed(() => { const p = this.plan(); return p ? uniquePieces(p) : []; });
  piecePreviews = computed(() => {
    const rf = this.data.roles(); if (!rf) return [];
    return this.pieces().map((u) => ({ u, item: previewPiece(u.slot, this.back(), rf) }));
  });
  totalCopies = computed(() => this.pieces().reduce((s, u) => s + u.copies, 0));
  /** the piece's own label from pieces.json where there is one: "Emergency: Policy Peek", not "Emergency power" */
  pieceLabel(slot: Slot): string {
    const f = slot.front;
    return (f.type === 'piece' && this.data.pieces()?.[f.id]?.label) || slot.name;
  }
  pickSheet(i: number) { this.sheetPick.set(Math.max(0, Math.min(i, this.sheets().length - 1))); }
  pieceBox(it: PreviewItem) { return `0 0 ${it.w} ${it.h}`; }

  /** what an optional role brings to the table, beyond the text in roles.json */
  roleTags(r: Role): string[] {
    const tags: string[] = [];
    const extra = Object.entries(r.extraMembership ?? {}).map(([k, v]) => `${v} ${k[0].toUpperCase() + k.slice(1)}`);
    if (extra.length) tags.push('Adds cards: ' + extra.join(', '));
    return tags;
  }
  /** original: part of the original game, so left out when only the XL additions are printed */
  flags: { k: Flag; label: string; hint: string; original?: boolean }[] = [
    { k: 'briefings', label: 'Role Briefing cards', hint: 'One per Secret Role card: explains that role on its own.' },
    { k: 'placards', label: 'President and Chancellor placards', hint: 'Fold-in-half tents.', original: true },
    { k: 'pileCards', label: 'Draw and discard pile cards', hint: 'Card size; the tile decks sit on them.', original: true },
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
  /** optional roles to show, with paired roles (the two spies) in one entry sharing a checkbox */
  roleGroups = computed(() => {
    const out: Role[][] = [], done = new Set<string>();
    for (const r of this.extraRoles()) {
      if (done.has(r.id)) continue;
      const g = [r, ...(r.pair ? this.extraRoles().filter((x) => x.id === r.pair) : [])];
      g.forEach((x) => done.add(x.id)); out.push(g);
    }
    // in a pair, the Liberal first
    return out.map((g) => g.length > 1 ? [...g].sort((a, b) => (a.seat === 'liberal' ? -1 : b.seat === 'liberal' ? 1 : 0)) : g);
  });
  groupName(g: Role[]) { return g.map((r) => r.name).join(' + '); }
  groupSeat(g: Role[]) { return g.map((r) => (r.seatLabel || '').toLowerCase()).join(' and '); }
  groupTags(g: Role[]) { return g.flatMap((r) => this.roleTags(r).map((t) => (g.length > 1 ? `${r.name}: ${t}` : t))); }

  // ---- boards, reference cards, spares
  boardStyles: { k: BoardStyle; label: string; hint: string }[] = [
    { k: 'border', label: 'With border', hint: 'The classic boards, 395 × 134 mm.' },
    { k: 'borderless', label: 'Borderless', hint: 'For the 3D-printed frames, 390 × 130 mm, with the title left blank.' },
    { k: 'both', label: 'Both', hint: 'Every board in both versions.' },
  ];
  refSizes: { k: RefSize; label: string; hint: string }[] = [
    { k: 'board', label: 'Board size', hint: '395 × 134 mm, laid out like the boards.' },
    { k: 'small', label: 'Small', hint: '280 × 95 mm: four stacked on A3, two side by side on A4.' },
  ];
  refCards = REF_CARDS;
  /** the reference card shown full size, and which side */
  refZoom = signal<{ id: string; label: string } | null>(null);
  refZoomBack = signal(false);
  openRef(r: (typeof REF_CARDS)[number]) { this.refZoomBack.set(false); this.refZoom.set({ id: r.id, label: r.label }); }
  spareKinds = SPARE_KINDS;
  refAllowed(r: (typeof REF_CARDS)[number]) { return refCardAllowed(r, this.opts()); }
  setRef(id: string, v: number) { this.raw.update((o) => ({ ...o, refCards: { ...o.refCards, [id]: v } })); }
  setSpare(k: SpareKind, v: number) { this.raw.update((o) => ({ ...o, spares: { ...o.spares, [k]: v } })); }
  totalSpares = computed(() => Object.values(this.opts().spares).reduce((a, b) => a + b, 0));

  /** how many sleeves of each size the set needs */
  sleeves = computed(() => {
    const p = this.plan();
    return p ? { cards: p.cards.length + p.ballots.length, tiles: p.tiles.length } : { cards: 0, tiles: 0 };
  });

  // ---- full-screen preview
  zoom = signal(false);
  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    if (this.refZoom()) {
      if (e.key === 'Escape') this.refZoom.set(null);
      else if (e.key === 'f' || e.key === 'b') this.refZoomBack.set(!this.refZoomBack());
      else return;
      e.preventDefault();
      return;
    }
    if (!this.zoom()) return;
    if (e.key === 'Escape') this.zoom.set(false);
    else if (e.key === 'ArrowRight') this.pickSheet(this.sheetIndex() + 1);
    else if (e.key === 'ArrowLeft') this.pickSheet(this.sheetIndex() - 1);
    else if (e.key === 'f' || e.key === 'b') this.back.set(!this.back());
    else return;
    e.preventDefault();
  }

  allRoles(on: boolean) { this.raw.update((o) => ({ ...o, roles: Object.fromEntries(this.extraRoles().map((r) => [r.id, on])) })); }
  roleAllowed(r: Role) { const o = this.opts(); return o.xl && (!r.needsCommunists || o.communists); }
  reset() { this.raw.set({ ...DEFAULT_OPTIONS }); }

  async generate() {
    const rf = this.data.roles(); if (!rf) return;
    this.busy.set(true); this.error.set(''); this.progress.set(0);
    try {
      const o = this.opts(), files = this.files(), r = new Renderer(fetchLoader);
      if (o.output === 'pieces') return await this.generatePieces(r, o);
      const out: { name: string; bytes: Uint8Array }[] = [];
      for (const [i, f] of files.entries()) {
        this.status.set(`Building ${f.name} (${f.sheets.length} sheets)…`);
        out.push({ name: f.name, bytes: await r.render(f, o.paper, rf, (d, t) => this.progress.set((i + d / t) / files.length)) });
      }
      out.push(...(await this.rulebookFiles(o)));
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
  /** ZIP for print services: every piece and side as its own PDF, with a manifest of the copies. */
  private async generatePieces(r: Renderer, o: PrintOptions) {
    const rf = this.data.roles()!, plan = this.plan()!;
    this.status.set('Building one file per piece…');
    const ex = await r.pieceFiles(plan, rf, { perCopy: o.perCopy, label: (sl) => this.pieceLabel(sl) }, (d, t) => this.progress.set(0.9 * d / t));
    const JSZip = (await import('jszip')).default; const zip = new JSZip();
    for (const f of ex.files) zip.file(f.path, f.bytes);
    zip.file('manifest.csv', ex.manifest);
    zip.file('README.txt', pieceReadme(o, ex.pieces, ex.copies));
    for (const f of await this.rulebookFiles(o)) zip.file(f.name, f.bytes);
    this.status.set('Packing the zip…');
    save(await zip.generateAsync({ type: 'uint8array' }), `Secret_Hitler_XL_print_service_pieces.zip`, 'application/zip');
    this.status.set(`Done: ${ex.pieces} pieces, ${ex.copies} copies. Each file is cut size plus 3 mm bleed.`); this.progress.set(1);
  }

  private async rulebookFiles(o: PrintOptions) {
    if (!o.rulebook) return [];
    this.status.set('Adding the rulebook…');
    let rb = o.paper === 'A3'
      ? ['Secret_Hitler_XL_Rulebook_A4_booklet_on_A3.pdf', 'Secret_Hitler_XL_Rulebook_A4.pdf', 'Secret_Hitler_XL_Rulings_one_sheet_A3.pdf']
      : ['Secret_Hitler_XL_Rulebook_A5_booklet_on_A4.pdf', 'Secret_Hitler_XL_Rulebook_A5.pdf', 'Secret_Hitler_XL_Rulings_and_balance_notes.pdf'];
    if (o.output === 'pieces') rb = rb.filter((n) => !n.includes('booklet'));   // a print service binds the page-by-page version
    return Promise.all(rb.map(async (n) => ({ name: 'Rulebook/' + n, bytes: await fetchLoader('pdf/' + n) })));
  }

  setPaper(p: Paper) { this.set('paper', p); }
  num(v: string) { return +v; }
}

function save(bytes: Uint8Array, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name.split('/').pop()!; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function pieceReadme(o: PrintOptions, pieces: number, copies: number): string {
  return [
    'SECRET HITLER + XL - PIECES FOR A PRINT SERVICE', '',
    `Players: up to ${o.players}. ${o.xl ? 'Secret Hitler XL' + (o.communists ? ' with the Communists' : '') : 'Original game only'}.`,
    ...(o.base ? [] : ['Only what XL adds to the original box: play it together with your copy of Secret Hitler.']),
    `${pieces} different pieces, ${copies} copies in total.`, '',
    'Every piece has a front and a back file, one page each: the cut size plus 3 mm bleed on every side.',
    o.perCopy ? 'Each copy has its own pair of files.' : 'The number of copies is in the file name (_x4 = four copies) and in manifest.csv.',
    `Folders: tiles 44 x 68 mm (mini European sleeves), cards 63.5 x 88 mm (standard sleeves), boards 395 x 134 mm, borderless boards 390 x 130 mm, reference cards ${o.refSize === 'small' ? '280 x 95' : '395 x 134'} mm, placards 104.5 x 176 mm (fold in half).`, '',
    'Secret Hitler by Mike Boxleiter, Tommy Maranges, Max Temkin and Mac Schubert. Secret Hitler XL by Lord_Roguy.',
    'Licensed CC BY-NC-SA 4.0: not for commercial use.',
  ].join('\n');
}

function readme(o: PrintOptions, files: string[]): string {
  return [
    'SECRET HITLER + XL - PRINT SET', '',
    `Paper: ${o.paper}. Players: up to ${o.players}. ${o.xl ? 'Secret Hitler XL' + (o.communists ? ' with the Communists' : '') : 'Original game only'}.`,
    ...(o.base ? [] : ['Only what XL adds to the original box: play it together with your copy of Secret Hitler.']), '',
    ...files, '',
    'Print at 100 % (no "fit to page"), double-sided, flip on the long edge.',
    'Odd pages are fronts, even pages are backs. Cut along the crop marks.',
    'Hold a sheet against the light: the registration targets should cover each other.', '',
    'Secret Hitler by Mike Boxleiter, Tommy Maranges, Max Temkin and Mac Schubert. Secret Hitler XL by Lord_Roguy.',
    'Licensed CC BY-NC-SA 4.0: not for commercial use.',
  ].join('\n');
}
