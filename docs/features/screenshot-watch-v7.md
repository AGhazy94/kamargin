# Feature — Watched screenshot folder, v7

**Status:** built 2026-09-15. The picker is a native dialog, so the grant/resume path has not been
exercised end to end by an automated run — everything either side of it has.

Extends [screenshot-import-v4.md](screenshot-import-v4.md). v4 removed the *typing*. v7 removes the
*handover* — the alt-tab, the drag, the `⌘V`. You point Kamargin at the folder your screenshots land
in once; after that, taking a screenshot in Dofus is the whole interaction.

Everything downstream of the handover is v4's and is untouched: the same OCR queue, the same parser,
the same matcher, the same mandatory review. **v7 adds a third source of files, nothing else.**

## It reverses one v4 decision, deliberately

v4's *Out of scope* list says:

> **Auto-capture, clipboard watching, anything resident.** The app is a page, not an agent.

That reasoning was about *capability*, and it was right at the time: watching a folder meant a native
helper, which meant an installer, a background process, and a second thing to trust. The File System
Access API removes all three. A folder handle the player granted, read only while the tab is open,
polled by the page itself, is not an agent — it is the same page reading files the player handed it,
with the drag removed from the handover.

What v4's line still correctly forbids, and v7 does not do:

- **Nothing resident.** No service worker, no background sync, no process outside the tab. Close the
  tab and the watching stops, with no residue but a permission the player can revoke.
- **No clipboard watching.** `navigator.clipboard.read()` on focus would be the cheaper build and is
  rejected: it reads whatever the player last copied, which is frequently not a screenshot and is
  frequently private. A folder the player named is a scope; the clipboard is not.
- **No auto-capture.** Kamargin never takes a screenshot. It reads ones Dofus and the OS already
  wrote.

## The journey

```
once        Import menu → "Watch a folder" → pick where screenshots land.
            One OS permission prompt. Persisted; a later visit is one click to re-grant.

in-game     open each market dialog, press screenshot. Never alt-tab.

app         when you come back, the tab has already read them:
            "4 screenshots read — review" sitting in the corner.
            One click, one confirm.
```

Compared with v4, the player's per-screenshot cost falls from *alt-tab + locate window + drag or
paste* to *nothing*. The per-batch cost stays one confirm, which is the guarantee, not the friction.

## Decisions taken

| Question | Decision |
| -------- | -------- |
| Mechanism | **File System Access API** — `showDirectoryPicker`, read-only handle, persisted in IndexedDB |
| Availability | **Chromium desktop only.** Feature-detected; the UI does not exist elsewhere, and drop + paste stay the universal road |
| Detection | **Poll on visibility/focus, plus a slow interval while visible.** No filesystem change events exist |
| What counts as new | **`lastModified` watermark**, persisted, plus a same-millisecond name set |
| Arrival behaviour | **A tray, never a modal.** Files enqueue silently; the review sheet opens only when the player clicks |
| Trust | **Unchanged — review is still mandatory.** A watched file and a dropped file are the same `ImportRequest` |
| First grant | **Ingests nothing.** The watermark starts at "now", so picking a folder of 400 old screenshots imports zero |
| Scope | **Top level of the chosen folder only.** No recursion into subfolders |
| How many folders | **One.** A second slot for Dofus's own directory was built and cut — see below |

### Why a tray and not the review sheet

The review sheet is a modal `Dialog`. In v4 that is correct — it opens because the player just
dropped something, so it is the thing they were doing. Under v7 files arrive while the tab is
*hidden*, and the player returns to the browser for some other reason half the time. A modal that
opens itself on focus would steal a click, a scroll position, and possibly a half-typed price.

So arrivals accumulate into the existing session and surface as a dismissible pill:

```
                                   ┌──────────────────────────────┐
                                   │ ⬦ 4 screenshots read  Review │
                                   └──────────────────────────────┘
```

Reading starts immediately — by the time the pill is clicked the cards are usually already `ready`,
so the sheet opens straight onto a confirmable grid. The work happens eagerly; only the *interruption*
waits for permission.

### Why one folder

A second slot for Dofus's own screenshot directory was built and removed. It was answering a
question nobody asked: the player takes screenshots one way, with one key, and they land in one
place. A second row doubled the picker, the permission prompts and the states to explain, in
exchange for a folder most players never write to.

### The Desktop cannot be watched, and the dialog has to say so first

macOS saves screenshots to the Desktop by default, and **Chromium refuses the Desktop outright** —
"can't open this folder because it contains system files", with no way through. The same goes for
the home directory and other well-known folders. So the obvious folder is the one folder that can
never work.

Nothing in the app can fix that, which makes it a *teaching* problem, not an error-handling one. Two
consequences:

- **The picker opens at Pictures, not the Desktop.** Starting where the pick is guaranteed to fail
  is worse than starting one click away from where it succeeds.
- **The empty state says it before the click.** A callout above the button names the block, tells
  the player to make a folder of their own (`Pictures/dofus`), and on macOS gives the one step that
  makes the whole thing work — `⌘⇧5 → Options → Other Location` to point the screenshot key there.

Handling the refusal after the fact is not enough, and barely possible: Chromium's own "choose a
different folder" dialog means the promise only rejects — with `AbortError`, indistinguishable from
a cancel — once the player gives up. The app would have nothing specific to say at the point where
it is finally told. Hence the warning up front, and the generic refusal message kept only as a
backstop.

**The browser never reveals a full path.** `showDirectoryPicker` hands back a handle whose only
readable identity is `handle.name` — the folder's own name, not where it sits. The dialog shows that
name and says so outright, rather than implying a path it cannot know.

### Why a watermark and not a seen-set

The obvious implementation remembers every filename it has imported. That set grows without bound,
and it re-imports a file the player edited or re-saved under the same name. A `lastModified`
watermark is O(1), survives a rename, and matches what the player means by "new since I last
looked". The one hole it has — several files written in the same millisecond, of which we ingested
some — is closed by also persisting the names seen *at* the watermark, which is a set of one or two
in practice.

```ts
// utils/new-screenshots.ts — pure, no filesystem
type Seen = { at: number; names: string[] }

function selectNew(
  files: readonly { name: string; lastModified: number }[],
  seen: Seen,
  limit: number,
): { ingest: string[]; next: Seen }
```

- Ignores anything not an image, by extension and then by `File.type`.
- Ignores `lastModified < seen.at`, and at `=== seen.at` ignores names already in `seen.names`.
- Sorts oldest-first so the review grid reads in the order the screenshots were taken.
- **Caps at `limit` (10)** and reports the overflow. A folder that gained 300 files while the tab was
  closed must not enqueue 300 OCR jobs; the pill says `10 of 300 read — the rest are older`, and the
  watermark advances only past what was actually ingested.

This function is the whole of the feature's logic, and it is testable with a plain array.

### Why polling, and at what cadence

There is no change notification in the File System Access API. Polling is the only option, so the
cost has to be kept invisible:

| When | Cadence |
| ---- | ------- |
| Tab hidden | **Nothing.** No timer, no reads |
| On `visibilitychange` → visible, and on `window.focus` | **One immediate scan** — the case that matters, since the player was in Dofus |
| Tab visible, idle | Every **5 s**, so a second monitor setup still sees screenshots arrive |
| A scan is already running | Skipped, not queued |

A scan is one `dir.entries()` iteration reading names and `lastModified` — no file contents are read
until `selectNew` says a file is new. On a folder of a few hundred entries that is sub-millisecond
work, and it stops entirely when the tab is hidden.

## Permission, and how it degrades

```ts
const handle = await window.showDirectoryPicker({
  id: 'kamargin-screenshots', // the OS remembers this picker's last location
  mode: 'read',
  startIn: 'pictures',
})
```

The handle is structured-cloneable, so it persists in IndexedDB — but the *permission* does not
survive a browser restart. On load:

| `queryPermission({ mode: 'read' })` | Behaviour |
| ----------------------------------- | --------- |
| `granted` | Watching resumes silently. The player does nothing |
| `prompt` | The pill becomes `Resume watching Screenshots` — `requestPermission` needs a user gesture, so it cannot be asked for on load |
| `denied`, or the handle throws `NotFoundError` | Watching is forgotten, the stored handle is dropped, and the settings row returns to "Watch a folder" |

Feature detection gates the whole surface: `'showDirectoryPicker' in window`. Where it is absent —
Safari, Firefox, every mobile browser — no settings row appears and no "unsupported" message is
shown. v4's drop and paste are not a fallback there; they are the normal way the app works, and
saying otherwise on every Firefox page load would be noise.

## The picker

The header's import button opens a menu — `Choose screenshots`, then `Watch a folder` — and that
second item opens the picker dialog, which is where every watch decision is made:

```
  Watch for new screenshots
  Point Kamargin at the folder your screenshots land in and they import
  themselves. Nothing is uploaded, and prices still need your confirmation.

  ┌─────────────────────────────────────────────────────────┐
  │                          🗀                              │
  │                   Choose a folder                        │
  │              A folder of your own, not Desktop           │
  └─────────────────────────────────────────────────────────┘
  ┌─────────────────────────────────────────────────────────┐
  │ ⚠ Your browser blocks Desktop and other system folders.  │
  │   Make a folder for this — say Pictures/dofus — and      │
  │   choose that instead.                                   │
  │   Then point the screenshot key at it: ⌘⇧5 → Options →   │
  │   Other Location.                                        │
  └─────────────────────────────────────────────────────────┘

  Only files added after you choose are read — an existing pile is left alone.
  Reading stops when this tab closes. Nothing runs in the background.
  Your browser reveals a folder's name, never its full path.
```

Once chosen, the dashed target becomes a row: the folder name, a green dot and `n read this
session`, plus `Change` and a stop button. A lapsed grant says `Access lapsed` and offers `Resume`.
The lines underneath are the whole privacy contract, stated where the decision is made rather than
in a tooltip nobody opens.

**A refused pick says so.** `showDirectoryPicker` throws `AbortError` when the player cancels — that
is silent — and something else when the browser refuses the folder, which surfaces in the dialog.
Swallowing both, as the first cut did, makes a blocked folder look like a dead button.

The trigger button carries a small `--gain` dot while a watch is live, and its tooltip changes to
`Watching for screenshots`. **The tooltip is suppressed while the menu is open** — otherwise it
renders on top of the menu it just described.

## Structure

Additive. No existing file changes shape; three gain a call site.

```
src/features/screenshot-import/
├── hooks/
│   ├── use-ocr-queue.ts            # unchanged
│   └── use-watched-folder.ts       # NEW — handle, permission, poll loop, picker errors
├── components/
│   ├── drop-surface.tsx            # unchanged
│   ├── review-sheet.tsx            # gains `open` — renders the pill instead when deferred
│   ├── watch-folder-dialog.tsx     # NEW — the picker, and every watch action
│   ├── watch-folder-menu.tsx       # NEW — the one menu item that opens it, with live status
│   └── arrivals-pill.tsx           # NEW — "4 screenshots read — Review"
└── utils/
    ├── new-screenshots.ts          # NEW — pure: selectNew (above)
    ├── folder-handle-store.ts      # NEW — one IndexedDB object store: handle + watermark
    └── tests/
        └── new-screenshots.test.ts # NEW
```

- `folder-handle-store.ts` is ~40 lines of raw IndexedDB against a single object store. **No `idb`
  dependency** — one store with `get`/`put`/`delete` does not earn one, and the app currently has no
  IndexedDB code of its own to share.
- `src/app/screenshot-import.tsx` mounts `useWatchedFolder` inside `ScreenshotImportProvider`, whose
  session gains one field: `deferred`. An arrival opens a deferred session; a drop, a paste or a
  click never does, and an arrival into an already-open sheet does not re-hide it.
- **Reading is eager because the sheet stays mounted while deferred** — it renders `ArrivalsPill`
  instead of its `Dialog`, so `useOcrQueue` is already working by the time the pill is clicked.
- The header's import button becomes a `DropdownMenu`: `Choose screenshots`, then the watch section.
  A green dot on the button marks a live watch. Where the API is absent the section renders nothing.
- TypeScript may not ship `showDirectoryPicker` on `Window`; if not, one ambient declaration in
  `src/types/`, not a `@types` package.

## Build order

1. **`new-screenshots.ts` + tests.** Pure, no browser API, no UI. The feature's only real logic.
2. **`folder-handle-store.ts`.** Persist and restore a handle across a reload; prove it by logging
   the folder name on load.
3. **`use-watched-folder.ts`.** Permission states, the poll loop, visibility wiring. Emits into a
   callback; still no UI.
4. **`watch-folder-row.tsx`** wired to `addImports`. At this point the feature works and opens the
   review sheet on every arrival — usable, and deliberately still rude.
5. **`arrivals-pill.tsx`.** Arrivals stop stealing focus. This is the step that makes it pleasant.
6. **Overflow and revocation states** — the `10 of 300` line, `Resume watching`, folder gone.

Steps 1–4 are the feature; 5–6 are what make it liveable.

## Out of scope, deliberately

- **Clipboard watching** and **auto-capture** — see above; still rejected, on privacy grounds now
  rather than capability ones.
- **Watching in a Service Worker or with the tab closed.** The permission model does not allow it,
  and v4's "the app is a page" holds.
- **Recursing into subfolders**, or watching more than one folder. One key, one folder.
- **Auto-confirming a high-confidence read.** The temptation grows once files arrive by themselves;
  v4's [Why review is not optional](screenshot-import-v4.md#why-review-is-not-optional) answers it
  and v7 does not reopen it.
- **Deleting or moving the screenshots after import.** Read-only handle, on purpose — a bug in
  Kamargin must not be able to cost the player a file.

## Risks

| Risk | Mitigation |
| ---- | ---------- |
| Player picks a huge folder (Desktop, Pictures) | Watermark starts at "now", so nothing historic imports; per-scan cap of 10 |
| Chromium-only, so the feature is invisible to most | Drop + paste remain the documented primary road; v7 is never a prerequisite |
| A screenshot arriving mid-edit disrupts the player | Tray, never a modal; reading is eager, interrupting is not |
| Permission silently lapses after a browser restart | The row says `Access lapsed` and offers `Resume`, not a silent failure |
| The browser refuses the Desktop, where macOS saves by default | The empty state warns before the click and names the fix; the picker starts at Pictures |
| Poll cost on a slow machine | Hidden tab does nothing; a scan reads directory metadata only, never file contents |
| Non-screenshot images in the folder | Filtered by type; a non-dialog image still degrades to v4's "not a market dialog" card, which is a dead end for nobody |
