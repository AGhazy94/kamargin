# QA — Screenshot import v4 (steps 1–5)

**Tested** 2026-09-12 against `dev` @ `40203d8`, `npm run dev` on `/kamargin/`, driven through the
real app in a Chromium browser pane at 1205×928 unless a section says otherwise.

**Material** 28 real market screenshots from `.ocr-proof.local/screenshots` (1030×790 → 5120×2880),
plus adversarial cases built from them with ImageMagick: title cropped off, scaled to 40 %, two
dialogs side by side, a dialog part-covered, a non-market screen, a 4K full-desktop grab, a
zero-byte `.png`, and a text file renamed `.png`. Batch behaviour measured on 20 images at once.

**Headline:** the OCR itself is the strongest part of this feature. Across 18 real market dialogs —
including a 5120×2880 grab with chat, quests, inventory and a second panel in frame — every item
title, level, type, average price and pack price was read **digit for digit correct**. Not one
misread number in the whole run. Everything below is about what the app does with those numbers.

Ranked by what poisons a price book or wastes the player's time.

---

## Bugs

### 1. `Confirm all` is dead on arrival — 14 of 18 correct screenshots are excluded

**Repro**
1. Import `Screenshot …7.07.16 PM.png` (Greedo Rum), `…7.07.33 PM.png` (Edelweiss),
   `…7.07.41 PM.png` (Kido Beak).
2. Wait for all three to read.

**Expected** Three perfect reads, `Confirm all 3`, three green `Matched` badges.

**Actual** `Confirm all 0`. All three cards carry a red `⚠ Check item details` badge. The counter
says `3 screenshots · 3 matched · 3 need review`. Confirming requires three separate clicks.

On the 20-image batch: `20 screenshots · 18 matched · 16 need review`, `Confirm all 4`. Only 4 of
the 18 correctly-read dialogs were eligible.

**Cause** `needsItemReview` gates on the *confidence* of the parsed level/type/title, not on whether
they agree with the matched item — [review-import.ts:39-48](../../src/features/screenshot-import/utils/review-import.ts#L39-L48),
consumed by `canConfirmTogether` at [review-import.ts:61-71](../../src/features/screenshot-import/utils/review-import.ts#L61-L71).
The level word is parsed from a single token at
[parse-dialog.ts:138-141](../../src/features/screenshot-import/utils/parse-dialog.ts#L138-L141),
and in the game dialog that token sits beside the `♦` separator glyph, which Tesseract has no model
for. The captured fixture for Greedo Rum shows it exactly:

```
'Greedo' 91   'Rum' 96   'Lvl.' 2   '100' 2   '+' 45   'Liquid' 96
```

The value `100` is **correct**; its confidence is **2**. Measured level confidence across the 18 real
dialogs: 0, 2, 5, 36, 44, 49, 51, 53, 54, 55, 63, 63, 64, 68, 71, 73, 78 — 16 of 18 below the
threshold of 70 ([types.ts:4](../../src/features/screenshot-import/types.ts#L4)).

`matchItem` has already proved the level is right: it only returns `confident: true` when
`dialog.level.value === best.item.level` ([match-item.ts:68-74](../../src/features/screenshot-import/utils/match-item.ts#L68-L74)).
Re-checking its OCR confidence afterwards second-guesses a fact that has been verified against
bundled data.

**Why it matters** Batching is the whole argument for this flow — the spec says the work "scales with
*one*, not with the number of ingredients". As shipped it scales with N again, and every card is
painted red, which trains the player to click past warnings. That is exactly how a genuinely bad
number gets waved through.

Same cause: the auto-focus on the first card that needs attention lands on the **item combobox**
rather than the risky price field, on every card
([review-card.tsx:94-106](../../src/features/screenshot-import/components/review-card.tsx#L94-L106)).

---

### 2. Confirming replaces an item's tiers, and the receipt does not say what it deleted

**Repro**
1. Import Edelweiss (`…7.07.33 PM.png`). Confirm — 4 tiers saved (349 / 1,294 / 10,996 / 109,467).
2. Add a second Edelweiss screenshot to the same batch. Clear ×10, ×100, ×1000. Confirm.

**Expected** Something that tells the player three stored prices are about to be dropped.

**Actual** `prices:355[594]` goes from four tiers to one. The receipt reads
`Edelweiss · 1 pack prices saved · ×1 777`. Nothing mentions the three tiers that were removed.

Verified in `localStorage` before and after. Cause is intentional —
[price-book.ts:169-188](../../src/stores/price-book.ts#L169-L188) rebuilds `tiers` from scratch —
and README documents it, but nothing in the UI does.

**Why it matters** This is the one path that silently *loses* good data. It is not exotic: the game
dialog only shows the pack sizes currently on sale, so re-screenshotting an item on a thin market
legitimately yields fewer rows than last time, and confirming it wipes the rest. `Undo` fixes it,
but only if the player notices, and only until the sheet closes (bug 3).

---

### 3. Escape closes the sheet instantly — no warning, and every `Undo` is destroyed

**Repro**
1. Import several screenshots. Confirm some. Leave at least one card unconfirmed.
2. Press `Esc` (or click `Done`, or the `×`).
3. Re-open the sheet.

**Expected** A prompt, or at minimum a warning that `Undo` is about to expire.

**Actual** The sheet closes immediately. On re-open, zero receipts and zero `Undo` buttons —
confirmed by counting `Undo` buttons in the re-opened sheet (0). Unconfirmed cards are gone and
their OCR work is discarded; re-importing re-runs the whole pipeline.

**Why it matters** A player who has just confirmed a bad batch has exactly one keystroke between
them and an unrecoverable price book. `Esc` is also the reflex for dismissing the enlarged-screenshot
dialog, so it gets pressed a lot in this sheet.

---

### 4. Dropping a screenshot on the page throws the app away — **fixed 2026-09-12**

**Repro** Drag any screenshot from Finder onto the Kamargin window.

**Expected** At minimum, nothing. The feature does not accept drops yet (spec step 6 is deferred), so
the drop should be a no-op.

**Actual** Nothing in the app listens, so the browser's default action runs: the tab navigates to the
dropped `file://` image and the app is gone — along with any open review sheet, its unconfirmed
cards, and every live `Undo`.

**Cause** There is no `dragover` handler anywhere to cancel. `rg -n "onPaste|onDrop|onDragOver|dataTransfer|'paste'|'drop'" src/` returns **zero** matches. Verified in the
running app: dispatching real `dragover`, `drop` and `paste` events carrying an image `File` on
`<main>` leaves `defaultPrevented === false` for all three, and no review sheet opens.

**Why it matters** Drag-and-drop is the *first* thing a player will try — the spec's own journey is
"drop the whole pile anywhere in Kamargin", and the header button gives no hint that a file picker is
the only way in (issue A). The one action the feature most invites is the one that destroys the
session.

**Note on scope** The navigation itself is standard browser behaviour for an uncancelled drop rather
than something observed here — a synthetic `DragEvent` cannot make Chrome navigate, so what is
verified is that nothing cancels the default. This is exactly why drop zones start with
`preventDefault` on `dragover` before they do anything useful.

**Fixed** by [drop-surface.tsx](../../src/features/screenshot-import/components/drop-surface.tsx),
which cancels `dragover`/`drop` at the window before doing anything else, so a stray drop is inert
even when it carries no image. Shipped together with the drop zone and paste support — see
improvement 1.

---

### 5. Tab past the last control leaves the modal

**Repro** Open the sheet, focus the `×` (Close) button, press `Tab` once. Wait.

**Expected** Focus wraps to the first control in the sheet.

**Actual** Focus lands on an invisible focus-guard `<span>` outside `[role="dialog"]` and stays
there (checked after a 2 s wait — `document.activeElement` is the guard, `inDialog: false`). Nothing
is highlighted; the player cannot see where focus is. Pressing `Tab` again reaches
`Kamargin home`, then `Calculator`, then `Snapshots` — links inside the `aria-hidden="true"`
background behind the dimmed overlay — before focus eventually returns to `Browse`.

Reproduced with synthetic key input; a real keyboard may race the guard differently, but focus
demonstrably rests outside the dialog for seconds.

Focus *return* on close is correct: focus the header trigger, open the sheet, press `Esc`, and focus
is back on `Import screenshots`.

---

### 6. At 320 px the review sheet clips the digits it exists to let you check

**Repro** 320×720 viewport. Import any dialog with a 5+ digit pack price.

**Expected** Every price fully legible — this screen's only job is comparing numbers to a screenshot.

**Actual** Values overflow their inputs. Measured:

| row | value | clientWidth | scrollWidth |
| --- | ----- | ----------- | ----------- |
| ×10 | 23,998 | 108 | 111 |
| ×100 | 155,550 | 108 | 121 |

`155,550` renders as `155,55`. Real prices in the test set go to `1,778,999`.

**Cause** `PriceInput` reserves a 48 px trailing slot whenever `reference !== undefined`
([price-input.tsx:39,57](../../src/components/price-input.tsx#L39)). `ReviewCard` passes
`tier === 1 && average ? <span…> : null` ([review-card.tsx:330-338](../../src/features/screenshot-import/components/review-card.tsx#L330-L338))
— `null` is not `undefined`, so all four rows pay the 48 px even though only ×1 ever fills it. That
leaves 48 px of usable text width in a 108 px box.

No clipping at 375 px, 768 px, or desktop; no page-level horizontal overflow at any width tested.

---

### 7. Light mode: the `Confirm` button label fails WCAG AA

`--primary-foreground` on `--primary` measured on the live button: **3.63 : 1** at 12.8 px / 500.
AA needs 4.5 : 1. Dark mode is 8.91 : 1.

Tokens: [index.css:75-76](../../src/index.css#L75-L76) (`oklch(0.62 0.14 70)` /
`oklch(0.99 0.01 85)`). It is a shared token, so this hits every primary button in the app — but the
one it hits here is the button that writes to the price book.

Everything else in the sheet passes in both themes (loss-on-card 5.30 light / 5.66 dark,
muted-on-card 5.88 / 6.64, gain-on-card 5.08 / 7.61). No light-mode layout or colour breakage found
otherwise: the card, inputs, badges and receipts all render correctly.

---

### 8. A failed OCR engine is reported as a bad screenshot

**Repro** (engine failure forced by replacing the cached `ocr/worker.min.js` in CacheStorage with a
throwing stub, then reloading and importing two known-good screenshots.)

**Expected** One line saying the OCR engine could not start — the spec's "Worker failed" state.

**Actual** Every card reads **"The screenshot could not be read."** with a `Retry` button, and falls
back to manual entry. Both screenshots were pristine market dialogs that read perfectly before and
after. The console shows the real cause twice (`Uncaught Error: QA: poisoned worker asset`) — once
per job, confirming the worker is torn down and re-created per job
([use-ocr-queue.ts:140](../../src/features/screenshot-import/hooks/use-ocr-queue.ts#L140)), so every
image in the batch fails the same way and every `Retry` will fail again.

Two problems:
- The message blames the input. The player will go and re-take screenshots that were already fine.
- The dedicated worker-failure string never reaches the UI. `errorHandler` raises
  `new Error('The OCR worker failed.')`
  ([use-ocr-queue.ts:94-100](../../src/features/screenshot-import/hooks/use-ocr-queue.ts#L94-L100)),
  but the rejection that actually propagates is not an `Error`, so the generic fallback at
  [use-ocr-queue.ts:130-138](../../src/features/screenshot-import/hooks/use-ocr-queue.ts#L130-L138)
  wins.

The fallback *behaviour* is right — degrades to manual entry, offers `Retry`, never touches the price
book, rest of the app unaffected. Only the diagnosis is wrong. A batch-level "The OCR engine could
not start" banner would stop the player retrying twenty times.

---

### 9. No `prefers-reduced-motion` handling anywhere

The only reduced-motion rule in the served stylesheet is for `.shimmer`. The review sheet still
plays `data-open:zoom-in-95` + `fade-in-0` on open and the reverse on close, and every queued or
reading card runs an infinite `animate-spin` loader — on a 20-image batch that is up to 20
simultaneous spinners plus 20 animated `<progress>` bars, with no way to damp them.

Verified by enumerating `@media (prefers-reduced-motion: reduce)` rules in `document.styleSheets`
(one hit, `.shimmer`) and by reading the live class lists on the dialog.

---

### 10. Two items with the same name, level and type are offered as identical choices

**Repro** A dialog whose title is `Black Paint`.

**Actual** `matchItem` returns `confident: false` with two candidates scored 0 — item `1086` and item
`21689`, both `Black Paint`, both `Lvl. 1`, both `Miscellaneous Resource`. The combobox renders name
+ `Lvl. N · Type` only ([item-combobox.tsx:103-110](../../src/features/screenshot-import/components/item-combobox.tsx#L103-L110)),
so the two rows are visually identical. The player picks one at random; half the time the price lands
on an item no recipe uses.

`Surprise Bwork Pack` has eight such collisions; there are 6 duplicate names in the bundled 11,273
items. Refusing to auto-pick is right — presenting an unbreakable tie is not.

---

### 11. Empty-state flash on first open: "No screenshots in this batch."

Sampling the sheet every 350 ms on a cold load, at t≈594 ms the sheet reads
`0 screenshots · 0 matched · 0 need review` with the body text **"No screenshots in this batch."** —
after the player has just chosen files. The first card appears at t≈1.5 s.

**Cause** the sheet renders before `enqueue` runs; the initial files are enqueued from a
`setTimeout(…, 0)` inside an effect ([review-sheet.tsx:49-52](../../src/features/screenshot-import/components/review-sheet.tsx#L49-L52))
that only fires after the lazy chunk resolves. On a slow device or a cold engine this reads as "it
didn't take my files".

---

### 12. Grammar: "1 screenshots"

[review-sheet.tsx:131](../../src/features/screenshot-import/components/review-sheet.tsx#L131) —
`{queue.jobs.length} screenshots`, unpluralised. Visible on every single-file import.

---

## UX issues

### A. The only way in is an unlabelled icon next to two other unlabelled icons

`src/app/screenshot-import.tsx:33-46` renders an icon-only `ImagePlusIcon` button between the server
select and the theme toggle. Its purpose lives entirely in a hover tooltip ("Import screenshots. OCR
engine: 8.13 MB on first use, saved in this browser"), which touch users never see. The landing
page's "How it works" section still describes typing prices only, and never mentions import. With
page-wide drop and paste deferred (spec step 6), this icon is the *entire* discoverable surface for
the feature.

### B. Nothing teaches what a good screenshot is, and the failures are silent about why

The examples strip (spec step 9) is deferred, so the app never says what it can read. What it
actually does with bad input:

| case | result |
| ---- | ------ |
| scaled to 40 % (417×317) | `isMarketDialog: false`, zero tiers, "Not a market dialog." |
| title cropped off | prices read perfectly, item unmatched, average misread as `9,704` (flagged) |
| two dialogs side by side | reads **one**, silently drops the other; flags "Uncertain dialog region" |
| dialog part-covered | reads the visible rows, flags the covered one `Check ×1` — correct |
| non-market screen | "Not a market dialog. Choose an item and enter its pack prices." |
| zero-byte / renamed `.txt` | "The source image could not be decoded." + `Retry` — clean |
| 5120×2880 full-desktop grab | read perfectly |

Three of these are honest but unhelpful. "Not a market dialog" on a downscaled screenshot is *wrong
about the cause* — the image is a market dialog, it is just too small — and the player has no way to
learn that resizing broke it. The two-dialog case loses data with no indication that a second dialog
was seen and ignored; with manual crop deferred (spec step 7) there is no recovery at all.

### C. A stale receipt keeps claiming prices that are no longer stored

Confirm Edelweiss (4 tiers), then confirm a second Edelweiss card (1 tier). Both receipts stay on
screen. The first still reads `4 pack prices saved · ×1 349 · ×10 1,294 · ×100 10,996 · ×1000
109,467` — none of which is in the book any more. Its `Undo` correctly refuses
("This item changed after import…"), but only after you click it. The footer counts both:
`4 saved` for 3 items.

### D. `Discard` is instant, irreversible, and tabs *before* `Confirm`

Tab order inside a card: item combobox → ×1 → ×10 → ×100 → ×1000 → **Discard** → **Confirm**. Discard
removes the card with no confirmation and no undo; recovering means re-picking the file and re-running
OCR. Putting the destructive action one Tab ahead of the primary one is the wrong way round.

### E. In a batch, cards are indistinguishable by name

Real screenshots are all called `Screenshot 2026-09-12 at 8.41.08 PM.png`. The card truncates from
the right, so twenty cards all read `Screenshot 202…`. Only the thumbnail distinguishes them. Truncate
from the middle, or lead with the matched item name.

### F. The item OCR read is hidden exactly when it matters

`Read as <title>` only renders when **no** item is selected
([review-card.tsx:223-230](../../src/features/screenshot-import/components/review-card.tsx#L223-L230)).
When matching picks the *wrong* item confidently, the player sees a clean item name and no sign of
what was actually read. Show the OCR'd title whenever it differs from the selected item's name.

### G. Screen-reader semantics: good labels, no confirmation

Good: every price field is labelled (`Edelweiss pack 10 price`); flagged fields carry
`aria-invalid` + `aria-describedby` pointing at the real note text; the dialog is `aria-labelledby`
its `<h2>`; each `<progress>` has `<file> OCR progress`; reading cards are `aria-busy`; the error is
`role="alert"`; receipts are `<article aria-label="Greedo Rum import receipt">`.

Gaps:
- **No announcement on confirm.** The only thing that changes in a live region is the header counter
  (`role="status"`), which says `… · 3 need review`. Nothing says "Greedo Rum saved".
- **No announcement when a card needs attention.** `⚠ Check ×1` and "Low confidence. Compare with the
  shot." are reachable only by navigating onto the field.
- **Live-region flood.** Every queued/reading card carries its own `role="status"` ("Queued" /
  "Reading…"), so a 20-image batch installs 20 live regions that all fire as the queue advances, on
  top of the header counter re-announcing the whole line each time.
- **Eight identical `Undo` buttons.** Accessible name is bare `Undo`; the owning `<article>` label
  supplies context, but the button itself should say which item.

### H. The sheet's header eats the screen at 320 px

Title, server badge, a three-line disclaimer, a two-line counter and two buttons occupy ~350 px of a
720 px viewport before any card is visible. At 375 px and above it is fine.

### I. At 200 % zoom (640 CSS px) "Cheapest per unit" wraps to three lines

The `sm:` four-column grid kicks in at 640 px, and the trailing note column is too narrow for its
label. No clipping or overflow — just ugly. 375 px and desktop are clean.

---

## Improvements

### 1. Open an item on the calculator, then paste or drop its screenshot onto that page *(requested — page-wide drop and paste shipped 2026-09-12)*

**Shipped:** a page-wide drop target and `⌘V`/`Ctrl+V` paste
([drop-surface.tsx](../../src/features/screenshot-import/components/drop-surface.tsx)), an idle hint
inside the recipe panel ([drop-hint.tsx](../../src/features/screenshot-import/components/drop-hint.tsx),
composed through a new `importHint` slot in `src/app/routes/home.tsx`), and a batch that grows
instead of resetting when files arrive while the sheet is open. Confirming an import updates the
ingredient row live behind the sheet, because both read the same price book through
`useLocalStorage`'s listener registry — verified in the browser.

**Still deferred:** per-ingredient-row drop targets and the recipe checklist banner (spec step 8),
where identity comes from the row rather than from matching. That is what would remove bug 10 and
issue F for the calculator path.

Spec steps 6 and 8. Identity comes from the open recipe, so no matching, no combobox, no ambiguity —
and it removes the one thing the current flow cannot do well (bug 10, issue F).
**Buys:** the fastest path for the common case, and an override when matching fails.
**Costs:** `drop-surface.tsx` + `row-drop-target.tsx`, paste-event plumbing in `src/app/`, and a
decision about what a drop means when the review sheet is already open.

**Costs already paid:** `drop-surface.tsx` + `drop-hint.tsx`, one slot prop on
`CraftProfitCalculator`, an incremental enqueue in `review-sheet.tsx`, and 8 tests. The remaining
cost is `row-drop-target.tsx` and the checklist banner.

### 2. Stop re-checking OCR confidence on a field `matchItem` already validated

Drop `parsed.level` / `parsed.type` confidence from `needsItemReview`; keep `parsed.title`
confidence and keep `match.confident`. Fixes bug 1 and the misplaced auto-focus in one change.
**Buys:** `Confirm all 18` instead of `Confirm all 4`, and a red badge that means something.
**Costs:** ~5 lines; the parser tests already cover the cases.

### 3. Say what a confirm will overwrite

On a card whose item already has stored tiers, show them (`replacing ×10 1,294 · ×100 10,996`) and
mark the tiers about to be dropped. Fixes bug 2 without changing the replace semantics.
**Buys:** removes the only silent data-loss path.
**Costs:** one `readPriceBook` lookup per card; a row of muted text.

### 4. Warn on close while `Undo` is still live

"3 imports can still be undone. Close anyway?" Fixes bug 3.
**Buys:** the last line of defence before a bad batch is permanent.
**Costs:** an `AlertDialog`, plus an `onOpenChange` guard.

### 5. Keep the whole batch in `localStorage` until it is dismissed

Receipts and drafts die with the component. Persisting them would survive an accidental close, a
reload, and a crash mid-batch — and would make "Undo" outlive the sheet, which is what players will
expect from a word like Undo.
**Buys:** a 20-image batch stops being a single-session commitment.
**Costs:** a serialisable draft store; `File`/blob URLs cannot be persisted, so thumbnails would be
lost on reload — decide whether a receipt without its thumbnail is still useful.

### 6. Detect the "too small to read" case and say so

The 40 %-scaled shot produced zero anchors, so `locateDialog` reported nothing and the card claimed
"Not a market dialog". `readScreenshot` already knows the source dimensions
([read-screenshot.ts:29-33](../../src/features/screenshot-import/utils/read-screenshot.ts#L29-L33));
a dialog-sized image below some pixel height could say "This screenshot looks scaled down — OCR needs
the original size."
**Buys:** turns the most likely user error into a correctable one.
**Costs:** a heuristic and a threshold to calibrate against the fixture set.

### 7. Note when a second dialog was seen and ignored

`locateDialog` finds an anchor cluster; a second, disjoint cluster is detectable. Even without manual
crop, "Another dialog was found in this screenshot and not read" would stop silent data loss.
**Buys:** the two-dialog case stops being invisible.
**Costs:** cluster-splitting in `locate-dialog.ts`, plus fixtures.

### 8. Disambiguate duplicate item names in the combobox

Show something that differs — the item id, or the icon at a size where the art reads. Fixes bug 10.
**Buys:** removes a coin-flip that writes to the wrong item.
**Costs:** a line of muted text per option.

### 9. Consider `tessdata_fast`

The vendored `eng.traineddata` is the **standard** 4,113,088-byte file; with the worker (111,307 B)
and `tesseract-core-relaxedsimd-lstm.wasm.js` (3,905,767 B) that is 8,130,162 B on first use, which
matches the advertised 8.13 MB honestly. The spec suggested starting with `tessdata_fast` (~2 MB) and
only moving up if real screenshots demanded it — given that the current accuracy is 18/18 on real
dialogs, there is headroom to try halving the download.
**Buys:** ~2 MB off the one-time cost, on a feature whose main friction is that first download.
**Costs:** re-running the fixture capture and confirming accuracy holds.

### 10. Degrade when Service Workers are unavailable

`createOcrWorker` throws `"This browser cannot store the offline OCR engine."` if
`serviceWorker` is missing ([ocr.ts:7-10](../../src/features/screenshot-import/utils/ocr.ts#L7-L10)) —
so the feature refuses to run at all in a Firefox private window, rather than fetching the assets
uncached and working for that session.
**Buys:** the feature works where it can, instead of failing closed.
**Costs:** making `enableAssetCache` failure non-fatal, and a line saying the engine won't be saved.

---

## What worked, verified

- **Accuracy.** 18 real market dialogs, every title / level / type / average / pack price correct.
  Spot-checked digit for digit against the source images for Greedo Rum (1,482 / 23,998 / 155,550,
  avg 970), Edelweiss (349 / 1,294 / 10,996 / 109,467), Kido Beak (919 / 9,000 / 85,000 / 802,197),
  Mellifluous Bearbarian Tail (459 / 4,187 / 50,000 / 500,000), Manderisha Skin (100 / 3,140 /
  30,000), Bestial Brockhard Claw (391 / 4,196 / 119,995) and Intangible Meat (180 / 1,800 / 18,987).
  The last two came from 4K full-desktop grabs with chat, quests and inventory in frame.
- **Matching.** Exact ✓. One letter off (`Kldo Beak` → Kido Beak, `Edelweis` → Edelweiss) ✓. Two off
  (`Greedo Rurn`) ✓. Nonsense → no candidates, empty combobox, prices still filled ✓. Level and type
  genuinely disambiguate: they act as a veto on `confident` and as a score tiebreak — `Greedo Rum` at
  level 7, or typed `Bone`, both drop to "choose it yourself".
- **Confirm / Undo.** Writes land in `prices:<server>` with a fresh `capturedAt`; `Undo` restores the
  previous tiers **and their original timestamps**. The guard is real: after a second import of the
  same item, undoing the older receipt is refused with
  "This item changed after import. Undo the newer import first; newer edits are kept." The guard
  compares both `packPrice` and `capturedAt` per tier
  ([price-book.ts:210-217](../../src/stores/price-book.ts#L210-L217)), so it cannot be fooled.
- **Server safety.** The batch server is frozen at open and shown twice (header badge + footer). The
  header server select is behind the modal overlay and `aria-hidden`, so it cannot be changed
  mid-batch by clicking. Forcing a change the other way — navigating to `#/calculator?server=295`
  while the sheet is open — moves the header to Draconiros but the sheet keeps saying Kourial, and
  the confirm landed in `prices:355`. Correct.
- **Calculator afterwards.** Imported prices appear on the recipe with a sane relative timestamp
  ("18 min ago"), and the cheapest-per-unit tier is picked correctly.
- **Queue.** 20 images, one at a time, ~30 s total, streaming — card 1 is reviewable while card 20 is
  queued. The UI stays responsive: 8 long tasks, longest 179 ms, 561 ms total blocking across the
  whole batch. `Cancel` on a reading or queued job stops it cleanly, degrades to manual entry, and
  offers `Retry`; `Retry` re-reads correctly.
- **Failure paths.** Zero-byte and renamed-text files produce "The source image could not be decoded."
  with `Retry`, and never touch the price book. A non-market screenshot degrades to manual entry.
- **Offline.** With the dev server **stopped** (verified: `fetch` to the origin throws), a fresh OCR
  worker read two screenshots correctly from CacheStorage + IndexedDB. README's claim holds.
- **Cold-cache honesty.** Cleared CacheStorage and IndexedDB, reloaded, imported: total stored is
  4,017,074 B in CacheStorage (worker + one core variant) and 4,113,088 B in IndexedDB
  (`eng.traineddata`) = 8,130,162 B, against the advertised 8,131,466. Only one of the three core
  variants downloads. The service worker's fetch handler is tightly scoped to the two OCR asset paths
  and passes everything else through — no app-shell interception.
- **Responsive.** No horizontal page overflow at 320, 375, 768 or desktop. The card reflows to a
  single column below `sm:` and remains usable.
- **Focus return.** `Esc` returns focus to the `Import screenshots` trigger.

---

## Not tested, and why

- **Reload while offline.** Tested, and it does not work: with the server stopped, reloading gives a
  blank page. This is by design — README says the feature "does not add offline navigation or an
  app-shell cache" — so the sequence in the brief (*import, go offline, reload, import again*) cannot
  succeed. Offline import **without** a reload does work, which is what README actually claims.
- **`Backspace` / `Delete` key handling.** The browser pane did not deliver either key to the page
  (typing, `Tab`, `Enter` and `Escape` all worked). Fields were cleared with a native value setter
  instead, which exercises the same `onChange` path. Clearing a field by keyboard is therefore
  **unverified**; the code path (`parse('')` → `undefined`,
  [price-input.tsx:7-10](../../src/components/price-input.tsx#L7-L10)) looks correct.
- **The unavailable-Service-Worker path** (improvement 10) was read but not run — Chromium always
  provides one. Engine failure itself *was* forced and is written up as bug 8.
- **Real assistive technology.** Semantics were audited from the accessibility tree and the DOM, not
  with VoiceOver or NVDA. The live-region *flood* in issue G is inferred from counting regions, not
  from hearing it.
- **`prefers-reduced-motion` under emulation.** The pane cannot set the media feature. The finding is
  from the served CSS (one `.shimmer` rule, nothing else) and the live animation classes, so the
  behaviour is identical with the preference set — but it was not observed with it on.
- **Production build.** Everything was exercised against `npm run dev`. The `base` path, the vendored
  asset copy and the service-worker scope all behaved, but a Pages build was not run.
- **Real touch input.** Mobile widths were emulated at desktop with a mouse; tap targets were measured
  geometrically, not tapped.

---

## Working tree

Unchanged apart from this file. The adversarial images were built under
`.ocr-proof.local/qa-cases/` (gitignored) and deleted afterwards.

**Your browser state was modified:** the QA run wrote imported prices to the **Kourial (355)** price
book for Greedo Rum, Edelweiss, Kido Beak and Bestial Brockhard Claw, among others, and left an
`eng.traineddata` entry in IndexedDB plus a `kamargin-ocr:*` CacheStorage entry.
