import { Component, DestroyRef, ElementRef, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import SimpleBar from 'simplebar';
import { DataService } from './core/data.service';
import { ScrollService } from './core/scroll.service';
import { GithubStars } from './shared/github-stars';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, GithubStars],
  template: `
    <div class="progress" [class.on]="navigating()" aria-hidden="true"></div>
    <div class="shell" #shell>
    <div class="frame">
    <header class="top" [class.open]="menuOpen()">
      <a class="brand" routerLink="/" aria-label="Secret Hitler + XL, home">
        <img src="icon.svg" alt="" class="logo" width="36" height="36" />
        <span class="name">Secret Hitler <em>+ XL</em></span>
      </a>
      <button class="burger" type="button" (click)="menuOpen.set(!menuOpen())" [attr.aria-expanded]="menuOpen()" aria-controls="site-nav"
        [attr.aria-label]="menuOpen() ? 'Close the menu' : 'Open the menu'">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          @if (menuOpen()) { <path d="M6 6l12 12M18 6L6 18" /> } @else { <path d="M4 7h16M4 12h16M4 17h16" /> }
        </svg>
      </button>
      <nav id="site-nav" aria-label="Main">
        <div class="main">
          <a routerLink="/rules" routerLinkActive="on">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" /><path d="M9 8h7M9 11.5h5" /></svg>
            Rulebook
          </a>
          <a routerLink="/roles" routerLinkActive="on">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="11" height="15" rx="2" /><path d="M17 6.5l2.6.7a2 2 0 0 1 1.4 2.4l-2.6 9.8a2 2 0 0 1-2.4 1.4L13 20" /><circle cx="8.5" cy="10.5" r="2" /><path d="M5.5 16.5a3 3 0 0 1 6 0" /></svg>
            Roles
          </a>
          <a routerLink="/print" routerLinkActive="on" class="cta">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9V3h10v6" /><rect x="3" y="9" width="18" height="8" rx="2" /><path d="M7 14h10v7H7z" /></svg>
            Print builder
          </a>
        </div>
        <div class="minor">
          <a routerLink="/about" routerLinkActive="on">About</a>
          <a routerLink="/3d-printing" routerLinkActive="on">3D printing</a>
          <a routerLink="/credits" routerLinkActive="on">Credits</a>
        </div>
        <app-github-stars class="gh nav" />
      </nav>
    </header>
    @if (error) {
      <p class="err">Could not load the game data: {{ error }}</p>
    }
    <main>
      @if (loading()) {
        <div class="loader" role="status"><img src="icon.svg" alt="" width="56" height="56" /><span>Loading the game data…</span></div>
      }
      <router-outlet />
    </main>
    <footer class="foot">
      <div class="fl">
        <img src="icon.svg" alt="" width="28" height="28" />
        <span>Secret Hitler by Mike Boxleiter, Tommy Maranges, Max Temkin and Mac Schubert · Secret Hitler XL by Lord_Roguy · CC BY-NC-SA 4.0</span>
      </div>
      <div class="fr">
        @if (version(); as v) {
          <a class="ver" routerLink="/rules" fragment="version-history" title="Rulebook version history">Rulebook v{{ v.version }} · {{ v.date }}</a>
        }
        <a routerLink="/about">About</a>
        <a routerLink="/credits">Credits</a>
        <a href="https://github.com/Firestone82/secret-hitler-xl" target="_blank" rel="noopener">Source</a>
      </div>
    </footer>
    </div>
    </div>
  `,
  styleUrl: './app.scss',
})
export class App {
  error = '';
  menuOpen = signal(false);
  /** true while a navigation takes long enough to notice (a lazy page loading) */
  navigating = signal(false);
  private data = inject(DataService);
  readonly loading = computed(() => !this.error && !this.data.rulebookMeta());
  readonly version = computed(() => {
    const m = this.data.rulebookMeta();
    return m ? { version: m.version, date: m.date } : null;
  });
  private shell = viewChild.required<ElementRef<HTMLElement>>('shell');

  constructor() {
    this.data.load().catch((e) => (this.error = String(e?.message ?? e)));
    const router = inject(Router), scroll = inject(ScrollService);
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastPath = '';
    const sub = router.events.subscribe((e) => {
      if (e instanceof NavigationStart) {
        clearTimeout(timer);
        timer = setTimeout(() => this.navigating.set(true), 120);
      } else if (e instanceof NavigationEnd || e instanceof NavigationCancel || e instanceof NavigationError) {
        clearTimeout(timer);
        this.navigating.set(false);
      }
      if (e instanceof NavigationEnd) {
        // close the mobile menu, and start a new page at the top (the page scrolls in SimpleBar, so the router cannot do it)
        this.menuOpen.set(false);
        const path = e.urlAfterRedirects.split(/[?#]/)[0];
        if (path !== lastPath && !router.parseUrl(e.urlAfterRedirects).fragment) scroll.scrollTo(0);
        lastPath = path;
      }
    });
    inject(DestroyRef).onDestroy(() => sub.unsubscribe());

    afterNextRender(() => {
      const bar = new SimpleBar(this.shell().nativeElement, { autoHide: false, ariaLabel: 'Page content' });
      const el = bar.getScrollElement() as HTMLElement;
      scroll.element.set(el);
      // keyboard scrolling (arrows, Page Down, Space) works without clicking into the page first
      el.focus({ preventScroll: true });
      fadeInImages(el);
    });
  }
}

/**
 * Images start transparent (see styles.scss) and fade in once loaded, so pictures do not pop in line by line.
 * An image that is already loaded when it is added is shown at once.
 */
function fadeInImages(root: HTMLElement): void {
  const done = (img: HTMLImageElement) => img.classList.add('ld');
  const onEvent = (e: Event) => { if (e.target instanceof HTMLImageElement) done(e.target); };
  root.addEventListener('load', onEvent, true);
  root.addEventListener('error', onEvent, true);
  const check = (n: Node) => {
    if (n instanceof HTMLImageElement) { if (n.complete && n.naturalWidth) done(n); }
    else if (n instanceof Element) n.querySelectorAll('img').forEach((i) => i.complete && i.naturalWidth && done(i));
  };
  check(root);
  new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach(check))).observe(root, { childList: true, subtree: true });
  root.classList.add('fade-imgs');
}
