import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { DataService } from './core/data.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="top">
      <a class="brand" routerLink="/rules">
        <img src="logo_alpha.png" alt="" class="logo" />
        <span>Secret Hitler <em>+ XL</em></span>
      </a>
      <nav>
        <a routerLink="/rules" routerLinkActive="on">Rulebook</a>
        <a routerLink="/roles" routerLinkActive="on">Roles</a>
        <a routerLink="/print" routerLinkActive="on" class="cta">Print builder</a>
      </nav>
    </header>
    @if (error) {
      <p class="err">Could not load the game data: {{ error }}</p>
    }
    <main><router-outlet /></main>
    <footer class="foot">
      Secret Hitler by Mike Boxleiter, Tommy Maranges, Max Temkin and Mac Schubert · Secret Hitler XL by Lord_Roguy ·
      CC BY-NC-SA 4.0 · <a routerLink="/rules" fragment="credits-and-licence">Credits</a>
    </footer>
  `,
  styleUrl: './app.scss',
})
export class App {
  error = '';
  constructor() {
    inject(DataService).load().catch((e) => (this.error = String(e?.message ?? e)));
  }
}
