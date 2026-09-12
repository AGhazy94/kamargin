# Feature — Craft profit calculator

**Status:** specified, not built. Design session pending.

The first and, for now, only feature. Answers one question: *for this item, on my server, does
crafting it and selling it on the marketplace make kamas?*

Game mechanics and data sources it rests on: [../research.md](../research.md).

## v1 scope — one item at a time

1. Search for an item and pick it.
2. See its recipe: each ingredient, its quantity.
3. Type a unit price for each ingredient, and a unit sale price for the crafted item.
4. See craft cost, the 2% marketplace fee, net profit, and margin.

That is the whole feature. Everything else is deferred — see [below](#deliberately-deferred).

## Non-negotiables

- **Manual prices are the source of truth.** Bundled data never supplies a price. A median can be
  shown as a reference next to the field and copied in with one click, but nothing auto-fills a
  number that then backs a profit figure.
- **Prices are per server.** A profit result that doesn't say which server it's for is wrong.
  Default to Kourial; a selector can land in v1 if it stays trivial (bundled JSON + a `<select>`),
  otherwise defer it and hardcode.
- **Every price is per unit.** The game lists per pack (1 / 10 / 100 / 1000). If pack entry is
  offered, divide on entry and keep the pack size visible so the number's origin is legible.
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

## Open questions for the design session

- Server selector in v1, or hardcode Kourial and add it later?
- If a selector: classic servers only (13), or all 27 including Temporis and Shadow?
- Pack-size entry in v1, or per-unit only with the division done in the user's head?
- How prominent is the median-price reference, given it's informational and never authoritative?
