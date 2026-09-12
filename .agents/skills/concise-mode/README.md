# concise-mode

Reduces token usage ~75% by stripping verbal filler from Claude's responses — without changing how Claude reasons, uses tools, or handles code.

## Why

Every Claude Code session burns tokens on text that adds no value:

- *"Now let me check that file..."* — before a Read tool call
- *"I'll go ahead and fix that now..."* — before an Edit tool call
- *"I'll spawn an agent to explore this..."* — before launching a subagent
- *"The agent found X, so now I'll..."* — re-narrating what a subagent returned
- *"Sure! Great question! Let me help you with that."* — before every answer
- *"Let me know if you need anything else!"* — after every answer

None of that affects correctness. It's just output tokens you're paying for and reading through. Over a long session, this adds up fast.

## What it does (and doesn't)

**Cuts:**
- Narration before/between/after tool calls
- Narration before/after spawning subagents — and re-narrating what they returned
- Preambles and closing pleasantries
- Restating the question before answering
- End-of-response summaries

**Never touches:**
- Claude's reasoning or thinking process
- How tools are called or in what order
- Code completeness — no truncation ever
- Critical warnings that change behavior

The answers stay the same. You just get the answer, not the wrapper around it.

## Subagents

Subagents spawned via the Agent tool start cold — they don't inherit this skill or any conversation context. Concise mode only shapes the orchestrator's own narration by default, not what a subagent does inside its own run. To close that gap, this skill has the orchestrator inject a concise-mode directive into every subagent prompt it sends, so spawned agents drop their own narration too instead of falling back to default verbosity.

## Usage

```
concise mode        → activates for the entire conversation
verbose mode        → deactivates
deactivate concise  → deactivates
```

## Install

```bash
claude skill install concise-mode.skill
```

## Source

See [SKILL.md](SKILL.md) for the full skill definition.
