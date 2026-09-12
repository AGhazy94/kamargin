# `src/features/`

One folder per feature. Only create the subfolders a feature actually needs:

```
src/features/<feature-name>/
├── assets/      # feature-scoped static files
├── components/  # components used only by this feature
├── hooks/
├── stores/      # feature-scoped state
├── types/       # TypeScript types for this feature's domain
└── utils/       # feature-scoped helpers
```

Rules (see [AGENTS.md](../../AGENTS.md)):

- No `api/` subfolder here — this app is offline and does no runtime fetching.
- A feature must not import from another feature. Compose them in `src/app/` instead.
- Import a feature's parts by their full path (`@/features/pricing/components/price-table`),
  not through a barrel `index.ts` — barrels hurt Vite's tree-shaking and HMR.
