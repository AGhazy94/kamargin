# Research — Dofus market & craft economics

Background for the craft profit calculator. Everything here was verified against a live source in
September 2026; the game facts hold for **Dofus 3.6.11.15** (the version `api.dofusdu.de` served at
the time of writing). Dofus changes often — re-verify anything load-bearing before relying on it.

Feature scope lives in [features/craft-profit-calculator.md](features/craft-profit-calculator.md).

## Marketplace mechanics

| Rule | Value |
| ---- | ----- |
| Sale fee | 2% of the pack's **total** price |
| When charged | Upfront, at listing |
| Refunded? | **Never** — sold or not |
| Markdown fee | 1% of the new total price |
| Markup fee | 2% of the price **increase** |
| Pack sizes | 1, 10, 100, 1000 |
| Selling slots | 2 × character level (Omega counts), per market type, shared across the account |
| Listing duration | 672 h (28 days), then returned to the bank |
| Market scope | Global per type — Bonta/Brakmar/Sufokia share one book |

Two consequences the maths has to respect:

- The fee is a **sunk cost per listing attempt**, not a deduction at sale. A craft that gets relisted
  three times has paid the fee four times and sold once.
- Listed prices are **per pack, not per unit**. Every price entering the model must be normalised.

Crafting itself: every recipe yields exactly **one** item (DofusDB's recipe schema has
`ingredientIds` and `quantities` but no result-quantity field), and recipes nest — Hogmeiser's Boots
(lvl 75) consumes one Hogmeiser's Worn Boots, itself craftable.

## Prices: ask vs realised

The in-game Market price panel (24 h / 7 d / 30 d) reports **median price**, **average price**,
**items sold**, and a last-purchase timestamp, per server. The item tooltip's "Average price" is a
separate, older mechanic: computed from actual purchases in markets and merchant mode, refreshed
roughly every 24 h per server.

A real observation, Mellifluous Bearbarian Tail, 24 h window:

| Source | Per unit |
| ------ | -------- |
| Cheapest ask (pack of 1) | 459 |
| Pack of 100 (50,000) | 500 |
| Pack of 1000 (500,000) | 500 |
| **Median realised** | **389** |
| Average realised | 396 |
| Items sold / 24 h | 164 |

Three things fall out of this:

- The cheapest ask sat **~18% above** what buyers actually paid. Buying an ingredient costs you the
  ask; selling a craft realises closer to the median. **They are different numbers and the model must
  keep them separate** — a single "market price" field overstates profit on both sides at once.
- Bulk was *more* expensive per unit than singles, and both bulk rows landed on a suspiciously round
  500/u. Never assume packs are cheaper; treat round-number bulk listings as likely filler.
- Median beats average as a default reference — it resists exactly those filler listings.

## What the community says calculators miss

Saturation, not margin. The recurring complaint is selling a batch down to cost: *"I crafted 50–60
Masto amulets and by the end I was selling them at craft cost because the price dropped"*
([r/Dofus](https://www.reddit.com/r/Dofus/comments/i3y78e/what_lvl_crafting_do_you_make_good_profit_and_do/)).
One tester logged the same resource swinging −12% to +31% over two weeks depending on processing and
timing, and named the failure mode as stockpiling with no exit window
([Dofus Unity economy guide](https://dafous.app/en/guides/economie-mmorpg.html)).

The `items sold / 24 h` figure is the liquidity signal that answers this, and it is the number
existing tools ignore. Community rule of thumb: **under ~10% net margin, the unsold risk dominates**.

## Data sources

### dofusdude — `https://api.dofusdu.de/dofus3/v1/`

Free, open source, no auth, no API key, multilingual (en/fr/es/de/pt). Served 3.6.11.15 when probed.

| Endpoint | Use |
| -------- | --- |
| `{lang}/items/search?query=` | Autocomplete across all item types |
| `{lang}/items/{equipment\|resources\|consumables}/{id}` | Level, pods, icon URLs, full recipe with quantities |
| `{lang}/items/{type}/all` | Bulk dump — equipment ≈ 8.5 MB, resources ≈ 1.8 MB |
| `meta/version` | Game version the data reflects |

The `/all` dumps are what keep this app offline: fetch at build time, bundle the trimmed result, do
zero runtime fetching. Missing from this API: profession/job, craft XP, whether an item is sellable.

### DofusDB — `https://api.dofusdb.fr/`

Fills the gaps. `GET /recipes?resultId={id}` returns `jobId` / `skillId`, and the embedded `result`
object carries `craftXpRatio`, `recyclingNuggets` (crushing value), `price` (NPC price) and
`exchangeable`. **`exchangeable` matters**: items that cannot be listed at all should never show a
profit figure.

`GET /servers` returns 27 servers with a `gameTypeId` separating them:

| `gameTypeId` | Servers |
| ------------ | ------- |
| 0 — classic | Draconiros, Imagiro, Orukam, Tylezia, Hell Mina, Tal Kasha, Rafal, Brial, Salar, Dakal, Mikhal, Kourial, Shukrute |
| 2 | Kideebom, Tynril |
| 3 — Temporis / Speed Rush | Tournaments, Speed Rush 1–10 |
| 4 | Shadow |

### Market prices

**No free market-price API exists.** Prices are per-server and Ankama exposes nothing. Manual entry
is the correct design, not a fallback. (`dofus-value` advertises a public API but is unofficial and
would break the offline constraint.)

## Market price sources — re-verified 2026-09-12

Re-probed before specifying [features/craft-recommendations-v3.md](features/craft-recommendations-v3.md),
this time including paid and private options. **Nothing is for sale, at any price.**

### Ankama — no official route

| Probe | Result |
| ----- | ------ |
| `developers.ankama.com`, `api.dofus.com` | do not resolve |
| `api.ankama.com` | corporate site; `/docs` 404 |
| `haapi.ankama.com` | the real Ankama API — auth and launcher services only, partner-keyed, no market or item endpoints |

No developer programme, no partner tier, no published pricing. Players asked for a public API on the
official forum (*Création d'une API publique*, Dec 2024) and nothing followed. The CGU separately
forbid unauthorised automated access to game data, which is what rules out reading the client.

### Third parties — dead or local-only

| Source | State |
| ------ | ----- |
| `vulbis.com` | **gone** — 302s to a parked spam domain |
| `kamascope.fr` | **abandoned** — TLS certificate expired 2026-08-24, page is an empty SPA shell |
| `chacha-hub.com` | alive, free, **no API** — OCR of pasted HDV screenshots via Tesseract.js, localStorage only |
| `geneka.net` | alive, free, **no API** — user-entered prices shared between its own tools, Ko-fi donations |
| `dofocus.fr` | alive, runes only, user-entered, no API |
| `brifus.fr` | HTTP 520 |
| `Lopinsley/dofus-value` | README-stage repo, no working collector |
| `api.dofusdu.de`, `api.dofusdb.fr` | items and recipes, **zero price data** |

The pattern is uniform: every working tool obtains prices from the player's own client — manual
entry or in-browser OCR — because there is nothing to query.

### What that leaves

- **Manual entry / in-browser OCR** — legitimate, free, offline. OCR reads the HDV panel a player
  screenshots; it accelerates entry, it does not provide coverage.
- **Packet or memory reading of the client** — the only route to the full market. Breaks the CGU and
  risks a ban. Out of scope, permanently.
- **A crowd-sourced backend** — real coverage, but needs both a server and users, and it would end
  the offline architecture.

`api.dofusdb.fr/` now serves an **LPNC-IA 1.0** licence at its root: non-commercial use, with an
explicit clause covering AI-generated derivatives. It post-dates
[scripts/generate-game-data.mjs](../scripts/generate-game-data.mjs) and should be read before the
next regeneration.

## Sources

- [Dofus Wiki — Market](https://dofuswiki.fandom.com/wiki/Market)
- [Average Price Display devblog](https://www.dofus.com/en/mmorpg/news/devblog/tickets/314118-average-price-display)
- [r/Dofus — crafting profit](https://www.reddit.com/r/Dofus/comments/i3y78e/what_lvl_crafting_do_you_make_good_profit_and_do/)
- [MMORPG economy on Dofus Unity](https://dafous.app/en/guides/economie-mmorpg.html)
- [doduapi](https://github.com/dofusdude/doduapi) · [docs](https://docs.dofusdu.de/dofus3/v1/)
- [DofusDB API](https://api.dofusdb.fr/)
