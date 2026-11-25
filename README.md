# Secret Hitler + XL: rules and print builder

An Angular single-page app for the Secret Hitler + Secret Hitler XL print-and-play set (up to 19 players):

- **Rulebook**: the complete rules, with search and a table of contents. Role sections come from `roles.json`.
- **Roles**: every Secret Role card with its Role Briefing card, and a PDF of each briefing.
- **Print builder**: choose paper (A3 or A4), table size, XL modules, extra roles and components, with a live preview of every sheet. The PDFs are built in the browser with [pdf-lib](https://pdf-lib.js.org/); nothing is uploaded. For a print service it can instead export a ZIP with every piece as its own front and back PDF (cut size plus 3 mm bleed) and a `manifest.csv` of the copies.

It runs entirely on static files, so it deploys to GitHub Pages.

## Run it

```bash
npm install
npm start            # http://localhost:4200
npm run build        # production build in dist/secret-hitler-xl/browser
```

## Deploy to GitHub Pages

1. Push this folder to a GitHub repository (branch `main`).
2. In the repository settings, under **Pages**, set **Source** to **GitHub Actions**.
3. Every push to `main` runs `.github/workflows/deploy.yml` and publishes the site at `https://<user>.github.io/<repo>/`.

The app uses hash URLs (`#/rules`) and a relative base href, so it works under any repository name with no extra configuration.

## Where the content lives

All game content is in `public/`:

| Path | What it is |
|---|---|
| `data/roles.json` | Every role: name, module, palette, seat, art, portrait crop, **briefing card text** and **rulebook text**. Edit it to change both. |
| `data/rulebook.json` | The rest of the rulebook as blocks (headings, paragraphs, tables, scripts, notes, figures). |
| `data/pieces.json` | Size and label of every printable piece. |
| `pieces/*.pdf` | One small PDF per piece: page 1 front, page 2 back, cut size plus 3 mm bleed. The builder places these on the sheets. |
| `portraits/`, `cards/`, `rb/` | Portraits for the briefing cards, card thumbnails, rulebook pictures. |
| `preview/` | Small JPEGs of every piece (front `_0`, back `_1`) for the print builder's preview. Made from `pieces/` by `tools/export/web_previews.py`. |
| `fonts/` | Jost and Germania One, embedded into the generated PDFs. |
| `pdf/` | The finished rulebook PDFs (A5 and A4, normal and booklet) and the rulings sheet. |

### roles.json

```jsonc
{
  "palettes": { "lib": { "header": "#61c9d9", "headerText": "#013a52", "accent": "#01607f", "paper": "#e6f6f9" }, ... },
  "roles": [{
    "id": "jester",
    "name": "Jester",
    "module": "roles",              // base | communists | roles
    "palette": "jes",               // the Jester has a colour of its own
    "seat": "liberal",              // whose seat the role takes
    "extraMembership": { "fascist": 1 },   // membership cards printed on top of the seats
    "art": ["h_r_jester"],          // Secret Role card piece(s)
    "portrait": "n_r_jester", "crop": [0.47, 0.44, 0.56],
    "briefing": { "side": "No team, own goal", "card": "Fascist", "sections": [{ "label": "YOU WIN IF", "items": ["..."] }] },
    "rulebook": { "title": "The Jester", "teamLabel": "No team", "paragraphs": ["..."], "addWhen": "...",
                  "addWhenTable": "...", "pitch": "..." }   // optional roles: "Add it when" and "What it does" in the print builder
  }]
}
```

Briefing text may use `<b>…</b>`. Briefing cards are drawn as vector text, so edits show up in the PDF with no other step.

## How the print builder works

`src/app/print/`:

- `options.ts`: the choices and the rules that keep them consistent (Communists above 10 players, spies together…).
- `plan.ts`: how many of each piece the chosen set needs, from the rulebook's seat tables.
- `layout.ts`: places pieces on A3 or A4 sheets (A4 boards come as halves), split into files by paper.
- `render.ts`: draws the sheets with pdf-lib: front and back pages, bleed, light grey crop marks in the margins and gaps, registration targets, fold and half marks. `pieceFiles()` writes the single-piece PDFs for print services.
- `preview.ts`: the same layout as SVG for the on-screen preview, using the JPEGs in `public/preview/`.
- `briefing-pdf.ts`: the Role Briefing card renderer.

`tools/test-render.mts` runs the generator in Node (`npx tsx tools/test-render.mts`) and writes test PDFs to `/tmp`.

`tools/export/` holds the Python scripts that exported the data and pieces from the original generator. They are only needed to re-export art, not to edit text. After changing anything in `public/pieces/`, run `python3 tools/export/web_previews.py` to refresh the preview images.

## Credits and licence

Secret Hitler by Mike Boxleiter, Tommy Maranges, Max Temkin and Mac Schubert ([secrethitler.com](https://www.secrethitler.com/)).
Secret Hitler Socialist expansion by Dtep, mrkvicka and havosh. Secret Hitler XL by Lord_Roguy (Bo P.), with art by u/PenguineWithAFez, u/muhaaman, Leo Carlton and Hal Aetus.

Licensed [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/): free to share and adapt with credit, not for commercial use.
