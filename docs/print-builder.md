# Print builder

The print builder makes print-ready PDFs entirely in the browser with [pdf-lib](https://pdf-lib.js.org/) and packs them with [JSZip](https://stuk.github.io/jszip/). Nothing is uploaded. The page is `src/app/pages/print/`, and the generator is in `src/app/print/`:

| File | What it does |
|---|---|
| `options.ts` | The choices and the rules that keep them consistent (Communists above 10 players, spies together…). |
| `plan.ts` | How many of each piece the chosen set needs, from the rulebook's seat tables. |
| `layout.ts` | Places pieces on A3 or A4 sheets (A4 boards come as halves), all in one PDF. |
| `render.ts` | Draws the sheets with pdf-lib: front and back pages, bleed, light grey crop marks in the margins and gaps, registration targets, fold and half marks. `pieceFiles()` writes the single-piece PDFs for print services. |
| `preview.ts` | The same layout as SVG for the on-screen preview, using the thumbnails in `public/cards/thumb/` (the full-size pictures in full screen). The pictures are cut size, so a stretched copy under each stands in for the bleed. |
| `briefing-pdf.ts` | The Role Briefing card renderer. |

## Tools

- `npx tsx tools/test-render.mts` runs the generator in Node and writes test PDFs to `/tmp`.
- `tools/export/` holds the Python scripts that exported the data and pieces from the original generator. They are only needed to re-export art, not to edit text.
- After changing a PDF in `public/cards/`, run `python3 tools/export/card_images.py [card ids]` to refresh its pictures (full size and `thumb/`).
- After changing briefing text in `public/data/roles/`, run `npx tsx tools/export/briefing_images.mts` so the pictures show the new text. The PDFs always use the current text.
- Borderless boards are the inner track and footer strip of each board in a narrow frame of their own, made from the boards with border by `python3 tools/export/borderless_boards.py`. It also updates `cards.json` and prints the sizes for `INSERT_MM` in `plan.ts`, which must agree with `public/cards/boards/borderless/*.pdf`.
