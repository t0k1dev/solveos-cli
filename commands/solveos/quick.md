---
description: Lightweight workflow — minimal Plan Brief + immediate Build, skip all gates
---

# /solveos:quick — Quick Cycle (Plan + Build, No Gates)

A lightweight path for tasks where you know the problem, know the solution, and the cost of being slightly wrong is low. Combines planning and building into a single session with minimal overhead.

```
Rigor Spectrum:
/solveos:fast  →  /solveos:quick  →  Full workflow (/solveos:new → plan → build → ship)
   No process      ▶ Light process     Full process
   No artifacts    Minimal artifacts    Full artifacts
   Inline          Plan + Build         All phases + gates
```

## When to Use This

- You understand the problem well
- The solution is straightforward
- The cost of being slightly wrong is low (easy to fix later)
- You don't need research, plan validation, build validation, or review

**When NOT to use this:** If the task is complex, ambiguous, high-stakes, or involves unfamiliar territory — use the full workflow (`/solveos:new` → `/solveos:plan` → `/solveos:build` → `/solveos:ship`) instead.

## Step 1: Initialize (if needed)

1. If `.solveos/` does not exist, create the directory structure:
   - `.solveos/`, `.solveos/research/`, `.solveos/validations/`, `.solveos/reviews/`, `.solveos/history/`, `.solveos/notes/`
   - Write default `config.json`
2. If `.solveos/` already exists, read `.solveos/STATE.md`:
   - If a cycle is already in progress (not `INIT` or `CYCLE_COMPLETE`), warn the user: "A cycle is already in progress (state: {state}). Running `/solveos:quick` will start a new cycle. Continue?"
   - If `CYCLE_COMPLETE`, start a new cycle normally

## Step 2: Create Minimal Plan Brief

Create `.solveos/BRIEF.md` with only the essential fields. Ask the user (or infer from context):

```markdown
# Plan Brief (Quick)

## Problem

{What problem are we solving?}

## Goal

{What does success look like?}

## Success Criteria

- [ ] {Criterion 1}
- [ ] {Criterion 2}
...
```

**Omitted sections** (intentionally skipped for speed): Audience, Appetite, Constraints, Core Assumption, Rabbit Holes, Out of Scope.

If the user provides a natural language description of their task, extract Problem, Goal, and Success Criteria from it. Confirm with the user before proceeding.

## Step 3: Update State — Skip All Gates

Update `.solveos/STATE.md`:

1. Set `current_state: "BUILDING"`
2. Record all skipped gates in the transitions log:
   - `RESEARCH` (skipped)
   - `PLAN_VALIDATION` (skipped)
3. Update timestamp

The state transitions are: `INIT → PLANNING → BUILDING` (with RESEARCH and PLAN_VALIDATION recorded as skipped).

## Step 4: Execute Build

Follow the same build process as `/solveos:build`:

1. **Re-read the brief** — even the minimal version has Success Criteria to verify against
2. **Decompose into units** — adjust for granularity setting in config (default: standard)
3. **Execute units** using wave-based execution if multiple units, direct execution if single unit
4. **Verify each unit** against the success criteria
5. **For software domain:** create atomic git commits

## Step 5: Quick Exit

After build is complete:

1. Update `STATE.md`:
   - Record skipped gates: `BUILD_VALIDATION`, `REVIEW_PRE_SHIP`, `REVIEW_POST_SHIP`
   - Transition through: `BUILDING → READY_TO_SHIP → SHIPPED → CYCLE_COMPLETE`
2. Present a brief summary:

```
## Quick Cycle Complete

**Units completed:** {n}/{total}
**Success criteria met:** {n}/{total}
**Gates skipped:** Research, Plan Validation, Build Validation, Pre-Ship Review, Post-Ship Review

All done. Run `/solveos:status` to review, or `/solveos:new-cycle` to start a new cycle.
```

3. Archive the cycle to `.solveos/history/cycle-{n}/`

## AI Guidance

- Even in quick mode, verify against success criteria — that's the minimum quality bar
- If you discover the task is more complex than expected, suggest switching to full workflow: "This is getting complex. Consider running `/solveos:plan` for a full Plan Brief."
- Don't expand scope beyond the stated Goal and Success Criteria
- If the user didn't provide clear success criteria, ask for them — they're required even in quick mode
