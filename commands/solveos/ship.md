---
description: Ship the current cycle — final check, confirm, archive
---

# /solveos:ship — Ship Phase

You are entering the **Ship phase** of the solveOS cycle. Shipping means putting your work in front of reality — the only true validator.

## Prerequisites

1. Check that `.solveos/` exists. If not: "No solveOS project found. Run `/solveos:new` first."
2. Read `.solveos/STATE.md` to verify the current state allows shipping:
   - Valid entry states: `READY_TO_SHIP`, `BUILDING` (skipping post-build gates), `REVIEWING_PRE` (review passed)
   - If state is `INIT` or `PLANNING`: "Nothing to ship yet. Run `/solveos:build` first."
3. Read `.solveos/BRIEF.md` — you need this for the final check.
4. Read `.solveos/config.json` for domain settings.

## Step 1: Final Brief Check (5 minutes)

Before shipping, do a final alignment check. Present each question to the user:

### Success Criteria Review
Read the success criteria from `BRIEF.md` and check each one:

```
## Final Brief Check

Let's verify the build matches the plan:

Success Criteria:
- [ ] {criterion 1} — Was this met? (yes/no/partially)
- [ ] {criterion 2} — Was this met? (yes/no/partially)
...
```

For each criterion:
- **Met**: Mark as [x]
- **Partially met**: Note what's missing. Ask: "Ship with this gap, or fix first?"
- **Not met**: Flag clearly. Ask: "This criterion isn't met. Ship anyway, defer it, or fix first?"

### Scope Check
> "Did any out-of-scope work sneak in? Is the output within the boundaries set by the brief?"

### Brief Accuracy Check
> "Is the brief still accurate, or did it silently drift during the build? If it changed, note the differences."

## Step 2: Define "Shipped"

Based on the domain from `.solveos/config.json`, explain what "shipped" means and how to verify it:

| Domain | What "Shipped" Means | Verification |
|--------|---------------------|--------------|
| `software` | Code is deployed or merged to the target branch. It's accessible to the audience named in the brief. | PR merged / deploy confirmed / feature flag enabled |
| `content` | Content is published and publicly accessible to the target audience. | URL is live / post is published / document is shared |
| `research` | Findings are shared with stakeholders. Conclusions are documented and accessible. | Report delivered / presentation given / document shared |
| `strategy` | Decision is communicated to stakeholders. Action plan is in place with owners and timelines. | Decision email sent / meeting held / plan documented with next steps |
| `general` | The output is delivered to the intended audience in the intended format. | Audience has received and can access the output |

Ask the user:
> "Based on your domain ({domain}), 'shipped' means: {definition}.
> Verification: {verification method}.
> Has this been done, or do you need to do it now?"

## Step 3: Confirm Ship

This is a human decision. Never auto-ship.

> "Ready to ship? This will:
> 1. Mark this cycle as SHIPPED
> 2. Archive the Plan Brief and state to `.solveos/history/cycle-{cycle_number}/`
> 3. Clear the current brief and validations for the next cycle
>
> Confirm? (yes/no)"

If the user says no, suggest alternatives:
- "Run `/solveos:build` to continue working"
- "Run `/solveos:review` for a pre-ship review"
- "Run `/solveos:status` to see where things stand"

## Step 4: Capture Learnings

Before archiving, spend 10 minutes capturing learnings. Ask:

> **What worked well in this cycle?**
> (Process, tools, decisions, approaches that you'd repeat)

> **What didn't work?**
> (Friction points, wrong assumptions, wasted effort)

> **What would you do differently next time?**
> (Specific changes to process, planning, or execution)

> **Any feed-forward items for the next cycle?**
> (Things that should be addressed next but are out of scope now)

Save these learnings as part of the archive.

## Step 5: Archive and Transition

1. Archive the current cycle:
   - Copy `.solveos/BRIEF.md` to `.solveos/history/cycle-{n}/BRIEF.md`
   - Copy `.solveos/STATE.md` to `.solveos/history/cycle-{n}/STATE.md`
   - Copy `.solveos/validations/` to `.solveos/history/cycle-{n}/validations/`
   - Write learnings to `.solveos/history/cycle-{n}/learnings.md`

2. Clear current cycle artifacts:
   - Remove `.solveos/BRIEF.md`
   - Clear `.solveos/validations/` contents

3. Update `.solveos/STATE.md`:
   - Set `current_state` to `SHIPPED`
   - Update `updated_at` timestamp

## Step 6: Suggest Next Step

Read `.solveos/config.json` gate configuration:

- If `review_post_ship` gate is enabled:
  > "Cycle {n} shipped. I recommend a post-ship review to capture what reality teaches you: run `/solveos:review`."

- If `review_post_ship` gate is disabled:
  > "Cycle {n} shipped. Ready for the next cycle? Run `/solveos:new-cycle` to start fresh with feed-forward from this cycle's learnings."

## Important Rules

- Never auto-ship. The human confirms.
- Never skip the final brief check, even if the user wants to rush.
- Always capture learnings — this is how the process improves.
- Learnings are not a performance review. They're a calibration tool. Be matter-of-fact, not judgmental.
