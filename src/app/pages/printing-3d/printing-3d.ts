import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GithubStars } from '../../shared/github-stars';
import { Reveal } from '../../shared/reveal';

/** Placeholder until the 3D models are ready. */
@Component({
  selector: 'app-printing-3d',
  imports: [RouterLink, GithubStars, Reveal],
  template: `
    <div class="page narrow">
      <div class="row"><h1>3D printing</h1><span class="chip soon">Coming soon</span></div>
      <p class="lead">
        Printable models to go with your paper copy are on the way. Once they are ready, this page will hold:
      </p>

      <div class="plan">
        @for (p of planned; track p.name) {
          <div class="item" appReveal>
            <div class="ico" aria-hidden="true"><svg viewBox="0 0 24 24"><path [attr.d]="p.icon" /></svg></div>
            <div><h2>{{ p.name }}</h2><p>{{ p.text }}</p></div>
          </div>
        }
      </div>

      <section class="box" appReveal>
        <h2>Until then</h2>
        <p>The <a routerLink="/print">print builder</a> already makes everything you need to play on paper. Have a model to share or an idea
          for one? Open an issue or a pull request on GitHub.</p>
        <app-github-stars size="big" />
      </section>
    </div>
  `,
  styles: `
    .narrow { max-width: 920px; }
    .row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin: .5rem 0 .2rem; }
    .soon { flex: none; background: var(--orange); color: #2a1206; }
    h1 { font-size: 2.4rem; margin: 0; }
    .lead { max-width: 720px; font-size: 1.05rem; }
    .plan { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin: 1.5rem 0; }
    .item { display: flex; gap: .9rem; background: #fff; border-radius: 14px; padding: 1rem 1.1rem; border: 2px dashed var(--line); }
    .item:nth-child(2) { transition-delay: .05s; }
    .item:nth-child(3) { transition-delay: .1s; }
    .item:nth-child(4) { transition-delay: .15s; }
    .ico { flex: none; width: 44px; height: 44px; border-radius: 10px; background: #ece6d3; display: grid; place-items: center; }
    .ico svg { width: 24px; height: 24px; fill: none; stroke: var(--dark); stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
    .item h2 { margin: 0 0 .15rem; font-size: 1.3rem; }
    .item p { margin: 0; color: var(--muted); font-size: .93rem; }
    .box { background: #fff; border-radius: 14px; padding: 1.1rem 1.3rem 1.3rem; }
    .box h2 { margin: 0 0 .3rem; font-size: 1.6rem; }
    .box p { margin: .3rem 0 1rem; }
    @media (max-width: 640px) { .plan { grid-template-columns: 1fr; } }
  `,
})
export class Printing3dPage {
  /** what the page will hold once the models are ready */
  readonly planned = [
    { name: 'Model files', text: 'Ready-to-slice STL and 3MF files for each piece, free to download.', icon: 'M12 2l8 4.5v9L12 20l-8-4.5v-9zM12 11l8-4.5M12 11v9M12 11L4 6.5' },
    { name: 'Print settings', text: 'Recommended layer height, infill, supports and filament colours for every part.', icon: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4' },
    { name: 'Assembly notes', text: 'How the parts fit together and with the printed cards and boards.', icon: 'M14 4l6 6-10 10H4v-6zM12 6l6 6' },
    { name: 'Photos', text: 'Pictures of the finished pieces on the table.', icon: 'M3 7h4l2-3h6l2 3h4v13H3zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
  ];
}
