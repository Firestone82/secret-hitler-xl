import { Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/data.service';
import { SafeHtmlPipe } from '../../shared/safe-html.pipe';

/** The rulebook's version history, from data/rulebook/changelog.json, newest first. */
@Component({
  selector: 'app-versions',
  imports: [DatePipe, RouterLink, SafeHtmlPipe],
  template: `
    <div class="page narrow">
      <h1>Version history</h1>
      <p class="lead">
        Every change to the rules gets a new version number. The current version is shown in the <a routerLink="/rules">rulebook</a>
        and on its printed cover, so you can tell at a glance whether a printed copy is up to date.
      </p>

      @if (meta(); as m) {
        <ol class="list">
          @for (v of versions(); track v.version; let first = $first) {
            <li class="ver" [class.current]="first">
              <div class="head">
                <h2>{{ v.version }}</h2>
                <span class="date">{{ v.date | date: 'longDate' : 'UTC' }}</span>
                @if (first) { <span class="chip now">Current</span> }
              </div>
              <ul>@for (c of v.changes; track $index) { <li [innerHTML]="c | safeHtml"></li> }</ul>
            </li>
          }
        </ol>
      }
    </div>
  `,
  styles: `
    h1 { font-size: 2.4rem; margin: .5rem 0 .2rem; }
    .lead { color: var(--muted); }
    .list { list-style: none; margin: 1.5rem 0 0; padding: 0; display: flex; flex-direction: column; gap: 1rem; }
    .ver { background: #fff; border-radius: 14px; padding: 1rem 1.3rem 1.1rem; border-left: 5px solid var(--line); }
    .ver.current { border-left-color: var(--orange); }
    .head { display: flex; align-items: baseline; gap: .7rem; flex-wrap: wrap; }
    .head h2 { margin: 0; font-size: 1.6rem; font-variant-numeric: tabular-nums; }
    .date { color: var(--muted); font-size: .92rem; }
    .now { margin-left: auto; background: var(--orange); color: #2a1206; align-self: center; }
    ul { margin: .5rem 0 0; padding-left: 1.2rem; }
    li li { margin: .3rem 0; }
  `,
})
export class VersionsPage {
  private data = inject(DataService);
  readonly meta = this.data.rulebookMeta;
  /** newest first, whatever order the file lists them in */
  readonly versions = computed(() =>
    [...(this.meta()?.changelog ?? [])].sort((a, b) => b.date.localeCompare(a.date) || b.version.localeCompare(a.version, undefined, { numeric: true })),
  );
}
