# Data files

All game content is in `public/`. The site reads three JSON files at start-up (`src/app/core/data.service.ts`), and everything else is images, PDFs and fonts.

| Path | What it is |
|---|---|
| `data/roles.json` | Every role: name, module, palette, seat, art, portrait crop, **briefing card text** and **rulebook text**. Edit it to change both. |
| `data/rulebook.json` | The rest of the rulebook: version and changelog, PDF downloads, seat tables, and the text as blocks (headings, paragraphs, tables, scripts, notes, figures, credits). |
| `data/pieces.json` | Size and label of every printable piece. |
| `pieces/*.pdf` | One small PDF per piece: page 1 front, page 2 back, cut size plus 3 mm bleed. The print builder places these on the sheets. |
| `portraits/`, `cards/`, `rb/` | Portraits for the briefing cards, card thumbnails, rulebook pictures. |
| `preview/` | Small JPEGs of every piece (front `_0`, back `_1`) for the print builder's preview. Made from `pieces/` by `tools/export/web_previews.py`. |
| `fonts/` | Jost and Germania One, embedded into the generated PDFs. |
| `pdf/` | The finished rulebook PDFs (A5 and A4, normal and booklet). |

Keep the JSON files indented with 2 spaces. Text fields may use simple HTML such as `<b>…</b>` and `<i>…</i>`.

## roles.json

```jsonc
{
  "palettes": {                       // colours of the briefing cards and role boxes
    "lib": { "header": "#61c9d9", "headerText": "#013a52", "accent": "#01607f", "paper": "#e6f6f9" }
  },
  "roles": [
    {
      "id": "jester",
      "name": "Jester",
      "module": "roles",              // base | communists | roles
      "palette": "jes",               // key in "palettes"; the Jester has a colour of its own
      "party": "fascist",
      "regular": false,               // false for the optional XL roles
      "seat": "liberal",              // whose seat the role takes
      "seatLabel": "A Liberal",
      "count": 1,
      "pair": null,                   // id of a role that always comes with this one (the two spies)
      "needsCommunists": false,       // only playable with the Communist module
      "extraMembership": { "fascist": 1 },   // membership cards printed on top of the seats
      "art": ["h_r_jester"],          // Secret Role card piece(s) from public/pieces
      "portrait": "n_r_jester",
      "crop": [0.47, 0.44, 0.56],     // portrait crop on the briefing card: centre x, centre y, width (fractions of the art)
      "briefing": {                   // the Role Briefing card
        "side": "No team, own goal",
        "card": "Fascist",
        "sections": [{ "label": "YOU WIN IF", "items": ["..."] }]
      },
      "rulebook": {                   // the role's section in the rulebook
        "title": "The Jester",
        "teamLabel": "No team",
        "image": "r_jester.jpg",
        "paragraphs": ["..."],
        "addWhen": "...",             // "Add it when" in the rulebook
        "addWhenTable": "...",        // the same, in the table of optional roles
        "pitch": "..."                // "What it does" in the print builder
      }
    }
  ]
}
```

Briefing cards are drawn as vector text, so an edit here shows up in the printed PDF with no other step.

## rulebook.json

Everything on the Rulebook page comes from this file, so the rules change without touching code.

```jsonc
{
  "version": "1.0.0",               // shown in the rulebook sidebar, the footer and on the printed cover
  "date": "2026-11-25",
  "changelog": [                    // the Versions page; add an entry with every rule change
    { "version": "1.0.0", "date": "2026-11-25", "changes": ["..."] }
  ],
  "downloads": [{ "label": "A5, reading order", "file": "pdf/Secret_Hitler_XL_Rulebook_A5.pdf" }],
  "booklets": {                     // what the Print dialog opens for a booklet
    "A4": { "label": "A5 booklet on A4", "file": "pdf/..." },
    "A3": { "label": "A4 booklet on A3", "file": "pdf/..." }
  },
  "setup": {                        // who sits at the table, one entry per player count from "from" upwards
    "xl": { "from": 6, "experimentalFrom": 17, "liberals": [3, 4], "fascists": [], "hitler": [],
            "communists": [], "emergency": [], "fascistBoard": null },
    "base": { "from": 5, "experimentalFrom": null }
  },
  "blocks": [
    { "type": "h2", "text": "...", "id": "..." },
    { "type": "seats", "table": "xl", "caption": "..." }
  ]
}
```

- The seat tables are used twice: `seats` blocks draw them in the rulebook, and the print builder counts the pieces from them. Player counts from `experimentalFrom` up are marked as experimental.
- Any block can carry `"experimental": true` to show it framed with an *Experimental* mark.
- Block types: `part`, `h1`, `h2`, `h3`, `p`, `list`, `table`, `script`, `note`, `figure`, `wide`, `icons`, `wins`, `legislative` (the worked example, with its steps and tiles), `seats`, `role` (written from roles.json) and `credits`.

## pieces.json

One entry per piece in `public/pieces/`, keyed by the file name without `.pdf`:

```json
{
  "t_p018": {
    "kind": "tile",
    "w": 44,
    "h": 68,
    "label": "Liberal policy"
  }
}
```

`kind` is one of `card`, `tile`, `placard`, `long` or `insert`, and `w` and `h` are the cut size in millimetres (without bleed).
