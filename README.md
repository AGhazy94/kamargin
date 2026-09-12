# Dofus Market Calculator

A client-side craft-profit calculator with bundled recipe data, per-server price
books, a watchlist and frozen snapshots. React, TypeScript, Vite and Tailwind;
no backend or live market-price feed.

## Development

```sh
npm install
npm run dev
```

Vite prints the local URL. Prices and saved records are stored in the browser's
localStorage, separately for each game server and local origin.

## Navigation

- `#/?server=355&item=910`: calculator for an item and server.
- `#/watchlist?server=355`: tracked items, opened with current saved prices.
- `#/snapshots?server=355`: frozen records, searchable by item or label.
- `#/snapshots?server=355&item=910`: one item's history.
- `#/snapshots/<id>?server=355`: a frozen snapshot's detail page.

Hash routing supports direct links and refresh on static hosting without server
rewrites. Prices and snapshot payloads stay out of URLs. Unknown records show a
recoverable unavailable state rather than falling back to another server's data.

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
use Testing Library and jsdom. Biome handles formatting, lint and import boundaries.

See [the UI/UX review](docs/features/saved-items-ux-review.md) for behavior,
browser verification and remaining limitations, and [AGENTS.md](AGENTS.md) for
repository conventions.
