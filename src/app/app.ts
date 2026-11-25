import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { DataService } from './core/data.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="top" [class.open]="menuOpen()">
      <a class="brand" routerLink="/rules" aria-label="Secret Hitler + XL, home">
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
          <a routerLink="/credits" routerLinkActive="on">Credits</a>
        </div>
      </nav>
    </header>
    @if (error) {
      <p class="err">Could not load the game data: {{ error }}</p>
    }
    <main><router-outlet /></main>
    <footer class="foot">
      <div class="fl">
        <img src="icon.svg" alt="" width="28" height="28" />
        <span>Secret Hitler by Mike Boxleiter, Tommy Maranges, Max Temkin and Mac Schubert · Secret Hitler XL by Lord_Roguy · CC BY-NC-SA 4.0</span>
      </div>
      <div class="fr">
        <a routerLink="/about">About</a>
        <a routerLink="/credits">Credits</a>
        <a href="https://github.com/Firestone82/secret-hitler-xl" target="_blank" rel="noopener">Source</a>
      </div>
    </footer>
  `,
  styleUrl: './app.scss',
})
export class App {
  error = '';
  menuOpen = signal(false);
  constructor() {
    inject(DataService).load().catch((e) => (this.error = String(e?.message ?? e)));
    // close the mobile menu after every navigation
    inject(Router).events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => this.menuOpen.set(false));
  }
}
