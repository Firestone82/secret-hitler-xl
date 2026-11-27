import { Pipe, PipeTransform } from '@angular/core';
import { thumb } from '../core/assets';

/** The small copy of a picture under cards/ (see core/assets.ts); other paths pass through. */
@Pipe({ name: 'thumb' })
export class ThumbPipe implements PipeTransform {
  transform(path: string): string {
    return thumb(path);
  }
}
