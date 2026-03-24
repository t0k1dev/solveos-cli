---
description: Create a Plan Brief for the current cycle
---

# /solveos:plan — Create the Plan Brief

You are guiding the user through creating a **Plan Brief** — the central artifact of the solveOS cycle. The Plan Brief is both a thinking tool (it forces clarity) and an instruction set (the AI builds from it).

## Prerequisites

1. Check that `.solveos/` exists. If not, tell the user to run `/solveos:new` first.
2. Read `.solveos/STATE.md` to verify the current state is `INIT`, `RESEARCHING`, or `PLANNING` (re-entering to refine).
   - If the state is anything else, warn: "The current cycle is in state `{state}`. Planning should happen before building. Continue anyway?" and respect the user's decision.
3. Load context:
   - Read all files in `.solveos/research/` (if any) — these are research summaries from the Research gate.
   - Read all files in `.solveos/reviews/` (if any) — these contain feed-forward items from previous cycles.
   - Read `.solveos/BRIEF.md` if it exists (this is a refinement pass, not a fresh start).

## Behavior

Invoke the **solveos-planner** agent behavior as defined in `agents/solveos-planner.md`.

Walk the user through each of the 8 Plan Brief questions, one at a time. For each question:

1. Explain what the question is asking and what a good answer looks like.
2. If research summaries exist, reference relevant findings.
3. If previous cycle reviews exist, surface feed-forward items.
4. If the user's answer is vague or incomplete, challenge it (see Common Mistakes below).
5. Move to the next question only when the current one has a solid answer.

## The 8 Questions

### 1. Problem
> "What is broken, missing, or needed?"

- Must be 1-2 sentences
- Must state the problem, NOT the solution
- Challenge if the answer embeds a solution (e.g., "We need to add caching" → "That's a solution. What's the problem that makes you want caching?")

### 2. Audience
> "Who experiences this problem?"

- Must be a specific person, role, or group
- Challenge "users", "everyone", "the team" → ask "which users specifically?"
- Good: "Backend engineers on the payments team who deploy 3x/day"

### 3. Goal
> "What does success look like?"

- Must be one sentence
- Must start with a verb
- Must be specific enough that someone else could verify it
- Challenge vague goals (e.g., "improve performance" → "What metric? What threshold?")

### 4. Appetite
> "How much time/effort are you willing to invest?"

- This is a **bet**, not an estimate
- It sets the scope ceiling — if the work takes longer, you re-scope, not extend
- Challenge "as long as it takes" → "What's the maximum you'd invest before reconsidering the approach?"

### 5. Constraints
> "What are the non-negotiables?"

- Technical constraints (language, framework, existing systems)
- Process constraints (approval required, backwards compatibility)
- Resource constraints (can't use X, must use Y)
- Output as bullet list

### 6. Success Criteria
> "How will you know it's done?"

- Each criterion must be **measurable** (a human or test can verify it)
- Each criterion must be **falsifiable** (you can prove it failed)
- Output as checkbox list: `- [ ] criterion`
- Challenge unmeasurable criteria ("works well" → "what does 'well' mean? what's the pass/fail test?")
- Challenge untestable criteria ("users are happy" → "how would you measure that?")

### 7. Core Assumption
> "What must be true for this plan to work?"

- Every plan has an underlying bet — name it
- If this assumption is wrong, the plan may need to change
- Challenge "it should work" → "What's the riskiest thing you're assuming?"

### 8. Rabbit Holes
> "What unknowns could drag the build off track?"

- Areas where investigation could spiral without progress
- Naming them is a defense mechanism — you'll notice when you're in one
- If the user says "none", push back: "Every problem has unknowns. What's the thing you'd most hate to discover mid-build?"

## After All 8 Questions

### 9. Out of Scope
> "What are you explicitly NOT solving?"

- Prevents scope creep during build
- Challenge empty lists: "What related problems will you resist solving this cycle?"

## Plan Phase Exit Checklist

Before writing the final BRIEF.md, verify:

- [ ] Problem is stated without embedding a solution
- [ ] Audience is specific (not "users" or "everyone")
- [ ] Goal starts with a verb and is one sentence
- [ ] Appetite is a bet, not an estimate
- [ ] Constraints are listed (even if few)
- [ ] Every success criterion is measurable and falsifiable
- [ ] Core assumption is explicit and testable
- [ ] At least one rabbit hole is identified
- [ ] Out of scope is non-empty
- [ ] A stranger could read this brief and build from it

If any item fails, point it out and ask the user to revise that section.

## Output

1. Write the completed Plan Brief to `.solveos/BRIEF.md` using the template format from `templates/plan-brief.md`.
2. Update `.solveos/STATE.md`:
   - Transition `current_state` to the appropriate next state
   - Update `updated_at` timestamp
3. Read `.solveos/config.json` to check gate configuration, then suggest the next step:
   - If `plan_validation` gate is enabled: "Plan Brief created. I recommend validating it: run `/solveos:validate-plan`."
   - If `plan_validation` gate is disabled: "Plan Brief created. Ready to build: run `/solveos:build`."

## Common Mistakes to Watch For

| Mistake | What the User Says | What to Ask |
|---------|-------------------|-------------|
| Solution masquerading as problem | "We need to add a cache" | "What's the problem that makes you want a cache?" |
| Vague audience | "Users" or "everyone" | "Which users specifically? What role, team, or segment?" |
| Unmeasurable goal | "Improve performance" | "What metric? What threshold? How would you verify it?" |
| Infinite appetite | "As long as it takes" | "What's your maximum investment before reconsidering?" |
| Missing constraints | "No constraints" | "What about language, framework, existing systems, backwards compatibility?" |
| Vague success criteria | "It works" | "How would you prove it works? What's the test?" |
| No rabbit holes | "Can't think of any" | "What's the thing you'd most hate to discover mid-build?" |
| Empty out of scope | Nothing listed | "What related problems will you resist solving this cycle?" |
