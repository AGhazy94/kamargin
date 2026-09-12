# Saved items: UI/UX review

Date: 2026-09-12. Status: implemented and verified.

Heuristic review of the running app and its saved-item code, not a user study.
Inspected dark mode at 1440 x 900 and 390 x 844 using the existing Kourial watchlist
and Fwell Sword snapshot, then switched to Gelano. No saved data was intentionally
created, restored, edited, or deleted during the initial review. The findings below
record that initial state; implementation results follow.

## Implementation results

- Calculator, Watchlist and Snapshots are separate hash routes, with bookmarkable
   snapshot details. Item/server identity and list filters live in the URL.
- Calculator history matches the selected item and server, disappears when empty,
   and shows the latest record or up to three recent records below Sell.
- Snapshot previews focus Close; restore and delete confirmations focus Cancel.
   Open item uses current prices. Restore warns about shared ingredient prices,
   replaces recorded tier sets, preserves the snapshot date and leaves records frozen.
- Prices persist immediately. Navigation no longer cancels a delayed save; blocked
   storage retains values in memory for the current session.
- Navigation has a coin mark, larger targets and a separate mobile row. Watchlist
   removal stays visible. Snapshot lists show item identity, date, tier and net/pack
   versus net/unit, with search and an item filter.
- Ingredient expanders cover the name/icon area and allow multiple open rows.
   Price fields fit values up to 2,000,000,000 at 375px; tier markers sit below them.
- Search results no longer reserve space for an invisible check icon. Long snapshot
   labels use two preview lines and remain available in full in details.
- The mobile net-profit bar is fixed to the viewport bottom, with safe-area padding
   inside it and space reserved so the final controls remain reachable.
- Arbitrary craft quantities remain deferred. The UI explicitly distinguishes the
   per-item craft cost from each sell pack's total craft cost (1/10/100/1000 items).
- Market median prices are not available: the price book stores current user-entered
   tier prices, not a representative market sample. A median would require a defined
   observation history or a separate, explicitly approved data source.

## Findings, highest priority first

| Priority | Finding and evidence | Recommended improvement |
| --- | --- | --- |
| High | Opening a snapshot focuses **Delete**. Its handler deletes immediately, without confirmation or undo. An Enter press can therefore destroy the record the user just opened. Observed in the browser; handler in [snapshot-view.tsx](../../src/features/saved-items/components/snapshot-view.tsx#L92). | Initially focus the snapshot heading or Close. Put deletion behind confirmation, or provide reliable undo. Keep destructive actions visually secondary. |
| High | **Copy prices in** sounds like a local calculator action, but restoration writes into the shared server price book, including ingredient prices used by other recipes. The dialog gives no overwrite warning. See [snapshot-view.tsx](../../src/features/saved-items/components/snapshot-view.tsx#L92) and [use-pack-prices.ts](../../src/features/craft-profit/hooks/use-pack-prices.ts#L20). | Separate **Open item** using current saved prices from **Restore snapshot prices**. Confirm the latter with the affected server and overwrite scope. Keep the original snapshot frozen and historical provenance explicit. |
| Medium | Global saved entries compete with the calculation. At 1440 x 900, Saved occupies 265px and Sell gets only 378px, requiring internal scrolling to reach all tiers. At 390 x 844, even a three-ingredient recipe puts Sell at approximately y=1037, after Saved. See [craft-profit-calculator.tsx](../../src/features/craft-profit/craft-profit-calculator.tsx#L22). | Move collection management to separate routes. Align Sell with the recipe on desktop; on mobile place Sell directly after the recipe, before contextual history. |
| Medium | History is server-specific but not item-specific. Selecting Gelano still shows the Fwell Sword snapshot. [saved-panel.tsx](../../src/features/saved-items/saved-panel.tsx#L32) accepts no selected item and passes the whole server collection to the list. | On the calculator, show only snapshots matching both the selected item ID and active server. Hide the history section when there are no matches. |
| Medium | Snapshot rows show label, age, net and tier without column headings or a separate item identity. The default label already truncates at desktop width; a custom label need not identify the item at all. See [snapshot-list.tsx](../../src/features/saved-items/components/snapshot-list.tsx#L11). | On the Snapshots route, separate item name, label, saved time, tier, net/pack and net/unit. Keep exact figures available in details; use net/unit when comparing different pack sizes. |
| Medium | Watchlist removal is invisible until hover or keyboard focus. At the mobile viewport, the control had opacity 0 and a 32px target. See [watchlist.tsx](../../src/features/saved-items/components/watchlist.tsx#L8). | Keep a visible removal or overflow control on touch layouts, with a comfortable target. Add visible hover/focus tooltips to unfamiliar icon-only actions while preserving their accessible names. |

## Recommended navigation

Use three peer destinations, not a Saved route with another layer of tabs:

| Destination | Logical URL | Main job |
| --- | --- | --- |
| Calculator | `/?server=<serverId>&item=<itemId>` | Price ingredients, enter sale tiers, judge profit, watch an item and save a snapshot. Both parameters can default when absent. |
| Watchlist | `/watchlist?server=<serverId>` | Find tracked items and open them in the calculator with that server's current saved prices. |
| Snapshots | `/snapshots?server=<serverId>` | Browse frozen records, search by item or label, and inspect a snapshot. |
| Filtered snapshots | `/snapshots?server=<serverId>&item=<itemId>` | Show the full history reached from the selected calculator item. |
| Snapshot detail | `/snapshots/<snapshotId>?server=<serverId>` | Open a bookmarkable frozen record, scoped to its server. |

Keep server and theme controls in the shared header. Use real navigation links
with an active state; on narrow screens give the three links their own row rather
than squeezing them between the brand and server selector. Put collection counts
in page headings, where their server scope is visible.

The calculator stays the default screen. Its star toggle and Save snapshot action
stay beside the working item/results, so saving never requires visiting a library.
Do not put a miniature global watchlist back on the calculator after adding routes.

A small client-side router is justified for links, refresh and browser history.
No backend, runtime data fetching or server rendering is needed. The URLs above
are logical routes: use hash routing if the static host cannot serve the app shell
for deep paths; otherwise configure its existing SPA fallback.

## Conditional snapshots on the calculator

| State | Visible behavior |
| --- | --- |
| No selected item | No contextual history section. Snapshots remains available in navigation. |
| Selected item, zero matching snapshots | No empty history panel or zero-count badge. Save snapshot remains available. |
| One or more matches | Show a compact **Snapshot history (N)** section below the current result, with the newest record's label, saved time, tier and frozen net/unit visible. |
| Several matches | Allow expansion to the newest three records and provide **View all** to the item-filtered Snapshots route. |
| Item or server changes | Recompute matches immediately and close any preview that no longer belongs to that context. Never show a previous item's record during the transition. |
| Save or delete | Update the matching count and preview immediately. Deleting the last match removes the section. |

Read the collection through `useSnapshots(serverId)`, then match `snapshot.itemId`
against the selected ID and sort by `takenAt`, newest first. Never match by name,
label, watchlist membership, or an unscoped collection. The current store already
partitions snapshots by server; preserve that boundary.

Opening a history row previews frozen figures without changing live inputs.
Use the same snapshot detail content from the calculator and the Snapshots route.
Show the server and saved timestamp in details, with a short **Snapshot** status.
For incomplete records, show missing values as unavailable, not zero profit.

Do not automatically restore a snapshot just because its item is selected. Do not
recalculate its saved figures using today's price book. A live-versus-snapshot
comparison can follow later; it must compare the same tier or use net/unit with
clear labels, rather than subtracting unrelated pack totals.

## Collection layouts

- **Watchlist:** a scan-friendly list with item icon/name, category, level and an
  Open in calculator action. Include item search and a visible removal control.
  Avoid displaying a supposedly current profit without checking price completeness
  and age; this app has user-entered prices, not a live market feed.
- **Snapshots:** a table on desktop and stacked rows on mobile, newest first.
  Show item identity independently of the optional label. Include item/label search,
  an item filter and an explicit clear-filter action. Distinguish an empty collection
  from no matching search results.
- **Snapshot detail:** frozen figures first, then Open item, Restore snapshot prices,
  and a secondary destructive action. On mobile, use a scrollable detail page rather
  than forcing an increasingly rich comparison into a small modal.
- **Calculator:** retain the existing theme, item imagery, editable recipe and tier
  comparison. Reclaim space through hierarchy, not a new palette or decorative cards.
  Keep the mobile result summary and enough bottom clearance for the last control.

## Implementation boundaries and acceptance checks

These routes supersede the single-screen restriction in the
[v2 brief](craft-profit-calculator-v2.md), as approved for implementation.
Compose routes in `src/app/`; keep saved-item presentation inside its existing
feature and reuse the shared stores. Do not introduce cross-feature imports.

The selected item and server are resolved in [router.tsx](../../src/app/router.tsx)
from URL parameters, with defaults for missing/invalid servers and recoverable
missing-item states. Prices and snapshot payloads never appear in URLs.

Price persistence in [use-pack-prices.ts](../../src/features/craft-profit/hooks/use-pack-prices.ts)
writes through to the reactive, server-scoped price book immediately. There is no
pending debounce to lose on route or server changes.

Acceptance checks for implementation:

1. All three destinations support active navigation, refresh, direct links and
   browser Back/Forward. Route changes move focus appropriately; returning from a
   snapshot restores useful item/list context.
2. Navigating immediately after a price edit preserves that edit, selected item and
   server. Switching servers never writes pending values into the wrong price book.
3. Contextual history covers zero, one and many records; another item's snapshots
   and the same item's snapshots on another server never appear.
4. Creating a matching snapshot reveals history immediately; deleting the final
   match hides it. Canceling either action leaves data unchanged.
5. Previewing never changes prices. Restore clearly identifies the target server
   and shared-price overwrite, supports cancellation, and leaves frozen figures intact.
6. Opening a snapshot and pressing Enter cannot immediately delete it. Keyboard
   focus remains visible, Escape works, and closing a preview returns focus sensibly.
7. Long labels, large numbers, missing items and unknown snapshot IDs have readable,
   recoverable states. Missing data never silently loads another server's record.
8. Verify 375px, 390px and desktop widths, actual touch input, light/dark themes and
   large collections. No overlapping controls or clipped primary actions; removal
   must not depend on hover.

## Verification and limits

- Automated: 51 tests pass, including 11 routed UI regressions and five price-hook
   tests. Type checking, the production build and Biome CI pass.
- Browser: create/preview/restore/delete, safe keyboard focus, cancellation, frozen
   values, immediate-navigation persistence, filtered Back/Forward navigation,
   direct-link refresh, server isolation, missing items and unknown snapshot IDs.
- Layout: desktop screenshots and 375/390/768/1440px checks, both themes, loaded
   item images, 22 snapshot records and long labels. The profit bar's bottom gap is
   zero at both scroll extremes at 375/390/768px, with no final controls covered.
- Touch emulation: multiple expanded ingredients, navigation and watchlist removal
   pass in a 390 x 844 mobile browser context without page errors.
- Mutation tests used an isolated local origin, not the user's existing saved data.
   Physical iOS/Android devices, their software keyboards and nonzero safe-area
   insets remain unverified. This is a heuristic/browser review, not a user study.
- The production build retains Vite's large-chunk warning; bundled game data is
   included in the main client bundle. Bundle splitting is separate follow-up work.
