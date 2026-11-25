import { Component, computed, inject, signal } from '@angular/core';
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
        <div class="grid">
          @for (r of shown(); track r.id) {
            <section class="role" [style.--c]="rf.palettes[r.palette].accent">
              <div class="cards">
                <img class="secret" [src]="'cards/' + r.art[0] + '.jpg'" [alt]="r.name + ' Secret Role card'" loading="lazy" />
                <app-briefing-card [role]="r" [palettes]="rf.palettes" />
              </div>
              <div class="info">
                <div class="head">
                  <h2>{{ r.name }}</h2>
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
                <div class="tags">
                  <span class="chip">{{ moduleLabel(r) }}</span>
                  @if (r.seatLabel) { <span class="chip">takes the seat of {{ r.seatLabel.toLowerCase() }}</span> }
                  @if (r.countLabel) { <span class="chip">{{ r.countLabel }} in a game</span> }
                  @if (r.needsCommunists) { <span class="chip">needs the Communists</span> }
                </div>
                @if (r.rulebook; as rb) {
                  @for (p of rb.paragraphs; track $index) { <p [innerHTML]="p | safeHtml"></p> }
                  <p class="when"><b>Add it when</b> <span [innerHTML]="(rb.addWhenTable || rb.addWhen) | safeHtml"></span></p>
                } @else {
                  <p class="muted">A role of the {{ r.module === 'base' ? 'original game' : 'Communist party' }}: see the rulebook for how it plays.</p>
                }
              </div>
            </section>
          }
        </div>
      } @else { <p>Loading…</p> }
    </div>
  `,
  styles: `
    h1 { font-size: 2.4rem; margin: .5rem 0 .2rem; }
    .lead { max-width: 760px; color: var(--muted); }
    code { background: #ece6d3; padding: 0 .3rem; border-radius: 4px; }
    .filters { display: flex; gap: .4rem; flex-wrap: wrap; margin: 1rem 0 1.5rem; }
    .filters button { border: 0; border-radius: 99px; padding: .4rem .9rem; background: #ece6d3; font-weight: 600; }
    .filters button.on { background: var(--dark); color: var(--cream); }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 560px), 1fr)); gap: 1.5rem; }
    .role { background: #fff; border-radius: 14px; padding: 1rem; display: flex; flex-direction: column; gap: .8rem; border-top: 5px solid var(--c); }
    .cards { display: flex; gap: .8rem; align-items: flex-start; flex-wrap: wrap; }
    .secret { width: 254px; height: 352px; object-fit: cover; border-radius: 9px; box-shadow: 0 2px 10px rgba(0,0,0,.18); }
    .head { display: flex; align-items: flex-start; justify-content: space-between; gap: .6rem; }
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
    .when > b { color: var(--c); margin-right: .35rem; }
    .muted { color: var(--muted); }
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
