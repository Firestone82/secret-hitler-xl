import { Component, DestroyRef, ElementRef, HostListener, computed, effect, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { DataService } from '../../core/data.service';
import { ScrollService } from '../../core/scroll.service';
import { Block, SeatTable } from '../../core/types';
import { Credits } from '../../shared/credits';
import { Lightbox } from '../../shared/lightbox';
import { RoleBox } from '../../shared/role-box';
import { SafeHtmlPipe } from '../../shared/safe-html.pipe';
import { PrintChoice, PrintDialog } from './print-dialog';

const strip = (s: string) => (s ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

function blockText(b: Block): string {
  switch (b.type) {
    case 'h1': case 'h2': case 'h3': return b['text'];
    case 'p': case 'note': return (b['label'] ?? '') + ' ' + b['html'];
    case 'list': return b['items'].join(' ');
    case 'table': return b['rows'].map((r: string[]) => r.join(' ')).join(' ');
    case 'script': return b['title'] + ' ' + b['lines'].join(' ');
    case 'icons': return b['items'].map((i: any) => i.name + ' ' + i.html).join(' ');
    case 'wins': return b['panels'].map((p: any) => p.name + ' ' + p.items.join(' ')).join(' ');
    case 'legislative': return b['steps'].map((s: any) => s.title + ' ' + s.html).join(' ') + ' ' + (b['caption'] ?? '');
    case 'seats': return b['caption'] ?? '';
    case 'credits': return b['title'] + ' ' + b['columns'].flat().map((c: any) => c.title + ' ' + c.html).join(' ');
    default: return '';
  }
}

@Component({
  selector: 'app-rules',
  imports: [SafeHtmlPipe, RoleBox, DatePipe, Credits, PrintDialog, Lightbox],
  templateUrl: './rules.html',
  styleUrl: './rules.scss',
})
export class RulesPage {
  data = inject(DataService);
  private host = inject(ElementRef<HTMLElement>);
  private fragment = toSignal(inject(ActivatedRoute).fragment);
  query = signal('');
  tocOpen = signal(false);
  printing = signal(false);
  meta = this.data.rulebookMeta;
  /** block index of the contents entry the reader is in now, highlighted in the sidebar */
  active = signal(-1);
  private lightbox = viewChild.required(Lightbox);

  blocks = computed(() => this.data.rulebook() ?? []);
  toc = computed(() => this.blocks().map((b, i) => ({ b, i })).filter(({ b }) => b.type === 'part' || b.type === 'h1' || b.type === 'h2'));
  results = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (q.length < 3) return [];
    const out: { i: number; where: string; snippet: string }[] = [];
    let where = '';
    this.blocks().forEach((b, i) => {
      if (b.type === 'h1' || b.type === 'h2') where = strip(b['text']);
      let t = strip(blockText(b));
      if (b.type === 'role') { const r = this.data.role(b['role']); t = strip([r?.name, ...(r?.briefing.sections ?? []).flatMap((x) => [x.label, ...x.items]), r?.rulebook?.addWhen].join(' ')); }
      const k = t.toLowerCase().indexOf(q);
      if (k >= 0) out.push({ i, where, snippet: (k > 40 ? '…' : '') + t.slice(Math.max(0, k - 40), k + q.length + 70) + '…' });
    });
    return out.slice(0, 30);
  });

  constructor() {
    effect(() => {
      const f = this.fragment(), n = this.blocks().length;
      if (f && n) setTimeout(() => this.host.nativeElement.querySelector('#' + CSS.escape(f))?.scrollIntoView({ behavior: 'smooth' }), 50);
    });
    this.trackActive();
  }

  /** Follows the scroll position and marks the chapter or section being read in the sidebar. */
  private trackActive() {
    const scroll = inject(ScrollService);
    let frame = 0;
    const update = () => {
      frame = 0;
      const root = this.host.nativeElement as HTMLElement;
      // a heading counts as reached once it passes under the sticky bar
      let cur = -1;
      for (const t of this.toc()) {
        const el = root.querySelector('#b' + t.i);
        if (!el) continue;
        if (el.getBoundingClientRect().top > 160) break;
        cur = t.i;
      }
      if (cur < 0 && this.toc().length) cur = this.toc()[0].i;
      if (cur !== this.active()) {
        this.active.set(cur);
        this.revealInToc(cur);
      }
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    effect((onCleanup) => {
      const el = scroll.element() ?? window;
      if (!this.blocks().length) return;
      el.addEventListener('scroll', onScroll, { passive: true });
      setTimeout(update, 100);
      onCleanup(() => el.removeEventListener('scroll', onScroll));
    });
    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(frame));
  }

  /** Scrolls the sidebar itself (never the page) so the active entry stays in view. */
  private revealInToc(i: number) {
    const aside = (this.host.nativeElement as HTMLElement).querySelector('aside');
    const btn = aside?.querySelector<HTMLElement>(`[data-b="${i}"]`);
    if (!aside || !btn || aside.scrollHeight <= aside.clientHeight) return;
    const top = btn.getBoundingClientRect().top - aside.getBoundingClientRect().top + aside.scrollTop, pad = 60;
    if (top < aside.scrollTop + pad) aside.scrollTo({ top: top - pad, behavior: 'smooth' });
    else if (top > aside.scrollTop + aside.clientHeight - pad) aside.scrollTo({ top: top - aside.clientHeight + pad, behavior: 'smooth' });
  }

  /** Pictures of the rulebook open at full size; icons and the cover do not. */
  zoom(e: MouseEvent) {
    const img = (e.target as HTMLElement).closest('img');
    if (img && img.closest('figure, .legis, app-role-box')) this.lightbox().open(img.currentSrc || img.src, img.alt);
  }

  /** A seat table of rulebook.json as columns and rows, with the experimental player counts marked. */
  seatTable(key: 'base' | 'xl') {
    const t: SeatTable | undefined = this.meta()?.setup[key];
    if (!t) return null;
    const cols = t.liberals.map((_, i) => {
      const n = t.from + i;
      return { n, x: t.experimentalFrom != null && n >= t.experimentalFrom };
    });
    const num = (v: number | undefined) => (v ? String(v) : '-');
    const rows: { label: string; cells: string[] }[] = [
      { label: 'Liberals', cells: t.liberals.map(num) },
      { label: 'Fascists', cells: t.fascists.map(num) },
      { label: 'Hitler', cells: t.hitler.map(num) },
    ];
    if (t.communists.some((v) => v > 0)) rows.push({ label: 'Communists', cells: t.communists.map(num) });
    if (t.emergency) rows.push({ label: 'Emergency tiles', cells: t.emergency.map(num) });
    if (t.fascistBoard) rows.push({ label: 'Fascist board', cells: t.fascistBoard });
    return { cols, rows };
  }

  /**
   * A booklet opens its imposed PDF. Otherwise the page itself is printed on the chosen paper:
   * every picture is loaded first (most are lazy), and on A3 the page is scaled up to fill the sheet.
   */
  async print(c: PrintChoice) {
    if (c.bookletFile) {
      window.open(c.bookletFile, '_blank', 'noopener');
      return;
    }
    this.printing.set(true);
    try {
      await this.loadImages(5000);
    } finally {
      this.printing.set(false);
    }
    const a3 = c.paper === 'A3';
    const style = document.createElement('style');
    style.textContent = `@page { size: ${c.paper} portrait; }`;
    document.head.appendChild(style);
    document.documentElement.classList.toggle('print-a3', a3);
    const done = () => { style.remove(); document.documentElement.classList.remove('print-a3'); };
    window.addEventListener('afterprint', done, { once: true });
    window.print();
  }

  // Ctrl+P skips the button: still ask for the lazy pictures, the dialog may catch most of them
  @HostListener('window:beforeprint')
  beforePrint() {
    void this.loadImages(0);
  }

  private loadImages(timeout: number): Promise<unknown> {
    const imgs = Array.from(this.host.nativeElement.querySelectorAll('img')) as HTMLImageElement[];
    const waits = imgs.map((img) => {
      img.loading = 'eager';
      return img.complete ? null : new Promise((r) => { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); });
    });
    return Promise.race([Promise.all(waits), new Promise((r) => setTimeout(r, timeout))]);
  }

  goId(id: string) {
    this.tocOpen.set(false);
    this.host.nativeElement.querySelector('#' + CSS.escape(id))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  go(i: number) {
    this.tocOpen.set(false);
    this.host.nativeElement.querySelector('#b' + i)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  plain = strip;
}
