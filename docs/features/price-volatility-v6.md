# Feature — Price volatility from snapshots, v6

**Status:** built 2026-09-13.

Deferred out of [craft-recommendations-v5.md](craft-recommendations-v5.md). v5 decides which
*missing* prices are worth a lookup. v6 decides which *existing* ones are worth a second look.

## The problem with `stale`

Today a price is stale at 24 hours and that is the whole of the app's opinion about freshness
(`STALE_AFTER_MS`, [price-book.ts](../../src/stores/price-book.ts)). Age is a proxy for wrongness,
and a bad one in both directions:

- A resource that has sat at the same price for three weeks is flagged the moment it turns a day
  old. The badge sends you to re-check something that will not have moved.
- A resource that swings 40% between mornings looks perfectly trustworthy for 23 hours.

The app already holds the evidence to do better. Every snapshot stores `prices` — the full slice of
the price book behind that craft, with a `takenAt`
([types/saved.ts](../../src/types/saved.ts)). Several snapshots are several observations of the same
ingredients at different moments. That is a price history nobody is reading.

## What it computes

Per item, an observation is a **unit price** — `cheapestTier`'s figure, so a pack-of-100 record and a
pack-of-1 record compare honestly. Observations come from every snapshot holding that item, plus the
current price book entry.

```
swing = (max − min) / median        across every observation of that item
```

Median, not mean, because three observations where one is a typo should not have the typo set the
centre. Undefined below two observations: an item seen once has no history, and the app must say
unknown rather than assume steady.

| Constant | Value | Meaning |
| -------- | ----- | ------- |
| `SETTLED_SWING` | 0.05 | Under 5% across every observation: a stale price here is still good |
| `VOLATILE_SWING` | 0.25 | Over 25%: worth re-checking however fresh it looks |

Re-check priority is `swing × age in days` — a figure that moves a lot, last seen a while ago,
outranks both a steady old price and a volatile fresh one.

## Decisions taken

| Question | Decision |
| -------- | -------- |
| Observation unit | **Unit price** via `cheapestTier`, never the pack total |
| Spread measure | `(max − min) / median`, not standard deviation |
| Below two observations | **Unknown**, never "steady" |
| What `stale` does | **Unchanged.** v6 qualifies the badge, it does not move the row |
| Where the queue lives | The recommendations screen, opposite the blocker panel |

### Why age still decides nothing

Freshness is shown, never scored — v3's rule, and v6 keeps it. A volatile row does not rank higher
or lower than a steady one; it carries a badge and it enters a queue. The margin column remains the
only thing the sort obeys.

### Why this grows with use

A brand-new price book has no snapshots and therefore no history: every item is unknown, and v6 shows
nothing. One snapshot of a craft yields observations for that item *and* all of its ingredients, so
coverage grows several items at a time. Like v5's bound, the feature is worth nothing on day one and
a great deal in month two. That is honest, and it is the cost of not running a server.

## Changes

### `src/utils/price-history.ts` — new

```
type PriceObservation = { at: number; unitPrice: number }
type Volatility = { swing: number; observations: number; lastSeenAt: number }

buildPriceHistory(snapshots, book)   → Map<itemId, PriceObservation[]>, oldest first
volatilityOf(observations)           → Volatility | undefined
refreshQueue(history, now, limit)    → the items most worth re-checking, ranked
```

Observations at the same instant collapse to one: restoring a snapshot writes its prices back into
the book with the snapshot's own `takenAt`
(`restorePackPrices`), which would otherwise double-count.

### `src/utils/craft.ts`

`CraftSummary` gains `usedItemIds: number[]` — the items whose prices the figures were actually built
from. `summariseCraft` already tracks these internally to decide `stale`; exposing them lets the
ranking ask about volatility without a second signature.

### `src/features/recommendations`

- `rankRecommendations` gains a trailing `history` parameter, defaulting to an empty map. With no
  history nothing changes, which is what the watchlist and every existing test rely on.
- `Recommendation` gains `settled: boolean` (stale, but nothing behind it has moved) and
  `volatile: boolean` (something behind it swings past `VOLATILE_SWING`).
- `Blocker` gains `detail: string`, so the existing panel renders both queues. `topBlockers` writes
  `unlocks N crafts`; the refresh queue writes `moved 34% · seen 3 d ago`.
- `BlockerPanel` takes `title` and `description`, and renders `detail` verbatim.

### UI

- Row badges: `stale` becomes `steady` when the history says the price has not moved; a `swings`
  badge is added when it has, fresh or not.
- The refresh queue appears where the blocker panel does, when the screen has something ranked —
  the warm-start counterpart to the cold-start queue, never both at once.

## Tests

`src/utils/tests/price-history.test.ts`, plus the existing rank and blocker suites.

- Two observations of the same item at different tiers compare per unit, not per pack.
- An item seen once → volatility undefined.
- Two identical observations at the same instant collapse → still undefined.
- A typo-high third observation moves `swing` but not the median's centre.
- A row whose used prices are all steady and stale → `settled`, not `volatile`.
- A fresh row with a swinging ingredient → `volatile`.
- `refreshQueue` ranks a big old swing above a big fresh one, and both above a steady old price.

## Deferred — not in v6

- **Recording every price write.** A real history store would give volatility for everything typed,
  not only what was snapshotted. It is the better data source and a storage change of its own; the
  snapshot-derived version is the one that needs no migration.
- **Per-tier volatility.** A resource can be steady at ×1 and jumpy at ×100. Collapsing to unit price
  hides that, and nothing in the app acts on a single tier yet.
