# `docs/`

Domain knowledge, feature specs and reviews. Not agent instructions — those live in
[AGENTS.md](../AGENTS.md).

- [research.md](research.md) — Dofus marketplace mechanics, price semantics, and the free APIs this
  project draws game data from. Verified against a game version; re-check before relying on it.
- [features/](features/) — one spec per feature: the decisions taken, and what each deliberately
  leaves out. Each carries a **Status** line; trust that line over the prose around it.
- [qa/](qa/) — reviews of what shipped, each a dated snapshot of one pass over the running app.

## The version chain

Specs are versioned rather than rewritten: v1 → [v2](features/craft-profit-calculator-v2.md) →
[v3](features/craft-recommendations-v3.md) → [v4](features/screenshot-import-v4.md) →
[v5](features/craft-recommendations-v5.md) → [v6](features/price-volatility-v6.md) →
[v7](features/screenshot-watch-v7.md). Each opens by
saying what the previous one left unanswered, so a superseded spec is still the record of why its
decisions were made — [v1](features/craft-profit-calculator.md) is superseded *in part*, and both
`research.md` and v2 link to it. Supersede a spec by updating its Status line, not by deleting it.

## Specs and reviews are different documents

A spec is written before the work and says what to build. A review is written after and says what
the build actually does — so it is dated, it goes stale, and it never gets edited to stay true. Keep
them apart: `features/` before, `qa/` after.
