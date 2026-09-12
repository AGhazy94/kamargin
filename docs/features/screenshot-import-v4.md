# Feature — Screenshot import, v4

**Status:** specified 2026-09-12. Not built.

v1–v3 all start the same way: you read a number off the game's market dialog and type it into the
app. That transcription is the whole cost of using Kamargin — four pack tiers per item, a dozen
ingredients per craft, and every one of them retyped when the market moves.

v4 removes the typing. You screenshot the market dialog, drop it into the app, and the pack prices
arrive already filled in — **read locally, in the browser, by a bundled OCR engine.** No server, no
API, no model call. The app stays exactly as offline as it is today.

Market mechanics and price semantics: [../research.md](../research.md). The pack-tier model this
feature writes into: [craft-profit-calculator-v2.md](craft-profit-calculator-v2.md).

## The journey — screenshot-first, item inferred

The obvious flow is *item-first*: search an item, open it, drop its screenshot on it. It works, and
v4 supports it — but it is not the cheapest flow, because it makes you say twice what the screenshot
already says once.

**The dialog names its own item.** So the app should ask for the screenshot and nothing else:

```
in-game     open the market dialog for each thing you care about, press screenshot.
            No cropping, no order, no naming. Five ingredients → five screenshots.

alt-tab     once. Drop the whole pile anywhere in Kamargin.

app         each image identifies itself — title → item, rows → pack tiers.
            One review grid. Confirm all.
```

Compared with searching each item and dropping onto it, this removes **N searches and N
drag-to-the-right-slot decisions**, and replaces them with one drop and one confirm. The work the
player does scales with *one*, not with the number of ingredients.

What the item-first idea is genuinely right about is **context**, and that is kept:

- **On the calculator, the recipe is a checklist.** Drop a pile there and it fills the ingredients
  it recognises, then says `5 of 8 priced — 3 still to screenshot`, naming them. The craft becomes a
  shopping list of screenshots to take, which is the real job.
- **A per-row drop target stays** on every ingredient row. It is the override, not the main road:
  identity comes from the row, so it always works even when matching fails.
- **Search still drops.** An image dropped anywhere in the app is accepted; the drop target is the
  whole page, not a box you must aim at.

The rule behind all three: **you should never have to tell the app something the screenshot already
says.** Aiming is an error path, not a step.

## What the screenshot actually gives us

The in-game dialog is a fixed layout, and every field on it maps onto something the app already
models:

| On screen | Maps to |
| --------- | ------- |
| Title (`Greedo Rum`) | the item — matched against bundled `items.json` |
| `Lvl. 100 ♦ Liquid` | `Item.level` and `Item.type` — used to disambiguate the name match |
| `Average price: 970` | nothing stored. Shown in review as a sanity check |
| Pack rows (`1 / 1,482`, `10 / 23,998`, …) | `PriceEntry.tiers[tier].packPrice` — the payload |
| `Amount in Inventory: 63` | ignored |

The pack rows *are* the price book. A parsed screenshot is one `restorePackPrices` call away from
being indistinguishable from a hand-typed entry — which is the point: this feature adds an input
method, not a data model.

Note what is **not** on the dialog: the server. Prices land on whichever server is selected in the
header, exactly as typed prices do.

## Decisions taken

| Question | Decision |
| -------- | -------- |
| OCR engine | **Tesseract.js**, WASM, assets self-hosted. Never a network OCR service. |
| Trust | **Always review before writing.** No import ever reaches the price book unseen. |
| Item identity | **OCR the title, fuzzy-match `items.json`**, confirm with the level + type line. |
| Primary entry | **Drop anywhere.** Batch-first, item inferred. Calculator adds recipe context. |
| Secondary entry | **Per-ingredient-row drop target**, where identity is taken from the row. |
| Cropping | **Auto-crop to the dialog**, with a **manual crop + re-read** when the guess is off. |
| Average price | **Parsed, shown, not stored.** It is a reference figure, not a listing. |
| Language | **English game client only** in v4. |
| Failure mode | A field that cannot be parsed is **left empty and focused**, never guessed. |

### Why review is not optional

Every other number in this app is one the player typed and can therefore vouch for. A silently
auto-applied OCR price breaks that: a misread `1,482` as `1482` is invisible, but a misread
`155,550` as `15,550` quietly poisons a craft margin, a recommendation ranking, and any snapshot
taken afterwards. The review step keeps the guarantee the app sells — **every figure on screen is
one you confirmed.**

The cost is one click per batch. Batching is what makes that acceptable.

### Why not fixed-ratio crops

The obvious approach — crop the title box, crop each price box, OCR each crop — assumes a known
dialog size. Screenshots arrive at whatever resolution, scale and window size the player runs,
sometimes cropped by hand, sometimes a full-screen grab with the dialog somewhere in the middle.
Ratios break on all of that.

Instead: **locate, then read.** The dialog is found first (below), and the structure inside it is
recovered from word bounding boxes — a title line, an `Average price:` line, then N rows each
holding a small left number and a large right number. The parser never needs to know where the
dialog sat or how big it was, which makes it a pure function over a word list: testable without ever
running OCR.

## Cropping — automatic, with a manual override

Two passes, which is both faster and more accurate than one:

1. **Locate.** Downscale the image and OCR it cheaply. The anchor words (`Average`, `price`, `Pack`,
   `BUY`) form a cluster; the dialog is the bounding box of that cluster, padded. Background chat,
   spell bars and the map contribute no anchors, so they fall outside.
2. **Read.** OCR only that region, at full resolution, with `tessedit_char_whitelist` narrowed to
   digits and separators for the price band. Fewer pixels, no background noise, one font.

If the anchor cluster is too sparse to trust, the card opens in **crop mode**: the image with a
draggable rectangle pre-positioned at the best guess, and a **Re-read** button. The same control is
reachable from any card (`Adjust crop`), so a bad auto-crop is never a dead end — it is one drag.

Manual crop is also the escape hatch for the screenshot that holds *two* dialogs, or a dialog half
covered by a tooltip: crop to the one you want, re-read.

## Teaching it — examples, not instructions

The import surface ships with a short **how it works** strip rather than prose:

- **Three thumbnails**: a good screenshot (full dialog, unscaled), one cropped too tight (title
  missing → the item cannot be named), one scaled far down (digits blur → flagged low confidence).
  Each labelled in three words.
- **Try a sample** — a bundled example screenshot in the feature's `assets/`, which runs the real
  pipeline end to end. The feature can be understood before the player ever alt-tabs, and it doubles
  as a self-test that the vendored engine loaded.
- One line on where Dofus writes screenshots on disk.

The strip collapses permanently once an import has been confirmed.

## Offline packaging — the part that must not regress

Tesseract.js downloads its worker, its WASM core and its language data from a CDN by default. That
would put a runtime network dependency in an app whose defining property is not having one. All
three are therefore **vendored and served from our own origin**, and the paths are pinned:

```ts
const base = import.meta.env.BASE_URL // '/kamargin/' on Pages, '/' nowhere else

await createWorker('eng', 1, {
  workerPath: `${base}ocr/worker.min.js`,
  corePath: `${base}ocr/core`,
  langPath: `${base}ocr`,
  gzip: false,          // we ship the plain .traineddata, not the gzipped CDN form
  cacheMethod: 'write', // second import reads traineddata from IndexedDB, not the network
})
```

- Files live in `public/ocr/` so Vite copies them verbatim and `base` prefixes them for free.
- A copy step in `scripts/` keeps them in sync with the installed `tesseract.js` /
  `tesseract.js-core` versions, so a dependency bump cannot silently desync the vendored copies.
  **Do not hand-edit them.**
- Budget to verify at implementation: the LSTM-only core is on the order of **~3 MB wasm**, and
  `eng.traineddata` is **~4 MB** standard / **~2 MB** from `tessdata_fast`. Start with `fast` and
  only move up if accuracy on real screenshots demands it — the text here is large, high-contrast
  and in a single font.
- **None of it is loaded until an image is dropped.** The feature is `React.lazy`, the worker is
  created on first image, and none of it is in the initial bundle. A player who never imports a
  screenshot downloads none of this.

After the first successful import the traineddata is in IndexedDB, so the feature works with the
network off — the same standard the rest of the app holds itself to.

## The parser

Everything below is pure, lives in `utils/`, and is tested against fixture word lists captured from
real screenshots. No DOM, no worker, no image.

### Input

```ts
type Word = { text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }
```

### Steps

```
1. rows      = cluster words by vertical overlap of their bbox   → Word[][]
2. header    = the first row whose words are large relative to the median word height
               → candidate item name
3. meta      = the row matching /Lvl\.?\s*(\d+)/ → level, plus the trailing token(s) → type
4. average   = the row containing "Average" → the trailing integer
5. packRows  = rows holding exactly two integer runs, where
                 - the left run's x-centre sits left of the row's midpoint
                 - the right run sits right of it
               → { tier: leftInt, packPrice: rightInt }
6. keep only packRows whose tier ∈ PACK_TIERS (1, 10, 100, 1000), first occurrence wins
```

Numbers are read by stripping every non-digit (`1,482` / `1 482` / `1.482` all → `1482`) — the same
normalisation [price-input.tsx](../../src/components/price-input.tsx) already applies to typed input.
Thousands separators are therefore never a source of error; a *missing* digit is, which is what the
review step exists to catch.

### Item matching

```
candidates = items whose normalised name is within edit distance ≤ 2 of the OCR'd title
             (normalise: lowercase, strip punctuation and diacritics)
score      = name distance, then +penalty if item.level ≠ parsed level
                            then +penalty if item.type ≠ parsed type
```

- One clear winner → pre-selected in review, with the matched name shown.
- Several close → review opens with the item combobox focused and the candidates listed.
- None → same, but empty. The player picks; OCR still filled the prices.

The existing `searchItems` in [game-data.ts](../../src/lib/game-data.ts) is prefix/substring only and
cannot absorb an OCR slip. Matching adds a small edit-distance helper in the feature; it does **not**
change `searchItems`, which serves a different need.

### Confidence

Tesseract reports per-word confidence. A parsed field whose source words fall below a threshold is
kept but **flagged in review** — highlighted, not hidden, so the eye goes to the risky number first.
A field the parser could not produce at all is left empty.

## UI

### The review grid

Dropping anywhere opens the review sheet. One card per image, streaming: card 1 is reviewable while
card 5 is still in the worker.

```
┌─────────────────────────────────────────────────────────────┐
│  Drop screenshots here — or paste, or browse                │
│  Nothing leaves your browser. Prices are read on-device.    │
└─────────────────────────────────────────────────────────────┘

5 screenshots · 4 matched · 1 needs you           [ Confirm all 4 ]
┌──────────┬──────────────────────────────────────────────────┐
│ [thumb]  │ Greedo Rum          Lvl. 100 · Liquid   ✓ matched│
│  crop ⤢  │ avg 970 ⬦                                        │
│          │  ×1     1,482      1,482/u                       │
│          │  ×10   23,998      2,400/u                       │
│          │  ×100 155,550      1,556/u          [ Confirm ]  │
├──────────┼──────────────────────────────────────────────────┤
│ [thumb]  │ Kldo Beak  →  ⌄ Kido Beak (Lvl. 101 · Bone)      │
│  crop ⤢  │ ⚠ low confidence on ×1000     [ Adjust crop ]    │
└──────────┴──────────────────────────────────────────────────┘
```

Per card:

- **Thumbnail of the source image**, click to enlarge, `Adjust crop` to redraw and re-read — the
  review is only meaningful if the original is one glance away.
- **Item**, as a combobox, pre-filled with the match. Always changeable.
- **One row per pack tier**, each a `PriceInput` (the shared component — an imported price is edited
  with exactly the same control as a typed one), with the derived per-unit figure beside it and the
  cheapest tier marked, matching the calculator.
- **`avg` shown as reference**, in the same trailing slot `PriceInput` already reserves.
- **Confirm** writes via `restorePackPrices(serverId, …)` and collapses the card to a one-line
  receipt with **Undo** (the pre-import tiers are held until the sheet is dismissed).
- **Confirm all** takes every card with a confident match and no flagged field; cards needing
  attention stay behind.

### On the calculator — the recipe as checklist

Dropping on the calculator runs the same pipeline, then adds context the other surfaces don't have:

- A screenshot whose item is **in the open recipe** fills that ingredient's row in place.
- A screenshot that isn't gets a normal card — it still imports, it just isn't part of this craft.
- A standing line: `5 of 8 ingredients priced — Kido Beak, Edelweiss, Manderisha Skin still to
  screenshot`, each name copyable so the next in-game search is one paste.

### Drop target on an ingredient row

Each ingredient row accepts a dropped image. Identity is taken from the row — no matching, no
combobox — and the pack rows open inline beneath it. The fast path for the common case: you are
already looking at the row you need to fill.

### Empty and failure states

| State | Screen |
| ----- | ------ |
| No screenshots yet | The drop zone, the three examples, `Try a sample` |
| Engine loading | Card with a skeleton and "Reading…", first load also says the engine is downloading once |
| Auto-crop unsure | Card opens in crop mode, rectangle at the best guess, `Re-read` |
| Not a market dialog | Card says so, offers the item combobox + empty tiers — degrades to manual entry, never a dead end |
| Worker failed | One line, a retry, and the manual-entry fallback. The rest of the app is unaffected |

## Structure

```
src/features/screenshot-import/
├── assets/
│   └── sample-dialog.png       # powers "Try a sample" and the examples strip
├── components/
│   ├── drop-surface.tsx        # page-wide drop + paste
│   ├── review-sheet.tsx
│   ├── review-card.tsx
│   ├── crop-box.tsx
│   └── row-drop-target.tsx
├── hooks/
│   └── use-ocr-queue.ts        # worker lifecycle, concurrency of 1, cancellation
├── types.ts                    # Word, ParsedDialog, ReviewDraft
└── utils/
    ├── ocr.ts                  # createWorker with the pinned local paths
    ├── locate-dialog.ts        # anchor words → crop rect        (pure)
    ├── parse-dialog.ts         # Word[] → ParsedDialog           (pure)
    ├── match-item.ts           # title + level + type → candidates (pure)
    └── tests/
        ├── fixtures/*.json     # word lists captured from real screenshots
        ├── locate-dialog.test.ts
        ├── parse-dialog.test.ts
        └── match-item.test.ts
```

`src/app/` composes it: the drop surface wraps the shell, the review sheet is lazily loaded on first
image. Nothing outside the feature imports `tesseract.js`.

Fixtures are captured once by running the real engine over real screenshots and writing the word list
to JSON — after that the suite runs in milliseconds, offline, with no WASM. Every screenshot that
ever parses wrong becomes a fixture; that is how the parser gets hardened.

## Build order

Each step leaves the app working and is worth a commit.

1. **Vendor the engine.** `tesseract.js` + `tesseract.js-core`, the copy script, `public/ocr/`,
   `knip.jsonc` entry. Prove it: a throwaway page reads the sample screenshot offline.
2. **Capture fixtures.** Run the engine over the five real screenshots, write the word lists to
   `utils/tests/fixtures/`. Everything after this is testable without WASM.
3. **The pure core**, test-first against those fixtures: `parse-dialog.ts`, `locate-dialog.ts`,
   `match-item.ts`.
4. **The queue**: `use-ocr-queue.ts` — worker lifecycle, one image at a time, cancellation, progress.
5. **The review sheet**: card, tier rows on the shared `PriceInput`, confirm → `restorePackPrices`,
   undo. This is the first step the player can use.
6. **The drop surface**: page-wide drop + paste, wired in `src/app/`.
7. **Crop**: auto-crop from step 3 feeding a draggable `crop-box.tsx` with re-read.
8. **Calculator context**: recipe checklist banner, per-row drop target.
9. **The examples strip** and `Try a sample`.

Steps 1–5 are the feature. 6–9 are what make it cheap to use.

## Out of scope, deliberately

- **Non-English clients.** The anchors are English words. A second language is a fixture set and a
  string table, not a redesign — but it is not v4.
- **Reading the seller list / the price-history graph.** Only the pack-buy dialog.
- **Storing the average price.** It is a derived server statistic, not a listing; mixing it into a
  book of observed prices would blur exactly the line [v3](craft-recommendations-v3.md) draws.
- **Auto-capture, clipboard watching, anything resident.** The app is a page, not an agent.
- **Cropping or de-skewing photos of a screen.** Screenshots only.

## Risks

| Risk | Mitigation |
| ---- | ---------- |
| Asset size on first import (~5 MB) | Lazy feature + lazy worker; IndexedDB cache; the size is stated in the UI before it downloads |
| OCR misreads a digit | Review is mandatory; low confidence is flagged; the thumbnail sits beside the number |
| Auto-crop misses the dialog | Manual crop + re-read on every card, not only on failure |
| Dialog layout changes in a future patch | The parser keys on structure (two integer runs per row), not pixels; fixtures make a break loud |
| `tesseract.js` bump desyncs vendored assets | The copy script is the only way those files are written |
| knip flags `public/ocr` or the copy script | Both are outside `src/`; add the script to `entry` in [knip.jsonc](../../knip.jsonc) |
