# Running and deploying

## Run it locally

You need [Node.js](https://nodejs.org/) 22 or newer.

```bash
npm install
npm start            # http://localhost:4200, reloads on every change
npm run build        # production build in dist/secret-hitler-xl/browser
```

There are no unit tests. To check a change, build it and look at the pages in the browser.

## Deploy to GitHub Pages

1. Push the repository to GitHub (branch `master`).
2. In the repository settings, under **Pages**, set **Source** to **GitHub Actions**.
3. Every push to `master` runs `.github/workflows/deploy.yml` and publishes the site at `https://<user>.github.io/<repo>/`.

The app uses hash URLs (`#/rules`) and a relative base href, so it works under any repository name with no extra configuration.

## Release

`.github/workflows/release.yml` publishes a GitHub release with:

- the four rulebook PDFs from `public/rulebook/pdf/`;
- the whole game as one print-ready PDF for A3 and one for A4 (the print builder's default options: 19 players, every module and role, the Role Briefings);
- the same set as a zip of single-piece PDFs with bleed, `manifest.csv` and `README.txt`, for a print service;
- release notes taken from the version's entry in `public/data/rulebook/changelog.json`.

To make one:

1. Raise `version` and `date` in `public/data/rulebook/index.json` and add the entry to `changelog.json`. If the rules changed, rebuild the rulebook PDFs (`npx ng build && node tools/export/rulebook_pdf.mjs`).
2. Merge to `master`, then do one of these:
   - run the **Release** workflow by hand from the Actions tab (simplest: it tags the commit itself);
   - push a tag `v<version>` (`git tag v1.2.0 && git push origin v1.2.0`);
   - create a release on GitHub with a new tag `v<version>` on `master`.

GitHub runs the workflow file of the tagged commit, so a tag on a commit from before the workflow existed starts nothing. The job fails when the tag does not match the version in `index.json`, or when a manual run finds the tag already on another commit. Re-running the job for an existing tag replaces the release's files.

The same files can be built locally with `npx tsx tools/release/print_files.mts [out dir]` (default `release/`, which git ignores).

## Project layout

| Path | What it is |
|---|---|
| `src/app/pages/` | One folder per page: home (with the About and Credits sections), rules, roles, print, versions, 3D printing. |
| `src/app/shared/` | Components used on several pages (briefing card, role box, credits…). |
| `src/app/core/` | Data loading (`data.service.ts`), types and the scroll service. |
| `src/app/print/` | The print builder's PDF generator. See [Print builder](print-builder.md). |
| `public/` | All game content: JSON data, art, pieces, fonts, PDFs. See [Data files](data-files.md). |
| `tools/` | Scripts for testing the PDF generator, re-exporting art and building the release files. |

The whole page scrolls inside a [SimpleBar](https://github.com/Grsmto/simplebar) container rather than the window, so `window.scrollTo` and window scroll events do nothing. Use `ScrollService` from `src/app/core/scroll.service.ts` instead. `position: sticky`, `scrollIntoView` and IntersectionObserver work as usual.
