---
description: Show current cycle status
---

# /solveos:status — Where Am I?

You are showing the user their current position in the solveOS cycle.

## Prerequisites

1. Check that `.solveos/` exists. If not:
   > "No solveOS project found. Run `/solveos:new` to start."
   Stop here.

## What to Read

- `.solveos/STATE.md` — Current state data
- `.solveos/BRIEF.md` — Problem and goal (if it exists)
- `.solveos/config.json` — Gate configuration

## Output Format

Present the status in this format:

```
## solveOS Status

**Cycle:** {cycle_number}
**Phase:** {human-readable state description}
**Updated:** {updated_at}

### Brief
**Problem:** {problem from BRIEF.md, or "No brief yet"}
**Goal:** {goal from BRIEF.md, or "—"}

### Gates
| Gate | Status |
|------|--------|
| Research | {completed / skipped / pending / disabled} |
| Plan Validation | {completed / skipped / pending / disabled} (passes: {n}) |
| Build Validation | {completed / skipped / pending / disabled} |
| Pre-ship Review | {completed / skipped / pending / disabled} |
| Post-ship Review | {completed / skipped / pending / disabled} |

### Blockers
{list of blockers, or "None"}

### Next Step
{suggestion based on current state}
```

## State-to-Description Mapping

| State | Description |
|-------|-------------|
| `INIT` | Project initialized — ready to start |
| `RESEARCHING` | Research gate — gathering information |
| `PLANNING` | Plan phase — creating the Plan Brief |
| `VALIDATING_PLAN` | Plan Validation gate — checking the brief (pass {n}) |
| `BUILDING` | Build phase — executing against the plan |
| `VALIDATING_BUILD` | Build Validation gate — checking the output |
| `REVIEWING_PRE` | Pre-ship Review — final check before shipping |
| `READY_TO_SHIP` | Ready to ship — all checks passed |
| `SHIPPED` | Shipped — work delivered |
| `REVIEWING_POST` | Post-ship Review — reflecting on the cycle |
| `CYCLE_COMPLETE` | Cycle complete — ready for next cycle |

## Gate Status Logic

For each gate, determine status by checking:
1. Is it in `gates_completed`? → "completed"
2. Is it in `gates_skipped`? → "skipped"
3. Is it disabled in `config.json` (`gates.{name}: false`)? → "disabled"
4. Otherwise → "pending"

## Keep It Concise

This is a status check, not a report. Keep the output short and scannable. The user wants to know where they are and what to do next.
