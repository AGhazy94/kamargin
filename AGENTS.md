# AGENTS.md — dofus-market-calculator

Source of truth for agent behaviour in this repo. Read in full before your first reply.

## What this is

A **client-side, offline** market calculator for the video game Dofus. React + TypeScript + Vite +
Tailwind v4. No backend, no API calls at runtime — all game data is bundled or user-entered, all
computation happens in the browser. Persistence, when added, is `localStorage`/IndexedDB.

Keep it that way: don't introduce a server, a data-fetching layer, or a runtime network dependency
without being asked.

## Response style — concise mode (always on)

Read [.agents/skills/concise-mode/SKILL.md](.agents/skills/concise-mode/SKILL.md) in full before
your first reply. It is always on from turn 1 and never announced — ignore its Activation section
and its "trigger only when explicitly mentioned" frontmatter, both of which this repo overrides.
Binding until the user says `verbose mode` / `deactivate concise`.

## Searching — ripgrep, never `grep -r`

`grep -r` and `find -name` are hard-blocked by
[.claude/hooks/no-recursive-grep.py](.claude/hooks/no-recursive-grep.py).

- Text (strings, config keys, TODOs, non-code files) → `rg`.
- Code symbols (definition, references, implementations) → serena / LSP:
  `find_symbol`, `find_referencing_symbols`, `find_declaration`, `find_implementations`.
  Load them once per session with `ToolSearch select:mcp__serena__find_symbol,…` and wait.
- Files by name → `rg --files -g <glob>` or the Glob tool.

If serena is missing: `claude mcp add serena -- uvx --from git+https://github.com/oraios/serena serena start-mcp-server --project-from-cwd --context=claude-code`

## Editing files — Edit/Write by default

Never edit source through the Bash tool: no `sed -i`, no heredoc rewrites, no throwaway scripts.
No hook catches this — a mis-aimed shell edit exits `0` and renders no diff.

## Project structure — bulletproof-react

Layout follows [bulletproof-react](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md).

```
src/
├── app/          # application layer
│   ├── routes/   # route components
│   ├── app.tsx   # root component
│   └── provider.tsx  # global providers
├── assets/       # static files (images, fonts)
├── components/   # shared components
│   ├── errors/
│   ├── layouts/
│   └── ui/
├── config/       # global config (empty: offline app has no env to validate)
├── features/     # feature modules — see src/features/README.md
├── hooks/        # shared hooks
├── lib/          # preconfigured third-party libraries
├── stores/       # global state
├── testing/      # test utils and mocks
├── types/        # shared types
└── utils/        # shared utilities
```

No `app/router.tsx` and no `features/*/api/`: this is a single-screen offline app with no router
and no runtime fetching. Add them if that changes.

### Unidirectional imports (enforced)

`shared → features → app`. Dependencies only ever point one way:

- `src/app/` may import from `features/` and shared folders.
- `src/features/` may import from shared folders, **never** from `app/` or another feature.
- Shared folders (`components`, `config`, `hooks`, `lib`, `stores`, `types`, `utils`) may import
  only from each other — never from `features/` or `app/`.

`noRestrictedImports`, scoped by per-layer `overrides` in [biome.json](biome.json), enforces the
first two directions.

Biome matches the **import string**, not a resolved path, so the rules only see `@/…` specifiers.
That is why `../../**` is blocked from those layers too — a relative climb would otherwise slip past
the layer check. Always cross a layer boundary with `@/`.

**Cross-feature imports are not yet enforced** — that needs a pattern per feature. When you add
`src/features/pricing`, add to the `src/features/**` override's patterns:

```json
{ "group": ["@/features/*/**", "!@/features/pricing/**"] }
```

Compose features in `src/app/`, don't wire them to each other.

## Conventions

- **Imports**: use the `@/` alias for anything under `src/`; relative paths only within a folder.
  No barrel `index.ts` files — import by full path; barrels hurt Vite tree-shaking and HMR.
- **Styling**: Tailwind utility classes. No CSS modules, no styled-components. Tailwind v4 is
  configured in CSS (`src/index.css`) — there is no `tailwind.config.js`.
- **Comments**: only when the code can't speak for itself, one line, the _why_ not the _what_.
- **Formatting**: `npm run check`. Biome formats, sorts imports and sorts Tailwind classes; don't
  hand-order. Class sorting is Biome's `useSortedClasses`, still a nursery rule with an *unsafe*
  fix — `npm run check` passes `--unsafe` so it actually applies.
- **Vendored content**: `.agents/skills/` is upstream-verbatim and excluded in `biome.json`.
  Re-sync it, never edit it in place.

## Tooling

**Biome is the only linter and formatter** — it replaced ESLint + Prettier and their nine plugins.
There is no `eslint.config.js` and no `.prettierrc`; don't add one.

## Commands

|                     |                                        |
| ------------------- | -------------------------------------- |
| `npm run dev`       | Vite dev server on :5173               |
| `npm run build`     | typecheck + production build           |
| `npm run typecheck` | types only                             |
| `npm run lint`      | Biome lint (incl. import boundaries)   |
| `npm run format`    | Biome format, write                    |
| `npm run check`     | format + lint + import sort, write     |
| `npm run ci`        | verify everything, no writes (for CI)  |
