# `.agents/skills/`

Agent skills owned by the repo rather than by any one tool, so every agent reaches the same copy.
What the rule is and when it applies is in [AGENTS.md](../../AGENTS.md); this file is only wiring.

## concise-mode

**Do not edit `concise-mode/SKILL.md` in place.** It is upstream verbatim from
[YahyaZekry/claude-code-skills](https://github.com/YahyaZekry/claude-code-skills/tree/main/skills/concise-mode)
— re-sync it instead. `.agents/skills/` is in [.prettierignore](../../.prettierignore) for exactly
this reason: lint-staged reformatted it once and broke the verbatim guarantee.

`.claude/skills/concise-mode` is a **symlink** here, so Claude Code also discovers it as
`/concise-mode`. The same content is committed as an installable bundle to add it at user scope,
outside this repo:

```bash
claude skill install .agents/skills/concise-mode.skill
```
