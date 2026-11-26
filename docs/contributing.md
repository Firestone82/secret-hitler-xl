# Contributing

Thanks for helping. Issues and pull requests are welcome at <https://github.com/Firestone82/secret-hitler-xl>.

## Reporting a problem

[Open an issue](https://github.com/Firestone82/secret-hitler-xl/issues) and say where you saw it: the page, the section or the card, and what you expected instead. A screenshot helps for anything in the printed PDFs.

## Fixing rules text or a role

Nearly all the text on the site is in three JSON files, so you do not need to touch any code:

- Rulebook text, seat tables, version history: `public/data/rulebook.json`
- Roles, briefing cards and the role sections of the rulebook: `public/data/roles.json`
- Names and sizes of the printable pieces: `public/data/pieces.json`

See [Data files](data-files.md) for what each field does. When you change the rules, raise `version` in `rulebook.json` and add an entry to its `changelog`, which shows on the Versions page.

## Changing the code

1. Fork the repository and create a branch, named like `fix/short-description` or `feat/short-description`.
2. Run the site locally (see [Running and deploying](running.md)) and make your change.
3. Check that `npm run build` passes and that the pages you touched look right, on a phone width too.
4. Commit with a short message in the imperative mood, in the [Conventional Commits](https://www.conventionalcommits.org/) style (`fix: …`, `feat: …`, `docs: …`).
5. Open a pull request that says what changed, why, and how to check it.

Style notes:

- Keep the JSON files indented with 2 spaces, one value per line, so changes show up as small diffs.
- Indent code with 2 spaces and use single quotes in TypeScript (see `.editorconfig`).
- Write site text in plain, short sentences.

## Licence of contributions

By contributing, you agree that your code is released under the [MIT licence](../LICENSE) and your game content (text, art) under [CC BY-NC-SA 4.0](../LICENSE-CONTENT.md).
