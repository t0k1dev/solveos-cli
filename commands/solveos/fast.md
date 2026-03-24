---
description: Zero-overhead inline execution — no artifacts, no planning, just do it
---

# /solveos:fast — Fast Execution (Inline, No Artifacts)

Execute a trivial task immediately with zero process overhead. No Plan Brief, no state tracking, no sub-agents, no validation. Just do the thing.

```
Rigor Spectrum:
/solveos:fast  →  /solveos:quick  →  Full workflow (/solveos:new → plan → build → ship)
   ▶ No process    Light process       Full process
   No artifacts    Minimal artifacts    Full artifacts
   Inline          Plan + Build         All phases + gates
```

## When to Use This

- The task is trivial (< 5 minutes of work)
- The solution is obvious
- The cost of being wrong is near zero (easy to undo)
- Planning overhead exceeds the cost of the task itself

**Examples:** Rename a variable, fix a typo, add a comment, update a dependency version, adjust a config value, format a file, add an import.

**When NOT to use this:**
- If the task involves multiple steps → use `/solveos:quick`
- If you're unsure about the approach → use `/solveos:plan`
- If the change affects other systems or users → use the full workflow

## Execution

### 1. Understand the Request

Read the user's request. If it's clear and actionable, proceed immediately. If ambiguous, ask one clarifying question (no more).

### 2. Execute Immediately

Do the work in the current context:
- Make the change
- Verify it works (quick check, not a full validation)
- For software domain: create a single git commit with a descriptive message

### 3. Confirm Completion

Briefly report what was done:

```
Done. {One-sentence summary of what changed.}
```

No build summary, no success criteria checklist, no state transitions.

### 4. Optional Logging

If `.solveos/` exists in the project, append a one-line entry to `.solveos/notes/fast-log.md`:

```markdown
- {ISO timestamp} — {one-line description of what was done}
```

This creates a lightweight audit trail without the overhead of full state management.

If `.solveos/` does not exist, do not create it. Fast mode works with zero project setup.

## Constraints

- Do NOT create `.solveos/` directory if it doesn't exist
- Do NOT create or modify `BRIEF.md` or `STATE.md`
- Do NOT spawn sub-agents
- Do NOT ask more than one clarifying question
- Do NOT expand scope beyond the immediate request
- If the task turns out to be complex, stop and suggest: "This is more involved than a fast task. Consider running `/solveos:quick` or `/solveos:new` instead."

## Escalation Triggers

If any of these are true, suggest upgrading to a higher-rigor path:

| Trigger | Suggest |
|---------|---------|
| Task requires 3+ files to be changed | `/solveos:quick` |
| Task involves unclear requirements | `/solveos:plan` |
| Task could break existing functionality | `/solveos:quick` with build validation |
| Task requires research or investigation | `/solveos:new` with research gate |
| You find yourself planning in your head | `/solveos:quick` — make the plan explicit |
