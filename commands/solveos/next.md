---
description: Suggest or execute the next step in the cycle
---

# /solveos:next — What Should I Do Next?

You are helping the user navigate to the next step in the solveOS cycle.

## Prerequisites

1. Check that `.solveos/` exists. If not:
   > "No solveOS project found. Run `/solveos:new` to start."
   Stop here.

## What to Read

- `.solveos/STATE.md` — Current state
- `.solveos/config.json` — Gate configuration and `auto_advance` setting

## Logic

### 1. Get Valid Next States

Based on the current state, the valid next states are:

| Current State | Valid Next States |
|---------------|-------------------|
| `INIT` | `RESEARCHING`, `PLANNING` |
| `RESEARCHING` | `PLANNING` |
| `PLANNING` | `VALIDATING_PLAN`, `BUILDING` |
| `VALIDATING_PLAN` | `PLANNING` (gaps found), `BUILDING` (passed) |
| `BUILDING` | `VALIDATING_BUILD`, `REVIEWING_PRE`, `READY_TO_SHIP` |
| `VALIDATING_BUILD` | `BUILDING` (issues), `PLANNING` (major issues), `REVIEWING_PRE` (passed), `READY_TO_SHIP` |
| `REVIEWING_PRE` | `BUILDING` (not ready), `READY_TO_SHIP` (ready) |
| `READY_TO_SHIP` | `SHIPPED` |
| `SHIPPED` | `REVIEWING_POST`, `CYCLE_COMPLETE` |
| `REVIEWING_POST` | `CYCLE_COMPLETE` |
| `CYCLE_COMPLETE` | `INIT` (new cycle) |

### 2. Filter by Gate Configuration

If a gate is disabled in `config.json`, skip past it to the next enabled state:

- If `gates.research` is `false` and current state is `INIT` → recommend `PLANNING` (skip research)
- If `gates.plan_validation` is `false` and current state is `PLANNING` → recommend `BUILDING` (skip plan validation)
- If `gates.build_validation` is `false` and current state is `BUILDING` → recommend `REVIEWING_PRE` or `READY_TO_SHIP`
- If `gates.review_pre_ship` is `false` and current state is `BUILDING` or `VALIDATING_BUILD` → recommend `READY_TO_SHIP`
- If `gates.review_post_ship` is `false` and current state is `SHIPPED` → recommend `CYCLE_COMPLETE`

### 3. Map to Command

| Recommended State | Command |
|-------------------|---------|
| `RESEARCHING` | `/solveos:research` |
| `PLANNING` | `/solveos:plan` |
| `VALIDATING_PLAN` | `/solveos:validate-plan` |
| `BUILDING` | `/solveos:build` |
| `VALIDATING_BUILD` | `/solveos:validate-build` |
| `REVIEWING_PRE` | `/solveos:review` |
| `READY_TO_SHIP` | `/solveos:ship` |
| `SHIPPED` | `/solveos:ship` |
| `REVIEWING_POST` | `/solveos:review` |
| `CYCLE_COMPLETE` | `/solveos:new-cycle` |
| `INIT` | `/solveos:new-cycle` |

### 4. Present or Execute

Check `auto_advance` in `config.json`:

**If `auto_advance: false` (default):**
> "You're currently in **{state description}**. Next step: run `{command}` to {brief explanation}."

**If `auto_advance: true`:**
> "Auto-advancing to **{state description}**..."
Then execute the recommended command.

## Edge Cases

- If there are multiple valid next states and the gate config doesn't disambiguate, present all options:
  > "You're in **Build phase**. Next options:
  > 1. `/solveos:validate-build` — Check your output against success criteria
  > 2. `/solveos:review` — Pre-ship review
  > 3. `/solveos:ship` — Ship directly (skips validation and review)"

- If the state is `VALIDATING_PLAN` or `VALIDATING_BUILD`, the "next" depends on the result of the validation (passed or failed). Ask:
  > "How did the validation go? Passed (continue forward) or needs work (go back)?"
