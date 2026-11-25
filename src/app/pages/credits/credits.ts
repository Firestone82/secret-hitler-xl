import { Component } from '@angular/core';
import { Credits } from '../../shared/credits';

@Component({
  selector: 'app-credits-page',
  imports: [Credits],
  template: `
    <div class="page narrow">
      <h1>Credits</h1>
      <p class="lead">Secret Hitler + XL is the work of many people. This edition only collects, re-sets and rewords what they made.</p>

      <section class="box">
        <h2>The game and the expansion</h2>
        <app-credits />
      </section>

      <section class="box">
        <h2>This website</h2>
        <ul>
          <li>Built with <a href="https://angular.dev/" target="_blank" rel="noopener">Angular</a>. The print PDFs are made in your browser with
            <a href="https://pdf-lib.js.org/" target="_blank" rel="noopener">pdf-lib</a> and packed with
            <a href="https://stuk.github.io/jszip/" target="_blank" rel="noopener">JSZip</a>.</li>
          <li>Typefaces: <a href="https://fonts.google.com/specimen/Jost" target="_blank" rel="noopener">Jost</a> by Owen Earl and
            <a href="https://fonts.google.com/specimen/Germania+One" target="_blank" rel="noopener">Germania One</a> by John Vargas Beltrán,
            both under the SIL Open Font License.</li>
          <li>Source code and issue tracker on
            <a href="https://github.com/Firestone82/secret-hitler-xl" target="_blank" rel="noopener">GitHub</a>.</li>
        </ul>
      </section>
    </div>
  `,
  styles: `
    .narrow { max-width: 920px; }
    h1 { font-size: 2.4rem; margin: .5rem 0 .2rem; }
    .lead { color: var(--muted); max-width: 680px; }
    .box { background: #fff; border-radius: 14px; padding: 1.1rem 1.3rem 1.3rem; margin-top: 1.4rem; }
    .box h2 { margin: 0 0 .3rem; font-size: 1.6rem; }
    ul { margin: .4rem 0 0; padding-left: 1.2rem; }
    li { margin: .35rem 0; }
  `,
})
export class CreditsPage {}
