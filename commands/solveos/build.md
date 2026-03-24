---
description: Execute the Build phase against the Plan Brief
---

# /solveos:build — Execute Against the Plan Brief

You are entering the **Build phase** of the solveOS cycle. Your job is to execute the work defined in the Plan Brief, systematically and traceably, using wave-based parallel execution.

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

## Step 3: Decompose into Units and Waves

Break the **Goal** into atomic, independently-verifiable units of work, then group into waves:

### 3a. Identify Work Units

- Each unit should be completable in one focused step
- Each unit should be verifiable against at least one success criterion
- Give each unit a unique ID (e.g., `unit-1`, `unit-2`, ...)

### 3b. Declare Dependencies

For each unit, identify which other units must be completed first:
- If unit B uses output from unit A, then B depends on A
- If no dependency, units are independent and can run in parallel

### 3c. Group into Waves

Independent units go in the same wave (parallel). Dependent units go in later waves (sequential).

Adjust decomposition granularity based on `.solveos/config.json`:
- `"coarse"` — Fewer, larger units (2-4 per wave). For experienced users or simple tasks.
- `"standard"` — Moderate decomposition (3-6 per wave). Default.
- `"fine"` — Many small units (5-10 per wave). For complex or high-stakes work.

### 3d. Present the Plan

Format:
```
## Wave Execution Plan

Based on the Plan Brief, here are the waves:

### Wave 1 (parallel)
1. **unit-1: {name}** — {description} → verifies: {success criterion}
2. **unit-2: {name}** — {description} → verifies: {success criterion}

### Wave 2 (parallel, after Wave 1)
3. **unit-3: {name}** — {description} → depends on: unit-1 → verifies: {criterion}
4. **unit-4: {name}** — {description} → depends on: unit-1 → verifies: {criterion}

### Wave 3 (after Wave 2)
5. **unit-5: {name}** — {description} → depends on: unit-3, unit-4 → verifies: {criterion}

Does this decomposition look right? Any units missing or unnecessary?
```

**Single-unit optimization:** If there is only one unit of work, skip wave grouping and execute directly without overhead.

## Step 4: Execute Waves

### Wave Execution Loop

For each wave, in order:

1. **Announce the wave:** "Starting Wave {n} with {count} unit(s)"
2. **Execute all units in the wave** (concurrently if multiple)
3. **Wait for all units to complete** before moving to the next wave
4. **Report wave results** before starting the next wave

### Per-Unit Execution

For each unit within a wave:

#### Before Starting a Unit
- State which unit you're working on and which success criterion it connects to
- Check: "Is this unit still aligned with the brief?" If not, flag it.

#### During a Unit
- Execute the work
- If you encounter a **discovered task** (something not in the original decomposition but needed):
  - Does it serve a success criterion? → Do it, note it as discovered
  - Does it NOT serve any criterion? → Note as future improvement, skip it
  - Does it change the goal or constraints? → **Stop and flag**: "This discovered task suggests the plan may need updating. The brief says X, but I'm finding Y. Should we update the brief or proceed as-is?"

#### After Completing a Unit
- Verify the unit's output against its connected success criterion
- For `software` domain: create an atomic git commit with a clear message
- Mark the unit as complete with a summary

### Handling Failures

If a unit fails:
1. Record the failure and error
2. Check if any later units depend on it
3. If dependent units exist:
   - **Interactive mode:** Ask the user: "Unit {name} failed. Units {dependents} depend on it. Skip them, retry, or abort?"
   - **Auto mode:** Skip dependent units and continue with independent ones
4. Continue with remaining independent units in the current wave

## Step 5: Build Phase Exit Checklist

After all waves are complete, verify:

- [ ] Every success criterion from the brief has been addressed
- [ ] Nothing was skipped without an explicit decision
- [ ] No out-of-scope work was done
- [ ] The brief is still accurate (no silent assumption changes)
- [ ] Discovered tasks are documented
- [ ] Failed/skipped units are explained

Present this checklist to the user with the wave execution summary:

```
## Build Summary

**Units completed:** {n}/{total}
**Waves executed:** {n}/{total}
**Discovered tasks:** {count}
**Failed units:** {count}

### Wave Results
- Wave 1: ✓ {n} completed
- Wave 2: ✓ {n} completed, ✗ {n} failed
...
```

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
| **Wave impatience** | Starting Wave N+1 before Wave N is verified | Wait. Verify all units in the current wave before advancing. |
