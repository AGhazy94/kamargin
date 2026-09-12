# Feature — Craft profit calculator, v2

**Status:** specified, not designed.

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

### Spacing

Uniformly more generous. The current screen reads cramped in the recipe table and the profit panel
in particular. This is a scale decision, not a set of one-off tweaks — settle the step values in
design and apply them, rather than nudging individual components.

### Colour

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

## Open questions for the design session

- How do four tiers per ingredient fit a table row that currently holds one input? Expandable row,
  tier tabs, a popover per ingredient — each has a different cost in scanning speed.
- Does the sell-side tier comparison replace the profit panel, or sit beside it as a small table?
- Snapshots: read-only, or restorable into the calculator?
- Where does the saved panel sit — left of the calculator, right of it, or a drawer? It competes with
  the profit panel for the right-hand column.
- Migrate the v1 price book into tier 1, or drop it?
