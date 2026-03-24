---
description: Run a pre-ship or post-ship review — holistic judgment before shipping, outcome measurement after
---

# /solveos:review — Review Gate

You are running the **Review gate** of the solveOS cycle. This gate has two modes:

- **Pre-ship review:** A holistic judgment check before shipping. Asks whether the result actually solves the problem for the stated audience.
- **Post-ship review:** An outcome measurement after shipping. Measures success criteria against real-world results and generates feed-forward inputs for the next cycle.

The mode is auto-detected based on the current cycle state.

## Prerequisites

1. Check that `.solveos/` exists. If not: "No solveOS project found. Run `/solveos:new` first."
2. Read `.solveos/STATE.md` to determine the mode:
   - **Pre-ship mode** if state is: `BUILDING`, `VALIDATING_BUILD`, or `REVIEWING_PRE`
   - **Post-ship mode** if state is: `SHIPPED` or `REVIEWING_POST`
   - If state is `INIT` or `PLANNING`: "Nothing to review yet. Run `/solveos:build` first."
   - If state is `CYCLE_COMPLETE`: "This cycle is already reviewed. Run `/solveos:new-cycle` to start the next one."
3. Read `.solveos/BRIEF.md` — the Plan Brief is central to both review modes.
4. Read `.solveos/config.json` to check if the review gate is enabled.
   - For pre-ship: check `gates.review_pre_ship`
   - For post-ship: check `gates.review_post_ship`
   - If disabled: "The {mode} review gate is disabled in your config. You can still run it — do you want to proceed?"
5. Read any existing validation and build artifacts for context.

---

## Pre-Ship Mode

### Purpose

The pre-ship review is a **judgment check**, not a technical check. Build Validation asks "does it work?" — the pre-ship review asks "should we ship it?"

### Step 1: Review Against the Plan Brief

Invoke the **solveos-reviewer** agent in pre-ship mode. Evaluate:

#### Does the result solve the problem stated in the Plan Brief?

- Re-read the **problem** field from the Plan Brief
- Does the built result actually address this problem?
- Or does it address a related but different problem?
- Has the problem itself changed since planning?

#### Would the named audience find this useful/usable/readable?

- Re-read the **audience** field from the Plan Brief
- Put yourself in the audience's position
- Would they understand it? Would they use it? Would they benefit from it?
- Is the quality level appropriate for this audience?

#### What is the weakest part of the result?

- Every piece of work has a weakest part. Name it explicitly.
- Is the weakest part in a critical path or a peripheral area?
- Would the audience notice the weakness?

#### Are you shipping because it's ready, or because you're tired?

- This is the most important question. Be honest.
- Sunk cost is not a reason to ship.
- "Good enough" is valid — but only if you can articulate why it's good enough for this audience.

### Step 2: Write Pre-Ship Review

Write the output to `.solveos/validations/pre-ship-review.md` using the Pre-Ship Review template.

### Step 3: Decide and Transition

Present the assessment to the user:

#### If ready to ship:

> "Pre-ship review complete. The result solves the stated problem for the stated audience.
>
> Weakest part: {description} — but it's acceptable because {reason}.
>
> Run `/solveos:ship` to ship."

Update `STATE.md`:
- Mark `REVIEW_PRE_SHIP` as a completed gate
- Transition to `READY_TO_SHIP`
- Update `updated_at`

#### If not ready:

> "Pre-ship review found concerns:
> - {concern}
>
> I recommend returning to Build to address these before shipping.
>
> Options:
> 1. Run `/solveos:build` to iterate
> 2. Ship anyway (you understand the risks)
>
> What would you like to do?"

Update `STATE.md`:
- If returning to Build: transition to `BUILDING`
- If shipping anyway: mark review as completed with accepted concerns
- Update `updated_at`

---

## Post-Ship Mode

### Purpose

The post-ship review measures **real-world outcomes** against what was planned. It generates feed-forward inputs that inform the next cycle's Plan Brief. This is how solveOS learns.

### When to Run (Timing Guidance)

Present timing guidance based on the domain in `config.json`:

| What shipped | When to review | Why |
|---|---|---|
| Software feature | After 1-2 weeks of real usage | Need real user data, not launch-day excitement |
| Article / content | After 3-7 days live | Engagement patterns stabilize after a few days |
| Strategy / decision | After first observable outcomes | Could be days or months depending on the decision |
| Internal tool | After first real use by the team | One real session reveals more than any preview |
| Quick experiment | Within 24-48 hours | The whole point was to learn fast |

> "This is a post-ship review. When are you running this relative to shipping?
> (For context: {timing guidance for this domain})"

### Step 1: Measure Success Criteria

For each success criterion from the Plan Brief, measure the real-world result:

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | {criterion} | Met / Partially met / Not met | {what actually happened} |

### Step 2: Reflect

#### What worked well?
- What decisions or approaches produced good outcomes?
- What would you repeat?

#### What didn't work?
- What decisions or approaches produced bad outcomes or unexpected problems?
- What would you do differently?

#### What single decision had the most impact?
- Positive or negative — name the one decision that mattered most.
- Why did it matter? What was the mechanism?

### Step 3: Generate Feed-Forward Inputs

This is the critical output. These items become inputs to the next cycle:

#### New problems revealed
- What problems did shipping reveal that weren't visible before?
- Are these new problems, or were they latent problems that surfaced?

#### Deferred scope
- What was intentionally cut during this cycle that still matters?
- Should it be the next cycle, or is it no longer important?

#### Wrong assumptions
- What assumptions from the Plan Brief's **core assumption** turned out to be wrong?
- What did reality teach you that the plan didn't anticipate?

#### Open questions
- What questions remain unanswered?
- Would these benefit from a Research gate in the next cycle?

### Step 4: Write Post-Ship Review

Write the output to `.solveos/reviews/cycle-{n}-review.md` where `{n}` is the current cycle number from `STATE.md`.

Use the Post-Ship Review template.

### Step 5: Transition to Cycle Complete

> "Post-ship review complete. Feed-forward items saved for the next cycle.
>
> When you're ready to start the next cycle, run `/solveos:new-cycle` — it will pre-load these feed-forward items into your new Plan Brief.
>
> Or if this project is done, no further action needed."

Update `STATE.md`:
- Mark `REVIEW_POST_SHIP` as a completed gate
- Transition to `CYCLE_COMPLETE`
- Update `updated_at`

---

## Important Rules

- **Pre-ship review is judgment, not verification** — Build Validation checks criteria. Pre-ship review checks whether you *should* ship.
- **Post-ship review requires real data** — don't run it immediately after shipping. Wait for real-world feedback.
- **Feed-forward items are structured** — they should be specific enough that `/solveos:new-cycle` can load them as starting context.
- **Reviews persist across cycles** — the `.solveos/reviews/` directory is NOT cleared when a cycle is archived. Reviews are the memory layer.
- **The "are you tired?" question is real** — sunk cost shipping is the most common failure mode. Call it out honestly.
