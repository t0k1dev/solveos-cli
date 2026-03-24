---
description: Archive the current cycle manually (abandon, save progress, or clean up)
---

# /solveos:archive — Manually Archive Current Cycle

You are archiving the current solveOS cycle. This is a utility command for situations outside the normal ship flow — abandoning a cycle, saving progress before a major direction change, or manual cleanup.

## Prerequisites

1. Check that `.solveos/` exists. If not, tell the user: "No solveOS project found. Nothing to archive."
2. Read `.solveos/STATE.md` to check the current state.
3. Read `.solveos/BRIEF.md` to check if a brief exists.

If **neither** STATE.md nor BRIEF.md has meaningful content (state is `INIT` with cycle 1, no brief), tell the user:
> "There's nothing to archive — the project is in its initial state with no Plan Brief."

And stop.

## Step 1: Show Current Status

Display a summary of what will be archived:

```
Archive Summary
━━━━━━━━━━━━━━━
Cycle:    {cycle_number}
State:    {current_state}
Brief:    {exists/missing}
Gates completed: {list or "none"}
Gates skipped:   {list or "none"}
```

## Step 2: Ask for Confirmation

> "This will archive the current cycle to `.solveos/history/cycle-{n}/` and reset the project to a fresh state."

If the current state is **not** `SHIPPED` or `CYCLE_COMPLETE`, add a warning:
> "**Note:** This cycle hasn't been shipped. It will be marked as **abandoned** in the archive."

Ask:
> "Do you want to proceed? (You can optionally provide a reason for archiving.)"

Wait for the user's response. If they decline, stop.

## Step 3: Capture the Reason

If the user provided a reason in their response, use it. Otherwise, infer a default:

- If state was `SHIPPED` or `CYCLE_COMPLETE`: reason = "Cycle completed normally"
- Otherwise: reason = "Abandoned — archived manually from {state} state"

## Step 4: Generate Archive Metadata

Before archiving, create or append an **Archive Metadata** section to `.solveos/STATE.md`:

```markdown
## Archive Metadata

- **Archived at:** {ISO timestamp}
- **Final state:** {current_state}
- **Reason:** {user reason or default}
- **Completed gates:** {comma-separated list or "none"}
- **Skipped gates:** {comma-separated list or "none"}
- **Abandoned:** {yes/no — yes if state was NOT SHIPPED or CYCLE_COMPLETE}
```

## Step 5: Archive the Cycle

Archive the current cycle files to `.solveos/history/cycle-{cycle_number}/`:

1. Copy `.solveos/BRIEF.md` → `.solveos/history/cycle-{n}/BRIEF.md` (if exists)
2. Copy `.solveos/STATE.md` (with metadata) → `.solveos/history/cycle-{n}/STATE.md`
3. Copy `.solveos/validations/` → `.solveos/history/cycle-{n}/validations/` (if exists and non-empty)
4. Copy `.solveos/reviews/` → `.solveos/history/cycle-{n}/reviews/` (if exists and non-empty)
5. Copy `.solveos/research/` → `.solveos/history/cycle-{n}/research/` (if exists and non-empty)

## Step 6: Reset Project State

After archiving:

1. Clear `.solveos/BRIEF.md` (write empty file or remove)
2. Reset `.solveos/STATE.md` to initial state:
   - `current_state: INIT`
   - `cycle_number`: **same number** if abandoned (don't increment), or **increment by 1** if the cycle was shipped/complete
   - Reset `gates_skipped`, `gates_completed`, `transitions_log` to empty
   - Fresh `created_at` timestamp
3. Clear `.solveos/validations/` directory
4. Preserve `.solveos/reviews/` (reviews persist across cycles for feed-forward)
5. Preserve `.solveos/research/` (research may be reusable)

## Step 7: Confirm

Report the result:

```
Cycle {n} archived to .solveos/history/cycle-{n}/
{abandoned_note}

Project reset to INIT state (cycle {next_cycle_number}).
Run /solveos-new or /solveos-plan to start fresh.
```

Where `{abandoned_note}` is either:
- "Marked as abandoned (was in {state} state)." — if not shipped
- "" (empty) — if cycle was shipped/complete
