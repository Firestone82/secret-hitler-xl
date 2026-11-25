import { Component, computed, inject, input } from '@angular/core';
import { DataService } from '../core/data.service';
import { SafeHtmlPipe } from './safe-html.pipe';

/** A role section of the rulebook, written from roles.json. */
@Component({
  selector: 'app-role-box',
  imports: [SafeHtmlPipe],
  template: `
    @if (role(); as r) {
      @if (r.rulebook; as rb) {
        <article class="box" [style.--c]="pal()?.accent">
          <img [src]="'rb/' + rb.image" [alt]="rb.title" loading="lazy" />
          <div class="txt">
            <h3>{{ rb.title }}</h3>
            <div class="team">{{ rb.teamLabel }} @if (r.seatLabel) { · takes the seat of {{ r.seatLabel.toLowerCase() }} }</div>
            @for (p of rb.paragraphs; track $index) { <p [innerHTML]="p | safeHtml"></p> }
            <div class="when"><b>Add it when</b> <span [innerHTML]="rb.addWhen | safeHtml"></span></div>
          </div>
        </article>
      }
    }
  `,
  styles: `
    .box { display: grid; grid-template-columns: 110px 1fr; gap: 1rem; padding: 1rem 0 1.2rem; border-bottom: 1px solid var(--line); }
    img { width: 110px; border-radius: 6px; box-shadow: 0 1px 6px rgba(0,0,0,.2); }
    h3 { margin: 0; font-size: 1.5rem; color: var(--c); }
    .team { font-size: .78rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin-bottom: .3rem; }
    p { margin: .35rem 0; }
    p ::ng-deep b { color: var(--c); }
    .when { margin-top: .6rem; padding: .45rem .7rem; background: #f3eedd; border-left: 3px solid var(--c); font-size: .95rem; }
    .when b { color: var(--c); margin-right: .3rem; }
    @media print { .box { break-inside: avoid; } img { box-shadow: none; } .when { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
    @media (max-width: 560px) { .box { grid-template-columns: 70px 1fr; } img { width: 70px; } }
  `,
})
export class RoleBox {
  data = inject(DataService);
  id = input.required<string>();
  role = computed(() => this.data.roles()?.roles.find((r) => r.id === this.id()));
  pal = computed(() => { const r = this.role(); return r ? this.data.roles()!.palettes[r.palette] : undefined; });
}
