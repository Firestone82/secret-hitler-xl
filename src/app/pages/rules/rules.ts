import { Component, ElementRef, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { DataService } from '../../core/data.service';
import { Block } from '../../core/types';
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
    default: return '';
  }
}

@Component({
  selector: 'app-rules',
  imports: [SafeHtmlPipe, RoleBox],
  templateUrl: './rules.html',
  styleUrl: './rules.scss',
})
export class RulesPage {
  data = inject(DataService);
  private host = inject(ElementRef<HTMLElement>);
  private fragment = toSignal(inject(ActivatedRoute).fragment);
  query = signal('');
  tocOpen = signal(false);

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

  go(i: number) {
    this.tocOpen.set(false);
    this.host.nativeElement.querySelector('#b' + i)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  plain = strip;
}
