import { Component, ElementRef, HostListener, computed, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { DataService } from '../../core/data.service';
import { Block, SeatTable } from '../../core/types';
import { RoleBox } from '../../shared/role-box';
import { SafeHtmlPipe } from '../../shared/safe-html.pipe';

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
  imports: [SafeHtmlPipe, RoleBox, DatePipe],
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
      if (b.type === 'role') { const r = this.data.role(b['role']); t = strip([r?.name, ...(r?.rulebook?.paragraphs ?? [])].join(' ')); }
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

  /** Loads every picture first (most are lazy), then opens the browser's print dialog. */
  async print() {
    this.printing.set(true);
    try {
      await this.loadImages(5000);
    } finally {
      this.printing.set(false);
    }
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
