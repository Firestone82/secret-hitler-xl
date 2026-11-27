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
            <svg:image [attr.href]="it.img" [attr.x]="-it.iw! / 2" [attr.y]="-it.ih! / 2" [attr.width]="it.iw" [attr.height]="it.ih" preserveAspectRatio="none" />
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
}
