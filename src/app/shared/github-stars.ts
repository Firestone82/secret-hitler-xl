import { Component, input, signal } from '@angular/core';

export const REPO = 'Firestone82/secret-hitler-xl';
export const REPO_URL = `https://github.com/${REPO}`;
const CACHE_KEY = 'gh-stars';
const CACHE_MS = 60 * 60 * 1000;

let pending: Promise<number | null> | undefined;

/** Star count of the repository from the GitHub API, cached for an hour (the API allows 60 calls an hour). */
function fetchStars(): Promise<number | null> {
  return (pending ??= (async () => {
    try {
      const hit = JSON.parse(sessionStorage.getItem(CACHE_KEY) ?? 'null');
      if (hit && Date.now() - hit.at < CACHE_MS) return hit.stars as number;
    } catch { /* storage blocked: just fetch */ }
    try {
      const res = await fetch(`https://api.github.com/repos/${REPO}`, { headers: { Accept: 'application/vnd.github+json' } });
      if (!res.ok) return null;
      const stars = (await res.json()).stargazers_count as number;
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ stars, at: Date.now() })); } catch { /* ignore */ }
      return stars;
    } catch {
      return null;
    }
  })());
}

function short(n: number): string {
  return n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k' : String(n);
}

/** "GitHub ★ 12" button linking to the repository. The count is left out when the API cannot be reached. */
@Component({
  selector: 'app-github-stars',
  template: `
    <a class="gh" [class.big]="size() === 'big'" [href]="url" target="_blank" rel="noopener"
       [attr.aria-label]="stars() === null ? 'Source code on GitHub' : 'Star on GitHub, ' + stars() + ' stars'">
      <svg class="mark" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
      <span class="lbl">{{ size() === 'big' ? 'Star on GitHub' : 'GitHub' }}</span>
      @if (stars() !== null) {
        <span class="count"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 .8l2.2 4.6 5 .7-3.6 3.5.9 5L8 12.2 3.5 14.6l.9-5L.8 6.1l5-.7z"/></svg>{{ label() }}</span>
      }
    </a>
  `,
  styles: `
    :host { display: inline-flex; }
    .gh { display: inline-flex; align-items: stretch; border-radius: 8px; overflow: hidden; text-decoration: none; font-weight: 600; font-size: .88rem;
      color: var(--cream); box-shadow: inset 0 0 0 1.5px rgba(255, 247, 214, .28); transition: box-shadow .15s, background .15s, transform .15s; }
    .gh:hover { background: rgba(255, 247, 214, .08); box-shadow: inset 0 0 0 1.5px rgba(255, 247, 214, .55); }
    .gh:active { transform: translateY(1px); }
    .mark { width: 17px; height: 17px; fill: currentColor; margin: auto 0 auto .65rem; flex: none; }
    .lbl { padding: .38rem .6rem .38rem .45rem; white-space: nowrap; }
    .count { display: inline-flex; align-items: center; gap: .3rem; padding: .38rem .65rem; border-left: 1.5px solid rgba(255, 247, 214, .28);
      font-variant-numeric: tabular-nums; animation: pop .35s ease-out; }
    .count svg { width: 13px; height: 13px; fill: var(--orange); }
    .big { font-size: 1rem; background: var(--dark); box-shadow: none; }
    .big:hover { background: var(--darker); box-shadow: none; }
    .big .mark { width: 20px; height: 20px; margin-left: .9rem; }
    .big .lbl { padding: .65rem .8rem .65rem .55rem; }
    .big .count { padding: .65rem .9rem; border-left-color: rgba(255, 247, 214, .2); }
    /* in the navbar between the burger breakpoint and full width, only the mark and the count fit */
    @media (min-width: 1025px) and (max-width: 1240px) {
      :host(.nav) .lbl { display: none; }
      :host(.nav) .mark { margin: auto .6rem; }
    }
    @keyframes pop { from { opacity: 0; transform: scale(.7); } }
  `,
})
export class GithubStars {
  readonly size = input<'small' | 'big'>('small');
  readonly url = REPO_URL;
  readonly stars = signal<number | null>(null);
  label = () => short(this.stars() ?? 0);
  constructor() {
    fetchStars().then((n) => this.stars.set(n));
  }
}
