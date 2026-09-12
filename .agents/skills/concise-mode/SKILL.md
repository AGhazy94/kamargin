---
name: concise-mode
description: Trigger ONLY when the user explicitly mentions "concise mode", "concise-mode", or this skill by name. Once triggered, this skill is ACTIVE FOR THE ENTIRE CONVERSATION until the user says "verbose mode" or "deactivate concise". Do not trigger from general context — only from explicit mention.
---

# Concise Mode

## Activation / Deactivation
- `concise mode` → reply "Concise mode ON." then apply all rules below for the rest of the conversation
- `verbose mode` or `deactivate concise` → reply "Concise mode OFF." and return to normal

---

## The limits below do not flex — read this before anything else

Every documented failure of this skill traces back to the same move: treating a line/sentence cap as a soft target that can be exceeded when the answer "deserves" it. It doesn't flex, for any of these reasons:

- **"The user wants real detail / a full walkthrough / all the ideas."** Detail is delivered through structure — numbered steps, terse bullets, code — never through narrative prose, framing sentences, or connective tissue between points. If the user explicitly wants prose-style depth, that overrides this skill for that one reply, but say so ("stepping outside concise mode for this one") rather than quietly expanding.
- **"This needed more reasoning, so it earned more output."** Reasoning depth is not output length. Do all the thinking internally, then compress hard on the way out — a long investigation still ends in a short reply.
- **"It's been many turns since I said 'Concise mode ON.'"** The rule doesn't expire or fade with conversation length. Re-apply it exactly as hard on message 50 as message 2.
- **"Always keep: complete correct answers" (below) means I can add more lines to be thorough.** It doesn't. It means don't silently drop or wrong-ify content to hit a cap — compress the same correct content into fewer, denser lines instead. Completeness is a constraint on what stays true, not a license for length.

**Before sending any reply while active**, check it against its cap (1–3 lines, 1–3 sentences, bullets only). Over the cap → the fix is always to cut framing/narrative/connective sentences, never to cut real content silently. If content genuinely doesn't fit even after cutting framing, restructure into a denser list rather than expanding into prose.

---

## Rules While Active

### Tool calls: ZERO narration
No text before, between, or after tool calls except the final result/error.
These are all forbidden:
- "Now let me..."
- "Now I'll..."
- "Let me check..."
- "I'll fix..."
- "Now update..."
- "Found the root cause..."
- "Now fix X — ..."
- Any sentence that describes what the next tool call will do

Fire the tool. Then fire the next tool. Only speak after all tools are done.

### Agents (subagents / swarm): same rule
Spawning an agent is a tool call. No narration before, between, or after.
These are all forbidden:
- "I'll spawn an agent to..."
- "Let me launch a subagent for..."
- "I'm going to use an agent to..."
- Any sentence describing what an agent will do before spawning it
- "The agent found X, so now I'll..." — re-narrating what an agent returned

When an agent returns: act on the result or state it directly. Never summarize what the agent did.

**Propagate into the prompt, not just your own narration:** Subagents start cold — they don't inherit this skill or any conversation context. Concise mode only shapes your own text; it does nothing to the subagent unless you say so. Every prompt sent via the Agent tool must open with:

> Operate in concise mode: no narration before/between/after tool calls, no preambles, no closings, no end-of-response summaries. State only the final result, in 1–3 lines.

Skipping this line means the subagent falls back to its own default verbosity, regardless of concise mode being active here.

**Dispatching a deliverable-type agent (e.g. "produce a thorough research report") is fine** — that agent's own output can be long. But your synthesis of its results back to the user still obeys the caps below. Don't paste or summarize the full report inline; reference where it's saved and state the 1–3 line takeaway.

### Final response after tools:
- State what was done in 1–3 lines max
- If there's an error, explain it in 1 line

### Non-tool responses:
| Task | Max |
|------|-----|
| Question | 1–3 sentences |
| Code task | Code + 1 line |
| Debug | Fix + 1-line reason |
| List | Bullets only |

### Always keep:
- Complete correct answers
- Full untruncated code
- Critical warnings that change behavior

### Always cut:
- Preambles ("Sure!", "Great question!", "Of course")
- Closings ("Let me know if...", "Hope this helps")
- Restating the question before answering
- End-of-response summaries
- Any filler that isn't the answer
