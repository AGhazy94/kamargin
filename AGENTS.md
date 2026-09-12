# AGENTS.md — dofus-market-calculator

Source of truth for agent behaviour in this repo. Read in full before your first reply.

## What this is

A **client-side, offline** market calculator for the video game Dofus. React + TypeScript + Vite +
Tailwind v4. No backend, no API calls at runtime — all game data is bundled or user-entered, all
computation happens in the browser. Persistence, when added, is `localStorage`/IndexedDB.

Keep it that way: don't introduce a server, a data-fetching layer, or a runtime network dependency
without being asked.

Domain research and feature specs live in [docs/](docs/) — read what's relevant there before
changing domain logic. Game mechanics are verified against a version; don't infer them from code.

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
│   └── ui/       # shadcn/ui components
├── config/       # global config — an offline app has no env to validate
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

All three directions are enforced by `noRestrictedImports`, scoped by per-layer `overrides` in
[biome.jsonc](biome.jsonc). **No config change is needed when you add a feature.**

Biome matches the **import string**, not a resolved path, which shapes two of the rules:

- **`@/features/**` is banned inside `src/features/`** — with no exception for your own feature.
  Another feature is off limits; your own feature is reached by a *relative* path (`../utils/format`).
  That single rule enforces cross-feature isolation generically, so unlike upstream bulletproof-react
  — which hand-lists a zone per feature — there is nothing to maintain per feature.
- **`../../**` is banned** from every layered folder. A relative climb would otherwise escape the
  layer check, since the rules only see `@/…` specifiers. Cross a layer boundary with `@/`.

Compose features in `src/app/`, don't wire them to each other.

## Conventions

- **Imports**: use the `@/` alias to cross a layer boundary; use relative paths *within* a feature.
  No barrel `index.ts` files — import by full path; barrels hurt Vite tree-shaking and HMR.
- **TypeScript**: one [tsconfig.json](tsconfig.json) covers `src/` and `vite.config.ts`. There are no
  project references and no `tsconfig.app.json`/`tsconfig.node.json` — the Vite template's three-file
  split exists to give the config file Node types, which this project doesn't need.
- **Styling**: Tailwind utility classes. No CSS modules, no styled-components. Tailwind v4 is
  configured in CSS (`src/index.css`) — there is no `tailwind.config.js`.
- **Use theme tokens, never raw colours.** `bg-background`, `text-muted-foreground`, `text-gain` —
  not `bg-neutral-950`. A raw colour is invisible to the theme and breaks in the other mode.
- **Comments**: see [Comments — one line, the why](#comments--one-line-the-why). Non-negotiable.
- **Formatting**: `npm run check`. Biome formats, sorts imports and sorts Tailwind classes; don't
  hand-order. Class sorting is Biome's `useSortedClasses`, still a nursery rule with an *unsafe*
  fix — `npm run check` passes `--unsafe` so it actually applies.
- **Vendored content**: `.agents/skills/` is upstream-verbatim and excluded in `biome.jsonc`.
  Re-sync it, never edit it in place.

## Comments — one line, the why

Default to **no comment**. Code that needs prose usually needs renaming instead.

When one genuinely earns its place — a non-obvious constraint, a rule that looks wrong until you
know why — write **one line stating the _why_**. Never the _what_.

Hard limits:

- **One line.** If it takes two, cut it until it fits, or move the reasoning to [docs/](docs/) and
  reference it. A wrapped sentence is two lines.
- **No restating the code.** `// Local copy: cannot drift from the installed version.` — not
  `// Points $schema at the copy of the schema inside node_modules.`
- **No section banners**, no `/* --- Setup --- */`, no decorative dividers.
- **No changelog comments.** Not `// Replaced ESLint here` — git records that.
- **No TODO without an owner or issue.** A bare `// TODO: fix` is noise.

This applies to config files (`biome.jsonc`, `vite.config.ts`) exactly as it does to `src/`.

## UI — shadcn/ui and the theme

Components live in `src/components/ui/`, on **Base UI** (`base-nova` style, Lucide icons) — the
shadcn default since July 2026. Not Radix: don't reintroduce `radix-ui`. Add components with
`npx shadcn@latest add <name>`, then `npm run check` — generated files carry shadcn's formatting
and Biome reformats them to this repo's.

Those files are **yours to edit**, not vendored. They are linted and formatted like any other source.

`cn` is imported from the `cn` package directly (`import { cn } from 'cn'`) — it bundles clsx and
tailwind-merge. `@/lib/utils` re-exports it.

After swapping a UI dependency, Vite's pre-bundle cache goes stale and the page serves
`504 (Outdated Optimize Dep)`. Restart the dev server; `rm -rf node_modules/.vite` if it persists.

### Theme

Tokens live in [src/index.css](src/index.css). Dark is the default — `<html class="dark">` in
[index.html](index.html).

Beyond the shadcn set, four market tokens: `--kama` / `--kama-foreground` for currency, and
`--gain` / `--loss` for trade outcomes (use these, never bare green/red).

`--accent` is **not** a brand colour — shadcn uses it for hover, focus and selected surfaces
(ghost buttons, highlighted menu items, hovered rows). Keep it a subtle lift off `--background`.
Brand colour goes in `--primary`; a distinct hue goes in `--chart-*` or a new named token.

Change a colour in **one place**: the `:root` and `.dark` blocks. Every token is `oklch`, so keep
new ones in `oklch` too — mixing colour spaces makes lightness ramps inconsistent. Any new token
needs a `--color-*` mapping in the `@theme inline` block before a utility class can see it.

## Tooling

**Biome is the only linter and formatter.** There is no `eslint.config.js` and no `.prettierrc`;
don't add one.

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
