# Data files

All game content is in `public/`. The site reads the JSON files in `public/data/` at start-up (`src/app/core/data.service.ts`, through `src/app/core/load-data.ts`), and everything else is pictures, PDFs and fonts.

```
public/
  data/
    cards.json              every printable piece: size, label, which back it has
    roles/
      index.json            the roles in the order the site lists them, and the blank briefing card
      palettes.json         colours of the briefing cards and role boxes
      <role>.json           one file per role (liberal.json, jester.json, ...)
    rulebook/
      index.json            version, date, PDF downloads, booklets, the chapter list
      changelog.json        the Versions page
      setup.json            the seat tables
      chapters/NN-<id>.json the rulebook text, one file per chapter
  cards/                    every printable piece, grouped by type (see below)
  rulebook/
    pdf/                    the finished rulebook PDFs (A5 and A4, normal and booklet)
    images/                 icons and the licence badge used in the rulebook text
    pages/                  pictures of rulebook pages for the home page
  fonts/                    Jost and Germania One, embedded into the generated PDFs
```

Keep the JSON files indented with 2 spaces. Text fields may use simple HTML such as `<b>…</b>` and `<i>…</i>`. Paths to pictures in the JSON files are relative to `public/` (`cards/roles/jester.jpg`).

## cards/

Each piece has a short path under `public/cards/`, its id: `roles/jester`, `policies/fascist`, `boards/borderless/liberal`. For each id there is:

| File | What it is |
|---|---|
| `cards/<id>.pdf` | The print file: page 1 front, page 2 back, cut size plus 3 mm bleed. The print builder places these on the sheets. |
| `cards/<id>.jpg` | The front at full size (12 px/mm, about 300 dpi), cut size without the bleed. |
| `cards/thumb/<id>.jpg` | The same at 5 px/mm, for pages that show many pieces at once. |
| `cards/<id>_back.jpg` | The back, when the piece has a back of its own. |

The folders are `roles` (Secret Role cards, with the blank ones), `briefing` (Role Briefing cards: the back as a PDF, and pictures of each card with its text), `membership`, `ballots`, `policies`, `powers` (emergency power tiles), `boards`, `boards/borderless`, `reference`, `placards`, `piles` (draw and discard pile cards) and `backs` (backs that many pieces share). `briefing/portraits/<role>.jpg` are the portraits drawn on the Role Briefing cards.

The pictures are made from the PDFs, so after changing a PDF run `python3 tools/export/card_images.py [ids]`. The briefing card pictures come from the role text: run `npx tsx tools/export/briefing_images.mts` after changing it.

## cards.json

One entry per piece, keyed by its id:

```json
{
  "policies/liberal": {
    "kind": "tile",
    "w": 44,
    "h": 68,
    "label": "Liberal policy",
    "back": "backs/policy"
  }
}
```

`kind` is one of `card`, `tile`, `placard`, `long` or `insert`, and `w` and `h` are the cut size in millimetres (without bleed). `back` names the picture of the back: a shared one in `backs/`, or the piece's own id when both sides are the same. Without it the back is `<id>_back.jpg`.

## roles/

`index.json` lists the role ids in order, and each role has a file of its own:

```jsonc
{
  "id": "jester",
  "name": "Jester",
  "module": "roles",              // base | communists | roles
  "palette": "jes",               // key in palettes.json; the Jester has a colour of its own
  "party": "fascist",
  "regular": false,               // false for the optional XL roles
  "seat": "liberal",              // whose seat the role takes
  "seatLabel": "A Liberal",
  "count": 1,
  "pair": null,                   // id of a role that always comes with this one (the two spies)
  "needsCommunists": false,       // only playable with the Communist module
  "extraMembership": { "fascist": 1 },   // membership cards printed on top of the seats
  "art": ["roles/jester"],        // Secret Role card(s), ids in cards.json
  "portrait": "jester",           // cards/briefing/portraits/<portrait>.jpg
  "crop": [0.47, 0.44, 0.56],     // portrait crop on the briefing card: centre x, centre y, width (fractions of the art)
  "briefing": {                   // the Role Briefing card
    "side": "No team, own goal",
    "card": "Fascist",
    "sections": [{ "label": "YOU WIN IF", "items": ["..."] }]
  },
  "details": [                    // the long description on the roles page: brief on the card, everything here
    { "label": "Goal", "text": ["..."] }   // then What you know, Power, Danger, any special rule, How to play it
  ],
  "rulebook": {                   // the role's section in the rulebook
    "title": "The Jester",
    "teamLabel": "No team",
    "image": "cards/roles/jester.jpg",
    "addWhen": "...",             // "Add it when" in the rulebook
    "addWhenTable": "...",        // the same, in the table of optional roles
    "pitch": "..."                // "What it does" in the print builder
  }
}
```

To add a role, add its file and put its id in `index.json`. Briefing cards are drawn as vector text, so an edit here shows up in the printed PDF with no other step.

## rulebook/

Everything on the Rulebook page comes from these files, so the rules change without touching code.

`index.json`:

```jsonc
{
  "version": "1.0.0",               // shown in the rulebook sidebar, the footer and on the printed cover
  "date": "2026-11-25",
  "downloads": [{ "label": "A5, reading order", "file": "rulebook/pdf/Secret_Hitler_XL_Rulebook_A5.pdf" }],
  "booklets": {                     // what the Print dialog opens for a booklet
    "A4": { "label": "A5 booklet on A4", "file": "rulebook/pdf/..." },
    "A3": { "label": "A4 booklet on A3", "file": "rulebook/pdf/..." }
  },
  "chapters": ["01-the-game", "02-setup"]   // files in chapters/, in reading order
}
```

`changelog.json` is the Versions page: add an entry with every rule change.

```json
[{ "version": "1.0.0", "date": "2026-11-25", "changes": ["..."] }]
```

`setup.json` says who sits at the table, one entry per player count from `from` upwards:

```jsonc
{
  "xl": { "from": 6, "experimentalFrom": 17, "liberals": [3, 4], "fascists": [], "hitler": [],
          "communists": [], "emergency": [], "fascistBoard": null },
  "base": { "from": 5, "experimentalFrom": null }
}
```

Each file in `chapters/` is a list of blocks, read one after the other:

```json
[
  { "type": "h2", "text": "...", "id": "..." },
  { "type": "seats", "table": "xl", "caption": "..." }
]
```

- The seat tables are used twice: `seats` blocks draw them in the rulebook, and the print builder counts the pieces from them. Player counts from `experimentalFrom` up are marked as experimental.
- Any block can carry `"experimental": true` to show it framed with an *Experimental* mark.
- Block types: `part`, `h1`, `h2`, `h3`, `p`, `list`, `table`, `script`, `note`, `figure`, `wide`, `icons`, `wins`, `legislative` (the worked example, with its steps and tiles), `seats`, `role` (written from the role files, with an optional `intro`: the sentences on who the role is, shown before the briefing sections) and `credits`.
- Every `part`, `h1`, `h2`, `credits` and `role` block can be linked as `#/rules?section=<id>` (the heading id, or the role id). The page keeps that parameter on the section being read.
