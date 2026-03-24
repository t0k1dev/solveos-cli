---
description: Start a new solveOS project or cycle
---

# /solveos:new — Initialize a New Project or Cycle

You are initializing a new solveOS project. Follow these steps carefully.

## Step 1: Check for Existing Project

Check if a `.solveos/` directory already exists in the current working directory.

- If it exists, read `.solveos/STATE.md` to check the current cycle state.
  - If the cycle is **not** in `CYCLE_COMPLETE` or `SHIPPED` state, warn the user:
    > "There's an active solveOS cycle in state `{current_state}`. Starting a new project will archive the current cycle. Continue?"
  - Wait for user confirmation before proceeding. If they decline, stop.
  - If they confirm, archive the current cycle using the existing cycle number, then proceed.
- If it doesn't exist, proceed directly.

## Step 2: Gather Project Information

Ask the user three questions. Be conversational, not robotic.

### Question 1: The Problem
> "What problem are you trying to solve? Give me 1-2 sentences — the problem, not the solution."

### Question 2: The Stakes
> "How high are the stakes? This helps me decide how rigorous to be."
> - **High** — Failure is costly. I'll enable all gates (research, plan validation, build validation, review).
> - **Medium** — Standard work. I'll enable plan validation and review.
> - **Low** — Quick task. I'll use a lighter process with fewer gates.

### Question 3: The Domain
> "What domain is this work in?"
> - **Software** — Code, APIs, infrastructure
> - **Content** — Articles, docs, marketing copy
> - **Research** — Investigation, analysis, literature review
> - **Strategy** — Decisions, planning, roadmaps
> - **General** — Doesn't fit the above

## Step 3: Create the Project

Based on the user's answers:

1. Create the `.solveos/` directory structure:
   - `.solveos/config.json`
   - `.solveos/STATE.md`
   - `.solveos/research/`
   - `.solveos/validations/`
   - `.solveos/reviews/`
   - `.solveos/history/`
   - `.solveos/notes/`

2. Write `config.json` with these settings:

   **High stakes:**
   ```json
   {
     "mode": "interactive",
     "gates": {
       "research": true,
       "plan_validation": true,
       "build_validation": true,
       "review_pre_ship": true,
       "review_post_ship": true
     },
     "plan_validation_max_passes": 3,
     "granularity": "fine",
     "auto_advance": false,
     "domain": "{user's choice}",
     "runtime": "auto"
   }
   ```

   **Medium stakes:**
   ```json
   {
     "mode": "interactive",
     "gates": {
       "research": false,
       "plan_validation": true,
       "build_validation": false,
       "review_pre_ship": true,
       "review_post_ship": false
     },
     "plan_validation_max_passes": 2,
     "granularity": "standard",
     "auto_advance": false,
     "domain": "{user's choice}",
     "runtime": "auto"
   }
   ```

   **Low stakes:**
   ```json
   {
     "mode": "interactive",
     "gates": {
       "research": false,
       "plan_validation": false,
       "build_validation": false,
       "review_pre_ship": false,
       "review_post_ship": false
     },
     "plan_validation_max_passes": 1,
     "granularity": "coarse",
     "auto_advance": false,
     "domain": "{user's choice}",
     "runtime": "auto"
   }
   ```

3. Write `STATE.md` with:
   ```json
   {
     "current_state": "INIT",
     "cycle_number": 1,
     "gates_skipped": [],
     "gates_completed": [],
     "plan_validation_passes": 0,
     "blockers": [],
     "created_at": "{now}",
     "updated_at": "{now}"
   }
   ```

## Step 4: Suggest Next Step

Based on the gate configuration:

- If `research` gate is enabled:
  > "Project initialized. I recommend starting with research: run `/solveos:research` to investigate the problem space before planning."

- If `research` gate is disabled:
  > "Project initialized. Next step: run `/solveos:plan` to create your Plan Brief."

## Important Rules

- Never skip the user questions. The whole point is that the human decides.
- If the user gives a vague problem statement, ask them to be more specific before proceeding.
- Always confirm the configuration before writing files.
- The `.solveos/` directory should be added to the project's `.gitignore` unless the user wants to version-control their planning artifacts.
