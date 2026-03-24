# solveos-cli

Install the [solveOS](https://solveos.dev) problem-solving framework as slash commands, agents, and hooks into your AI coding assistant.

> solveOS teaches you *how* to think about AI-assisted work. solveos-cli makes sure you actually *do* it.

## What it does

solveos-cli adds a structured **Plan -> Build -> Ship** cycle to your AI coding assistant with:

- **14 slash commands** for every step of the cycle
- **7 specialized agents** (planner, researcher, executor, validators, reviewer, debugger)
- **Optional quality gates** (research, plan validation, build validation, review)
- **Wave-based parallel execution** for complex builds
- **Markdown-based state** -- all artifacts live in `.solveos/`, no databases or cloud accounts

It does **not** replace your coding assistant. It adds structure on top of it.

## Supported runtimes

| Runtime | Priority | Command prefix |
|---------|----------|----------------|
| [OpenCode](https://opencode.ai) | P0 | `/solveos-new` |
| [Claude Code](https://docs.anthropic.com/en/docs/claude-code) | P1 | `/solveos-new` |
| [Cursor](https://cursor.com) | P2 | `/solveos-new` |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | P3 | `/solveos:new` |

## Quick start

### 1. Install

```bash
npx solveos-cli@latest
```

The installer auto-detects your runtime and copies commands, agents, and templates into the correct directories. Pass `--runtime <name>` to override detection (e.g., `--runtime claude-code`).

### 2. Start a cycle

```
/solveos-new
```

This initializes the `.solveos/` directory with a config file, state tracker, and empty brief.

### 3. Plan

```
/solveos-plan
```

The planner agent walks you through the 8 Plan Brief questions: Problem, Audience, Goal, Appetite, Constraints, Success Criteria, Core Assumption, and Rabbit Holes.

### 4. Build

```
/solveos-build
```

The executor agent works through the plan using wave-based parallel execution, checking off success criteria as it goes.

### 5. Ship

```
/solveos-ship
```

Final confirmation, archival to `.solveos/history/`, and cycle completion.

## Command reference

| Command | Description |
|---------|-------------|
| `/solveos-new` | Start a new project or cycle |
| `/solveos-research` | Conduct bounded research on a specific question |
| `/solveos-plan` | Create a Plan Brief via the planner agent |
| `/solveos-validate-plan` | Validate the Plan Brief (catches ambiguity early) |
| `/solveos-build` | Execute the Build phase against the Plan Brief |
| `/solveos-validate-build` | Validate build output against success criteria |
| `/solveos-review` | Pre-ship or post-ship review |
| `/solveos-ship` | Ship the current cycle |
| `/solveos-status` | Show current cycle status |
| `/solveos-next` | Suggest or execute the next step |
| `/solveos-new-cycle` | Start a new cycle with feed-forward from review |
| `/solveos-quick` | Lightweight workflow: minimal plan + immediate build |
| `/solveos-fast` | Zero-overhead inline execution, no artifacts |
| `/solveos-archive` | Manually archive/abandon the current cycle |

## Agents

| Agent | Role |
|-------|------|
| `solveos-planner` | Guides Plan Brief creation through interactive questioning |
| `solveos-researcher` | Conducts bounded research to inform planning |
| `solveos-executor` | Executes work using wave-based parallel execution |
| `solveos-plan-validator` | Validates Plan Brief against 3 core questions |
| `solveos-build-validator` | Validates build output against success criteria |
| `solveos-reviewer` | Runs pre-ship judgment or post-ship outcome measurement |
| `solveos-debugger` | Diagnoses issues found during validation gates |

## The cycle

```
         [Research]          [Validate Plan]     [Validate Build]    [Review]
            |                     |                    |                |
INIT -> RESEARCHING -> PLANNING -> VALIDATING_PLAN -> BUILDING -> VALIDATING_BUILD
                                                        |
                                                   REVIEWING_PRE -> READY_TO_SHIP -> SHIPPED
                                                                                       |
                                                                               REVIEWING_POST -> CYCLE_COMPLETE
```

Gates in `[brackets]` are optional. Skip any gate to move faster; enable all for maximum rigor.

## Rigor scaling

| Mode | Commands | Gates | Artifacts | Use when |
|------|----------|-------|-----------|----------|
| **Full** | All 14 | All enabled | Full `.solveos/` | Multi-day features, high-stakes changes |
| **Quick** | `/solveos-quick` | None | Minimal brief | Small features, well-understood problems |
| **Fast** | `/solveos-fast` | None | None | Bug fixes, one-liners, trivial changes |

## Configuration

Configuration lives in `.solveos/config.json`. Key options:

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
  "granularity": "standard",
  "domain": "software",
  "runtime": "auto",
  "hooks": {
    "context_monitor": true,
    "context_monitor_threshold": 60,
    "brief_anchor": true,
    "brief_anchor_interval": 10
  }
}
```

| Option | Values | Default | Description |
|--------|--------|---------|-------------|
| `mode` | `interactive`, `auto` | `interactive` | Whether gates require human confirmation |
| `gates.*` | `true`, `false` | `true` | Enable/disable individual quality gates |
| `plan_validation_max_passes` | 1-10 | 3 | Max validation loops before escalation |
| `granularity` | `coarse`, `standard`, `fine` | `standard` | Wave execution unit size |
| `domain` | `software`, `content`, `research`, `strategy`, `general` | `software` | Domain-specific agent prompt variants |
| `runtime` | `opencode`, `claude-code`, `cursor`, `gemini`, `auto` | `auto` | Target runtime (auto-detected if `auto`) |

## Project structure

After installation, your project gains:

```
.solveos/
  config.json          # Configuration
  STATE.md             # Current cycle state (human-readable)
  BRIEF.md             # Plan Brief for current cycle
  research/            # Research summaries
  validations/         # Plan and build validation logs
  reviews/             # Pre-ship and post-ship reviews
  history/             # Archived cycles
  notes/               # Freeform notes
```

## Domain modes

solveos-cli is domain-agnostic. The `domain` setting adjusts agent prompts:

- **software** -- Code-focused: PRs, tests, CI, APIs, deployment
- **content** -- Writing-focused: drafts, outlines, editorial review
- **research** -- Investigation-focused: hypotheses, evidence, synthesis
- **strategy** -- Decision-focused: options analysis, stakeholder alignment
- **general** -- No domain-specific adjustments

## Links

- [solveOS Framework](https://solveos.dev) -- The conceptual framework behind this CLI
- [GitHub Repository](https://github.com/t0k1dev/solveos-cli)
- [User Guide](docs/user-guide.md) -- Detailed usage documentation
- [Worked Example](docs/examples/build-a-feature.md) -- Complete cycle walkthrough

## License

MIT
