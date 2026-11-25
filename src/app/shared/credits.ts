import { Component } from '@angular/core';

/** Who made the game, the expansion and this edition, plus the licence. Shown in the rulebook and on the Credits page. */
@Component({
  selector: 'app-credits',
  template: `
    <div class="cols">
      <div>
        <h4>Secret Hitler</h4><p>Rules and art by Mike Boxleiter, Tommy Maranges and Max Temkin; art by Mac Schubert. <a href="https://www.secrethitler.com/" target="_blank" rel="noopener">secrethitler.com</a></p>
        <h4>Secret Hitler Socialist expansion</h4><p>Dtep, mrkvicka and havosh.</p>
        <h4>Secret Hitler XL</h4><p>Rules by Lord_Roguy (Bo P.): the Communists (adapted from the Socialists), Anarchist, Monarchist, Capitalist, Centrists, anti-policies and emergency powers. <a href="https://drive.google.com/drive/folders/1_UMxjcPKxG3I_Zgr0JtOsD5Lh6GaBDVY" target="_blank" rel="noopener">Original XL files</a></p>
        <h4>XL artwork</h4><p>u/PenguineWithAFez: the Communists and the Anarchist. u/muhaaman: clothing of the Communist grizzly bear. Leo Carlton (u/therazeblitz): the Monarchist and the Capitalist. Hal Aetus: the Centrists.</p>
      </div>
      <div>
        <h4>Play testers of Secret Hitler XL</h4><p>Fluff, Greenbeehn, Adoy, u/ZoomZoom670, Racc, Zommy, Käs, Brendon Bradburn, Coon, N00bAdrian, Wagon, JP, Kangawolf (inventor of the wildcat strike strategy for the Anarchist); the University of Queensland's Sci-Fi &amp; Fantasy Society, Mafia Society and Board Games Society; and many more.</p>
        <h4>This edition</h4><p>A remix of the files above: rulebooks merged and reworded, cards and boards re-set, role briefings and reference cards added. <a href="https://drive.google.com/drive/folders/10owkfJSwhzqOrMcFyPqaK2EqSAq_OIKO" target="_blank" rel="noopener">Files of this edition</a></p>
      </div>
    </div>
    <div class="lic"><img src="rb/cc_by_nc_sa.png" alt="CC BY-NC-SA" /><p>Licensed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0 (<a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener">CC BY-NC-SA 4.0</a>). Free to share and adapt with credit; not for commercial use; adaptations use the same licence.</p></div>
  `,
  styles: `
    :host { display: block; }
    .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; font-size: .9rem; }
    h4 { margin: .7rem 0 .1rem; }
    p { margin: 0; color: var(--muted); }
    .lic { display: flex; gap: 1rem; align-items: center; margin-top: 1rem; font-size: .9rem; }
    .lic img { width: 110px; }
    @media (max-width: 900px) { .cols { grid-template-columns: 1fr; } }
  `,
})
export class Credits {}
