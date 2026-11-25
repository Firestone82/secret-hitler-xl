import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-about',
  imports: [RouterLink],
  template: `
    <div class="page narrow">
      <h1>About</h1>
      <p class="lead">
        <b>Secret Hitler</b> is a social deduction game for 5 to 10 players: Liberals against Fascists, with Hitler hidden among them.
        <b>Secret Hitler XL</b> is a fan expansion that takes it to 19 players with a third party, the Communists, extra roles,
        anti-policies and emergency powers. This site holds the complete rules of both and everything you need to print your own copy.
      </p>

      <div class="tiles">
        <a class="tile" routerLink="/rules">
          <h2>Rulebook</h2>
          <p>The full rules with search and a table of contents, and the finished rulebook PDFs to download.</p>
        </a>
        <a class="tile" routerLink="/roles">
          <h2>Roles</h2>
          <p>Every Secret Role with its Role Briefing card. Download a role's card art, portrait and briefing in one zip.</p>
        </a>
        <a class="tile cta" routerLink="/print">
          <h2>Print builder</h2>
          <p>Pick the paper, the table size and the modules you want, and get print-ready PDFs with crop marks.</p>
        </a>
      </div>

      <section class="box">
        <h2>How it works</h2>
        <ul>
          <li>Everything runs in your browser. The PDFs are put together on your computer and nothing is uploaded.</li>
          <li>All the game text lives in plain JSON files (<code>roles.json</code>, <code>rulebook.json</code>), so a change there updates the
            rulebook, the roles page and the printed cards together.</li>
          <li>Print at 100 % (no "fit to page"), double-sided, flipping on the long edge, then cut along the crop marks.</li>
        </ul>
      </section>

      <section class="box">
        <h2>Licence</h2>
        <p>Secret Hitler and Secret Hitler XL are released under
          <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener">CC BY-NC-SA 4.0</a>, and so is this edition:
          share and adapt it freely with credit, but not for money. This is a fan project and is not affiliated with the publishers of Secret Hitler.
          See the <a routerLink="/credits">credits</a> for everyone who made it.</p>
      </section>

      <section class="box">
        <h2>Feedback</h2>
        <p>Found a typo, a rules question or a broken card? Open an issue on
          <a href="https://github.com/Firestone82/secret-hitler-xl/issues" target="_blank" rel="noopener">GitHub</a>.</p>
      </section>
    </div>
  `,
  styles: `
    .narrow { max-width: 920px; }
    h1 { font-size: 2.4rem; margin: .5rem 0 .2rem; }
    .lead { max-width: 720px; font-size: 1.05rem; }
    .tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin: 1.5rem 0; }
    .tile { display: block; background: #fff; border-radius: 14px; padding: 1rem 1.1rem; text-decoration: none; color: inherit;
      border-top: 5px solid var(--lib); transition: transform .15s, box-shadow .15s; }
    .tile:nth-child(2) { border-top-color: var(--com); }
    .tile.cta { border-top-color: var(--orange); }
    .tile:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,.08); }
    .tile h2 { margin: 0 0 .3rem; font-size: 1.5rem; }
    .tile p { margin: 0; color: var(--muted); font-size: .93rem; }
    .box { background: #fff; border-radius: 14px; padding: 1.1rem 1.3rem 1.3rem; margin-top: 1.2rem; }
    .box h2 { margin: 0 0 .3rem; font-size: 1.6rem; }
    .box p { margin: .3rem 0 0; }
    ul { margin: .4rem 0 0; padding-left: 1.2rem; }
    li { margin: .35rem 0; }
    code { background: #ece6d3; padding: 0 .3rem; border-radius: 4px; }
  `,
})
export class AboutPage {}
