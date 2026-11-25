import { Directive, ElementRef, OnDestroy, afterNextRender, inject } from '@angular/core';

/** Fades and lifts the element in the first time it scrolls into view. Styles live in styles.scss (.reveal). */
@Directive({ selector: '[appReveal]', host: { class: 'reveal' } })
export class Reveal implements OnDestroy {
  private io?: IntersectionObserver;
  constructor() {
    const el = inject(ElementRef<HTMLElement>).nativeElement;
    afterNextRender(() => {
      if (!('IntersectionObserver' in window)) return el.classList.add('in');
      this.io = new IntersectionObserver(
        (entries) => entries.forEach((e) => { if (e.isIntersecting) { el.classList.add('in'); this.io?.disconnect(); } }),
        { rootMargin: '0px 0px -8% 0px' },
      );
      this.io.observe(el);
    });
  }
  ngOnDestroy() { this.io?.disconnect(); }
}
