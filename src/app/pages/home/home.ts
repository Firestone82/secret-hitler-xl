import { Component, ElementRef, afterNextRender, computed, effect, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { DataService } from '../../core/data.service';
import { GithubStars } from '../../shared/github-stars';
import { Credits } from '../../shared/credits';
import { Reveal } from '../../shared/reveal';

/** card art shown fanned out in the hero, left to right */
const HERO_CARDS = ['monarchist', 'detective', 'jester', 'capitalist', 'anarchist'];

@Component({
  selector: 'app-home',
  imports: [RouterLink, GithubStars, Reveal, Credits],
  template: `
    <section class="hero">
      <div class="hero-in">
        <div class="copy">
          <p class="kicker">Fan edition · 5 to 19 players</p>
          <h1>Secret Hitler <em>+ XL</em></h1>
          <p class="lead">
            The complete rules of Secret Hitler and its XL expansion in one place: a third party, {{ roleCount() }} secret roles,
            anti-policies and emergency powers. Read them, look up a role mid-game, or print your own copy.
          </p>
          <div class="ctas">
            <a class="btn primary big" routerLink="/rules">Read the rulebook</a>
            <a class="btn ghost big" routerLink="/print">Build a print</a>
          </div>
        </div>
        <div class="fan" aria-hidden="true">
          @for (c of cards; track c; let i = $index) {
            <div class="card" [style.--i]="i - 2"><img [src]="'cards/roles/' + c + '.jpg'" alt="" /></div>
          }
        </div>
      </div>
    </section>

    <div class="page">
      <section class="stats" appReveal>
        <div>
          <svg class="wm" viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="7.5" r="3.5"/><path d="M2.5 20v-1.5A5.5 5.5 0 0 1 8 13h2a5.5 5.5 0 0 1 5.5 5.5V20"/><circle cx="17" cy="8.5" r="2.8"/><path d="M17.5 13.2a4.6 4.6 0 0 1 4 4.6V20"/></svg>
          <b>5–19</b><span>players</span>
        </div>
        <div>
          <svg class="wm" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21V3"/><path d="M3 3h5.5L7 5.5 8.5 8H3"/><path d="M11 21V7"/><path d="M11 7h5.5L15 9.5l1.5 2.5H11"/><path d="M19 21v-10"/><path d="M19 11h3l-1 2 1 2h-3"/><path d="M1.5 21h21"/></svg>
          <b>3</b><span>parties</span>
        </div>
        <div>
          <svg class="wm" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11h18"/><path d="M5.5 11l1.6-5.6a1.5 1.5 0 0 1 1.9-1l1.9.6a3.5 3.5 0 0 0 2.2 0l1.9-.6a1.5 1.5 0 0 1 1.9 1L18.5 11"/><circle cx="7.5" cy="17" r="3"/><circle cx="16.5" cy="17" r="3"/><path d="M10.5 16.5a2.5 2.5 0 0 1 3 0"/></svg>
          <b>{{ roleCount() }}</b><span>secret roles</span>
        </div>
        <div>
          <svg class="wm" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6.5C10 5 7.5 4.5 3 4.5v14c4.5 0 7 .5 9 2 2-1.5 4.5-2 9-2v-14c-4.5 0-7 .5-9 2z"/><path d="M12 6.5v14"/><path d="M6 8.5c1.6 0 2.9.2 4 .6M6 12c1.6 0 2.9.2 4 .6M14 9.1c1.1-.4 2.4-.6 4-.6M14 12.6c1.1-.4 2.4-.6 4-.6"/></svg>
          <b>{{ version() ? 'v' + version() : '…' }}</b><span>rulebook</span>
        </div>
      </section>

      <section class="tiles">
        <a class="tile lib" routerLink="/rules" appReveal>
          <div class="pic book">
            <img class="board" src="cards/thumb/boards/liberal.jpg" alt="" loading="lazy" />
            <img class="pg" src="rulebook/pages/p3.jpg" alt="" loading="lazy" />
            <img class="pg" src="rulebook/pages/p5.jpg" alt="" loading="lazy" />
            <img class="pg" src="rulebook/pages/p1.jpg" alt="" loading="lazy" />
            <img class="pol" src="cards/thumb/policies/fascist.jpg" alt="" loading="lazy" />
          </div>
          <div class="txt">
            <h2>Rulebook</h2>
            <p>Every rule of the base game and XL, with search, a table of contents and the finished PDFs to download.</p>
            <span class="go">Open the rules <i>→</i></span>
          </div>
        </a>
        <a class="tile com" routerLink="/roles" appReveal>
          <div class="pic cards">
            <img src="cards/thumb/roles/bodyguard.jpg" alt="" loading="lazy" />
            <img src="cards/thumb/roles/propagandist.jpg" alt="" loading="lazy" />
            <img src="cards/thumb/roles/centrist_a.jpg" alt="" loading="lazy" />
          </div>
          <div class="txt">
            <h2>Roles</h2>
            <p>Each secret role with its briefing card: what it wins on, what it knows and how to play it.</p>
            <span class="go">Meet the roles <i>→</i></span>
          </div>
        </a>
        <a class="tile cta" routerLink="/print" appReveal>
          <div class="pic"><img src="cards/thumb/boards/fascist_9-10.jpg" alt="" loading="lazy" /></div>
          <div class="txt">
            <h2>Print builder</h2>
            <p>Pick the paper, the table size and the modules, and get print-ready PDFs with crop marks, made in your browser.</p>
            <span class="go">Start building <i>→</i></span>
          </div>
        </a>
      </section>

      <section class="split" appReveal>
        <div class="box">
          <h2>New to the XL expansion?</h2>
          <ul>
            <li><b>The Communists</b> join as a third party, with their own board and powers.</li>
            <li><b>Extra roles</b> like the Monarchist, the Jester or the Detective twist every game.</li>
            <li><b>Anti-policies and emergency powers</b> keep the board moving at big tables.</li>
          </ul>
          <a routerLink="/rules">Read the XL rules</a>
        </div>
        <div class="box soon">
          <div class="row"><h2>3D printing</h2><span class="chip">Coming soon</span></div>
          <p>Printable models to go with your paper copy. The files, print settings and photos will appear here once they are ready.</p>
          <a routerLink="/3d-printing">See what is planned</a>
        </div>
      </section>

      <section class="original" appReveal>
        <img src="cards/thumb/briefing/back.jpg" alt="" loading="lazy" />
        <div class="txt">
          <h2>The original Secret Hitler</h2>
          <p>
            Secret Hitler is made by Goat, Wolf &amp; Cabbage. Their website sells the boxed game and also offers a free
            print-and-play version of the base game. This edition does not change any of its rules: it brings the same game in full colour,
            together with the XL expansion, so you can print one matching set for up to 19 players.
          </p>
        </div>
        <a class="btn primary" href="https://www.secrethitler.com/" target="_blank" rel="noopener">Open secrethitler.com <i aria-hidden="true">↗</i></a>
      </section>

      <section class="about" id="about" appReveal>
        <h2>About</h2>
        <p class="lead2">
          <b>Secret Hitler</b> is a social deduction game for 5 to 10 players: Liberals against Fascists, with Hitler hidden among them.
          <b>Secret Hitler XL</b> is a fan expansion that takes it to 19 players with a third party, the Communists, extra roles,
          anti-policies and emergency powers. This site holds the complete rules of both and everything you need to print your own copy.
        </p>
        <div class="cols">
          <div class="box">
            <h3>How it works</h3>
            <ul>
              <li>Everything runs in your browser. The PDFs are put together on your computer and nothing is uploaded.</li>
              <li>All the game text lives in plain JSON files, so one change updates the rulebook, the roles page and the printed cards together.</li>
              <li>Print at 100 % (no "fit to page"), double-sided, flipping on the long edge, then cut along the crop marks.</li>
            </ul>
          </div>
          <div class="box">
            <h3>Licence</h3>
            <p>Secret Hitler and Secret Hitler XL are released under
              <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener">CC BY-NC-SA 4.0</a>, and so is this edition:
              share and adapt it freely with credit, but not for money. This is a fan project and is not affiliated with the publishers of Secret Hitler.
              See the <a routerLink="/" fragment="credits">credits</a> for everyone who made it.</p>
            <h3>Feedback</h3>
            <p>Found a typo, a rules question or a broken card? Open an issue on
              <a href="https://github.com/Firestone82/secret-hitler-xl/issues" target="_blank" rel="noopener">GitHub</a>.</p>
          </div>
        </div>
      </section>

      <section class="credits" id="credits" appReveal>
        <h2>Credits</h2>
        <p class="lead2">Secret Hitler + XL is the work of many people. This edition only collects, re-sets and rewords what they made.</p>
        <div class="box">
          <h3>The game and the expansion</h3>
          <app-credits />
        </div>
        <div class="box">
          <h3>This website</h3>
          <ul>
            <li>Website, print builder and print layout by <a href="https://github.com/Firestone82" target="_blank" rel="noopener">Pavel Mikula (Firestone82)</a>,
              who put this edition online and adjusted the cards, boards and sheets for printing.</li>
            <li>Built with <a href="https://angular.dev/" target="_blank" rel="noopener">Angular</a>. The print PDFs are made in your browser with
              <a href="https://pdf-lib.js.org/" target="_blank" rel="noopener">pdf-lib</a> and packed with
              <a href="https://stuk.github.io/jszip/" target="_blank" rel="noopener">JSZip</a>.</li>
            <li>Typefaces: <a href="https://fonts.google.com/specimen/Jost" target="_blank" rel="noopener">Jost</a> by Owen Earl and
              <a href="https://fonts.google.com/specimen/Germania+One" target="_blank" rel="noopener">Germania One</a> by John Vargas Beltrán,
              both under the SIL Open Font License.</li>
          </ul>
        </div>
      </section>

      <section class="oss" appReveal>
        <div>
          <h2>Open source and free</h2>
          <p>Shared under CC BY-NC-SA 4.0. Spotted a typo or have an idea? The code and the issue tracker are on GitHub.</p>
        </div>
        <app-github-stars size="big" />
      </section>
    </div>
  `,
  styles: `
    :host { display: block; }

    .hero { background: var(--dark); color: var(--cream); overflow: hidden; position: relative; }
    .hero::before { content: ''; position: absolute; inset: 0; opacity: .5;
      background: radial-gradient(60% 80% at 85% 50%, rgba(232, 129, 58, .25), transparent 70%); }
    .hero-in { position: relative; max-width: var(--page-w); margin: 0 auto; padding: clamp(2rem, 6vw, 4.5rem) clamp(.8rem, 3vw, 2rem);
      display: grid; grid-template-columns: 1.1fr 1fr; align-items: center; gap: 2rem; }
    .kicker { margin: 0; text-transform: uppercase; letter-spacing: .12em; font-size: .8rem; font-weight: 600; color: var(--orange); }
    h1 { font-size: clamp(2.6rem, 6vw, 4.4rem); margin: .3rem 0 .6rem; }
    h1 em { font-style: normal; color: var(--orange); }
    .lead { font-size: 1.12rem; max-width: 34rem; color: #e9e3c9; margin: 0; }
    .ctas { display: flex; gap: .7rem; flex-wrap: wrap; margin-top: 1.6rem; }
    .btn.big { padding: .75rem 1.3rem; font-size: 1.02rem; text-decoration: none; transition: transform .15s, background .15s, box-shadow .15s; }
    .btn.big:hover { transform: translateY(-2px); }
    .btn.primary.big:hover { background: #f0924f; box-shadow: 0 8px 20px rgba(232, 129, 58, .35); }
    .hero .btn.ghost { color: var(--cream); box-shadow: inset 0 0 0 1.5px rgba(255, 247, 214, .4); }
    .hero .btn.ghost:hover { background: rgba(255, 247, 214, .08); }
    .copy > * { animation: rise .6s cubic-bezier(.2, .7, .3, 1) backwards; }
    .copy > :nth-child(2) { animation-delay: .06s; }
    .copy > :nth-child(3) { animation-delay: .12s; }
    .copy > :nth-child(4) { animation-delay: .18s; }

    /* fanned role cards; the white print margin of the art is cropped away */
    .fan { position: relative; height: clamp(240px, 32vw, 380px); }
    .card { --w: clamp(120px, 15vw, 190px); position: absolute; left: 50%; bottom: 0; width: var(--w); aspect-ratio: 346 / 503;
      margin-left: calc(var(--w) / -2); border-radius: 10px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, .45);
      transform-origin: 50% 120%; transform: rotate(calc(var(--i) * 9deg)) translateX(calc(var(--i) * 18%));
      animation: deal .8s cubic-bezier(.2, .7, .3, 1) backwards; animation-delay: calc(.15s + (var(--i) + 2) * .07s);
      transition: transform .35s cubic-bezier(.2, .7, .3, 1); }
    .card img { display: block; width: 121.4%; margin: -10.7% 0 0 -10.7%; }
    .fan:hover .card { transform: rotate(calc(var(--i) * 13deg)) translateX(calc(var(--i) * 30%)) translateY(-8px); }
    @keyframes deal { from { opacity: 0; transform: translateY(40%) rotate(0deg); } }
    @keyframes rise { from { opacity: 0; transform: translateY(14px); } }

    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: var(--line); border-radius: 14px; overflow: hidden; margin-top: -0.5rem; }
    .stats div { position: relative; overflow: hidden; background: #fff; padding: 1rem; text-align: center; }
    /* faint line icon behind each number so the cells do not look empty */
    .stats .wm { position: absolute; right: 8%; top: 50%; width: 5.2rem; height: 5.2rem; transform: translateY(-50%) rotate(-8deg);
      fill: none; stroke: var(--dark); stroke-width: 1.4; stroke-linecap: round; stroke-linejoin: round; opacity: .1;
      transition: opacity .3s, transform .3s; pointer-events: none; }
    .stats div:hover .wm { opacity: .18; transform: translateY(-50%) rotate(0deg) scale(1.06); }
    .stats div:nth-child(2) .wm { stroke: var(--fas); }
    .stats div:nth-child(3) .wm { stroke: var(--com); }
    .stats div:nth-child(4) .wm { stroke: var(--lib); }
    .stats b, .stats span { position: relative; }
    .stats b { display: block; font-family: var(--display); font-weight: 400; font-size: 2rem; line-height: 1.1; color: var(--dark); }
    .stats span { color: var(--muted); font-size: .9rem; }

    .tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.2rem; margin: 2rem 0; }
    .tile { display: flex; flex-direction: column; background: #fff; border-radius: 16px; overflow: hidden; text-decoration: none; color: inherit;
      border-top: 5px solid var(--lib); transition: transform .2s, box-shadow .2s; }
    .tile.com { border-top-color: var(--com); }
    .tile.cta { border-top-color: var(--orange); }
    .tile:nth-child(2) { transition-delay: .06s; }
    .tile:nth-child(3) { transition-delay: .12s; }
    .tile.in:hover { transform: translateY(-4px); box-shadow: 0 12px 28px rgba(0, 0, 0, .1); transition-delay: 0s; }
    .pic { height: 150px; background: #ece6d3; display: flex; align-items: center; justify-content: center; overflow: hidden; }
    .pic img { width: 100%; height: 100%; object-fit: cover; transition: transform .4s; }
    .tile:hover .pic img { transform: scale(1.05); }
    /* rulebook: the cover and two inner pages fanned over a dimmed board, with a policy card on top */
    .pic.book { position: relative; background: var(--dark); }
    .pic.book .board { position: absolute; inset: 0; opacity: .35; filter: blur(1.5px) saturate(.8); transform: scale(1.1); }
    .pic.book .pg, .pic.book .pol { position: absolute; top: 14%; left: 50%; width: auto; height: 118%; object-fit: contain;
      border-radius: 3px; box-shadow: 0 6px 16px rgba(0, 0, 0, .45); transition: transform .4s cubic-bezier(.2, .7, .3, 1); }
    .pic.book .pg:nth-child(2) { transform: translateX(-112%) rotate(-10deg); }
    .pic.book .pg:nth-child(3) { transform: translateX(12%) rotate(10deg); }
    .pic.book .pg:nth-child(4) { transform: translateX(-50%) translateY(-4%); }
    .pic.book .pol { top: 34%; height: 62%; border-radius: 6px; transform: translateX(105%) rotate(14deg); }
    .tile:hover .pic.book .board { transform: scale(1.15); }
    .tile:hover .pic.book .pg:nth-child(2) { transform: translateX(-128%) rotate(-14deg); }
    .tile:hover .pic.book .pg:nth-child(3) { transform: translateX(28%) rotate(14deg); }
    .tile:hover .pic.book .pg:nth-child(4) { transform: translateX(-50%) translateY(-10%); }
    .tile:hover .pic.book .pol { transform: translateX(150%) rotate(20deg) translateY(-6%); }
    .pic.cards { gap: .5rem; padding: 1rem .8rem 0; align-items: flex-start; }
    .pic.cards img { width: auto; height: 120%; object-fit: contain; filter: drop-shadow(0 4px 8px rgba(0, 0, 0, .2)); }
    .pic.cards img:nth-child(1) { transform: rotate(-8deg) translateY(6%); }
    .pic.cards img:nth-child(3) { transform: rotate(8deg) translateY(6%); }
    .tile:hover .pic.cards img:nth-child(1) { transform: rotate(-12deg) translate(-6%, 4%); }
    .tile:hover .pic.cards img:nth-child(2) { transform: translateY(-4%); }
    .tile:hover .pic.cards img:nth-child(3) { transform: rotate(12deg) translate(6%, 4%); }
    .txt { padding: 1rem 1.2rem 1.2rem; display: flex; flex-direction: column; flex: 1; }
    .txt h2 { margin: 0 0 .3rem; font-size: 1.7rem; }
    .txt p { margin: 0 0 .8rem; color: var(--muted); }
    .go { margin-top: auto; font-weight: 600; color: var(--lib); }
    .com .go { color: var(--com); }
    .cta .go { color: #b85a1a; }
    .go i { display: inline-block; font-style: normal; transition: transform .2s; }
    .tile:hover .go i { transform: translateX(4px); }

    .split { display: grid; grid-template-columns: 1.4fr 1fr; gap: 1.2rem; }
    .box { background: #fff; border-radius: 16px; padding: 1.2rem 1.4rem 1.4rem; }
    .box h2 { margin: 0 0 .4rem; font-size: 1.6rem; }
    .box ul { margin: 0 0 .8rem; padding-left: 1.2rem; }
    .box li { margin: .35rem 0; }
    .box p { margin: 0 0 .8rem; color: var(--muted); }
    .box a { font-weight: 600; }
    .soon { background: repeating-linear-gradient(135deg, #fff, #fff 14px, #fbf7ea 14px, #fbf7ea 28px); }
    .row { display: flex; align-items: center; justify-content: space-between; gap: .8rem; margin-bottom: .4rem; }
    .row h2 { margin: 0; }
    .soon .chip { background: var(--orange); color: #2a1206; flex: none; }

    .original { display: flex; align-items: center; gap: 1.4rem; margin-top: 1.2rem; padding: 1.2rem 1.4rem; border-radius: 16px;
      background: var(--dark); color: var(--cream); }
    .original img { flex: none; width: 84px; border-radius: 8px; box-shadow: 0 6px 16px rgba(0, 0, 0, .4); transform: rotate(-4deg); }
    .original .txt { padding: 0; }
    .original h2 { margin: 0 0 .3rem; font-size: 1.6rem; }
    .original .txt { flex: 1; }
    .original p { margin: 0; color: #d8d2b8; }
    .original .btn { flex: none; text-decoration: none; padding: .65rem 1.1rem; transition: background .15s; }
    .original .btn:hover { background: #f0924f; }
    .original .btn i { font-style: normal; }

    .about { margin-top: 2.5rem; scroll-margin-top: 80px; }
    .about > h2 { font-size: 2.2rem; margin: 0 0 .3rem; }
    .lead2 { font-size: 1.05rem; margin: 0 0 1rem; }
    .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 1.2rem; }
    .cols h3 { margin: 0 0 .3rem; font-size: 1.35rem; }
    .cols h3:not(:first-child) { margin-top: 1rem; }
    .cols p { margin: 0; color: inherit; }
    .credits { margin-top: 2.5rem; scroll-margin-top: 80px; }
    .credits > h2 { font-size: 2.2rem; margin: 0 0 .3rem; }
    .credits .box + .box { margin-top: 1.2rem; }
    .credits h3 { margin: 0 0 .3rem; font-size: 1.35rem; }
    .credits ul { margin: .4rem 0 0; padding-left: 1.2rem; }
    .credits li { margin: .35rem 0; }
    .about code { background: #ece6d3; padding: 0 .3rem; border-radius: 4px; }

    .oss { display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; flex-wrap: wrap; margin-top: 2rem; padding: 1.4rem 1.6rem;
      border-radius: 16px; background: #ece6d3; }
    .oss h2 { margin: 0 0 .2rem; font-size: 1.6rem; }
    .oss > div { flex: 1 1 24rem; }
    .oss p { margin: 0; color: #4a483f; }

    @media (max-width: 900px) {
      .hero-in { grid-template-columns: 1fr; }
      .fan { height: 230px; order: -1; margin-bottom: .8rem; }
      .card { --w: 120px; }
      .tiles, .split, .cols { grid-template-columns: 1fr; }
      .original { flex-direction: column; align-items: flex-start; }
      .original img { display: none; }
      .stats { grid-template-columns: repeat(2, 1fr); }
    }
  `,
})
export class HomePage {
  private data = inject(DataService);
  readonly cards = HERO_CARDS;
  readonly roleCount = computed(() => this.data.roles()?.roles.length ?? 15);
  readonly version = computed(() => this.data.rulebookMeta()?.version);

  constructor() {
    // the page scrolls inside SimpleBar, so the router does not jump to #about or #credits by itself
    const host = inject(ElementRef<HTMLElement>);
    const fragment = toSignal(inject(ActivatedRoute).fragment);
    let ready = false;
    const jump = (smooth: boolean) => {
      const id = fragment();
      if (id) host.nativeElement.querySelector('#' + CSS.escape(id))?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
    };
    afterNextRender(() => { ready = true; jump(false); });
    effect(() => { fragment(); if (ready) jump(true); });
  }
}
