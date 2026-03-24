---
description: Validate the Plan Brief before building — catches ambiguity early
---

# /solveos:validate-plan — Plan Validation Gate

You are running the **Plan Validation gate** of the solveOS cycle. This gate catches plan ambiguity before it becomes expensive build errors. Ambiguity in the brief becomes guesswork during build.

## Prerequisites

1. Check that `.solveos/` exists. If not: "No solveOS project found. Run `/solveos:new` first."
2. Read `.solveos/STATE.md`:
   - Valid entry states: `PLANNING` (plan complete, ready to validate) or `VALIDATING_PLAN` (re-entering after refinement)
   - If state is `INIT`: "No plan to validate. Run `/solveos:plan` first."
3. Read `.solveos/BRIEF.md` — this is what you're validating.
   - If no brief exists: "No Plan Brief found. Run `/solveos:plan` first."
4. Read `.solveos/config.json` for `plan_validation_max_passes` (default 3).
5. Read any existing validation logs from `.solveos/validations/plan-validation-*.md` for context on previous passes.

## Step 1: Check Pass Count

Read `plan_validation_passes` from `STATE.md`.

- If passes >= `plan_validation_max_passes`:
  > "You've reached the maximum validation passes ({max}). The brief may need fundamental rethinking rather than incremental refinement.
  >
  > Options:
  > 1. Run `/solveos:research` to investigate the problem space more deeply
  > 2. Run `/solveos:build` to proceed with the current brief (accepting known gaps)
  > 3. Start over with `/solveos:plan` from scratch"
  
  Wait for the user's decision. Do not force another validation pass.

## Step 2: Validate Against the 3 Core Questions

Invoke the **solveos-plan-validator** agent behavior. Evaluate the Plan Brief against these three questions:

### Question 1: Is the problem correctly stated?
- Is this the actual problem, or a symptom of a deeper issue?
- Is the audience named specifically (not "users" or "everyone")?
- Could someone outside the project understand what's wrong?
- Is the problem free of embedded solutions?

### Question 2: Is the plan feasible?
- Can the goal be achieved within the stated constraints and appetite?
- Do the constraints conflict with each other?
- Is the appetite realistic for the stated goal?
- Are there hidden dependencies not listed in constraints?

### Question 3: Is it specific enough to build from?
- Could someone who didn't write the brief execute it and produce the same result?
- Would two people interpret the success criteria the same way?
- Are there ambiguous terms that need definition?
- Is every success criterion testable?

### Additional Checks
- **Are success criteria measurable and falsifiable?** (Can you construct a test for each one?)
- **What would you cut if scope had to be reduced by 50%?** (Forces prioritization)
- **What is the single biggest unacknowledged risk?** (Surfaces hidden assumptions)

## Step 3: Write Validation Log

Write the results to `.solveos/validations/plan-validation-{n}.md` where `{n}` is the current pass number (1, 2, 3...).

Use the Plan Validation Log template format with all sections filled in.

## Step 4: Decide and Transition

Based on the validation results:

### If gaps were found (needs refinement):
1. Present the specific gaps to the user:
   > "I found {n} gaps in the Plan Brief:
   > 1. {gap description} — suggested fix: {suggestion}
   > 2. {gap description} — suggested fix: {suggestion}
   >
   > Run `/solveos:plan` to refine the brief, then `/solveos:validate-plan` again."

2. Update `STATE.md`:
   - Transition back to `PLANNING` (for refinement)
   - Increment `plan_validation_passes`
   - Update `updated_at`

### If validated (ready to build):
1. Confirm:
   > "Plan Brief validated — no critical gaps remain. The brief is specific enough to build from.
   >
   > Run `/solveos:build` to start executing."

2. Update `STATE.md`:
   - Mark `PLAN_VALIDATION` as a completed gate
   - Transition state toward `BUILDING`
   - Update `updated_at`

### If needs escalation (fundamental issues):
1. Explain:
   > "The Plan Brief has fundamental issues that incremental refinement won't fix:
   > - {issue description}
   >
   > I recommend:
   > 1. `/solveos:research` — investigate the problem space more deeply
   > 2. `/solveos:plan` — start a fresh brief from scratch"

2. Update `STATE.md` with escalation note in blockers.

## Refining Loop Summary

```
Pass 1: Catches obvious gaps (vague goals, missing constraints, unmeasurable criteria)
Pass 2: Catches structural issues (goal/constraint conflicts, feasibility concerns)
Pass 3: Catches alignment gaps (two readers would interpret differently)
After max: Escalate (suggest research or fundamental rethink)
```

Each pass builds on previous ones. Validation logs from earlier passes provide context for what was already caught and (hopefully) fixed.
