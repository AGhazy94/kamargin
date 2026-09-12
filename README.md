<div align="center">

<img src="public/favicon.svg" width="72" height="72" alt="" />

# Kamargin

**Know what a craft is worth before you make it.**

A client-side market calculator for [Dofus](https://www.dofus.com). Type the prices you
see at the marketplace and it costs out every recipe, ranks your profession by margin,
and keeps a record of what a craft was worth when you checked.

[**Open the app →**](https://aghazy94.github.io/kamargin/)

[![CI](https://github.com/AGhazy94/kamargin/actions/workflows/ci.yml/badge.svg)](https://github.com/AGhazy94/kamargin/actions/workflows/ci.yml)
[![Deploy to Pages](https://github.com/AGhazy94/kamargin/actions/workflows/pages.yml/badge.svg)](https://github.com/AGhazy94/kamargin/actions/workflows/pages.yml)
[![Release](https://img.shields.io/github/v/release/AGhazy94/kamargin?sort=semver)](https://github.com/AGhazy94/kamargin/releases)

</div>

<div align="center">
  <img src="public/og-image.png" width="820" alt="Kamargin — know what a craft is worth before you make it." />
</div>

## Why

The marketplace tells you what an item sells for. It does not tell you what it cost you
to make, which pack size to buy the ingredients in, or which of the hundreds of recipes
your profession can reach is the one worth the slot. Kamargin answers those from prices
you enter once: price an ingredient and **every** recipe that uses it is re-costed.

Everything runs in the browser. No account, no backend, no market-price feed — your
prices live in `localStorage`, per game server, and never leave the device.

## What's in it

| Screen         | What it does                                                                                                          |
| -------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Calculator** | One recipe, ingredient by ingredient, across all four pack sizes; margin at each sale tier, with the marketplace fee.   |
| **Crafts**     | Every recipe your prices can reach, ranked by margin and sortable by cost — plus which ingredient unlocks the most next. |
| **Watchlist**  | The items you keep returning to, each showing its current craft cost, margin and staleness.                              |
| **Snapshots**  | Freeze a craft's figures at today's prices, compare later, restore that price book when you want it back.               |

Prices are entered as **total pack prices** for packs of 1, 10, 100 or 1000; ingredient
cost always uses the cheapest per-unit tier you have entered. Prices older than a day are
badged stale. Nothing is ever silently dropped: a recipe missing an input says how many
inputs it is missing, and offers to take them.

## Running it

```sh
npm install
npm run dev
```

Vite prints the local URL. The dev server serves the app under the `/kamargin/` base path,
matching the GitHub Pages project site.

| Command             | What it does                             |
| ------------------- | ---------------------------------------- |
| `npm run dev`       | Vite dev server on :5173                 |
| `npm test`          | Vitest, single run                       |
| `npm run typecheck` | types only                               |
| `npm run build`     | typecheck + production build             |
| `npm run check`     | Biome format, lint and import sort, write |
| `npm run knip`      | unused files and dependencies             |
| `npm run ci`        | verify everything, no writes              |

## How it is put together

React, TypeScript, Vite and Tailwind v4, laid out after
[bulletproof-react](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md)
with `shared → features → app` import boundaries enforced by Biome rather than convention.
UI is shadcn/ui on Base UI. Recipe and item data is bundled ahead of
time from [dofusdu.de](https://api.dofusdu.de) by `npm run generate:game-data`; the only request
the running app makes is for item icons, and it renders without them.

Routing is hash-based, which is what lets a static host serve deep links and refreshes with
no rewrite rules — and why the Pages deploy needs no SPA fallback.

- `#/` — what the app is, and the way into each screen
- `#/calculator?server=355&item=910` — one item on one server
- `#/recommendations?server=355` — the ranking
- `#/watchlist?server=355` · `#/snapshots?server=355` — saved records
- `#/snapshots/<id>?server=355` — one frozen record

Prices and snapshot payloads stay out of URLs, so a shared link carries a view and never
someone's price book.

## Deploying and releasing

Pushing to the default branch deploys to GitHub Pages, with **Source: GitHub Actions** set
in the repository settings — the legacy branch source would publish the unbuilt `index.html`.

Releases are tag-driven:

```sh
npm version minor
git push --follow-tags
```

The tag runs [`release.yml`](.github/workflows/release.yml), which refuses a tag naming a
version `package.json` disagrees with, then builds, attaches the bundle and opens a release
with notes generated from the commits since the last tag. The version compiles into the
bundle and is shown in the landing-page footer.

Moving to a custom domain is one line — `base` in [vite.config.ts](vite.config.ts) — plus the
absolute URLs in [index.html](index.html).

## Contributing

[AGENTS.md](AGENTS.md) is the source of truth for conventions: project structure, import
boundaries, where tests live, and the comment rules. `npm run ci` is what CI runs.

Feature specs and domain research live in [docs/](docs/) — game mechanics there are verified
against a game version rather than inferred from the code, so read the relevant note before
changing domain logic.

## Licence

MIT. Unofficial, and not affiliated with Ankama. Dofus, item names and item art are Ankama's.
