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

## Project layout

| Path | What it is |
|---|---|
| `src/app/pages/` | One folder per page: home, rules, roles, print, versions, credits, 3D printing. |
| `src/app/shared/` | Components used on several pages (briefing card, role box, credits…). |
| `src/app/core/` | Data loading (`data.service.ts`), types and the scroll service. |
| `src/app/print/` | The print builder's PDF generator. See [Print builder](print-builder.md). |
| `public/` | All game content: JSON data, art, pieces, fonts, PDFs. See [Data files](data-files.md). |
| `tools/` | Scripts for testing the PDF generator and re-exporting art. |

The whole page scrolls inside a [SimpleBar](https://github.com/Grsmto/simplebar) container rather than the window, so `window.scrollTo` and window scroll events do nothing. Use `ScrollService` from `src/app/core/scroll.service.ts` instead. `position: sticky`, `scrollIntoView` and IntersectionObserver work as usual.
