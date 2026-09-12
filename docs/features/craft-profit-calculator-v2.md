# Feature — Craft profit calculator, v2

**Status:** built 2026-09-12.

v1 shipped: [craft-profit-calculator.md](craft-profit-calculator.md). It answers the question for one
item at one price. v2 makes it match how the marketplace actually works, and gives the work somewhere
to live between sessions.

Three additions, plus a visual pass. Game mechanics behind them: [../research.md](../research.md).

## 1. Pack tiers, on both sides

The game sells in packs of 1 / 10 / 100 / 1000, and **each tier carries its own total price** — the
per-unit figure differs per tier, and bulk is not reliably cheaper. The observed case in
[research.md](../research.md): 459/u at pack 1, but 500/u at both pack 100 and pack 1000.

v1 deliberately took per-unit numbers only. v2 overturns that.

### Buy side

Per ingredient, a price may be recorded for **any subset** of the four tiers. Craft cost uses the
**cheapest per-unit tier that has a price**, and the UI must show which tier won — a craft cost whose
provenance is invisible is a craft cost you can't check.

Recording one tier stays the fast path. Nothing forces four inputs per ingredient.

### Sell side

A sale price per tier, and profit for listing as 1 / 10 / 100 / 1000.

**This pulls batch crafting in, and that is intended.** Listing a pack of 10 means crafting 10. So
the sell-side panel computes, per tier:

```
units      = tier                        // 1, 10, 100, 1000
craftCost  = unitCraftCost × units
packPrice  = the price entered for that tier
fee        = round(packPrice × 0.02)     // 2% of the pack total
netProfit  = packPrice − craftCost − fee
perUnit    = netProfit / units
```

The fee is 2% of the pack total either way, so no tier is fee-advantaged. What differs is **selling
slots**: a pack of any size costs one slot. That is a real reason to prefer larger packs and it
belongs in the UI as a note, not yet as a modelled budget.

Comparing tiers side by side is the point of the feature. The per-unit net profit is the column that
makes them comparable; the pack net profit is the column that tells you what you actually make.

### Data model change

`PriceEntry.unitPrice` becomes per-tier. Roughly:

```ts
type PackTier = 1 | 10 | 100 | 1000;

type TierPrice = {
  packPrice: number;   // total for the pack, as the game shows it
  capturedAt: number;
};

type PriceEntry = {
  serverId: number;
  itemId: number;
  tiers: Partial<Record<PackTier, TierPrice>>;
};
```

Per-unit is derived (`packPrice / tier`), never stored — storing both invites them to disagree.
`capturedAt` moves to the tier, because tiers are observed at different moments.

Existing `prices:${serverId}` entries are v1-shaped. Decide in design: migrate each `unitPrice` into
the tier-1 slot, or drop the old book. Migrating is a few lines and preserves whatever the user has
already typed.

## 2. Saved items — watchlist and snapshots

Both, in **a panel on the same screen**. No router, no second screen, no navigation component. The
nav slot in the shell stays empty.

- **Watchlist** — items you're tracking. Click one to load it into the calculator. Prices come from
  the price book as they already do, so a watchlist entry is just an item id.
- **Snapshot** — an item plus the prices you entered plus the computed result, frozen with a
  timestamp and a label. Revisiting a snapshot shows what the numbers *were*; it does not
  recalculate. That is the whole value of it — it's the record you compare today's market against.

Both are per server. A snapshot taken on one server must never surface under another.

Open in design: whether a snapshot is restorable into the calculator as live prices, or strictly
read-only. Read-only is simpler and harder to misread; restoring is more useful.

## 3. Visual pass

**Status: built 2026-09-12.** What follows is what shipped, not a brief.

### Spacing — the settled scale

Five steps, each with one job. Every spacing value on the screen is one of these; nothing is chosen
per component.

| Step | Tailwind | Job |
| ---- | -------- | --- |
| 3 | `gap-3` / `px-3` | inside a single control or table cell |
| 4 | `gap-4` / `py-4` | between lines that belong to the same figure |
| 6 | `gap-6` | between groups inside a card; card padding (`--card-spacing`) |
| 8 | `gap-8` | between page-level blocks, and the two grid columns |
| 10 | `py-10` | page top and bottom |

Applied in **four shared places**, which is why no component needed nudging:

- `ui/card.tsx` — `--card-spacing` 4 → 6 (`sm` variant 3 → 4). Every card gets it.
- `ui/table.tsx` — head `h-10 px-2` → `h-12 px-3`, cell `p-2` → `px-3 py-4`. That is the recipe
  table's entire density change.
- `layouts/app-shell.tsx` — header `h-14` → `h-16`, gutters `px-4 sm:px-6` → `px-6 sm:px-8`,
  main `py-6` → `py-10`.
- `craft-profit-calculator.tsx` / `profit-panel.tsx` — block gaps 6 → 8, group gaps 4 → 6, line
  gaps 2 → 3. The right column widens 20rem → 22rem so the added padding doesn't cost the figures
  their line.

### Type scale and radius

The screen is read as figures, not prose, so the whole ramp moves one notch up in
[src/index.css](../../src/index.css)'s `@theme` — not per component:

| Token | Was | Now |
| ----- | --- | --- |
| `--text-xs` | 12px | 13px |
| `--text-sm` | 14px | 15px |
| `--text-lg` | 18px | 19px |
| `--text-3xl` | 30px | 32px |
| `--radius` | 0.5rem | 0.75rem |

Control heights follow, in the two shadcn primitives: `Input` `h-8` → `h-10`, and every `Button`
size up one step (`default` `h-8` → `h-9`, `lg` `h-9` → `h-11`, `icon` `size-8` → `size-9`).
base-nova ships deliberately compact controls; this app is one screen of number entry and can
afford the room.

**Net profit is the hero.** It moves from an inline `text-lg` figure to a stacked `text-3xl` one —
size carries the hierarchy, so `--kama` can stay on craft cost without out-shouting the answer.

### Scrolling — panels scroll, the page does not

From `lg` up the shell is viewport-height: `AppShell` is `h-dvh flex-col`, the header `shrink-0`, and
`<main>` `flex-1 min-h-0 overflow-hidden`. Each panel scrolls its own body. Below `lg` the columns
stack and `<main>` goes back to `overflow-y-auto` — one page scroll, as before.

[src/components/scroll-panel.tsx](../../src/components/scroll-panel.tsx) is the shared shape every
panel uses, this feature's and the next one's:

```
Card  (flex, max-h-full)
├── CardContent  shrink-0   ← header: stays put
├── ScrollArea   flex-1     ← unpadded; the padding rides on the div inside it
└── CardContent  shrink-0   ← footer: stays put
```

The ScrollArea carries **no horizontal padding**, so shadcn's scrollbar lands against the card
border rather than floating inside the gutter; the content's `px-(--card-spacing)` sits inside the
scroller.

In the recipe panel the header is the item summary and the footer is the craft-cost total — both
fixed, so the figure you are building never leaves the screen. The total moved out of the table's
`<tfoot>` into that footer; the table keeps only a sticky `<thead>`, which needs
`containerClassName="overflow-visible"` on `Table` — its default `overflow-x-auto` wrapper would
otherwise become the sticky containing block and pin the header to nothing.

### Theme switcher

shadcn's Vite pattern, with one substitution:
[src/components/theme-provider.tsx](../../src/components/theme-provider.tsx) is a context provider
mounted in [src/app/provider.tsx](../../src/app/provider.tsx), and
[src/components/mode-toggle.tsx](../../src/components/mode-toggle.tsx) is the header dropdown —
**Light / Dark / System**, with the Sun ↔ Moon crossfade.

- **Substitution:** the provider persists through this repo's
  [`use-local-storage`](../../src/hooks/use-local-storage.ts) rather than its own
  `useState` + `localStorage`. That hook is `useSyncExternalStore`-backed, so a theme change in one
  tab reaches the others, and every persisted value in the app stays JSON-encoded under one
  mechanism.
- `system` subscribes to `prefers-color-scheme` for as long as it is selected — following the OS
  means following it while the app is open, not only at mount.
- Dark stays the default, and [index.html](../../index.html) resolves the stored value (`system`
  included) before first paint, so a light user never sees a dark flash.

### Mobile — the recipe row folds

At 375px the four-column row could not fit a price input; the input was scrolled off-screen, which
made the primary interaction unreachable. Below `sm` the row collapses to two columns:

- Qty, Cost and the ingredient icon are hidden.
- The name cell carries a muted caption: `×50 · 6 000` (quantity and line cost).
- The price column is `w-32`, the full-size `w-44` returning at `sm`.

The craft-cost footer keeps its own total cell in both layouts.

### Colour

Neutrals pulled near-achromatic at chroma **0.004–0.007** on hue 75/85 — a trace of warmth, not a
wash. Gold survives only in `--primary`, `--kama`, `--ring` and `--chart-1`, which is why it now
reads as gold.

The surface ramp opened in both modes so cards separate from the page without a border doing the
work:

| | `--background` | `--card` | gap |
| --- | --- | --- | --- |
| Light | `0.955` | `0.995` | 0.040 L (was 0.021) |
| Dark | `0.145` | `0.210` | 0.065 L (was 0.047) |

Light `--kama` darkened `0.68` → `0.56`: at the old lightness the gold figure sat about 2.7:1
against the new near-white card, which is below AA for text.

`--gain`, `--loss` and `--destructive` kept their hues — semantic, and they work.

The palette reads **brown and muddy**, and the cause is measurable: the neutrals in
[src/index.css](../../src/index.css) carry chroma 0.018–0.04 on hues 55–85. Every surface, border and
muted text is a tinted brown, so the whole screen sits in one warm smear and the gold has nothing to
contrast against.

Direction:

- Pull the neutrals toward **near-achromatic** — chroma ≲0.008 — keeping a trace of warmth rather
  than a wash of it.
- Keep gold where it means something: `--primary`, `--kama`. It reads as gold precisely because the
  surfaces around it stop competing.
- Open up the **surface ramp** while you're there. `--background` and `--card` are close enough that
  cards barely separate; that flatness is a separate defect from the hue and won't be fixed by
  desaturating alone.
- Dark stays the default. Light gets the same treatment so the two don't diverge.
- Every token stays `oklch`, changed in the `:root` / `.dark` blocks only, per AGENTS.md.

`--gain` and `--loss` keep their hues — they're semantic and they work.

## Still deferred

Unchanged from v1, minus what v2 absorbs: batch crafting is now in, via pack tiers. Still out:

- Selling-slot budget as a modelled constraint (2 × level) — v2 notes the one-slot-per-pack
  advantage in prose only.
- Liquidity, days-to-sell, competition depth, saturation warnings.
- Recursive craft-vs-buy for nested recipes.
- Relisting fees, 28-day expiry.
- Sell-vs-crush, profession data, craft XP, profit per pod.
- Filtering non-`exchangeable` items — still a correctness gap, still waiting on DofusDB data.

## Design — settled and built 2026-09-12

The five open questions, answered, and the brief that was built against. Anything not described
here is out of v2.

> **Nothing to install.** Every component this design needs is already in `src/components/ui/`.
> The expandable row is a second `<TableRow>` behind local state, not a `Collapsible` — Base UI's
> collapsible wraps a `<div>`, which cannot live between `<tr>`s.

### The five answers

| Question | Answer | Why |
| -------- | ------ | --- |
| Four tiers per ingredient in one row? | **Expandable row** | Recording one tier stays the fast path: the collapsed row is v1's row plus a tier marker. Tier tabs would make you visit four tabs to read one ingredient's picture; a popover hides the comparison behind a click *and* covers the rows you are comparing against; four columns pay a permanent 4× width cost for a case that is usually one input. |
| Sell-side comparison beside the figures, or replacing them? | **Replaces them** | Comparing tiers is the feature. Two places showing net profit can disagree at a glance, and the tier table answers the single-tier question too — the `×1` row *is* v1's figure. |
| Snapshots restorable? | **Read-only, with an explicit restore action** | A snapshot that silently recalculates is worthless as a record. A separate, labelled "Copy prices into calculator" keeps the record frozen and still lets you act on it. |
| Where does the saved panel sit? | **Right column, above the profit panel** | No third column, no new breakpoint, and it reuses the [`ScrollPanel`](../../src/components/scroll-panel.tsx) shape already built. It also fills the dead space the profit panel leaves in that column with a real recipe loaded. |
| v1 price book? | **Migrate each `unitPrice` into tier 1** | A v1 per-unit price *is* a pack-of-1 total, so the migration is lossless and needs no flag. |

### Data model

```ts
type PackTier = 1 | 10 | 100 | 1000
const PACK_TIERS: readonly PackTier[] = [1, 10, 100, 1000]

type TierPrice = {
  packPrice: number // total for the pack, as the game shows it
  capturedAt: number
}

type PriceEntry = {
  serverId: number
  itemId: number
  tiers: Partial<Record<PackTier, TierPrice>>
}
```

Per-unit is always derived (`packPrice / tier`), never stored. `capturedAt` lives on the tier
because tiers are observed at different moments — a row can hold a fresh `×1` beside a stale `×100`,
and the UI must say so per tier, not per ingredient.

Saved items get their own key, per server, so switching servers swaps them with the price book:

```ts
type WatchlistEntry = { itemId: number; addedAt: number }

type Snapshot = {
  id: string // crypto.randomUUID()
  itemId: number
  label: string
  takenAt: number
  prices: Record<number, Partial<Record<PackTier, number>>> // packPrice per tier, per item
  result: CraftProfit // frozen, never recomputed
}
```

| Key | Holds |
| --- | ----- |
| `prices:${serverId}` | the price book, now tier-shaped |
| `watchlist:${serverId}` | `WatchlistEntry[]` |
| `snapshots:${serverId}` | `Snapshot[]`, newest first |

**Migration.** On read, a `prices:${serverId}` value whose entries carry `unitPrice` is rewritten to
`{ tiers: { 1: { packPrice: unitPrice, capturedAt } } }` and written back once. It runs inside
`readPriceBook`, so no caller knows it happened, and a second read sees only the new shape.

### The maths, per tier

Buy side — craft cost uses the **cheapest per-unit tier that has a price**:

```
winningTier = argmin over priced tiers of (packPrice / tier)
unitPrice   = winningTier.packPrice / winningTier
lineCost    = unitPrice × quantity
craftCost   = Σ lineCost                       // per one crafted item
```

Sell side, per tier:

```
units      = tier                              // 1, 10, 100, 1000
packCost   = craftCost × units
fee        = round(packPrice × 0.02)
netProfit  = packPrice − packCost − fee
perUnit    = netProfit / units
margin     = netProfit / packCost
```

`breakEven = craftCost / 0.98` stays per unit and tier-independent — it is the one figure that does
not move, which is why it stays outside the tier table.

The fee is 2% of the pack total at every tier, so **no tier is fee-advantaged**. What differs is
selling slots: one slot per pack whatever its size. That is a real reason to prefer big packs and it
ships as a line of prose under the table, not as a modelled budget — see
[Still deferred](#still-deferred).

### Screen layout

Unchanged shell, unchanged two columns. The right column now stacks two panels.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Dofus Market                          [ Kourial ▾ ]  [ ☀ ]              │
├──────────────────────────────────────────────────────────────────────────┤
│  ⌕  Search for an item…                                                  │
│                                                                          │
│  ┌────────────────────────────────────┐  ┌────────────────────────────┐  │
│  │ ▣  Gelano              [ ☆ ] [ × ] │  │ Saved            [ ▾ ]     │  │
│  ├────────────────────────────────────┤  │ ─────────────────────────  │  │
│  │ Ingredient    Qty  Unit price  Cost│  │ Watchlist                  │  │
│  │ ▸ ▣ Blueberry  50   120  ×1   6 000│  │  ▣ Gelano                  │  │
│  │ ▾ ▣ Mint Jel.  50   310 ×100 15 500│  │  ▣ Hogmeiser's Boots       │  │
│  │   ┌──────────────────────────────┐ │  │ Snapshots                  │  │
│  │   │ ×1    [   320]   320/u   2 h │ │  │  Gelano · 12 Sep · +1.2 M  │  │
│  │   │ ×10   [      ]     —      —  │ │  │  Gelano · 8 Sep  · +0.9 M  │  │
│  │   │ ×100  [31 000]   310/u ✓ 1 h │ │  └────────────────────────────┘  │
│  │   │ ×1000 [      ]     —      —  │ │  ┌────────────────────────────┐  │
│  │   └──────────────────────────────┘ │  │ Sell           [ Snapshot ]│  │
│  │ ▸ ▣ Lemon Jel. 20  1450  ×1  29 000│  │ Craft cost      170 250/u  │  │
│  ├────────────────────────────────────┤  │ Break-even      173 724/u  │  │
│  │ Craft cost               170 250   │  │ ────────────────────────── │  │
│  └────────────────────────────────────┘  │      pack price  net  /u   │  │
│                                          │ ×1   [1 450 000] +1.2M  ↑  │  │
│                                          │ ×10  [        ]    —    —  │  │
│                                          │ ×100 [14 000 000] +11M +110k│ │
│                                          │ ×1000[        ]    —    —  │  │
│                                          │ ────────────────────────── │  │
│                                          │ One slot per pack, any size│  │
│                                          └────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

Both right-column panels are `ScrollPanel`s. Saved is collapsible and capped at roughly a third of
the column; the sell panel takes the rest. Below `lg` they stack under the recipe table in that
order, and the `<lg` net-profit bar pins the **best tier's** net profit.

### The expandable ingredient row

**Collapsed** — v1's row plus one thing: the winning tier, rendered as a muted suffix on the price
(`120 ×1`). The input edits the winning tier directly, so an ingredient with one recorded price
behaves exactly as it did in v1.

**Expanded** — a second `<TableRow>` with a `colSpan` cell holding four lines:

| Column | Content |
| ------ | ------- |
| tier | `×1` / `×10` / `×100` / `×1000` |
| pack price | `PriceInput`, the total the game shows |
| per unit | derived, muted, `—` when the tier has no price |
| winner | ✓ on the cheapest per-unit tier, nothing on the rest |
| age | per tier, the v1 rules — muted, dot when stale, never blocking |

- The caret is the row's own disclosure button, `aria-expanded`, labelled `Pack prices for <name>`.
- Expansion is local component state, not persisted. Collapsing never discards a price.
- **Only one row is open at a time.** Two open sub-rows push the craft cost off-screen and the
  comparison is per-ingredient anyway.
- A row with two or more priced tiers keeps a muted marker when collapsed, so you can see which
  ingredients you have shopped properly without opening them.

### The sell panel

Craft cost and break-even sit above the table as shared context — they do not vary by tier. Then one
row per tier:

| Column | Content |
| ------ | ------- |
| tier | `×1` … `×1000`, with `= 10 crafts` as a muted hint on hover |
| pack price | `PriceInput`, the pack total |
| net | pack net profit, `text-gain` / `text-loss` per v1's colour rules |
| /unit | per-unit net, the column that makes tiers comparable |

- The **best tier by per-unit net** carries an `↑` marker and is the only row in `font-semibold`.
  If no tier is priced there is no best tier and nothing is marked.
- A tier with no pack price reads `—` across net and /unit. It is not zero and not a loss.
- The `thin` badge from v1 attaches per row, on that tier's margin.
- Every unpriced-ingredient rule from v1 still holds: **a partial basket computes nothing**, at any
  tier.
- The one-slot-per-pack note is the panel's footer line, beside v1's best-case caveat.

### Saved items

One collapsible panel, two sections, both per server.

**Watchlist** — a starred item id and when it was added. The star lives in the item summary header,
so adding is one click from the thing you are looking at. Clicking an entry loads it into the
calculator; prices come from the price book as they already do. Removing is a hover-revealed `×`.

**Snapshots** — taken by the `Snapshot` button in the sell panel, which opens a `Dialog` for the
label (defaulting to the item name plus the date). A snapshot freezes the prices *and* the computed
result. Clicking one opens the same dialog in read-only mode: the frozen figures, the timestamp, and
two actions — `Copy prices into calculator` and `Delete`. **It never recalculates**, and nothing
about viewing one changes the calculator.

`Copy prices into calculator` writes the snapshot's tier prices into the current server's price
book, loads the item, and says how many prices it overwrote. It is the only path from a snapshot
back to live state, and it is always explicit.

### States

v1's state table still holds. What v2 adds:

| State | What shows |
| ----- | ---------- |
| Ingredient with no tier priced | Collapsed row, empty input, v1's unpriced dot. Craft cost is `—`. |
| Ingredient with one tier priced | Collapsed row shows that tier as the winner. No multi-tier marker. |
| Ingredient with several tiers | Winner marked in the sub-row; collapsed row carries the multi-tier marker. |
| No sale price at any tier | Craft cost and break-even show; every tier row reads `—`; no best tier. |
| Watchlist empty | One line: `Star an item to keep it here.` No illustration. |
| Snapshots empty | One line: `Take a snapshot to record today's numbers.` |
| Saved entry for an item that left the bundle | Row renders the id and a `Remove` action. A regenerated game bundle must not strand a saved list. |
| Server switched | Watchlist, snapshots and prices all swap together. A snapshot never surfaces under another server. |

### Component breakdown

Shared — nothing here knows about pack tiers:

| Path | Change |
| ---- | ------ |
| `src/utils/pack-tiers.ts` | **new** — `PACK_TIERS`, `PackPrices`, `cheapestTier`, `pricedTierCount`. The winner rule lives here, not in the feature, because the store needs it too. |
| `src/stores/price-book.ts` | tier-shaped `PriceEntry`, `migratePriceBook`, `writeTierPrice` / `removeTierPrice`, `getWinningTier`. |
| `src/stores/saved-items.ts` | **new** — `useWatchlist` and `useSnapshots`, keyed per server, on `use-local-storage`. |
| `src/types/game.ts` | `PackTier`. |
| `src/types/saved.ts` | **new** — `WatchlistEntry`, `Snapshot`, `SnapshotFigures`. Shaped here so `stores/` crosses no layer to describe a frozen result. |
| `src/utils/format.ts` | `formatTier` (`×100`) and `formatCompactKamas` (`11 M`) for the narrow tier columns. |

Feature — `src/features/craft-profit/`:

| Path | What |
| ---- | ---- |
| `hooks/use-pack-prices.ts` | **new** — load, debounced persist and restore of the per-tier price map. Lifted out of the root, which was carrying all three. |
| `components/ingredient-price-row.tsx` | the caret, the winning-tier suffix and the multi-tier marker; renders its own expanded row. |
| `components/tier-price-rows.tsx` | **new** — the expanded sub-row: four tiers, per-unit, winner, age. |
| `components/sell-tier-table.tsx` | **new** — replaces the figures block in the profit panel. |
| `components/profit-panel.tsx` | keeps craft cost, break-even and the caveats; delegates the rest. |
| `components/snapshot-dialog.tsx` | **new** — taking one, plus `toSnapshotFigures`. |
| `utils/profit.ts` | profit per tier, `getTier`, `isThinMargin`. Still pure, still the unit-testable core. |
| `types.ts` | `TierProfit`; `CraftProfit` gains `tiers` and `bestTier` and loses its single-figure fields. |

Saved items are **not** a craft-profit feature — they hold item ids and frozen results, and a second
feature would want them too:

| Path | What |
| ---- | ---- |
| `src/features/saved-items/saved-panel.tsx` | the panel, both sections, collapsible. |
| `src/features/saved-items/components/watchlist.tsx` | list, load, remove. |
| `src/features/saved-items/components/snapshot-list.tsx` | list and open. |
| `src/features/saved-items/components/snapshot-view.tsx` | the read-only dialog: frozen figures, restore, delete. |

`src/app/routes/home.tsx` composes the two features. They never import each other: the watchlist
raises `onSelectItem` and home hands it to the calculator, exactly as
[AGENTS.md](../../AGENTS.md#unidirectional-imports-enforced) requires.

### Tests

`utils/profit.ts` keeps carrying the suite, in `src/features/craft-profit/utils/tests/`, joined by
`src/utils/tests/pack-tiers.test.ts` and `src/stores/tests/price-book.test.ts`. The migration is
tested through the exported pure `migratePriceBook`, not through `localStorage` — the suite runs in
node and stays free of a DOM. Cases worth naming:

- cheapest tier wins when bulk is *more* expensive per unit — the observed 459/u at `×1`, 500/u at
  `×100` case from [research.md](../research.md).
- a single priced tier behaves identically to a v1 unit price.
- fee is 2% of the pack total at every tier, so per-unit fee is tier-independent.
- a partial basket computes nothing at every tier.
- the v1 → tier-1 migration is lossless and idempotent.

### Explicitly not built

No router, no navigation, no second screen. No charts. No selling-slot budget, no liquidity, no
relisting model — everything in [Still deferred](#still-deferred) stays deferred. No export/import of
saved items. No syncing anything anywhere: this app is still offline.
