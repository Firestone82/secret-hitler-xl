import { Injectable, signal } from '@angular/core';

/**
 * The page scrolls inside the SimpleBar container, not the window, so window.scrollTo and
 * window scroll events do nothing. Use this element for scroll listeners and programmatic scrolling.
 * `position: sticky` and `scrollIntoView` work as usual.
 */
@Injectable({ providedIn: 'root' })
export class ScrollService {
  /** the scrolling element, set once SimpleBar is up (null before, and during prerendering) */
  readonly element = signal<HTMLElement | null>(null);

  scrollTo(top: number, behavior: ScrollBehavior = 'auto'): void {
    const el = this.element();
    if (el) el.scrollTo({ top, behavior });
    else window.scrollTo({ top, behavior });
  }
}
