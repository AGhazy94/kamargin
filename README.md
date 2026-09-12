# Kamargin

Know what a craft is worth before you make it.

A client-side Dofus market calculator with bundled recipe data, per-server price
books, a watchlist and frozen snapshots. React, TypeScript, Vite and Tailwind;
no backend and no live market-price feed.

**Live:** https://aghazy94.github.io/kamargin/

## Development

```sh
npm install
npm run dev
```

Vite prints the local URL. The dev server serves the app under the `/kamargin/`
base path, matching the GitHub Pages project site. Prices and saved records are
stored in the browser's localStorage, separately for each game server and local
origin.

## Navigation

- `#/`: what the app is, and the way into each screen.
- `#/calculator?server=355&item=910`: calculator for an item and server.
- `#/recommendations?server=355`: every craft your prices reach, ranked.
- `#/watchlist?server=355`: tracked items with their current margin.
- `#/snapshots?server=355`: frozen records, searchable by item or label.
- `#/snapshots?server=355&item=910`: one item's history.
- `#/snapshots/<id>?server=355`: a frozen snapshot's detail page.

Hash routing supports direct links and refresh on static hosting without server
rewrites — which is also why Pages needs no SPA fallback. Prices and snapshot
payloads stay out of URLs. Unknown records show a recoverable unavailable state
rather than falling back to another server's data.

The calculator shows contextual snapshots only for the current item and server.
Restore and delete require confirmation; opening a record never changes prices.

## Price semantics

Enter total pack prices for packs of 1, 10, 100 or 1000. Ingredient cost uses the
cheapest entered per-unit tier. Sell results show profit per pack and per unit,
with the total craft cost for each pack. Arbitrary batch quantities and market
median prices are not implemented.

## Verification

```sh
npm test
npm run typecheck
npm run build
npm run ci
```

Vitest tests live in a `tests/` subfolder of the folder under test. Routed UI tests
use Testing Library and jsdom. Biome handles formatting, lint and import boundaries,
and knip reports unused files and dependencies.

## Deploying and releasing

Pushing to `main` deploys to GitHub Pages (`.github/workflows/pages.yml`); enable
Pages with **Source: GitHub Actions** once, in the repository settings.

Releases are tag-driven:

```sh
npm version minor
git push --follow-tags
```

The tag runs `.github/workflows/release.yml`, which verifies the tag matches
`package.json`, builds, attaches the bundle and opens a GitHub Release with notes
generated from the commits since the last tag. The version is compiled into the
bundle and shown in the landing-page footer.

Moving to a custom domain means changing one line: `base` in
[vite.config.ts](vite.config.ts), plus the absolute URLs in
[index.html](index.html).

See [the UI/UX review](docs/features/saved-items-ux-review.md) for behavior,
browser verification and remaining limitations, and [AGENTS.md](AGENTS.md) for
repository conventions.
