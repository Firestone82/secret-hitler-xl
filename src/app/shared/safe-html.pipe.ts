import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/** The rulebook text is our own data (bold, colour, links), so it is trusted as HTML. */
@Pipe({ name: 'safeHtml' })
export class SafeHtmlPipe implements PipeTransform {
  private s = inject(DomSanitizer);
  transform(v: string | null | undefined): SafeHtml { return this.s.bypassSecurityTrustHtml(v ?? ''); }
}
