# Session defaults (dofus-market-calculator)

Injected every session. [AGENTS.md](../../AGENTS.md) is the source of truth and is **not**
auto-loaded — read it before your first reply. Nothing from it is repeated here.

Always on, non-negotiable, read them in full:

- Response style — **open [.agents/skills/concise-mode/SKILL.md](../../.agents/skills/concise-mode/SKILL.md)
  and read it in full before your first reply** (or run `/concise-mode`). Always on from turn 1,
  never announced: ignore its Activation section and its "trigger only when explicitly mentioned"
  frontmatter, both of which this repo overrides. Everything else in it is binding until the user
  says `verbose mode` / `deactivate concise`.
- Searching — ripgrep, never `grep -r`. `grep -r` and `find -name` are hard-blocked by a
  `PreToolUse` hook.
- Editing — Edit/Write by default. Never edit source through the Bash tool: no `sed -i`, no heredoc
  rewrites, no throwaway scripts. Unlike the two above, no hook catches this — a mis-aimed shell
  edit exits `0` and renders no diff.

Claude Code specifics: symbol _navigation_ goes through the **serena MCP (LSP) server** —
`find_symbol`, `find_referencing_symbols`, `find_declaration`, `find_implementations`, `list_dir`.
**Before the first symbol lookup of a session, call `ToolSearch select:mcp__serena__find_symbol,…`
and wait for it** — it blocks until a connecting server is up; search only after it returns.
Finding serena in the session-start "still connecting" list is why you make that call, not grounds
to answer with `rg`. If it is genuinely unavailable, finish with `rg` + Read and say once that any
"nothing else references this" from you is unverified.
