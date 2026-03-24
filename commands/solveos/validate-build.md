---
description: Validate build output against Plan Brief success criteria — catches gaps before shipping
---

# /solveos:validate-build — Build Validation Gate

You are running the **Build Validation gate** of the solveOS cycle. This gate checks whether what was built actually matches what was planned. It catches the gap between intention and execution before it reaches users.

## Prerequisites

1. Check that `.solveos/` exists. If not: "No solveOS project found. Run `/solveos:new` first."
2. Read `.solveos/STATE.md`:
   - Valid entry states: `BUILDING` (build in progress or complete) or `VALIDATING_BUILD` (re-entering after fixes)
   - If state is `INIT` or `PLANNING`: "Nothing to validate yet. Run `/solveos:build` first."
   - If state is `SHIPPED` or later: "This cycle is already shipped."
3. Read `.solveos/BRIEF.md` — especially the **success criteria**. These are what you're validating against.
   - If no brief exists: "No Plan Brief found. Run `/solveos:plan` first."
4. Read `.solveos/config.json` to check if the build validation gate is enabled.
   - If `gates.build_validation` is `false`: "The build validation gate is disabled in your config. You can still run it — do you want to proceed?"
5. Read any existing validation output from `.solveos/validations/build-validation.md` for context on previous validation attempts.

## Step 1: Gather Build Context

Before validating, understand what was built:

1. **Ask the user** to describe what was completed, or point to the relevant files/output:
   > "What was built? Please describe the output or point me to the relevant files so I can validate against your Plan Brief."

2. **Read the build output** — examine the files, code, documents, or artifacts that were produced during the Build phase.

3. **Read any test results** — if tests were run, check their output.

4. **Read the Plan Brief success criteria** — enumerate each criterion that needs to be checked.

## Step 2: Validate Against the 3 Build Validation Questions

Invoke the **solveos-build-validator** agent behavior. Evaluate the build output against these three questions:

### Question 1: Does it work?

- Does the output function as intended, without critical failures?
- Can the primary use case be completed end-to-end?
- Are there crashes, errors, or broken paths?
- Does it handle expected inputs correctly?

### Question 2: Does it match the plan?

For **each success criterion** from the Plan Brief, assess:

| Criterion | Status | Notes |
|-----------|--------|-------|
| {criterion from BRIEF.md} | Pass / Fail / Partial | {what works, what doesn't} |

- **Pass:** Criterion fully met
- **Partial:** Criterion partially met — describe what's missing
- **Fail:** Criterion not met — describe what's wrong

Also check for **scope drift**:
- Was anything added that wasn't in the plan? (scope creep)
- Was anything cut from the plan? (scope reduction)
- Were there any modifications to the original scope? If so, were they justified?

### Question 3: Is it stable enough to ship?

- Are remaining issues known, bounded, and acceptable?
- Would the audience described in the Plan Brief have a good experience?
- Are there any time bombs (things that will break soon but work now)?
- Is technical debt bounded and documented?

## Step 3: Catalog Known Issues

For any issues found, catalog them:

| Issue | Severity | Decision |
|-------|----------|----------|
| {description} | Critical / High / Medium / Low | Fix now / Defer / Accept |

**Severity definitions:**
- **Critical:** Blocks the primary use case. Must fix before shipping.
- **High:** Significantly degrades experience. Should fix before shipping.
- **Medium:** Noticeable but not blocking. Can defer with documentation.
- **Low:** Minor polish. Safe to accept or defer.

**Decision guidance:**
- **Fix now:** Return to Build phase to address this before proceeding.
- **Defer:** Document as known issue, add to next cycle's backlog.
- **Accept:** Acceptable for the stated audience and appetite.

## Step 4: Write Build Validation Output

Write the results to `.solveos/validations/build-validation.md` using the Build Validation template format with all sections filled in.

If a previous `build-validation.md` exists (from a prior validation attempt), rename it to `build-validation-{n}.md` before writing the new one, so history is preserved.

## Step 5: Decide and Transition

Present the results to the user and recommend a routing decision. **The user decides — not you.**

### If all criteria pass (no critical/high issues):

> "Build validation passed. All success criteria are met.
>
> Options:
> 1. Run `/solveos:review` for a pre-ship review (recommended if enabled)
> 2. Run `/solveos:ship` to ship directly
>
> What would you like to do?"

Update `STATE.md`:
- Mark `BUILD_VALIDATION` as a completed gate
- Transition state based on user's choice (toward `REVIEWING_PRE` or `READY_TO_SHIP`)
- Update `updated_at`

### If issues found (needs iteration):

> "Build validation found {n} issues:
> - {critical/high count} require fixing before shipping
> - {medium/low count} can be deferred or accepted
>
> I recommend returning to Build to fix the critical/high issues.
>
> Options:
> 1. Run `/solveos:build` to fix the issues (returns to Build phase)
> 2. Accept the issues and proceed to Review/Ship (document as known issues)
>
> What would you like to do?"

Update `STATE.md`:
- If returning to Build: transition to `BUILDING`
- If accepting and proceeding: mark `BUILD_VALIDATION` as completed with accepted issues noted
- Update `updated_at`

### If major plan gaps found (needs re-planning):

> "Build validation found fundamental gaps between the plan and the output:
> - {gap description}
>
> The issue isn't the build — it's the plan. I recommend:
> 1. Run `/solveos:plan` to revise the Plan Brief
> 2. Accept the deviation and proceed with what was built
>
> What would you like to do?"

Update `STATE.md`:
- If re-planning: transition to `PLANNING`
- Add the fundamental gap to blockers
- Update `updated_at`

## Important Rules

- **Check every success criterion individually** — don't summarize. Each criterion gets its own Pass / Fail / Partial assessment.
- **Be specific about failures** — "tests fail" is not actionable; "the `calculateTotal` function returns NaN for empty arrays because it doesn't handle the edge case" is actionable.
- **Scope drift is not automatically bad** — justified additions are fine if documented. Unjustified scope creep or silent scope reduction is a problem.
- **The human decides the routing** — present options and a recommendation, but never auto-transition.
- **Severity matters for routing** — critical issues block shipping; low issues don't. Don't treat all issues equally.
