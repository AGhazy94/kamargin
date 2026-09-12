# Audit — navigation, naming, and metadata

**Audited** 2026-09-12 against `dev`, in the running app. Every claim below was read out of the live
DOM or the served files, not inferred.

Scope: nav labels, route paths, document titles, headings, and the SEO/social/manifest metadata.

---

## What the app calls each screen

| Screen | Nav label | Route path | `document.title` | `<h1>` | `<main aria-label>` |
| ------ | --------- | ---------- | ---------------- | ------ | ------------------- |
| Landing | *(brand link)* | `/` | Kamargin — Dofus craft margins | Know what a craft is worth before you make it. | Kamargin |
| Craft cost | Craft cost | `/cost` | `<item>` \| Kourial \| Kamargin | Bottle of Greedoburg | Craft cost |
| What to craft | What to craft | `/crafts` | What to craft | What to craft | What to craft |
| Watchlist | Watchlist | `/watchlist` | Watchlist | Watchlist (1) | Watchlist |
| Snapshots | Snapshots | `/snapshots` | Snapshots | Snapshots (1) | Snapshots |
| Unknown | — | `*` | Page not found | Page not found | Page not found |

**Updated 2026-09-13.** The table above is the state *after* bugs 1 and 2 were fixed. Both are kept
below with their original findings, marked fixed.

---

## Bugs

### 1. An unknown route says it is Snapshots — **fixed 2026-09-13**

**Repro** Open `#/nope?server=355`.

**Expected** A title and landmark that say the page was not found.

**Actual** The body renders *"Page not found"*, but `document.title` is `Snapshots | Kourial |
Kamargin` and `<main aria-label>` is `Snapshots`. A screen-reader user is told they are on Snapshots;
so is anyone scanning browser tabs or their history.

**Cause** `title` in [router.tsx:56-65](../../src/app/router.tsx#L56-L65) is a ternary chain whose
final `else` is `'Snapshots'`, so every unmatched path inherits it. The `*` route renders its own
heading but never touches the title.

**Fixed** The pathname-to-title ternary is now a `TITLES` lookup with an explicit `Page not found`
fallback, so an unmatched path names itself in the tab, the history and the `main` landmark.

---

### 2. The Crafts screen has four different names — **fixed 2026-09-13**

`Crafts` in the nav and on the landing card, `/recommendations` in the URL, `Recommendations` in the
tab title and the `main` landmark, `What to craft` as the `<h1>`.

**Why it matters** The URL is the part a player shares and bookmarks, and it is the one name nobody
in the UI uses. The title is what fills their browser tab and history, and it is a third name. A user
searching their own history for "crafts" finds nothing.

Also inconsistent with the rest of the codebase: `RecommendationsRoute`, `features/recommendations/`,
`recommendation-filters:355` in `localStorage`, and `#/recommendations` in the README's route list —
against `Crafts` in the README's feature table and in AGENTS.md.

**Fixed, and the same problem was fixed on the other screen.** `Calculator` described the widget, not
the answer; both screens are now named for the question they settle:

| | Nav, title, landmark | Path |
| --- | --- | --- |
| One recipe costed out | **Craft cost** | `/cost` |
| The ranking | **What to craft** | `/crafts` |

`/calculator` and `/recommendations` redirect, carrying `?server` and `?item` through, so older links
and bookmarks still land in the right place. Paths now live in one `ROUTES` map in
[router.tsx](../../src/app/router.tsx) with titles derived from it, so the four-names failure cannot
recur by drift. The internal `features/recommendations/` folder and the `recommendation-filters:355`
storage key keep their names — neither is user-facing, and renaming the key would drop saved filters.

---

## UX issues

### A. `?server=355` and `?item=910` are opaque in a shared link — **fixed 2026-09-13**

A shared craft-cost link reads `#/cost?server=355&item=9968`. Neither number means anything to
the person receiving it, and the server ids are Ankama's, so they are not stable ground to build on.

- `?server=kourial` would be readable, would survive renumbering, and is a small lookup against
  `SERVERS` with the numeric form kept as a fallback for old links.
- `?item=9968-bottle-of-greedoburg` reads as a title in a chat window and still parses on the leading
  number, so old links keep working with no redirect table.

**Fixed** Links now read `#/cost?server=kourial&item=9968-bottle-of-greedoburg`.
[url-params.ts](../../src/utils/url-params.ts) writes and parses both forms, and the router's existing
normalising redirect upgrades an old link in place — so `#/calculator?server=355&item=910` lands on
`#/cost?server=kourial&item=910-hogmeisers-boots` in one hop. The id leads the item param, so a
renamed item still resolves and a stale slug is ignored. An item id nothing matches is left exactly as
typed rather than normalised, which is what keeps the redirect from looping. Storage is untouched:
`prices:<id>` keys stay numeric.

### B. Titles could carry their counts

Largely addressed by bug 2: the tab now reads `Craft cost` rather than `Calculator`, which says
something. Still open: Watchlist and Snapshots could carry their counts the way the `h1`s already do
(`Watchlist (1)`), which is free distinguishing information in a strip of pinned tabs.

### C. The landing page never mentions the screenshot importer — **fixed 2026-09-13**

"How it works" read *"type the marketplace prices"*, which stopped being the main road when the
importer shipped. The page now leads with it: the subheading is *"Screenshot the marketplace"*, there
is a primary **Price a craft** call to action beside *"or drop a screenshot anywhere — even here"*,
and the four numbered steps walk the screenshot flow, with typing kept as step 4 rather than step 1.
The two screen cards were renamed to match the nav.

The page also stopped hugging the left edge: the prose keeps a `max-w-3xl` reading measure, but the
section and the four screen cards now use the whole shell, four across from `xl`.

Still open from the screenshot-import QA: the header trigger is an unlabelled icon (issue A there).

### D. The social card is the same on every screen

The static tags in `index.html` work, and they unfurl correctly — confirmed on Discord. What cannot
work is making the card *per screen or per item*: Discord, Slack and Twitter fetch the HTML without
running JavaScript, so a `document.head` React rewrites after load is never seen. For a tool whose
use is sending someone a link to a specific craft, the preview will always describe the site rather
than the craft.

Worth knowing rather than worth attempting. The only real fix is pre-rendering a page per item at
build time, which is a large change for a link-preview nicety; the current card is a good one and
accepting it is the sane call.

---

## Improvements

### 1. Hash routing is the ceiling on SEO — decide deliberately

`#/cost?…` is a fragment, so every screen is the same URL to a crawler. The site can rank for
exactly one page, and `canonical` correctly points at the root. Per-screen titles never reach a
search engine.

Real paths on GitHub Pages need the `404.html` copy trick (Pages serves `404.html` for unknown paths;
it re-enters the SPA). That is one build step and it would make `/crafts` and `/cost` indexable
pages with their own titles.

**Buys** Four indexable pages instead of one; shareable links that unfurl per screen if static
pre-rendering ever follows.
**Costs** A `404.html` step in the Pages workflow, and it contradicts the deliberate choice recorded
in the README ("which is what lets a static host serve deep links and refreshes with no rewrite
rules"). Worth doing only if search traffic is actually a goal — say so before spending it.

### 2. `theme-color` is pinned to dark while the app has a light mode — **fixed 2026-09-13**

[index.html:13](../../index.html#L13) sets one `#0b0a08`. On iOS Safari and Android Chrome the browser
chrome stays black for a user in light mode. The fix is the two-line media pair:

```html
<meta name="theme-color" content="#f5f4f0" media="(prefers-color-scheme: light)" />
<meta name="theme-color" content="#0b0a08" media="(prefers-color-scheme: dark)" />
```

**Fixed, and one step further than the audit asked.** A media pair alone is only right while the
theme is left on *system*: a player who picks light on a dark OS would still get black chrome. So
[index.html](../../index.html) carries both metas tagged `data-scheme`, and
[theme-provider.tsx](../../src/components/theme-provider.tsx) rewrites their `media` on an explicit
choice — `all` on the winner, `not all` on the loser — and hands both back to
`prefers-color-scheme` when the theme returns to *system*. Verified in all three states. The hex
still lives once, in `index.html`, because the first paint happens before any script runs.

### 3. The manifest is missing what makes an install look finished — **fixed 2026-09-13**

[site.webmanifest](../../public/site.webmanifest) has name, icons, colors. It has no `id` (so a
changed `start_url` creates a second installed app), no `lang`, no `categories`, no `screenshots` —
and the repo already ships two good ones in `docs/screenshots/`, which is what Chrome uses to build
the richer install dialog instead of a bare icon-and-name prompt.

**Fixed** `id`, `lang`, `dir`, `categories` and three `screenshots` — two `wide` and one `narrow`, so
Chrome has both form factors it wants. The JSON-LD gained a matching `screenshot`.

The old `docs/screenshots/` pair could not be reused: they showed the retired `Calculator` and
`Crafts` nav labels. Rather than retake them by hand and have them go stale again,
[scripts/capture-screenshots.mjs](../../scripts/capture-screenshots.mjs) drives headless Chrome over
CDP against the dev server — it seeds a deterministic book of invented prices, then captures all
three shots at a fixed size. `npm run capture:screenshots`. The images now live in
`public/screenshots/` and serve both the README and the manifest, so there is one copy, not two.

### 4. JSON-LD says this is a game — **fixed 2026-09-13**

`"applicationCategory": "GameApplication"` ([index.html:52](../../index.html#L52)). It is a utility
for players of a game, not a game — `UtilitiesApplication` with `"applicationSubCategory": "Dofus"`
is the truer claim, and category is one of the few JSON-LD fields that affects how a result is shown.
**Fixed** Now `UtilitiesApplication` with `applicationSubCategory: "Dofus"`, plus `inLanguage`,
a five-item `featureList`, and `softwareVersion` — the last fed from `package.json` by a
`transformIndexHtml` hook in [vite.config.ts](../../vite.config.ts), so it cannot drift from the
version in the footer. `screenshot` is still absent; it wants improvement 3's real screenshots
rather than the social card.

### 5. `apple-mobile-web-app-title` — **fixed 2026-09-13**

Without it, an iOS home-screen bookmark uses the `<title>`, which is `Kamargin — Dofus craft margins`
and gets truncated to something like `Kamargin —…`. **Fixed** — one line pins it to `Kamargin`.

### 6. Absolute URLs hard-code the Pages host

`canonical`, `og:url` and `og:image` all start `https://aghazy94.github.io/kamargin/`. The README
already flags that a custom domain means editing `base` plus "the absolute URLs in index.html" — that
is three places plus the JSON-LD `url`, and nothing fails loudly if one is missed. Worth a comment
naming all four, or a small build-time substitution.

---

## What is already right

- `NavLink` sets `aria-current="page"` on the active tab — verified in the DOM.
- Every screen has exactly one `<h1>`, and `<main>` carries a matching `aria-label` (except the two
  bugs above).
- The item-level title is most-specific-first: `Bottle of Greedoburg | Kourial | Kamargin`.
- `lang="en"`, `color-scheme: dark light`, canonical, OG image with explicit dimensions and alt,
  `twitter:card`, a pre-paint theme script, SVG + PNG + touch icons, and a `preconnect` to the icon
  CDN are all present and correct.
- Prices and snapshot payloads stay out of URLs, so a shared link carries a view and never a price
  book.
- The server is carried in the URL and normalised by a redirect, so a link always opens on the server
  it was shared from.

---

## Suggested order

~~1. Bug 1 — the 404 title.~~ Done 2026-09-13.
~~2. Bug 2 — one name per screen.~~ Done 2026-09-13, as `Craft cost` and `What to craft`.
~~3. Issue C — the landing page.~~ Done 2026-09-13.

~~4. Improvements 2, 4, 5 — the metadata corrections.~~ Done 2026-09-13.

Remaining, in order:

~~5. Improvement 3 — the manifest.~~ Done 2026-09-13.

Remaining, in order:

~~6. Issue A — readable `server` and `item` params.~~ Done 2026-09-13.

Remaining, in order:

1. Issue B — counts in the Watchlist and Snapshots titles.
2. Improvement 6 — the hard-coded absolute URLs, now five with the JSON-LD `screenshot`.
3. Improvement 1 — only if search traffic is a goal worth a build step.
