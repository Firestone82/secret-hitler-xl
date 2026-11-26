import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DataService } from '../../core/data.service';
import { Role } from '../../core/types';
import { BriefingCard } from '../../shared/briefing-card';
import { SafeHtmlPipe } from '../../shared/safe-html.pipe';

type Filter = 'all' | 'base' | 'communists' | 'roles';

@Component({
  selector: 'app-roles',
  imports: [BriefingCard, SafeHtmlPipe],
  template: `
    <div class="page">
      <h1>Roles</h1>
      <p class="lead">Every Secret Role with its Role Briefing card. The text comes from <code>data/roles.json</code>; the same file
        writes the role sections of the rulebook and the briefing cards in the printed PDF. The download button next to a role's name
        gives you all of its files in one zip.</p>
      <div class="filters">
        @for (f of filters; track f.k) {
          <button [class.on]="filter() === f.k" (click)="filter.set(f.k)">{{ f.label }}</button>
        }
      </div>
      @if (data.roles(); as rf) {
        <div class="layout">
          <aside class="toc" [class.open]="tocOpen()" aria-label="Roles on this page">
            <div class="toch">Jump to a role</div>
            @for (g of groups(); track g.label) {
              <div class="tocg">{{ g.label }}</div>
              @for (r of g.roles; track r.id) {
                <button type="button" [class.on]="(active() || shown()[0]?.id) === r.id" [style.--c]="rf.palettes[r.palette].accent" (click)="go(r.id)">
                  <img [src]="'cards/' + r.art[0] + '.jpg'" alt="" loading="lazy" />{{ r.name }}
                </button>
              }
            }
          </aside>
          <button class="tocbtn" type="button" (click)="tocOpen.set(!tocOpen())" [attr.aria-expanded]="tocOpen()">{{ tocOpen() ? 'Close' : 'Roles' }}</button>
        <div class="grid">
          @for (r of shown(); track r.id) {
            <section class="role" [id]="'role-' + r.id" [style.--c]="rf.palettes[r.palette].accent">
              <div class="cards">
                <img class="secret" [src]="'cards/' + r.art[0] + '.jpg'" [alt]="r.name + ' Secret Role card'" loading="lazy" />
                <app-briefing-card [role]="r" [palettes]="rf.palettes" />
              </div>
              <div class="info">
                <div class="head">
                  <h2>{{ r.name }}</h2>
                  <div class="acts">
                  <button class="dl" type="button" (click)="open(r)" [attr.aria-label]="'Show the ' + r.name + ' cards full size'"
                    [title]="'Show the Secret Role card and the Role Briefing card of the ' + r.name + ' full size'">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
                  </button>
                  <button class="dl" type="button" (click)="download(r)" [disabled]="busy() === r.id"
                    [attr.aria-label]="'Download all files of the ' + r.name + ' (zip)'"
                    [title]="'Download the ' + r.name + ': Secret Role card, Role Briefing card, portrait and print-ready PDFs (zip)'">
                    @if (busy() === r.id) {
                      <svg viewBox="0 0 24 24" aria-hidden="true" class="spin"><path d="M12 3a9 9 0 1 0 9 9" /></svg>
                    } @else {
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
                    }
                  </button>
                  </div>
                </div>
                <div class="tags">
                  <span class="chip">{{ moduleLabel(r) }}</span>
                  @if (r.seatLabel) { <span class="chip">takes the seat of {{ r.seatLabel.toLowerCase() }}</span> }
                  @if (r.countLabel) { <span class="chip">{{ r.countLabel }} in a game</span> }
                  @if (r.needsCommunists) { <span class="chip">needs the Communists</span> }
                </div>
                @if (r.rulebook; as rb) {
                  @for (p of rb.paragraphs; track $index) { <p [innerHTML]="p | safeHtml"></p> }
                  <p class="when"><span class="wl">Add it when</span> {{ rb.addWhen }}</p>
                } @else {
                  <p class="muted">A role of the {{ r.module === 'base' ? 'original game' : 'Communist party' }}: see the rulebook for how it plays.</p>
                }
              </div>
            </section>
          }
        </div>
        </div>
      } @else { <p>Loading…</p> }
    </div>
    @if (big(); as r) {
      <div class="lightbox" role="dialog" aria-modal="true" [attr.aria-label]="r.name + ' cards full size'" (click)="close()">
        <div class="big" [style.zoom]="zoom()" (click)="$event.stopPropagation()">
          <img class="secret" [src]="'cards/' + r.art[0] + '.jpg'" [alt]="r.name + ' Secret Role card'" />
          <app-briefing-card [role]="r" [palettes]="data.roles()!.palettes" />
        </div>
        <button class="x" type="button" (click)="close()" aria-label="Close">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
    }
  `,
  styles: `
    h1 { font-size: 2.4rem; margin: .5rem 0 .2rem; }
    .lead { color: var(--muted); }
    code { background: #ece6d3; padding: 0 .3rem; border-radius: 4px; }
    .filters { display: flex; gap: .4rem; flex-wrap: wrap; margin: 1rem 0 1.5rem; }
    .filters button { border: 0; border-radius: 99px; padding: .4rem .9rem; background: #ece6d3; font-weight: 600; }
    .filters button.on { background: var(--dark); color: var(--cream); }
    .layout { display: grid; grid-template-columns: 210px minmax(0, 1fr); gap: 1.5rem; align-items: start; }
    .toc { position: sticky; top: 76px; max-height: calc(100vh - 92px); overflow-y: auto; display: flex; flex-direction: column; gap: 1px;
      padding: .7rem .5rem; background: #fff; border-radius: 14px; }
    .toch { font-family: var(--display); font-size: 1.15rem; padding: 0 .5rem .2rem; }
    .tocg { font-size: .7rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); padding: .6rem .5rem .2rem; }
    .toc button { display: flex; align-items: center; gap: .55rem; width: 100%; border: 0; background: transparent; text-align: left;
      padding: .28rem .5rem; border-radius: 8px; font-weight: 600; font-size: .9rem; color: var(--ink); border-left: 3px solid transparent;
      transition: background .15s, border-color .15s; }
    .toc button img { width: 22px; height: 30px; object-fit: cover; border-radius: 3px; flex: none; }
    .toc button:hover { background: #f3eedd; }
    .toc button.on { background: #f3eedd; border-left-color: var(--c); color: var(--c); }
    .tocbtn { display: none; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 520px), 1fr)); gap: 1.5rem; }
    .role { background: #fff; border-radius: 14px; padding: 1rem; display: flex; flex-direction: column; gap: .8rem; border-top: 5px solid var(--c);
      scroll-margin-top: 76px; }
    .cards { display: flex; gap: .8rem; align-items: flex-start; justify-content: center; flex-wrap: wrap; }
    .secret { width: 254px; height: 352px; object-fit: cover; border-radius: 9px; box-shadow: 0 2px 10px rgba(0,0,0,.18); }
    .head { display: flex; align-items: flex-start; justify-content: space-between; gap: .6rem; }
    .acts { display: flex; gap: .4rem; flex: none; }
    h2 { margin: 0; font-size: 1.7rem; color: var(--c); }
    .dl { flex: none; display: grid; place-items: center; width: 38px; height: 38px; border: 0; border-radius: 10px;
      background: #f3eedd; color: var(--c); transition: background .15s, color .15s; }
    .dl:hover:not(:disabled) { background: var(--c); color: #fff; }
    .dl:disabled { cursor: progress; }
    .dl svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .spin { animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .tags { display: flex; gap: .3rem; flex-wrap: wrap; margin: .3rem 0 .4rem; }
    .info p { margin: .35rem 0; }
    .info p ::ng-deep b { color: var(--c); }
    .when { background: #f3eedd; border-left: 3px solid var(--c); padding: .4rem .7rem; }
    .wl { font-weight: 700; color: var(--c); margin-right: .2rem; }
    .lightbox { position: fixed; inset: 0; z-index: 50; display: grid; place-items: center; overflow: auto; padding: 4.5rem 1rem 1rem;
      background: rgba(20, 18, 14, .82); cursor: zoom-out; }
    .big { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; cursor: default; }
    .big .secret { width: 254px; height: 352px; box-shadow: 0 4px 24px rgba(0,0,0,.45); }
    .x { position: fixed; top: 1rem; right: 1rem; display: grid; place-items: center; width: 42px; height: 42px; border: 0; border-radius: 50%;
      background: var(--cream); color: var(--ink); }
    .x svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; }
    .muted { color: var(--muted); }
    @media (max-width: 1024px) {
      .layout { grid-template-columns: minmax(0, 1fr); }
      .toc { display: none; position: fixed; inset: auto 1rem 4.5rem auto; top: auto; z-index: 11; width: min(260px, calc(100vw - 2rem));
        max-height: 70vh; box-shadow: 0 6px 24px rgba(0,0,0,.25); }
      .toc.open { display: flex; }
      .tocbtn { display: block; position: fixed; right: 1rem; bottom: 1rem; z-index: 11; border: 0; border-radius: 99px; padding: .7rem 1.1rem;
        background: var(--orange); font-weight: 700; box-shadow: 0 2px 10px rgba(0,0,0,.25); }
    }
    @media (max-width: 600px) { .secret { width: 46%; height: auto; } }
  `,
})
export class RolesPage {
  data = inject(DataService);
  filter = signal<Filter>('all');
  /** id of the role whose zip is being built */
  busy = signal('');
  filters: { k: Filter; label: string }[] = [
    { k: 'all', label: 'All roles' }, { k: 'base', label: 'Original game' }, { k: 'communists', label: 'Communists' }, { k: 'roles', label: 'Extra roles (XL)' },
  ];
  shown = computed(() => (this.data.roles()?.roles ?? []).filter((r) => this.filter() === 'all' || r.module === this.filter()));
  tocOpen = signal(false);
  /** role whose cards are shown full size */
  big = signal<Role | null>(null);
  /** scale of the full-size view, so both cards fit the window side by side, or stacked on a narrow screen */
  zoom = signal(1);
  /** id of the role at the top of the viewport */
  active = signal('');
  groups = computed(() => {
    const labels: Record<Role['module'], string> = { base: 'Original game', communists: 'Communists', roles: 'Extra roles (XL)' };
    return (['base', 'communists', 'roles'] as const)
      .map((m) => ({ label: labels[m], roles: this.shown().filter((r) => r.module === m) }))
      .filter((g) => g.roles.length);
  });

  go(id: string) {
    this.tocOpen.set(false);
    document.getElementById('role-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  open(r: Role) { this.fit(); this.big.set(r); }
  close() { this.big.set(null); }

  private fit() {
    // room for the close button above the cards
    const w = innerWidth - 32, h = innerHeight - 88;
    // card 254 x 352 px; side by side the pair is 520 px wide
    const side = Math.min(w / 520, h / 352), stacked = Math.min(w / 254, h / 716);
    this.zoom.set(Math.max(1, Math.max(side, stacked)));
  }

  private frame = 0;
  constructor() {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') this.close(); };
    const onResize = () => this.fit();
    document.addEventListener('keydown', onKey);
    addEventListener('resize', onResize);
    inject(DestroyRef).onDestroy(() => { document.removeEventListener('keydown', onKey); removeEventListener('resize', onResize); });
    // capture scroll events from any scrolling element, so tracking works whether the window
    // or a custom scroll container (e.g. SimpleBar) scrolls the page
    const onScroll = () => this.onScroll();
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('scroll', onScroll, { capture: true });
      cancelAnimationFrame(this.frame);
    });
  }

  private onScroll() {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      // the lowest row whose top has passed just below the navbar; in a row of two, its first role
      let cur = this.shown()[0]?.id ?? '', best = -Infinity;
      for (const r of this.shown()) {
        const top = document.getElementById('role-' + r.id)?.getBoundingClientRect().top;
        if (top !== undefined && top < 160 && top > best + 1) { cur = r.id; best = top; }
      }
      this.active.set(cur);
    });
  }

  moduleLabel(r: Role) { return { base: 'Original game', communists: 'XL: the Communists', roles: 'XL: extra role' }[r.module]; }

  async download(r: Role) {
    if (this.busy()) return;
    this.busy.set(r.id);
    try {
      const { rolePack } = await import('../../shared/role-pack');
      const { bytes, name } = await rolePack(r, this.data.roles()!);
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/zip' }));
      const a = document.createElement('a'); a.href = url; a.download = name; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e: any) {
      alert('Could not build the download: ' + (e?.message ?? e));
    } finally { this.busy.set(''); }
  }
}
