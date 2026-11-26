# Print builder

The print builder makes print-ready PDFs entirely in the browser with [pdf-lib](https://pdf-lib.js.org/) and packs them with [JSZip](https://stuk.github.io/jszip/). Nothing is uploaded. The page is `src/app/pages/print/`, and the generator is in `src/app/print/`:

| File | What it does |
|---|---|
| `options.ts` | The choices and the rules that keep them consistent (Communists above 10 players, spies together…). |
| `plan.ts` | How many of each piece the chosen set needs, from the rulebook's seat tables. |
| `layout.ts` | Places pieces on A3 or A4 sheets (A4 boards come as halves), split into files by paper. |
| `render.ts` | Draws the sheets with pdf-lib: front and back pages, bleed, light grey crop marks in the margins and gaps, registration targets, fold and half marks. `pieceFiles()` writes the single-piece PDFs for print services. |
| `preview.ts` | The same layout as SVG for the on-screen preview, using the JPEGs in `public/preview/` (sharper ones from `preview/hd/` in full screen, briefing cards from `preview/briefing/`). |
| `briefing-pdf.ts` | The Role Briefing card renderer. |

## Tools

- `npx tsx tools/test-render.mts` runs the generator in Node and writes test PDFs to `/tmp`.
- `tools/export/` holds the Python scripts that exported the data and pieces from the original generator. They are only needed to re-export art, not to edit text.
- After changing anything in `public/pieces/`, run `python3 tools/export/web_previews.py [piece ids]` to refresh the preview images (normal and `hd/`).
- After changing briefing text in `roles.json`, run `npx tsx tools/export/briefing_previews.mts` so the preview shows the new text. The PDFs always use the current text.
- Borderless boards are the inner track of each board only, so each has its own size: `INSERT_MM` in `plan.ts` and `pieces.json` must agree with `public/pieces/i_*.pdf`.
