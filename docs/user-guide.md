# solveos-cli User Guide

## Installation

### Prerequisites

- Node.js >= 20.0.0
- One of the supported runtimes installed: OpenCode, Claude Code, Cursor, or Gemini CLI

### Install

Run from the root of your project:

```bash
npx solveos-cli@latest
```

The installer will:

1. Auto-detect your runtime (or pass `--runtime opencode|claude-code|cursor|gemini`)
2. Copy 14 slash commands into your runtime's command directory
3. Copy 7 agent definitions into your runtime's agent directory
4. Initialize `.solveos/` with default configuration and templates

### Runtime-specific paths

| Runtime | Commands | Agents |
|---------|----------|--------|
| OpenCode | `.opencode/commands/solveos-*.md` | `.opencode/agents/solveos-*.md` |
| Claude Code | `.claude/skills/solveos-*/SKILL.md` | `.claude/agents/solveos-*.md` |
| Cursor | `.cursor/skills/solveos-*/SKILL.md` | `.cursor/agents/solveos-*.md` |
| Gemini CLI | `.gemini/commands/solveos/*.toml` | `.gemini/agents/solveos-*.md` |

### Verify installation

After installing, run `/solveos-status` in your assistant. It should show:

```
Cycle 1 | State: INIT | No brief yet
```

## First project

### Step 1: Initialize

```
/solveos-new
```

This creates the `.solveos/` directory structure. If it already exists, the command preserves your existing configuration and state.

### Step 2: Plan

```
/solveos-plan
```

The planner agent will walk you through filling out the **Plan Brief** -- a structured document with 8 sections:

1. **Problem** -- What is broken, missing, or needed?
2. **Audience** -- Who experiences this problem?
3. **Goal** -- What does success look like?
4. **Appetite** -- How much time/effort are you willing to invest?
5. **Constraints** -- What are the non-negotiables?
6. **Success Criteria** -- Measurable, falsifiable checkboxes
7. **Core Assumption** -- What must be true for this plan to work?
8. **Rabbit Holes** -- Unknowns that could drag the build off track

Plus an **Out of Scope** section to prevent scope creep.

The completed brief is saved to `.solveos/BRIEF.md`.

### Step 3: Build

```
/solveos-build
```

The executor agent reads the Plan Brief and breaks the work into **waves** -- groups of tasks that can run in parallel. It checks off success criteria as each piece completes.

### Step 4: Ship

```
/solveos-ship
```

Confirms the cycle is complete, archives artifacts to `.solveos/history/cycle-N/`, resets state for the next cycle.

## The core cycle

The full cycle has 11 states:

```
INIT -> RESEARCHING -> PLANNING -> VALIDATING_PLAN -> BUILDING ->
  VALIDATING_BUILD -> REVIEWING_PRE -> READY_TO_SHIP -> SHIPPED ->
  REVIEWING_POST -> CYCLE_COMPLETE
```

The minimal path skips all optional gates:

```
INIT -> PLANNING -> BUILDING -> READY_TO_SHIP -> SHIPPED -> CYCLE_COMPLETE
```

### State transitions

At each state, `/solveos-next` tells you what commands are available and recommends the next step. `/solveos-status` shows where you are.

## Using gates

Gates are optional quality checkpoints. Each one can be enabled or disabled in `.solveos/config.json`.

### Research gate

**When to use:** When the problem domain is unfamiliar, when you need to investigate options before committing to a plan.

```
/solveos-research "What authentication libraries work with our stack?"
```

Produces a research summary in `.solveos/research/`. The researcher agent conducts bounded investigation -- it has a defined question and stops when it has an answer.

### Plan Validation gate

**When to use:** For high-stakes plans, plans with many unknowns, or when working with a team that needs alignment.

```
/solveos-validate-plan
```

The plan validator checks three core questions:

1. Does the plan solve the stated problem?
2. Is the plan feasible within the appetite?
3. Are the success criteria specific and falsifiable?

If gaps are found, the validator reports them. You can refine the brief and validate again (up to `plan_validation_max_passes` times, default 3, before escalation).

### Build Validation gate

**When to use:** Before shipping anything non-trivial.

```
/solveos-validate-build
```

Checks each success criterion against the actual build output. Reports pass/fail per criterion, scope drift, and known issues.

### Review gate

**When to use:** Pre-ship for a holistic "should we ship this?" judgment. Post-ship for outcome measurement and feed-forward.

```
/solveos-review
```

The command detects whether you're pre-ship or post-ship based on the current state and runs the appropriate review.

**Pre-ship review** asks: Does this solve the problem? Is it good enough for the audience? What's the weakest part?

**Post-ship review** measures outcomes against success criteria and generates **feed-forward items**: new problems discovered, deferred scope, wrong assumptions, and open questions. These feed into `/solveos-new-cycle`.

## Rigor scaling

Not every task needs the full cycle. solveos-cli offers three levels:

### Full cycle (all gates)

Use for multi-day features, high-stakes changes, or unfamiliar domains.

```
/solveos-new -> /solveos-research -> /solveos-plan -> /solveos-validate-plan ->
  /solveos-build -> /solveos-validate-build -> /solveos-review -> /solveos-ship ->
  /solveos-review -> /solveos-new-cycle
```

### Quick mode

Use for small features where you understand the problem well.

```
/solveos-quick
```

Creates a minimal Plan Brief (problem + goal + criteria only), skips all gates, and moves straight to build.

### Fast mode

Use for bug fixes, one-liners, and trivial changes.

```
/solveos-fast
```

No artifacts, no planning, no state tracking. Just does the work inline.

## Configuration reference

Edit `.solveos/config.json` to customize behavior.

### `mode`

- `"interactive"` (default) -- Human confirms at every gate
- `"auto"` -- Gates auto-advance (useful for CI or scripted workflows)

### `gates`

Each gate can be `true` (enabled) or `false` (disabled):

```json
{
  "research": true,
  "plan_validation": true,
  "build_validation": true,
  "review_pre_ship": true,
  "review_post_ship": true
}
```

### `plan_validation_max_passes`

Maximum number of validate-refine loops before the validator escalates (asks the human to decide). Default: `3`.

### `granularity`

Controls how the wave executor breaks down work:

- `"coarse"` -- 2-4 large work units
- `"standard"` -- 3-6 medium work units (default)
- `"fine"` -- 5-10 small work units

### `domain`

Adjusts agent prompt language for the problem domain:

- `"software"` (default) -- Code, tests, CI, APIs
- `"content"` -- Writing, editing, publishing
- `"research"` -- Hypotheses, evidence, synthesis
- `"strategy"` -- Options, decisions, stakeholders
- `"general"` -- No domain-specific adjustments

### `runtime`

- `"auto"` (default) -- Auto-detect from project files
- `"opencode"`, `"claude-code"`, `"cursor"`, `"gemini"` -- Force a specific runtime

### `hooks`

```json
{
  "context_monitor": true,
  "context_monitor_threshold": 60,
  "brief_anchor": true,
  "brief_anchor_interval": 10
}
```

- **Context monitor** -- Warns when conversation length approaches the context window limit (at 60% and 80%). Suggests spawning sub-agents to manage context.
- **Brief anchor** -- Periodically re-surfaces the Plan Brief's success criteria and out-of-scope items to prevent drift. Triggers every N tool calls (default: 10).

## Tips for effective Plan Briefs

1. **Be specific in Success Criteria.** "The feature works" is not falsifiable. "Users can create, edit, and delete items via the API" is.
2. **Set a realistic Appetite.** If you write "2 hours" but the plan requires a database migration, you'll hit friction. The appetite shapes the solution.
3. **Name your Rabbit Holes.** Acknowledging unknowns up front means you won't be surprised when you hit them.
4. **Use Out of Scope aggressively.** The most common failure mode is scope creep. Write down what you're NOT doing.
5. **One Core Assumption per plan.** If you have multiple risky assumptions, consider researching them first.

## FAQ

**Q: Can I use solveos-cli without any AI coding assistant?**
A: No. solveos-cli installs slash commands and agents that run inside an AI coding assistant. It doesn't have its own CLI runtime.

**Q: Does it work with multiple runtimes at once?**
A: You can install into multiple runtimes by running `npx solveos-cli@latest --runtime <name>` for each one. The `.solveos/` state directory is shared.

**Q: Where does state live?**
A: Everything is in `.solveos/` as markdown and JSON files. No databases, no cloud accounts, no telemetry.

**Q: Can I check `.solveos/` into version control?**
A: Yes. The entire directory is designed to be committed. This gives your team visibility into the planning and review process.

**Q: How do I reset a stuck cycle?**
A: Use `/solveos-archive` to archive or abandon the current cycle, then `/solveos-new` to start fresh.

**Q: What happens if I skip all gates?**
A: The cycle still works -- you go from INIT -> PLANNING -> BUILDING -> READY_TO_SHIP -> SHIPPED -> CYCLE_COMPLETE. Skipped gates are tracked in `.solveos/STATE.md` so you can see what was skipped.

**Q: Can I add custom commands or agents?**
A: Yes. Add markdown files to your runtime's command/agent directory following the same frontmatter format. solveos-cli won't overwrite files it didn't create.
