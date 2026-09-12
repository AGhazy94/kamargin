# Feature — Craft profit calculator

**Status:** built. Superseded in part by [v2](craft-profit-calculator-v2.md), which adds pack tiers,
saved items and a visual pass.

The first feature, and likely not the last. Answers one question: *for this item, on my server, does
crafting it and selling it on the marketplace make kamas?*

Game mechanics and data sources it rests on: [../research.md](../research.md).

## v1 scope — one item at a time

1. Search for an item and pick it.
2. See its recipe: each ingredient, its quantity.
3. Type a unit price for each ingredient, and a unit sale price for the crafted item.
4. See craft cost, the 2% marketplace fee, net profit, and margin.

That is the whole feature. Everything else is deferred — see [below](#deliberately-deferred).

## Non-negotiables

- **Manual prices are the source of truth.** Bundled data never supplies a price. A reference may be
  shown next to the field and copied in with one click, but nothing auto-fills a number that then
  backs a profit figure.
- **Prices are per server.** A profit result that doesn't say which server it's for is wrong.
  v1 ships the selector (13 classic servers), defaulting to Kourial.
- **Every price is per unit.** The game lists per pack (1 / 10 / 100 / 1000); v1 takes per-unit
  numbers only and says so on every field.
- **Offline.** Game data is fetched at build time and bundled. No runtime network calls.

## The maths

```
craftCost = Σ (ingredient.unitPrice × ingredient.quantity)
fee       = round(salePrice × 0.02)
netProfit = salePrice − craftCost − fee
margin    = netProfit / craftCost
breakEven = craftCost / 0.98          // sale price where profit = 0
```

Every recipe yields exactly one item, so there is no output-quantity term.

The fee is charged at listing and never refunded, so `netProfit` above is the **best case** — it
assumes the item sells at the first asking price. Worth stating in the UI; not worth modelling
relistings in v1.

Flag a margin under ~10% as risky rather than merely thin. That threshold is community consensus,
not a game rule.

## Data model

```ts
type PriceEntry = {
  serverId: number;
  itemId: number;      // ankama_id
  unitPrice: number;
  capturedAt: number;
};
```

Persisted in `localStorage`, keyed by server (`prices:${serverId}`) so switching servers swaps the
whole price book instead of mixing them. Show each price's age; grey out entries older than ~24 h
without blocking the calculation.

## Bundled game data

A build-time script pulls from `api.dofusdu.de` and writes trimmed JSON into the repo. Only what the
feature reads: `ankama_id`, `name`, `level`, `type`, icon URL, and `recipe`. The raw dumps are
~10 MB combined; the trimmed set should be a fraction of that. Record the `meta/version` the data
came from alongside it.

Ingredients resolve by `ankama_id` against the same bundle, so ingredient names and icons come for
free.

## Deliberately deferred

Listed so the design session doesn't reach for them. Each is real, none is v1:

- Batch crafting, selling-slot budget (2 × level), capital tied up.
- Liquidity — `items sold / 24 h`, days-to-sell, warning when a batch exceeds daily volume.
- Competition depth, undercut pricing, saturation warnings.
- Recursive craft-vs-buy for nested recipes (v1 prices a sub-craft as a bought ingredient).
- Relisting fees (1% markdown / 2% of markup), expiry after 28 days.
- Sell-vs-crush comparison via `recyclingNuggets`.
- Profession/job data, craft XP, kamas-per-XP.
- Profit per pod.
- Filtering out non-`exchangeable` items — worth adding the moment DofusDB data is pulled in at all,
  since showing profit on an unsellable item is a correctness bug rather than a missing feature.

## Design — settled 2026-09-12

The four open questions, answered. Everything below is the brief the implementation session builds
against; anything not described here is out of v1.

> **Before writing feature code:** `npx shadcn@latest add command popover && npm run check`.
> That is the whole install step — details in
> [shadcn components to add](#shadcn-components-to-add).

### The four answers

| Question | Answer | Why |
| -------- | ------ | --- |
| Server selector in v1? | **Yes** | It is a bundled JSON array and a `<select>`. Shipping it now makes the `prices:${serverId}` key real from day one instead of a migration later, and it keeps the profit figure honest about which server it belongs to. |
| Which servers? | **The 13 classic servers only** (`gameTypeId` 0) | Temporis and Speed Rush are seasonal — a bundled list of them goes stale between builds. Shadow and `gameTypeId` 2 are niche. Adding them later is one line of the generator's filter. |
| Pack-size entry? | **Per-unit only** | Two inputs per ingredient row doubles the input surface of the busiest part of the screen to save one division. The field is labelled `per unit` and the placeholder shows a unit figure, so there is no ambiguity about what to type. |
| Median reference? | **Nothing in v1** | There is no median to show: no market-price API exists and v1 bundles no observed prices. The field's trailing slot is designed and left empty. The first thing that will fill it is the price book's own last-entered value — see [When the reference slot fills](#when-the-reference-slot-fills). |

### Screen layout

One screen, `max-w-5xl` centred. Two columns from `lg`, one column below it.

```
┌──────────────────────────────────────────────────────────────────────┐
│  Dofus Market            [ nav slot — empty in v1 ]    [ Kourial ▾ ] │  app shell header
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  ⌕  Search for an item…                                        │  │  item picker
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────┐  ┌──────────────────────────┐  │
│  │ ▣  Hogmeiser's Boots             │  │  Sale price    per unit  │  │
│  │    Boots · level 75          [×] │  │  ┌────────────────────┐  │  │
│  ├──────────────────────────────────┤  │  │            12 000  │  │  │
│  │ Ingredient        Qty  Unit  Cost│  │  └────────────────────┘  │  │
│  │ ▣ Worn Boots        1  8 000 8000│  │  ────────────────────────│  │
│  │ ▣ Hogmeiser Leather 6    450 2700│  │  Craft cost      11 500  │  │
│  │ ▣ Kaniger Hair     10     95  950│  │  Fee (2%)           240  │  │
│  │ ▣ …                              │  │  ────────────────────────│  │
│  ├──────────────────────────────────┤  │  Net profit         260  │  │
│  │ Craft cost              11 650   │  │  Margin       2.3% ⚠ thin│  │
│  └──────────────────────────────────┘  │  ────────────────────────│  │
│                                        │  Break-even  11 735/u    │  │
│                                        │  Best case — the fee is  │  │
│                                        │  paid per listing.       │  │
│                                        └──────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

- **Item picker** stays at the top at all times — swapping items is the loop, not a rare action.
- **Recipe table** is the left column and the only place you type ingredient prices.
- **Profit panel** is the right column, `lg:sticky lg:top-6`. The sale price input lives at its top:
  it is an output-side number, and putting it beside the result keeps the two prices you are actually
  trading off — buy-side total and sell-side ask — from being separated by a long table.
- Below `lg` the panel drops beneath the table, and **net profit alone** pins as a bottom bar
  (`sticky bottom-0`, one line) so the number is visible while you type up the list.

### States

| State | What shows |
| ----- | ---------- |
| No item picked | Picker, plus a one-line empty state below it. No skeleton cards, no sample item. |
| Item picked, no prices | Recipe table with empty inputs. Profit panel is rendered but reads `—` for every figure and carries the line `Enter a price for every ingredient.` |
| Some ingredients priced | Panel still reads `—`. **Never show a profit computed from a partial basket** — a missing price is not a zero. The incomplete rows get a muted marker in the table. |
| All priced, no sale price | Craft cost shows. Fee, net profit, margin, break-even read `—`. |
| Complete | Everything computes. |
| Recipe missing | Item has no recipe → picker accepts it, panel is replaced by `This item can't be crafted.` Do not show a zero-cost profit. |

### Numbers and colour

- `netProfit > 0` → `text-gain`. `< 0` → `text-loss`. `= 0` → `text-foreground`.
- Margin under 10% and positive is **thin, not a loss**: keep it `text-foreground`, and attach an
  outline `Badge` reading `thin` with a tooltip stating this is community consensus, not a game rule.
  Do not spend `--loss` on a profitable trade, and do not invent a warning colour.
- Kamas render with space grouping (`11 650`) via one shared formatter. The kama figure in the
  profit panel — and only that one — takes `text-kama`; using the token on every number would make
  the whole screen gold and say nothing.
- Margin is a percentage with one decimal. Break-even is a kama figure suffixed `/u`.
- Empty input ≠ `0`. Parse to `undefined` and let the state table above handle it.

### Price book behaviour

- Every ingredient price you type is written to the book for the current server, debounced.
- Picking an item repopulates its ingredient inputs from the book, each with its age
  (`3 h ago`, muted). Entries older than 24 h keep their value but render muted with a dot —
  **stale never blocks the calculation.**
- The sale price is stored the same way, keyed by the crafted item's own `ankama_id`. It is a
  market price like any other.
- Switching servers swaps the whole book: inputs repopulate from the new server's entries, and any
  ingredient with no entry there goes empty. The profit figure follows the state table — it becomes
  `—` rather than carrying the old server's numbers under a new server's name.

### When the reference slot fills

The trailing slot inside each price input is empty in v1. It is sized for a muted figure plus a
click-to-copy affordance, so the first real reference drops in without relayout. Order of likely
fills: last-entered price from the book → a manually recorded median → anything the deferred list
eventually brings in. None of them ever auto-fill the field.

## Component breakdown

### App shell — shared, outside the feature

Nothing here knows the craft calculator exists. A second feature gets all of it for free.

| Path | What |
| ---- | ---- |
| `src/components/layouts/app-shell.tsx` | Header (wordmark · nav slot · server select) + `<main>`. The nav slot is a named region that renders `null` in v1 — **the seam, not the navigation.** |
| `src/config/servers.ts` | The 13 classic servers, `id` + `name`, generated alongside the game data. Exports `DEFAULT_SERVER_ID` (Kourial). |
| `src/stores/server.ts` | Selected `serverId`, persisted. |
| `src/components/server-select.tsx` | `Select` bound to that store. Shell-level, not feature-level. |
| `src/stores/price-book.ts` | `PriceEntry` read/write keyed `prices:${serverId}`; exposes get-by-item, set, and age. The one place `localStorage` is touched. |
| `src/hooks/use-local-storage.ts` | Generic persisted-state hook the two stores sit on. |
| `src/utils/format.ts` | `formatKamas`, `formatMargin`, `formatAge`. App-wide — a second feature formats kamas identically or the app looks like two apps. |
| `src/types/game.ts` | `Item`, `Ingredient`, `Recipe`, `Server`. |
| `src/assets/game-data/*.json` | The trimmed build-time bundle + the `meta/version` it came from. |
| `src/lib/game-data.ts` | Typed accessors over that bundle: `searchItems(query)`, `getItem(ankamaId)`. Feature code never imports the JSON directly. |

`src/app/routes/home.tsx` composes the shell with the feature's root component. That is the only
place the two meet.

### Feature — `src/features/craft-profit/`

Imports shared folders with `@/`, its own files relatively. No `api/` folder: nothing fetches.

| Path | What |
| ---- | ---- |
| `craft-profit-calculator.tsx` | Feature root. Owns selected item + the wiring to the price book; renders the three panels. |
| `components/item-picker.tsx` | Search + results popover over `searchItems`. |
| `components/item-summary.tsx` | Icon, name, level, type, clear button. |
| `components/recipe-table.tsx` | The ingredient table and its craft-cost footer row. |
| `components/ingredient-price-row.tsx` | One row: icon, name, qty, price input with its (empty) reference slot, line cost. |
| `components/price-input.tsx` | The numeric input itself — parsing, `inputMode="numeric"`, empty-vs-zero, trailing slot. Used by both the ingredient rows and the sale price. |
| `components/profit-panel.tsx` | Sale price input + the five figures + the best-case caveat. |
| `components/profit-summary-bar.tsx` | The `<lg` sticky net-profit bar. |
| `components/empty-state.tsx` | Pre-selection copy. |
| `hooks/use-craft-profit.ts` | Selected item + prices → the computed result or a reason it is incomplete. |
| `utils/profit.ts` | The maths from [The maths](#the-maths). Pure, no React, no formatting — the unit-testable core. |
| `types.ts` | Feature-local shapes (`CraftProfit`, `ProfitInputs`). |

**Why `price-input.tsx` is feature-local:** it encodes per-unit-kamas semantics and the reference
slot, both of which are this feature's model. It promotes to `src/components/ui/` the day a second
feature needs the same input — not before.

### shadcn components to add

**Run this first — it is the only dependency step this feature has:**

```sh
npx shadcn@latest add command popover && npm run check
```

Both are for the item picker (`command` = the searchable list, `popover` = the surface it opens in).
`npm run check` reformats the generated files to this repo's style — see
[AGENTS.md § UI](../../AGENTS.md#ui--shadcnui-and-the-theme).

Everything else the design needs — `card`, `table`, `input`, `label`, `select`, `badge`,
`separator`, `tooltip`, `button` — is already in `src/components/ui/`. Nothing else gets installed:
no router, no state library, no chart package.

### Explicitly not built

No router (one screen), no sidebar, no dashboard, no navigation component, no charts, no toasts,
no settings screen, and nothing from [Deliberately deferred](#deliberately-deferred).
