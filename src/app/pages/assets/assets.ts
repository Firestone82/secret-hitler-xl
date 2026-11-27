import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { briefingImage, cardImage, cardPdf, portrait, thumb } from '../../core/assets';
import { DataService } from '../../core/data.service';
import { Lightbox } from '../../shared/lightbox';

/** One file on the page: a picture to look at, with the files to download. */
interface Asset {
  key: string;
  label: string;
  /** picture shown in the grid and at full size */
  img: string;
  back?: string;
  pdf?: string;
  /** wide pieces (boards, reference cards) take a wider cell */
  wide?: boolean;
}
interface Section { id: string; title: string; hint: string; items: Asset[] }

/** Titles of the folders in public/cards/, in the order the page shows them. */
const GROUPS: Record<string, [string, string]> = {
  roles: ['Secret Role cards', 'Every role, with the blank cards for house roles. All share one back.'],
  briefing: ['Role Briefing cards', 'The card that explains each role. The print builder draws them fresh from the role text.'],
  membership: ['Party Membership cards', 'What an investigation reveals.'],
  ballots: ['Ballots', 'Ja! and Nein, and the two-sided ballot.'],
  policies: ['Policy tiles', 'Policies, anti-policies, blanks and the small Lobby card. All share one back.'],
  powers: ['Emergency powers', 'The emergency power tiles.'],
  boards: ['Boards', 'The boards with border, 395 × 134 mm.'],
  'boards/borderless': ['Borderless boards', 'Only the inner track and the footer strip, for 3D-printed frames.'],
  reference: ['Reference cards', 'Round order, setup and night script, powers and contents.'],
  placards: ['Placards', 'President and Chancellor. Fold in half.'],
  piles: ['Pile cards', 'Mark the draw and discard piles.'],
  backs: ['Backs', 'The backs that many pieces share.'],
};

/** Every picture and file of this edition in one grid: look at it full size or download it. */
@Component({
  selector: 'app-assets',
  imports: [Lightbox, RouterLink],
  template: `
    <div class="page">
      <h1>Assets</h1>
      <p class="lead">
        Every card, tile, board and rulebook of this edition. Click a picture to see it full size. The PDFs are print-ready:
        page 1 the front, page 2 the back, cut size plus 3 mm bleed. To print a whole set on sheets with crop marks, use the
        <a routerLink="/print">print builder</a>.
      </p>
      <nav class="jump" aria-label="Sections">
        @for (s of sections(); track s.id) { <a [href]="'#/assets'" (click)="jump($event, s.id)">{{ s.title }}</a> }
      </nav>

      @if (meta(); as m) {
        <section class="sec" id="assets-rulebook">
          <h2>Rulebook</h2>
          <p class="hint">Version {{ m.version }}, the same text as the <a routerLink="/rules">rulebook page</a>.</p>
          <ul class="docs">
            @for (d of m.downloads; track d.file) {
              <li><a class="doc" [href]="d.file" download><b>PDF</b>{{ d.label }}</a></li>
            }
          </ul>
        </section>
      }

      @for (s of sections(); track s.id) {
        <section class="sec" [id]="'assets-' + s.id">
          <div class="head">
            <h2>{{ s.title }} <small>{{ s.items.length }}</small></h2>
            <button class="btn ghost zip" type="button" [disabled]="zipping() === s.id" (click)="zip(s)">
              {{ zipping() === s.id ? 'Packing… ' + zipDone() + '/' + zipTotal() : 'Download all (ZIP)' }}
            </button>
          </div>
          <p class="hint">{{ s.hint }}</p>
          <div class="grid">
            @for (a of s.items; track a.key) {
              <figure class="item" [class.wide]="a.wide">
                <button type="button" class="pic" (click)="view(a.img, a.label)" [attr.aria-label]="'Show ' + a.label + ' full size'">
                  <img [src]="small(a.img)" [alt]="a.label" loading="lazy" />
                </button>
                <figcaption>
                  <span class="name">{{ a.label }}</span>
                  <span class="dl">
                    <a [href]="a.img" download>JPG</a>
                    @if (a.back) { <a href="" (click)="view(a.back, a.label + ', back', $event)">Back</a> }
                    @if (a.pdf) { <a [href]="a.pdf" download>PDF</a> }
                  </span>
                </figcaption>
              </figure>
            }
          </div>
        </section>
      }
    </div>
    <app-lightbox />
  `,
  styles: `
    h1 { font-size: 2.4rem; margin: .5rem 0 .2rem; }
    .lead { max-width: 780px; color: var(--muted); }
    .jump { display: flex; flex-wrap: wrap; gap: .35rem .5rem; margin: 1rem 0 .5rem; }
    .jump a { font-size: .9rem; padding: .2rem .65rem; border-radius: 99px; background: #fff; box-shadow: inset 0 0 0 1px var(--line); color: var(--ink); text-decoration: none; }
    .jump a:hover { box-shadow: inset 0 0 0 1.5px var(--orange); }
    .sec { margin-top: 2.2rem; scroll-margin-top: 80px; }
    .head { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
    h2 { font-size: 1.7rem; margin: 0; }
    h2 small { font: 500 .95rem var(--body); color: var(--muted); margin-left: .3rem; }
    .zip { margin-left: auto; font-size: .9rem; padding: .35rem .8rem; }
    .hint { margin: .2rem 0 .9rem; color: var(--muted); }
    .docs { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: .6rem; }
    .doc { display: flex; align-items: center; gap: .7rem; padding: .7rem .9rem; background: #fff; border-radius: 12px; color: var(--ink); text-decoration: none; box-shadow: 0 1px 0 var(--line); }
    .doc b { background: var(--fas); color: #fff; font-size: .75rem; padding: .15rem .4rem; border-radius: 5px; }
    .doc:hover { box-shadow: inset 0 0 0 1.5px var(--orange); }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1rem; }
    .item { margin: 0; background: #fff; border-radius: 12px; padding: .6rem; display: flex; flex-direction: column; gap: .45rem; box-shadow: 0 1px 0 var(--line); }
    .item.wide { grid-column: span 2; }
    .pic { border: 0; padding: 0; background: none; cursor: zoom-in; display: flex; align-items: center; justify-content: center; aspect-ratio: 63.5 / 88; }
    .wide .pic { aspect-ratio: auto; min-height: 120px; }
    .pic img { max-width: 100%; max-height: 100%; display: block; transition: transform .15s; }
    .pic:hover img { transform: scale(1.03); }
    figcaption { display: flex; flex-direction: column; gap: .2rem; font-size: .88rem; line-height: 1.25; }
    .name { font-weight: 600; }
    .dl { display: flex; gap: .6rem; }
    .dl a { color: var(--lib); font-weight: 600; font-size: .82rem; }
    @media (max-width: 560px) {
      .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .6rem; }
      .item.wide { grid-column: 1 / -1; }
    }
  `,
})
export class AssetsPage {
  private data = inject(DataService);
  private lightbox = viewChild.required(Lightbox);
  readonly meta = this.data.rulebookMeta;
  small = thumb;

  readonly sections = computed<Section[]>(() => {
    const cards = this.data.cards(), roles = this.data.roles();
    if (!cards || !roles) return [];
    const by = new Map<string, Asset[]>();
    const add = (group: string, a: Asset) => by.set(group, [...(by.get(group) ?? []), a]);
    const backs = new Map<string, string>();
    for (const [id, c] of Object.entries(cards)) {
      const group = id.slice(0, id.lastIndexOf('/'));
      const wide = c.kind === 'long' || c.kind === 'insert';
      if (c.back?.startsWith('backs/')) backs.set(c.back, labelOfBack(c.back));
      add(group, { key: id, label: c.label, img: cardImage(id), back: c.back === id ? undefined : cardImage(id, 1), pdf: cardPdf(id), wide });
    }
    // briefing cards: one picture per role and each blank, then the back
    const briefing: Asset[] = roles.roles.map((r) => ({ key: 'b-' + r.id, label: r.name, img: briefingImage(r.id) }));
    for (const [p, n] of [['lib', 'Liberal'], ['fas', 'Fascist'], ['com', 'Communist'], ['neu', 'Neutral']]) briefing.push({ key: 'b-blank-' + p, label: `Blank (${n})`, img: briefingImage('blank_' + p) });
    briefing.push(...(by.get('briefing') ?? []));
    by.set('briefing', briefing);
    by.set('backs', [...backs].map(([b, label]) => ({ key: b, label, img: `cards/${b}.jpg` })));
    const out: Section[] = Object.entries(GROUPS).filter(([g]) => by.get(g)?.length).map(([g, [title, hint]]) => ({ id: g.replace('/', '-'), title, hint, items: by.get(g)! }));
    out.push({
      id: 'portraits', title: 'Portraits', hint: 'The pictures on the Role Briefing cards.',
      items: roles.roles.map((r) => ({ key: 'p-' + r.id, label: r.name, img: portrait(r) })),
    });
    return out;
  });

  view(src: string, alt: string, e?: Event) {
    e?.preventDefault();
    this.lightbox().open(thumb(src), alt, src);
  }

  jump(e: Event, id: string) {
    e.preventDefault();
    document.getElementById('assets-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---- one ZIP per section, packed in the browser
  zipping = signal<string | null>(null);
  zipDone = signal(0);
  zipTotal = signal(0);
  async zip(s: Section) {
    const { default: JSZip } = await import('jszip');
    const files = [...new Set(s.items.flatMap((a) => [a.img, a.back, a.pdf].filter((f): f is string => !!f)))];
    this.zipping.set(s.id); this.zipDone.set(0); this.zipTotal.set(files.length);
    try {
      const zip = new JSZip();
      await Promise.all(files.map(async (f) => {
        const res = await fetch(f);
        if (!res.ok) throw new Error(`Could not load ${f} (${res.status})`);
        zip.file(f.replace(/^cards\//, ''), await res.arrayBuffer());
        this.zipDone.update((n) => n + 1);
      }));
      const blob = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `Secret_Hitler_XL_${s.title.replace(/[^A-Za-z0-9]+/g, '_')}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
    } finally {
      this.zipping.set(null);
    }
  }
}

function labelOfBack(b: string): string {
  const n = b.slice('backs/'.length).replace(/_/g, ' ');
  return n.charAt(0).toUpperCase() + n.slice(1) + ' back';
}
