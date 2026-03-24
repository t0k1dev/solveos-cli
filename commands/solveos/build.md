---
description: Execute the Build phase against the Plan Brief
---

# /solveos:build — Execute Against the Plan Brief

You are entering the **Build phase** of the solveOS cycle. Your job is to execute the work defined in the Plan Brief, systematically and traceably.

## Prerequisites

1. Check that `.solveos/` exists. If not, tell the user to run `/solveos:new` first.
2. Read `.solveos/STATE.md` to verify the current state allows building:
   - Valid entry states: `PLANNING`, `VALIDATING_PLAN`, `VALIDATING_BUILD` (re-entering after issues), `BUILDING` (resuming)
   - If state is `INIT`, tell the user: "You need a plan first. Run `/solveos:plan`."
3. Read `.solveos/BRIEF.md` — this is your primary instruction set.
   - If no brief exists, stop: "No Plan Brief found. Run `/solveos:plan` first."
4. Read `.solveos/config.json` for domain and granularity settings.

## Step 1: Transition State

Update `.solveos/STATE.md` to `current_state: "BUILDING"` with updated timestamp.

## Step 2: Re-Read the Brief

Before writing a single line of code or content, re-read and internalize:

1. **Success Criteria** — These are your verification checklist. Every unit of work must connect to at least one criterion.
2. **Out of Scope** — These are your boundaries. If you're about to do something on this list, stop.
3. **Rabbit Holes** — These are your warnings. If you find yourself investigating one of these, flag it.
4. **Constraints** — These limit HOW you can work.
5. **Appetite** — This limits HOW MUCH you can work.

## Step 3: Decompose into Units

Break the **Goal** into atomic, independently-verifiable units of work:

- Each unit should be completable in one focused step
- Each unit should be verifiable against at least one success criterion
- Order units by dependency (what must be true before the next unit can start)
- Present the decomposition to the user for confirmation before starting

Format:
```
## Build Decomposition

Based on the Plan Brief, here are the units of work:

1. **{Unit name}** — {What it does} → verifies: {success criterion}
2. **{Unit name}** — {What it does} → verifies: {success criterion}
...

Does this decomposition look right? Any units missing or unnecessary?
```

Adjust decomposition granularity based on `.solveos/config.json`:
- `"coarse"` — Fewer, larger units (3-5 typically)
- `"standard"` — Moderate decomposition (5-10 typically)
- `"fine"` — Many small units (10+ typically)

## Step 4: Execute Units

For each unit, in order:

### Before Starting a Unit
- State which unit you're working on and which success criterion it connects to
- Check: "Is this unit still aligned with the brief?" If not, flag it.

### During a Unit
- Execute the work
- If you encounter a **discovered task** (something not in the original decomposition but needed):
  - Does it serve a success criterion? → Do it, note it as discovered
  - Does it NOT serve any criterion? → Note as future improvement, skip it
  - Does it change the goal or constraints? → **Stop and flag**: "This discovered task suggests the plan may need updating. The brief says X, but I'm finding Y. Should we update the brief or proceed as-is?"

### After Completing a Unit
- Verify the unit's output against its connected success criterion
- For `software` domain: create an atomic git commit with a clear message
- Mark the unit as complete
- Move to the next unit

## Step 5: Build Phase Exit Checklist

After all units are complete, verify:

- [ ] Every success criterion from the brief has been addressed
- [ ] Nothing was skipped without an explicit decision
- [ ] No out-of-scope work was done
- [ ] The brief is still accurate (no silent assumption changes)
- [ ] Discovered tasks are documented

Present this checklist to the user.

## Step 6: Suggest Next Step

Read `.solveos/config.json` gate configuration:

- If `build_validation` gate is enabled: "Build complete. Run `/solveos:validate-build` to verify against success criteria."
- If `review_pre_ship` gate is enabled (but not build_validation): "Build complete. Run `/solveos:review` for a pre-ship review."
- If neither is enabled: "Build complete. Run `/solveos:ship` when ready."

## AI Failure Modes to Watch For

These are the ways AI agents fail during Build. Monitor yourself for these:

| Failure Mode | What It Looks Like | What to Do |
|-------------|-------------------|------------|
| **Instruction drift** | Gradually diverging from the brief's intent | Re-read the brief. Compare current work to success criteria. |
| **Silent assumptions** | Making decisions the brief doesn't authorize | Flag to user: "The brief doesn't specify X. I'm assuming Y. Correct?" |
| **Scope expansion** | Adding features or polish not in the brief | Check Out of Scope list. If it's there, stop. If not, flag it. |
| **Reference file blindness** | Ignoring existing code/content patterns | Read existing files before creating new ones. Match patterns. |
| **Rabbit hole entry** | Deep-diving into an area flagged as a rabbit hole | Stop. Flag: "I'm entering rabbit hole '{name}' from the brief. Pull back?" |
| **Sunk cost continuation** | Continuing a failing approach because of time invested | Stop. Assess. Is this the best approach, or just the one you started? |
