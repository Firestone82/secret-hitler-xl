import { Component, computed, inject, input } from '@angular/core';
import { DataService } from '../core/data.service';
import { SafeHtmlPipe } from './safe-html.pipe';
import { ThumbPipe } from './thumb.pipe';

/** A role section of the rulebook, written from the role files: the same sections as the role's Role Briefing card. */
@Component({
  selector: 'app-role-box',
  imports: [SafeHtmlPipe, ThumbPipe],
  template: `
    @if (role(); as r) {
      @if (r.rulebook; as rb) {
        <article class="box" [style.--c]="pal()?.accent">
          <img [src]="rb.image | thumb" [alt]="rb.title" loading="lazy" />
          <div class="txt">
            <h3>{{ rb.title }} @if (link()) { <a class="anchor" [href]="link()" [attr.data-section]="id()" aria-label="Link to this role" title="Copy the link to this role">#</a> }</h3>
            <div class="team">{{ rb.teamLabel }} @if (r.seatLabel) { · takes the seat of {{ r.seatLabel.toLowerCase() }} }</div>
            @if (intro()) { <p class="intro" [innerHTML]="intro()! | safeHtml"></p> }
            <div class="secs">
              @for (s of r.briefing.sections; track s.label) {
                <section>
                  <h4>{{ s.label }}</h4>
                  <ul>@for (it of s.items; track $index) { <li [innerHTML]="it | safeHtml"></li> }</ul>
                </section>
              }
            </div>
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
    .team { font-size: .78em; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin-bottom: .3rem; }
    .intro { margin: .35rem 0 .2rem; }
    .secs { columns: 2 250px; column-gap: 1.4rem; margin-top: .4rem; }
    section { break-inside: avoid; padding-bottom: .5rem; }
    h4 { margin: 0 0 .15rem; font-size: .74em; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; color: var(--c); }
    ul { margin: 0; padding-left: 1.05rem; }
    li { margin: .12rem 0; }
    li ::ng-deep b { color: var(--c); }
    .when { margin-top: .6rem; padding: .45rem .7rem; background: #f3eedd; border-left: 3px solid var(--c); font-size: .95em; }
    .when b { color: var(--c); margin-right: .3rem; }
    @media print { .box { break-inside: avoid; } img { box-shadow: none; } .when { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
    @media (max-width: 560px) { .box { grid-template-columns: 70px 1fr; } img { width: 70px; } }
  `,
})
export class RoleBox {
  data = inject(DataService);
  id = input.required<string>();
  /** a few sentences on who the role is, before the briefing sections */
  intro = input<string>();
  /** the address of this role in the rulebook; shows the # link next to the title */
  link = input<string>();
  role = computed(() => this.data.roles()?.roles.find((r) => r.id === this.id()));
  pal = computed(() => { const r = this.role(); return r ? this.data.roles()!.palettes[r.palette] : undefined; });
}
