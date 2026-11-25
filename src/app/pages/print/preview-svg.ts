import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PreviewItem } from '../../print/preview';

/** Draws preview items (pieces on a sheet, or one piece) as SVG, in millimetres. */
@Component({
  selector: 'svg:g[appPreview]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (it of items(); track $index) {
      <svg:svg [attr.x]="it.x" [attr.y]="it.y" [attr.width]="it.w" [attr.height]="it.h" [attr.viewBox]="'0 0 ' + it.w + ' ' + it.h">
        <svg:title>{{ it.name }}</svg:title>
        <svg:g [attr.transform]="it.transform">
          @if (it.img) {
            <svg:image [attr.href]="it.img" [attr.x]="-it.aw / 2" [attr.y]="-it.ah / 2" [attr.width]="it.aw" [attr.height]="it.ah" preserveAspectRatio="none" />
          } @else if (it.briefing; as b) {
            <svg:rect [attr.x]="-it.aw / 2" [attr.y]="-it.ah / 2" [attr.width]="it.aw" [attr.height]="it.ah" [attr.fill]="b.paper" />
            <svg:rect [attr.x]="-it.aw / 2" [attr.y]="-it.ah / 2" [attr.width]="it.aw" [attr.height]="it.ah * 0.3" [attr.fill]="b.header" />
            <svg:text [attr.x]="-it.aw / 2 + 6" [attr.y]="-it.ah / 2 + it.ah * 0.2" [attr.fill]="b.headerText" font-size="8" font-family="Germania, serif">{{ b.name || '' }}</svg:text>
            @for (l of lines; track l) {
              <svg:rect [attr.x]="-it.aw / 2 + 6" [attr.y]="-it.ah / 2 + it.ah * 0.38 + l * 6" [attr.width]="it.aw - 12 - (l % 3) * 9" height="1.6" rx=".8" [attr.fill]="b.headerText" opacity=".25" />
            }
          } @else {
            <svg:rect [attr.x]="-it.aw / 2" [attr.y]="-it.ah / 2" [attr.width]="it.aw" [attr.height]="it.ah" [attr.fill]="it.fill ?? '#ddd'" />
          }
        </svg:g>
        @if (cuts()) {
          <svg:rect class="cut" [attr.x]="it.cut.x" [attr.y]="it.cut.y" [attr.width]="it.cut.w" [attr.height]="it.cut.h" />
        }
      </svg:svg>
    }
  `,
  styles: `.cut { fill: none; stroke: rgba(0, 0, 0, .35); stroke-width: .25; stroke-dasharray: 1.2 1.2; }`,
})
export class PreviewSvg {
  items = input.required<PreviewItem[]>({ alias: 'appPreview' });
  cuts = input(true);
  protected lines = [0, 1, 2, 3, 4, 5, 6, 7];
}
