# Build Plan: solveos-cli

**Date:** March 23, 2026
**Status:** Draft -- awaiting review

---

## What We're Building

A CLI tool that installs solveOS's problem-solving framework as slash commands, agents, and hooks into AI coding assistants. It bridges solveOS's conceptual framework (Plan Brief, gates, feedback loops, diverge/converge) with GSD-style automation (structured prompts, sub-agent orchestration, artifact generation, context management).

**One-line pitch:** solveOS teaches you *how* to think about AI-assisted work. solveos-cli makes sure you actually *do* it.

---

## Design Principles

1. **solveOS's mental model, GSD's enforcement pattern.** The framework concepts come from solveOS. The delivery mechanism (slash commands, agents, artifacts, hooks) follows GSD's proven architecture.

2. **Domain-agnostic, not code-only.** solveOS works for articles, strategy, research, and design -- not just code. The CLI must support non-software work from day one.

3. **Gates are opt-in, not opt-out.** solveOS treats gates as optional. The CLI should make it easy to include them (defaults on for complex work) and easy to skip them (flags for lightweight paths), but never force them.

4. **Artifacts are the memory layer.** Like GSD, all state lives in markdown files. No databases, no cloud, no accounts. Everything is local, version-controllable, and readable by both humans and AI.

5. **Runtime-agnostic installer.** Support multiple AI coding assistants (OpenCode first, then Claude Code, Gemini CLI, etc.) via a runtime detection and adapter pattern.

6. **The human decides, always.** Every command that produces output requires a human decision before the workflow advances. No auto-shipping, no auto-approving plans. The `--auto` flag can relax this for experienced users.

---

## Target Runtimes (Priority Order)

| Priority | Runtime | Reason |
|----------|---------|--------|
| P0 | **OpenCode** | We're building in it; first-class support |
| P1 | **Claude Code** | Largest market, GSD's primary target, rich command/agent/hook API |
| P2 | **Cursor** | Widely adopted, good command integration |
| P3 | **Gemini CLI** | Growing, Google-backed |
| P4 | Others (Copilot, Codex, Windsurf, Antigravity) | Future expansion |

---

## Architecture

```
solveos-cli/
├── src/                          # TypeScript source (compiled to dist/)
│   ├── bin/                      # CLI entry point (npx installer)
│   │   └── install.ts            # Runtime detection + installation
│   ├── workflows/                # Orchestration logic
│   │   ├── state-machine.ts      # Cycle state machine (phase/gate transitions)
│   │   └── wave-executor.ts      # Parallel execution wave management
│   ├── lib/                      # Core library
│   │   ├── runtime-detect.ts     # Detect which AI assistant is running
│   │   ├── runtime-adapters/     # Per-runtime installation adapters
│   │   │   ├── opencode.ts
│   │   │   ├── claude-code.ts
│   │   │   └── cursor.ts
│   │   ├── artifacts.ts          # Read/write/validate .solveos/ artifacts
│   │   ├── config.ts             # Configuration loading and defaults
│   │   └── security.ts           # Path validation, injection scanning
│   ├── hooks/                    # Runtime hooks (TS, compiled to JS)
│   │   ├── context-monitor.ts    # Monitors context window utilization
│   │   └── brief-anchor.ts      # Reminds agent to check Plan Brief during Build
│   └── types.ts                  # Shared type definitions (states, config, artifacts, adapters)
├── commands/                     # Slash command definitions (.md prompt files)
│   └── solveos/                  # Namespaced: /solveos:*
│       ├── new.md                # Start a new project/cycle
│       ├── research.md           # Run Research gate
│       ├── plan.md               # Create Plan Brief
│       ├── validate-plan.md      # Run Plan Validation gate
│       ├── build.md              # Execute Build phase
│       ├── validate-build.md     # Run Build Validation gate
│       ├── review.md             # Run Review gate (pre-ship or post-ship)
│       ├── ship.md               # Ship phase
│       ├── next.md               # Auto-advance to next logical step
│       ├── status.md             # Show current cycle state
│       ├── quick.md              # Lightweight path (Plan + Build only)
│       └── fast.md               # Inline trivial tasks
├── agents/                       # Sub-agent prompt definitions (.md)
│   ├── solveos-researcher.md     # Research gate agent
│   ├── solveos-planner.md        # Plan Brief creation agent
│   ├── solveos-plan-validator.md # Plan Validation gate agent
│   ├── solveos-executor.md       # Build phase executor (fresh context)
│   ├── solveos-build-validator.md# Build Validation gate agent
│   ├── solveos-reviewer.md       # Review gate agent (pre + post-ship)
│   └── solveos-debugger.md       # Fix/iterate agent when validation fails
├── templates/                    # Markdown templates for artifacts
│   ├── plan-brief.md             # The 8-question Plan Brief template
│   ├── research-summary.md       # Research gate output template
│   ├── plan-validation-log.md    # Plan Validation gate output template
│   ├── build-validation.md       # Build Validation gate output template
│   ├── pre-ship-review.md        # Pre-ship Review output template
│   ├── post-ship-review.md       # Post-ship Review output template
│   └── cycle-state.md            # Current cycle state tracking
├── tests/                        # Test suite
├── dist/                         # Compiled JS output (git-ignored)
├── docs/                         # Project documentation (analysis docs live here)
├── package.json
├── tsconfig.json                 # TypeScript configuration
└── README.md
```

---

## Artifact Directory (`.solveos/`)

When installed in a project, solveos-cli creates and manages a `.solveos/` directory:

```
.solveos/
├── config.json                   # Project-level configuration
├── BRIEF.md                      # Current Plan Brief (the central artifact)
├── STATE.md                      # Current cycle state, phase, decisions, blockers
├── research/                     # Research gate outputs
│   └── {topic}-research.md
├── validations/                  # Validation gate outputs
│   ├── plan-validation-{n}.md    # Plan Validation passes (1, 2, 3...)
│   ├── build-validation.md       # Build Validation output
│   └── pre-ship-review.md        # Pre-ship Review output
├── reviews/                      # Post-ship reviews (persist across cycles)
│   └── cycle-{n}-review.md
├── history/                      # Completed cycle archives
│   └── cycle-{n}/
│       ├── BRIEF.md              # Archived Plan Brief
│       ├── STATE.md              # Archived state
│       └── validations/          # Archived validations
└── notes/                        # Captured ideas, future work
    └── {topic}.md
```

---

## Slash Commands

### Core Workflow Commands

| Command | Phase/Gate | What It Does |
|---------|-----------|-------------|
| `/solveos:new` | Init | Starts a new project or cycle. Interactive: asks about the problem, audience, stakes. Creates `.solveos/` directory, initializes `STATE.md`, optionally triggers Research. |
| `/solveos:research` | Research gate | Spawns `solveos-researcher` agent. Inputs: a specific research question + time limit. Outputs: `research/{topic}-research.md`. Updates `STATE.md`. |
| `/solveos:plan` | Plan phase | Spawns `solveos-planner` agent. Walks through the 8 Plan Brief questions interactively. Outputs: `BRIEF.md`. Updates `STATE.md` to `PLAN_COMPLETE`. |
| `/solveos:validate-plan` | Plan Validation gate | Spawns `solveos-plan-validator` agent. Checks the current `BRIEF.md` against the 3 validation questions. Outputs: `validations/plan-validation-{n}.md`. Loops: if gaps found, returns to Plan with specific feedback. |
| `/solveos:build` | Build phase | Spawns `solveos-executor` agent(s) in fresh context. Inputs: `BRIEF.md` + reference files. Breaks work into atomic units, executes in waves. Updates `STATE.md`. |
| `/solveos:validate-build` | Build Validation gate | Spawns `solveos-build-validator` agent. Checks build output against success criteria from `BRIEF.md`. Outputs: `validations/build-validation.md`. Routes: pass -> Review/Ship, fail -> back to Build. |
| `/solveos:review` | Review gate | Spawns `solveos-reviewer` agent. Auto-detects mode: pre-ship (if not yet shipped) or post-ship (if shipped). Outputs: `validations/pre-ship-review.md` or `reviews/cycle-{n}-review.md`. |
| `/solveos:ship` | Ship phase | Final brief check, ship confirmation, post-ship capture. Archives current cycle to `history/cycle-{n}/`. Updates `STATE.md` to `SHIPPED`. |

### Utility Commands

| Command | What It Does |
|---------|-------------|
| `/solveos:next` | Reads `STATE.md`, determines the next logical step, suggests or executes it. Respects gate configuration. |
| `/solveos:status` | Shows current cycle state: which phase/gate you're in, what's been completed, what's next, outstanding blockers. |
| `/solveos:quick` | Lightweight path: creates a minimal Plan Brief (problem + goal + success criteria only) and immediately enters Build. Skips Research, Plan Validation, Build Validation, and Review. |
| `/solveos:fast` | Inline trivial tasks: no artifacts, no sub-agents, executes immediately. For tasks where the overhead of planning exceeds the cost of being wrong. |

### Lifecycle Commands

| Command | What It Does |
|---------|-------------|
| `/solveos:new-cycle` | Starts a new cycle informed by the previous post-ship review. Pre-fills `BRIEF.md` with feed-forward items from the last review. |
| `/solveos:archive` | Manually archives the current cycle to `history/`. |

---

## Agent Definitions

Each agent is a markdown prompt file that defines the agent's role, context it receives, output format, and constraints.

### Agent Roster (7 agents -- intentionally fewer than GSD's 18)

| Agent | Role | Spawned By | Context Received | Output |
|-------|------|-----------|-----------------|--------|
| `solveos-researcher` | Conducts bounded research on a specific question | `/solveos:research` | Research question, time limit, existing `BRIEF.md` (if any) | `research/{topic}-research.md` using Research Summary template |
| `solveos-planner` | Guides creation of the Plan Brief | `/solveos:plan` | Problem description from user, any research summaries, previous cycle reviews | `BRIEF.md` using Plan Brief template |
| `solveos-plan-validator` | Validates Plan Brief against the 3 questions | `/solveos:validate-plan` | Current `BRIEF.md`, validation history | `validations/plan-validation-{n}.md` with gaps and recommendations |
| `solveos-executor` | Executes work in fresh context against the plan | `/solveos:build` | `BRIEF.md`, reference files, specific task scope | Work output + summary of what was done |
| `solveos-build-validator` | Checks build output against success criteria | `/solveos:validate-build` | `BRIEF.md` (success criteria), build output, test results | `validations/build-validation.md` with pass/fail per criterion |
| `solveos-reviewer` | Runs pre-ship or post-ship review | `/solveos:review` | Full cycle artifacts (`BRIEF.md`, validations, build output) | `validations/pre-ship-review.md` or `reviews/cycle-{n}-review.md` |
| `solveos-debugger` | Diagnoses and fixes issues found during validation | When validation fails | Validation output, `BRIEF.md`, error context | Fix recommendations or direct fixes |

### Why 7 Agents, Not 18

GSD's 18 agents include domain-specific agents (UI auditor, UI researcher, UI checker) and meta agents (user profiler, codebase mapper). Since solveOS is domain-agnostic, we start with the 7 agents that map directly to the framework's phases and gates. Domain-specific agents can be added as extensions later.

---

## State Machine

The cycle state machine tracks which phase/gate the user is in and enforces valid transitions:

```
States:
  INIT              # /solveos:new run, no work started
  RESEARCHING       # Research gate active
  PLANNING          # Plan phase active
  VALIDATING_PLAN   # Plan Validation gate active (pass 1, 2, or 3)
  BUILDING          # Build phase active
  VALIDATING_BUILD  # Build Validation gate active
  REVIEWING_PRE     # Pre-ship Review gate active
  READY_TO_SHIP     # All checks passed, awaiting ship decision
  SHIPPED           # Ship phase completed
  REVIEWING_POST    # Post-ship Review gate active
  CYCLE_COMPLETE    # Review done, ready for next cycle

Transitions:
  INIT -> RESEARCHING          # /solveos:research
  INIT -> PLANNING             # /solveos:plan (skip research)
  RESEARCHING -> PLANNING      # Research complete
  PLANNING -> VALIDATING_PLAN  # /solveos:validate-plan
  PLANNING -> BUILDING         # /solveos:build (skip validation)
  VALIDATING_PLAN -> PLANNING  # Gaps found, refine brief
  VALIDATING_PLAN -> BUILDING  # Validation passed
  BUILDING -> VALIDATING_BUILD # /solveos:validate-build
  BUILDING -> REVIEWING_PRE    # Skip build validation
  BUILDING -> READY_TO_SHIP    # Skip all post-build gates
  VALIDATING_BUILD -> BUILDING # Issues found, iterate
  VALIDATING_BUILD -> PLANNING # Major issues, re-plan
  VALIDATING_BUILD -> REVIEWING_PRE # Validation passed
  VALIDATING_BUILD -> READY_TO_SHIP # Skip review
  REVIEWING_PRE -> BUILDING    # Not ready, iterate
  REVIEWING_PRE -> READY_TO_SHIP # Ready to ship
  READY_TO_SHIP -> SHIPPED     # /solveos:ship
  SHIPPED -> REVIEWING_POST    # /solveos:review (post-ship)
  SHIPPED -> CYCLE_COMPLETE    # Skip post-ship review
  REVIEWING_POST -> CYCLE_COMPLETE # Review done
  CYCLE_COMPLETE -> INIT       # /solveos:new-cycle
```

### Gate Skip Rules

Gates can be skipped, but the CLI records that they were skipped in `STATE.md` for traceability:

```json
{
  "current_state": "BUILDING",
  "gates_skipped": ["RESEARCH", "PLAN_VALIDATION"],
  "gates_completed": [],
  "plan_validation_passes": 0
}
```

---

## Configuration

### `config.json` (project-level)

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
  "auto_advance": false,
  "domain": "software",
  "runtime": "opencode"
}
```

| Setting | Options | Default | Description |
|---------|---------|---------|-------------|
| `mode` | `interactive`, `auto` | `interactive` | Interactive = human confirms at each gate. Auto = advance automatically (experienced users). |
| `gates.*` | `true`, `false` | all `true` | Enable/disable individual gates. Disabled gates are skipped in the workflow. |
| `plan_validation_max_passes` | 1-5 | 3 | Maximum Plan Validation refinement passes before escalating. |
| `granularity` | `coarse`, `standard`, `fine` | `standard` | How finely Build phase decomposes work into units. |
| `auto_advance` | `true`, `false` | `false` | Whether `/solveos:next` auto-executes or just suggests. |
| `domain` | `software`, `content`, `research`, `strategy`, `general` | `software` | Adjusts agent prompts and artifact templates for the domain. |
| `runtime` | `opencode`, `claude-code`, `cursor`, `gemini`, `auto` | `auto` | Target runtime. `auto` = detect at install time. |

### Domain-Specific Adjustments

The `domain` setting modifies agent behavior:

| Domain | Plan Brief Adjustments | Build Adjustments | Ship Adjustments |
|--------|----------------------|-------------------|------------------|
| `software` | Success criteria include tests, performance; constraints include tech stack | Atomic git commits per unit; test verification | Deploy, merge PR |
| `content` | Success criteria include readability, audience match; constraints include tone/style | Draft -> edit -> polish cycle | Publish, distribute |
| `research` | Success criteria include falsifiability, coverage; constraints include sources | Literature review -> synthesis -> conclusions | Share findings, present |
| `strategy` | Success criteria include measurability, stakeholder alignment | Analysis -> options -> recommendation | Communicate decision, execute |
| `general` | No domain adjustments | Standard decomposition | Context-dependent |

---

## Installer

### Entry Point

```bash
npx solveos-cli@latest
```

### Installation Flow

1. **Runtime detection** -- Checks for OpenCode, Claude Code, Cursor, Gemini CLI config files/processes
2. **Confirmation** -- Shows detected runtime, asks user to confirm
3. **Install commands** -- Copies `commands/solveos/*.md` to the runtime's command directory
4. **Install agents** -- Copies `agents/*.md` to the runtime's agent directory
5. **Install hooks** -- Copies `hooks/*.js` to the runtime's hook directory
6. **Init project** -- Creates `.solveos/` directory with `config.json` and `STATE.md`
7. **Done** -- Prints available commands and quickstart guide

### Runtime Adapters

Each runtime has different conventions for command/agent/hook registration. The adapter pattern handles this:

```typescript
// lib/runtime-adapters/opencode.ts
import type { RuntimeAdapter } from '../types.js';

export const opencode: RuntimeAdapter = {
  detect() { /* check for .opencode config */ },
  installCommands(commandDir: string) { /* copy .md files to OpenCode command location */ },
  installAgents(agentDir: string) { /* copy .md files to OpenCode agent location */ },
  installHooks(hookDir: string) { /* copy compiled .js files to OpenCode hook location */ },
};
```

---

## Implementation Phases

### Phase 1: Foundation (MVP)

**Goal:** A working CLI that installs into OpenCode and supports the core Plan -> Build -> Ship cycle with the Plan Brief as the central artifact.

**Scope:**
- [ ] Project scaffolding (package.json, tsconfig.json, directory structure, bin entry point)
- [ ] TypeScript setup (tsc build, tsx dev runner, ESM output to dist/)
- [ ] Shared types (`src/types.ts` -- states, config, artifacts, adapter interface)
- [ ] Plan Brief template (`templates/plan-brief.md`)
- [ ] State machine (core transitions, `STATE.md` read/write)
- [ ] `/solveos:new` command (initialize project, create `.solveos/`)
- [ ] `/solveos:plan` command + `solveos-planner` agent (interactive Plan Brief creation)
- [ ] `/solveos:build` command + `solveos-executor` agent (execute against brief)
- [ ] `/solveos:ship` command (ship confirmation, cycle archive)
- [ ] `/solveos:status` command (show current state)
- [ ] `/solveos:next` command (suggest next step)
- [ ] OpenCode runtime adapter (install/detect)
- [ ] Basic configuration (`config.json` with defaults)
- [ ] Artifact management (`.solveos/` directory CRUD)

**Not in Phase 1:**
- Gates (Research, Plan Validation, Build Validation, Review)
- Wave-based parallel execution
- Other runtime adapters
- Domain-specific adjustments
- Hooks
- Tests (added in Phase 2)

**Exit criteria:**
- `npx solveos-cli` installs into an OpenCode project
- User can run `/solveos:new` -> `/solveos:plan` -> `/solveos:build` -> `/solveos:ship` and produce artifacts at each step
- `STATE.md` tracks cycle progression accurately
- Cycle archives to `history/` on ship

---

### Phase 2: Gates + Validation

**Goal:** Add the four gates that make the framework rigorous. Add Plan Validation's refining loop.

**Scope:**
- [ ] `/solveos:research` command + `solveos-researcher` agent + Research Summary template
- [ ] `/solveos:validate-plan` command + `solveos-plan-validator` agent + Plan Validation Log template
- [ ] Plan Validation refining loop (1-3 passes, gaps -> back to Plan)
- [ ] `/solveos:validate-build` command + `solveos-build-validator` agent + Build Validation template
- [ ] `/solveos:review` command + `solveos-reviewer` agent + Pre-ship and Post-ship Review templates
- [ ] Gate skip tracking in `STATE.md`
- [ ] `/solveos:new-cycle` command (feed-forward from post-ship review)
- [ ] `solveos-debugger` agent (fix issues found during validation)
- [ ] Test suite (state machine tests, artifact tests, template tests)

**Exit criteria:**
- Full cycle with all gates: Research -> Plan -> Plan Validation (x2) -> Build -> Build Validation -> Review (pre-ship) -> Ship -> Review (post-ship) -> New Cycle
- Plan Validation loops correctly (gaps found -> refine -> re-validate)
- Gate skip decisions are recorded in `STATE.md`
- Post-ship review's feed-forward items appear in next cycle's Plan

---

### Phase 3: Execution Engine + Quality

**Goal:** Add wave-based parallel execution, lightweight paths, context monitoring, and security.

**Scope:**
- [ ] Wave-based parallel execution (dependency analysis, parallel sub-agent spawning)
- [ ] `/solveos:quick` command (lightweight path)
- [ ] `/solveos:fast` command (inline trivial tasks)
- [ ] Context monitor hook (`hooks/context-monitor.ts`)
- [ ] Brief anchor hook (`hooks/brief-anchor.ts`)
- [ ] Security module (`lib/security.ts` -- path validation, injection scanning)
- [ ] Domain-specific adjustments (agent prompt variants per domain)
- [ ] Granularity settings (coarse/standard/fine decomposition)
- [ ] Comprehensive test suite (security tests, hook tests, execution tests)
- [ ] CI/CD (GitHub Actions)

**Exit criteria:**
- Build phase can decompose work into waves and execute in parallel
- Quick and Fast paths work for lightweight tasks
- Context monitor prevents context rot during long builds
- Security module catches path traversal and injection attempts
- Tests cover core logic, security, and workflow

---

### Phase 4: Multi-Runtime + Polish

**Goal:** Support additional AI coding assistants. Polish the experience.

**Scope:**
- [ ] Claude Code runtime adapter
- [ ] Cursor runtime adapter
- [ ] Gemini CLI runtime adapter
- [ ] Runtime auto-detection improvements
- [ ] `/solveos:archive` command
- [ ] Documentation (README, user guide, examples)
- [ ] npm package publication (`solveos-cli`)
- [ ] First release (v0.1.0)

**Exit criteria:**
- `npx solveos-cli` installs correctly into OpenCode, Claude Code, Cursor, and Gemini CLI
- README includes quickstart, command reference, and worked example
- Published to npm and installable

---

## Tech Stack

| Component | Technology | Reason |
|-----------|-----------|--------|
| **Language** | TypeScript (ESM) | Type safety for state machine, config schema, artifact validation, and runtime adapter interfaces. Catches invalid state transitions at compile time. |
| **Node version** | >= 20.0.0 | Matches both GSD and solveOS requirements |
| **Package manager** | npm | Standard, no additional tooling |
| **Build** | `tsc` -> ESM JS | Compiles to standard ESM for the published npm package. Users run plain JS. |
| **Dev runner** | `tsx` | Zero-config TypeScript execution during development |
| **Testing** | Node test runner + c8 | Zero external dependencies; built into Node 20+ |
| **CI** | GitHub Actions | Standard |
| **Linting** | `typescript-eslint` | Add in Phase 3 |

### Why TypeScript

1. **State machine correctness** -- The cycle has 12 states and ~20 transitions. Typed enums and discriminated unions make invalid transitions a compile error, not a runtime bug mid-cycle.
2. **Config schema safety** -- The configuration object (gates, domain, granularity, mode) is a typed interface. Typos and invalid values are caught before they reach the user.
3. **Artifact validation** -- Template rendering, artifact read/write, and state serialization benefit from typed structures.
4. **Runtime adapter contract** -- Each adapter (OpenCode, Claude Code, Cursor) implements a typed interface. Missing methods are compile errors, not silent failures.
5. **Refactoring confidence** -- As the codebase grows across 4 phases, typed code refactors safely.
6. **No cost to end users** -- The npm package ships compiled JS. Users run `npx solveos-cli` and never see TypeScript.
7. **Small overhead** -- The code surface is ~15 files. TypeScript adds `tsc` to the publish step and `tsx` to development. That's it.

---

## What Makes This Different From GSD

| Dimension | GSD | solveos-cli |
|-----------|-----|-------------|
| **Mental model** | Implicit (learn from using the tools) | Explicit (solveOS framework, Plan Brief, diverge/converge, gates) |
| **Domain** | Software only | Software, content, research, strategy, general |
| **Central artifact** | 11+ files in `.planning/` | 1 file: `BRIEF.md` (Plan Brief) + gate outputs |
| **Validation** | Plan checker agent (binary pass/fail) | Plan Validation gate with 3-pass refining loop and specific gap identification |
| **Feedback loops** | Milestone completion (implicit) | Explicit Loop 1 (Plan Validation) + Loop 2 (Ship -> Review -> next Plan) with feed-forward |
| **Agent count** | 18 | 7 (phase/gate-aligned, not domain-specific) |
| **Diverge/converge** | Not modeled | Explicit mode at each phase/gate; failure modes mapped to mode misalignment |
| **Rigor scaling** | fast / quick / full | fast / quick / full + per-gate toggle configuration |
| **Philosophy** | "Get shit done" (velocity-first) | "Solve the problem" (clarity-first, then velocity) |
| **Language** | JavaScript (no build step) | TypeScript (type-safe state machine, compiled to JS for distribution) |

---

## Open Questions

1. **npm package name:** `solveos-cli` is available? Need to verify.
2. **License:** MIT (to contrast with solveOS's current no-license state and match GSD's MIT)?
3. **Relationship to solveOS:** Is this an official implementation of solveOS, or an independent project inspired by it?
4. **Monorepo vs. single package:** Start as single package, split later if needed?
5. **Versioning strategy:** SemVer from v0.1.0? Or CalVer?

---

## Success Criteria for This Plan

- [ ] Phase 1 produces a working MVP installable in OpenCode
- [ ] A user can complete a full Plan -> Build -> Ship cycle using the CLI
- [ ] The Plan Brief template faithfully implements solveOS's 8-question format
- [ ] State tracking is accurate across the full cycle
- [ ] The architecture supports adding gates, runtimes, and domains without restructuring
