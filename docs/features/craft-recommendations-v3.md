# Feature — Craft recommendations, v3

**Status:** built 2026-09-12. Shipped as **What to craft** (`#/crafts`).

v1 and v2 answer *"is this one item worth crafting?"* — you must already know which item to ask
about. v3 answers the question before it: **"given what I've priced, what should I craft?"**

A third screen ranks craftable items by net margin, filtered by profession and level. Clicking a row
loads that item and its stored prices into the calculator, where the existing flow takes over.

Market mechanics: [../research.md](../research.md). The price-source investigation that shaped the
scope of this feature: [../research.md#market-price-sources--re-verified-2026-09-12](../research.md#market-price-sources--re-verified-2026-09-12).

## The constraint that defines this feature

**There is no market-price feed, at any price.** Ankama publishes no API; every community tool is
either dead, or stores prices the player typed into their own browser. Re-verified 2026-09-12.

So recommendations cannot rank the market. They rank **the player's price book** — the prices
already in `localStorage` from using the calculator. That is not a degraded version of the feature,
it is the whole design:

- A row is only as good as the prices behind it, so every row shows its own coverage and freshness.
- Items with unpriced ingredients are **not hidden** — they are the backlog. They show greyed with
  `N inputs missing` and a one-click fill, which is how the ranked set grows.
- The screen is therefore both a ranking *and* a data-entry queue. Those are the same screen on
  purpose: what you price next should be decided by what it would unlock.

## Decisions taken

| Question | Decision |
| -------- | -------- |
| Ranking key | **Net margin %**, alone. No liquidity proxy, no freshness weighting in the sort. |
| Unpriced ingredients | **Show greyed**, `N inputs missing`, one-click fill. Never hidden. |
| Nested crafts | **No.** An ingredient is always valued at its own market price. |

### Why no nested crafting

A craftable ingredient is *bought*, never costed as a sub-craft. If it has no price of its own, it
counts as missing — the model never substitutes a derived figure for an absent one.

This keeps the number checkable: every craft cost on the screen is a sum of prices the player
actually typed. A nested cost would silently mix observed prices with modelled ones, and the row
would stop being verifiable at a glance — which is the one thing this app sells.

Hogmeiser's Boots (consumes a craftable Hogmeiser's Worn Boots) is therefore ranked only once the
Worn Boots have their own listed price. That is correct: if nobody is selling them, you cannot buy
them, and the profit was never real.

## Data — profession and craft level, at build time

`items.json` carries level, type and recipe. It does not carry **which profession crafts the item,
nor at what craft level** — dofusdude has no job data. DofusDB does, and it is the only missing
piece.

Verified 2026-09-12 against `api.dofusdb.fr`:

| Call | Result |
| ---- | ------ |
| `GET /recipes?$limit=50&$skip=N` | 4858 recipes, each with `resultId`, `jobId`, `skillId`, `resultLevel` (1–200) |
| `GET /jobs?$limit=60` | 23 jobs with `id` + `name.{en,fr,…}` |
| join on `resultId` | **4610 of 4858 recipes resolve to a bundled item** — full coverage of what the app can show |

Recipe counts by job on that join, top of the distribution: Jeweller 734, Shoemaker 720, Tailor 705,
Smith 482, Artificer 438, Base 356, Carver 288, Alchemist 255, Breeder 211, Handyman 166.

### Changes to `scripts/generate-game-data.mjs`

- Page `/recipes` (98 requests at `$limit=50`, `$select[]` narrowed to the four fields). Build a
  `Map<resultId, { jobId, craftLevel }>`.
- Fetch `/jobs`, keep `id` + `name.en`, emit `src/config/jobs.ts` in the same generated style as
  [src/config/servers.ts](../../src/config/servers.ts) — restricted to job ids that actually appear
  on a recipe.
- `trimItem` gains `job` and `craftLevel`, written only when the item has a recipe. Two extra
  numbers on 4610 of ~13k entries: a few tens of KB on a 1.2 MB bundle.
- `meta.json` records the DofusDB recipe count alongside the game version, so a silent coverage
  regression is visible in the diff.

`Item` in [src/types/game.ts](../../src/types/game.ts) gains `job?: number` and `craftLevel?: number`
— optional, because only craftable items have them.

> **Licence note.** `api.dofusdb.fr/` now serves **LPNC-IA 1.0** — non-commercial, with an explicit
> clause on AI-generated derivatives. Read it before the next data regeneration; it did not apply
> when the script was written.

## Ranking model

Pure functions over `(items, priceBook, filters)`. No new maths: the fee and tier arithmetic is
already correct in `calculateCraftProfit`, and this feature must use *that* function, not a second
implementation that can drift.

### Shared-code move (required, do it first)

`calculateCraftProfit` lives in `src/features/craft-profit/utils/profit.ts`. A feature may not import
from another feature ([AGENTS.md](../../AGENTS.md#unidirectional-imports-enforced)), and Biome will
reject it.

Promote it before writing any of v3:

| From | To |
| ---- | -- |
| `features/craft-profit/utils/profit.ts` | `src/utils/profit.ts` |
| `features/craft-profit/utils/tests/*` | `src/utils/tests/*` |
| the profit types in `features/craft-profit/types.ts` | `src/types/profit.ts` |
| `features/craft-profit/components/price-input.tsx` | `src/components/price-input.tsx` |

`craft-profit` then imports them from `@/utils/profit`, `@/types/profit`, `@/components/price-input`.
`PricedIngredient`, `ProfitInputs`, `ProfitLine`, `TierProfit` and `CraftProfit` are already
domain-shaped, not feature-shaped — the move is a relocation, not a redesign. Nothing else in
`craft-profit/types.ts` is shared; leave the rest where it is.

### Per candidate

```
for each item with a recipe, passing the job + level filter:

  ingredients = recipe.map(ing => ({
    itemId, quantity,
    unitPrice: cheapestTier(packPricesOf(book[ing.itemId]))?.unitPrice,   // bought, never crafted
  }))

  profit = calculateCraftProfit({ ingredients, salePrices: packPricesOf(book[item.id]) })
  best   = the tier with the highest margin among tiers with a defined margin
```

`calculateCraftProfit` already returns `missingPriceCount`, leaves `craftCost` undefined while any
ingredient is unpriced, and computes `margin = netProfit / packCost` per tier. v3 adds only the
selection of the best tier **by margin** — `bestTierOf` currently picks by `perUnit`, so the ranking
needs its own selector rather than reusing `bestTier`.

### Row states

| State | Condition | Sorted |
| ----- | --------- | ------ |
| `ranked` | craft cost known **and** at least one sale tier priced | by margin %, descending |
| `unpriced-sale` | ingredients all priced, the crafted item is not | after ranked; shows break-even instead of margin |
| `missing-inputs` | `missingPriceCount > 0` | last, fewest missing first |

Within `ranked`, margin % is the only key — as decided. Freshness does **not** move a row; it is
shown, not scored. A row whose every contributing price is older than `STALE_AFTER_MS` (24 h, already
in [src/stores/price-book.ts](../../src/stores/price-book.ts)) carries a stale badge, and thin
margins reuse `THIN_MARGIN_THRESHOLD` (10%) for the existing warning treatment.

### Filters

- **Profession** — from the generated `jobs.ts`. Single select plus "All professions".
- **Craft level** — a min/max pair over 1–200, defaulting to the full range.
- **State** — a toggle to hide `missing-inputs` rows once the backlog is worked down.

Filter state persists per server through [`use-local-storage`](../../src/hooks/use-local-storage.ts),
in `src/features/recommendations/stores/filters.ts`.

### Performance

~4610 craftable items re-ranked on every filter change. Two mitigations, in order:

1. Build the craftable index once at module load in [src/lib/game-data.ts](../../src/lib/game-data.ts)
   (`getCraftableItems()`, `getJobs()`), so ranking iterates a prepared array, not a 13k map.
2. Filter *before* costing — job and level are plain field comparisons, and they cut the working set
   by ~10× before a single price is read.

Measure before reaching further. If a filter keystroke still drops frames, `useDeferredValue` on the
level inputs is the next step, and a web worker is not needed for arithmetic this shallow.

## UI

A third route, `/crafts` (built as `/recommendations`, renamed 2026-09-13; the old path still
redirects), in [src/app/router.tsx](../../src/app/router.tsx) — nav sits
between Calculator and Watchlist, `SparklesIcon` from lucide. Server-scoped like every other route
(`?server=`), and a row click navigates to `href('/', item.id)`: the calculator opens with the item
loaded and its stored prices already in place. That is the whole hand-off; no new plumbing.

### Layout

One [`ScrollPanel`](../../src/components/scroll-panel.tsx), full width, `max-w-5xl`, reusing the v2
shape exactly:

```
Card
├── CardContent  shrink-0   ← filter row: profession · level min/max · hide-incomplete toggle
├── ScrollArea   flex-1     ← the ranked table, sticky <thead>
└── CardContent  shrink-0   ← count line: "38 ranked · 112 need prices"
```

The filter row stays put while results scroll — the same fixed-header-and-footer discipline the
recipe panel uses, for the same reason: the control you are adjusting must not leave the screen.

### The table

| Column | Content | Notes |
| ------ | ------- | ----- |
| Item | icon, name, caption `Lv 60 · Jeweller` | caption is `text-muted-foreground text-xs` |
| Craft cost | per unit | `--kama`, as everywhere else |
| Best tier | `×100` | which pack tier won the margin |
| Net / unit | signed | `--gain` / `--loss` |
| **Margin** | **`+31%`** | **the hero column** — `text-lg`, `--gain` / `--loss` |
| — | badges / action | stale · thin margin · `4 inputs missing` + fill button |

Margin is the hero because it is the sort key; the eye must land on the column that explains the
order. Net per unit sits beside it for the "yes, but how much actually" follow-up — the same
pairing the profit panel already uses.

Greyed rows (`missing-inputs`) keep `opacity-60` on the figure cells only. The name and the action
stay at full contrast: the row is an invitation to fill it in, not a disabled row.

### One-click fill

The action on a `missing-inputs` row opens a dialog listing **only the unpriced ingredients**, one
tier-1 price input each (the promoted `@/components/price-input`), name and required quantity beside
it. Save writes the entries into the price book and the row re-ranks in place — no navigation, no
losing your position in the list.

Tier 1 only, deliberately. The dialog is for clearing a blocker fast; the calculator remains the
place to record the other three tiers properly.

### Empty and thin states

- **No prices at all** — "Price a few resources and your crafts will rank here", with a link to the
  calculator. Not a dead end.
- **Filters match nothing** — "No Jeweller recipes between level 40 and 60", with a reset.
- **Everything is `missing-inputs`** — the count line carries it: `0 ranked · 112 need prices`.

### Mobile

Below `sm` the row folds the way the recipe row does: name plus margin, with a caption carrying
`Lv 60 · Jeweller · craft 6 400`. The fill button stays — it is the primary action of an incomplete
row and must not be the thing that gets hidden.

## Tests

`src/features/recommendations/utils/tests/rank.test.ts`, plus the moved
`src/utils/tests/profit.test.ts`:

- a craftable ingredient without a price counts as missing — **never** costed as a sub-craft
- `missingPriceCount` drives the row state, and rows sort fewest-missing first
- ranked rows sort by margin %, not by net profit or per-unit
- best tier is chosen by margin, not by `perUnit` (the existing `bestTier` must not leak in)
- job and level filters cut the set before costing, and an item without `job` never appears
- stale prices badge the row but do not move it

## Files

**Moved** (before anything else): `utils/profit.ts`, `types/profit.ts`, `components/price-input.tsx`
and their tests, per the table above.

**Generated / changed**: `scripts/generate-game-data.mjs`, `src/config/jobs.ts` (new, generated),
`src/assets/game-data/items.json`, `src/types/game.ts`, `src/lib/game-data.ts`,
`src/app/router.tsx`.

**New feature** — `src/features/recommendations/`:

```
recommendations.tsx              # the screen
components/filter-row.tsx
components/recommendation-table.tsx
components/recommendation-row.tsx
components/fill-prices-dialog.tsx
stores/filters.ts
types.ts
utils/rank.ts
utils/tests/rank.test.ts
```

## Settled during the build

- **Coverage hints** were accepted into scope, and are the answer to a cold price book:
  [utils/blockers.ts](../../src/features/recommendations/utils/blockers.ts) ranks unpriced
  ingredients by how many recipes they hold back, and
  [blocker-panel.tsx](../../src/features/recommendations/components/blocker-panel.tsx) prices one
  without leaving the screen.
- **`unpriced-sale` rows stayed merged** into the list, behind a single `Hide incomplete` toggle
  rather than a filter of their own.
