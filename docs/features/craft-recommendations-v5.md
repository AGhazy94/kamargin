# Feature — Craft recommendations, v5

**Status:** built 2026-09-13.

v3 ranks what you have priced and queues what you have not. v5 answers the question that queue
raises: **of the things I have not priced, which are worth the trip to the HDV?**

Builds on [craft-recommendations-v3.md](craft-recommendations-v3.md). Market mechanics and the
price-source position: [../research.md](../research.md).

## The problem

There is no price feed, so every price is a manual lookup — a screenshot, an OCR pass, a typed
correction. Lookups are the scarce resource, and v3 spends them badly:

- `missing-inputs` rows sort **last, fewest missing first**
  ([rank.ts](../../src/features/recommendations/utils/rank.ts) `compare`). Fewest-missing is a
  measure of what a row *costs* to complete, and says nothing about what completing it is worth.
- `topBlockers` ([blockers.ts](../../src/features/recommendations/utils/blockers.ts)) already ranks
  unpriced ingredients by how many recipes they unblock — the right shape, but the count is
  unweighted. "Ash Wood unblocks 47 recipes" is not a reason to price Ash Wood if all 47 lose money.

The result is a session spent pricing ingredients that unlock nothing worth crafting. The ranking
is honest about what it knows; it just has no opinion about what to learn next.

## The idea — bound the best case, then prune

An unpriced ingredient can only ever *raise* a craft cost. So value every unpriced ingredient at
**zero** and the resulting profit is an upper bound: the most this craft could possibly earn, under
the most generous prices the market could offer.

If that upper bound is already a loss, no discoverable price rescues the recipe. It is not a row
waiting on data — it is dead, and it should leave the queue rather than sit at the bottom of it.

Everything here is arithmetic over data already in the bundle and the price book. No new source, no
network, no change to the offline constraint.

## Decisions taken

| Question | Decision |
| -------- | -------- |
| Bound test | **Net profit ≤ 0**, not margin ≤ 0 — see below |
| Which rows can be `dead` | **`missing-inputs` only.** A fully priced row is already exact |
| Rows with no sale price | **Never `dead`.** Nothing to bound against |
| Where `dead` rows go | Out of the default list; behind a footer count that opens them **on their own** |
| `topBlockers` input | The **survivor** set, so unlock counts mean profitable recipes |
| Stale prices | Unchanged in v5 — still shown, never scored. Deferred, below |

### The bound needs a priced ingredient to bite

Found while writing the tests, and it bounds the whole feature: a recipe with **no** priced
ingredient can never be dead. Its optimistic cost is zero, so its best case is the sale price minus
the 2% fee — always a profit. The prune therefore does nothing on a cold price book, and sharpens as
the book fills. That is the right shape (a claim is only made once there is evidence for it), but it
means v5 is worth nothing to a new player and a great deal to a returning one.

### Why net profit, not margin

`margin = netProfit / packCost` ([profit.ts](../../src/utils/profit.ts) `tierProfit`), and it is
left `undefined` when `packCost` is 0. Value every ingredient of a wholly unpriced recipe at zero
and `packCost` is exactly 0 — so the optimistic margin of the rows most in need of the test is the
one figure the test cannot read. Net profit is defined throughout.

### Why only `missing-inputs` rows

When nothing is missing, the optimistic cost equals the real cost and the bound tells you nothing
new: an unprofitable row is already on screen with a negative margin. Marking those `dead` would
hide priced, checkable losses behind a filter — which is the opposite of what the screen sells.

### What the bound does not cover

The sale price it prunes against is one the player typed, and may be stale or simply wrong. A dead
verdict is therefore only as sound as that one number. This is why `dead` hides rather than deletes,
and why the count stays visible: a corrected sale price must be able to bring a recipe back.

## Changes

### `src/utils/profit.ts`

Add alongside `calculateCraftProfit`, sharing its fee and tier arithmetic:

```
optimisticCraftProfit({ ingredients, salePrices })
  → the same CraftProfit, with every undefined unitPrice read as 0
```

It must not be a second implementation of the fee maths — build the optimistic `ProfitLine[]` and
hand it to the existing path, exactly as v3 required of the ranking.

### `src/utils/craft.ts`

`summariseCraft` gains `optimisticPerUnit?: number` — the best per-unit figure across the optimistic
tiers, computed **only when something is missing** (with nothing missing the bound is the real
figure, and the second pass would be waste on 4610 rows). The watchlist ignores the field.

### `src/features/recommendations/types.ts`

`RowState` gains `'dead'`. `Recommendation` gains `optimisticNetPerUnit?: number`, so the row can
say *how far* from viable it is rather than only that it is.

### `src/features/recommendations/utils/rank.ts`

In `toRecommendation`, a row otherwise classified `missing-inputs` becomes `dead` when
`optimisticPerUnit <= 0` — an absent sale price leaves the bound undefined, so the test cannot fire
on one. `STATE_ORDER` gains `dead: 3`; within the state the near misses sort first, since those are
what a corrected sale price revives. `countByState` gains `dead`.

**Visibility moves out of `rankRecommendations`** into a new `visibleRows(rows, filters)`. The
ranking now returns every row in the job and level window, including the hidden ones, because both
the footer counts and the blocker panel need to see what a filter is hiding. `hideIncomplete` moves
with it.

### `src/features/recommendations/utils/blockers.ts`

`topBlockers` takes the ranked rows rather than raw items, and skips `dead` ones.
`Blocker.recipeCount` keeps its name; its meaning narrows to *live* recipes.

### UI

- **Footer, not filter row.** The dead count is a toggle where the counts already are —
  `12 dead · show` — so the rows are never silently gone, and the filter row keeps to three
  controls. `aria-pressed` carries the state.
- **Showing them is an inspection view, not a merge.** Caught in the browser: dead rows sort behind
  everything, so on a real 481-row Smith backlog, folding them back into the list left the screen
  looking identical and the click looking broken. `showDead` therefore lists the dead *alone*, and
  the toggle reads `back` on the way out. `hideIncomplete` does not apply inside that view.
- `blocker-panel`: the copy stops promising unblocked crafts and starts promising profitable ones.
- Dead row, when shown: greyed, a `dead` badge, `best case −108` where the margin would be, and
  **no fill button** — a wrong verdict is corrected on the sale price, not on the inputs.
- Empty state when every row in the window is dead: says so, and points at the sale price.

## Tests

`rank.test.ts` and `blockers.test.ts` own this; fixtures in
[fixtures.ts](../../src/features/recommendations/utils/tests/fixtures.ts).

- A partly priced recipe whose priced ingredients alone already exceed the sale price → `dead`.
- The same recipe priced under the sale price → stays `missing-inputs`.
- The same recipe with no sale price → stays `missing-inputs`, bound undefined.
- A fully priced losing recipe → stays `ranked` with a negative margin, never `dead`.
- Two dead rows → the near miss first, both after every live row.
- An ingredient blocking only a dead recipe → absent from `topBlockers`.
- An ingredient blocking three recipes of which one is dead → `recipeCount` of 2.
- `visibleRows`: dead hidden by default, listed alone on request, and `hideIncomplete` dropping the
  backlog while they are hidden.

## Deferred — not in v5

- **Stale as an interval, not an absence.** A price older than `STALE_AFTER_MS` could feed the
  optimistic bound and prune more rows before any lookup. It changes what "missing" means across the
  whole app, so it is its own feature.
- **Volatility from snapshots.** Items whose price has not moved across stored snapshots do not need
  re-checking; items that swing do. That is the useful answer to "what needs a fresh price today",
  and it needs the snapshot history, not the price book. Taken up in
  [price-volatility-v6.md](price-volatility-v6.md).
