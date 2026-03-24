---
description: Start a new cycle informed by the previous post-ship review — carries feed-forward items
---

# /solveos:new-cycle — Start a New Cycle with Feed-Forward

You are starting a **new cycle** of an existing solveOS project. Unlike `/solveos:new` (which starts from scratch), this command carries forward learnings from the previous cycle's post-ship review.

This is the second feedback loop in action: **Ship -> Review -> Plan -> Build -> Ship**.

## Prerequisites

1. Check that `.solveos/` exists. If not: "No solveOS project found. Run `/solveos:new` first."
2. Read `.solveos/STATE.md`:
   - Valid entry states: `CYCLE_COMPLETE` (post-ship review done) or `SHIPPED` (review skipped)
   - If state is `INIT` through `READY_TO_SHIP`: "The current cycle isn't finished yet. Run `/solveos:ship` first, or `/solveos:new` to start fresh."
3. Read `.solveos/config.json` for current configuration.

## Step 1: Load Previous Review

Read the most recent post-ship review from `.solveos/reviews/cycle-{n}-review.md` where `{n}` is the current cycle number from `STATE.md`.

### If review exists — extract feed-forward items:

Parse the **Feed-Forward for Next Cycle** section:

- **New problems revealed** — problems that became visible after shipping
- **Deferred scope** — items cut from the last cycle that may still matter
- **Wrong assumptions** — assumptions that reality corrected
- **Open questions** — unknowns that might benefit from research

Present the feed-forward summary to the user:

> "Here's what the post-ship review surfaced for this next cycle:
>
> **New problems:**
> - {problem 1}
> - {problem 2}
>
> **Deferred scope:**
> - {item 1}
>
> **Wrong assumptions:**
> - {assumption} → {reality}
>
> **Open questions:**
> - {question 1}"

### If no review exists (review was skipped):

> "No post-ship review found for cycle {n}. Starting a new cycle without feed-forward context. You can still run `/solveos:review` on the shipped cycle if you'd like."

## Step 2: Loop Termination Check

Before starting a new cycle, check the three stop conditions:

### Condition 1: Problem is solved

If the post-ship review shows all success criteria were fully met:

> "The post-ship review shows all success criteria were met. The original problem may be solved.
>
> Is there still a problem to solve, or is this project done?"

Wait for user response. If done, stop here.

### Condition 2: Problem is no longer worth solving

> "Has the context changed since you started? Is this problem still worth solving?"

If the user indicates the context has changed, stop here.

### Condition 3: Building from habit, not signal

If the feed-forward section is empty or contains no actionable items:

> "The post-ship review didn't surface any new problems, deferred scope, or wrong assumptions. Starting another cycle without a clear reason leads to waste.
>
> Do you have a specific problem for the next cycle, or should we stop here?"

Wait for user response. If no clear problem, stop here.

If none of the stop conditions apply, proceed.

## Step 3: Archive Current Cycle

Before resetting state, archive the current cycle's artifacts:

1. Create `.solveos/history/cycle-{n}/` where `{n}` is the current cycle number
2. Move (not copy) into the archive:
   - `.solveos/BRIEF.md` → `.solveos/history/cycle-{n}/BRIEF.md`
   - `.solveos/STATE.md` → `.solveos/history/cycle-{n}/STATE.md`
   - `.solveos/validations/` → `.solveos/history/cycle-{n}/validations/`
3. Do **NOT** archive `.solveos/reviews/` — reviews persist across cycles as the memory layer
4. Do **NOT** archive `.solveos/research/` — research may still be relevant
5. Do **NOT** archive `.solveos/config.json` — configuration carries forward

## Step 4: Reset State for New Cycle

Write a new `.solveos/STATE.md`:

```json
{
  "current_state": "INIT",
  "cycle_number": {n + 1},
  "gates_skipped": [],
  "gates_completed": [],
  "plan_validation_passes": 0,
  "blockers": [],
  "created_at": "{now}",
  "updated_at": "{now}"
}
```

## Step 5: Save Feed-Forward Context

If feed-forward items were extracted from the post-ship review, write them to `.solveos/notes/cycle-{n}-feed-forward.md` so they're available when `/solveos:plan` runs:

```markdown
## Feed-Forward from Cycle {n}

These items were surfaced during the Cycle {n} post-ship review and should inform Cycle {n+1} planning.

### New Problems
- {problem}

### Deferred Scope
- {item}

### Wrong Assumptions
- {assumption} → {reality}

### Open Questions
- {question}
```

## Step 6: Suggest Next Step

Based on the feed-forward items and configuration:

### If there are open questions and research gate is enabled:

> "Cycle {n+1} initialized. The previous review raised open questions — I recommend starting with research.
>
> Run `/solveos:research` to investigate, or `/solveos:plan` to start planning directly."

### If there are clear new problems and no open questions:

> "Cycle {n+1} initialized with feed-forward from Cycle {n}. The next problem is clear.
>
> Run `/solveos:plan` to create the Plan Brief. The feed-forward items from the previous review will be available as context."

### If starting without feed-forward:

> "Cycle {n+1} initialized. No feed-forward from the previous cycle.
>
> Run `/solveos:plan` to start planning, or `/solveos:research` to investigate first."

## Important Rules

- **Always check stop conditions** — don't automatically start cycles. Each cycle should have a clear reason to exist.
- **Feed-forward items inform planning, they don't dictate it** — the user may choose to ignore some feed-forward items or prioritize differently.
- **Reviews persist** — the `.solveos/reviews/` directory is never archived. It's the project's memory across cycles.
- **Research persists** — previous research may still be relevant. Don't archive it.
- **The human decides** — present feed-forward context and let the user decide what matters for the next cycle.
