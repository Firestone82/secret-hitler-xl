import { Component, computed, inject } from '@angular/core';
import { DataService } from '../core/data.service';
import { SafeHtmlPipe } from './safe-html.pipe';

/**
 * Who made the game, the expansion and this edition, plus the licence.
 * The text is the `credits` block of rulebook.json; shown in the rulebook and on the Credits page.
 */
@Component({
  selector: 'app-credits',
  imports: [SafeHtmlPipe],
  template: `
    @if (block(); as b) {
      <div class="cols">
        @for (col of b['columns']; track $index) {
          <div>@for (c of col; track $index) { <h4 [innerHTML]="c.title | safeHtml"></h4><p [innerHTML]="c.html | safeHtml"></p> }</div>
        }
      </div>
      @if (b['licence']; as l) {
        <div class="lic">@if (l.image) { <img [src]="'rb/' + l.image" [alt]="l.alt ?? ''" /> }<p [innerHTML]="l.html | safeHtml"></p></div>
      }
    }
  `,
  styles: `
    :host { display: block; }
    .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; font-size: .9rem; }
    h4 { margin: .7rem 0 .1rem; }
    p { margin: 0; color: var(--muted); }
    .lic { display: flex; gap: 1rem; align-items: center; margin-top: 1rem; font-size: .9rem; }
    .lic img { width: 110px; }
    @media (max-width: 900px) { .cols { grid-template-columns: 1fr; } }
    @media print { .lic { break-inside: avoid; } }
  `,
})
export class Credits {
  private data = inject(DataService);
  block = computed(() => this.data.rulebook()?.find((b) => b.type === 'credits'));
}
