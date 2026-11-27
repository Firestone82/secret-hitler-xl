import { Component, computed, input } from '@angular/core';
import { portrait } from '../core/assets';
import { Palette, Role } from '../core/types';
import { SafeHtmlPipe } from './safe-html.pipe';

/** HTML preview of a Role Briefing card at 4 px per millimetre. The PDF uses the same data and layout. */
@Component({
  selector: 'app-briefing-card',
  imports: [SafeHtmlPipe],
  template: `
    <div class="card" [style.background]="pal().paper" [style.--acc]="pal().accent">
      <div class="head" [style.background]="pal().header" [style.color]="pal().headerText">
        <div class="kicker">YOUR SECRET ROLE</div>
        <div class="name">{{ role().name }}</div>
        <div class="side">{{ role().briefing.side }}</div>
        <div class="mem"><b>Membership card:</b> {{ role().briefing.card }}</div>
        <div class="portrait" [style.border-color]="pal().headerText" [style.background-image]="'url(' + portraitUrl() + ')'"
             [style.background-size]="crop().size" [style.background-position]="crop().pos"></div>
      </div>
      <div class="body">
        @for (s of role().briefing.sections; track s.label) {
          <div class="lab">{{ s.label }}</div>
          <ul>
            @for (it of s.items; track $index) { <li [innerHTML]="it | safeHtml"></li> }
          </ul>
        }
      </div>
    </div>
  `,
  styles: `
    :host { display: block; width: 254px; }
    .card { width: 254px; height: 352px; border-radius: 9px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,.18); font-family: var(--body); position: relative; }
    .head { height: 90px; position: relative; padding: 13px 0 0 14px; }
    .kicker { font-weight: 700; font-size: 7.6px; letter-spacing: 1.3px; }
    .name { font-family: var(--display); font-size: 24px; line-height: 1; margin-top: 5px; white-space: nowrap; max-width: 145px; overflow: hidden; }
    .side { font-weight: 700; font-size: 8.9px; margin-top: 3px; white-space: nowrap; max-width: 150px; overflow: hidden; text-overflow: ellipsis; }
    .mem { font-size: 8.3px; white-space: nowrap; max-width: 150px; overflow: hidden; text-overflow: ellipsis; }
    .portrait { position: absolute; right: 12.8px; top: 10px; width: 63px; height: 70px; border: 1.4px solid; background-repeat: no-repeat; }
    .body { padding: 12px 13px 0 14px; color: #2b2c2a; }
    .lab { font-weight: 700; font-size: 8.5px; color: var(--acc); margin-top: 9px; }
    .lab:first-child { margin-top: 0; }
    ul { margin: 2px 0 0; padding: 0 0 0 12.8px; list-style: none; }
    li { font-size: 10.6px; line-height: 1.22; margin: 0 0 2.8px; position: relative; }
    li::before { content: ''; position: absolute; left: -9px; top: 4.3px; width: 4.4px; height: 4.4px; border-radius: 50%; background: var(--acc); }
    li ::ng-deep b { font-weight: 700; }
  `,
})
export class BriefingCard {
  role = input.required<Role>();
  palettes = input.required<Record<string, Palette>>();
  pal = computed(() => this.palettes()[this.role().palette]);
  portraitUrl = computed(() => portrait(this.role()));
  /** crop window of the portrait art, as CSS background size and position */
  crop = computed(() => {
    const [cx, cy, w] = this.role().crop, iw = 822, ih = 1122;
    const cw = w * iw, ch = cw / 0.9;
    const x0 = Math.min(Math.max(cx * iw - cw / 2, 75), 747 - cw), y0 = Math.min(Math.max(cy * ih - ch / 2, 74), 1054 - ch);
    const s = 70 / ch;
    return { size: `${iw * s}px ${ih * s}px`, pos: `${-x0 * s}px ${-y0 * s}px` };
  });
}
