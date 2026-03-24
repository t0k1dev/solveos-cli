# Repository Analysis: Get Shit Done (GSD)

**Repository:** [gsd-build/get-shit-done](https://github.com/gsd-build/get-shit-done)
**Analysis Date:** March 23, 2026

---

## Overview

| Attribute | Value |
|-----------|-------|
| **Name** | `get-shit-done-cc` (npm) |
| **Description** | Meta-prompting, context engineering & spec-driven development system |
| **Primary Language** | JavaScript (~1.48 MB) + Shell (~1.4 KB) |
| **License** | MIT |
| **Stars** | 39,868 |
| **Forks** | 3,241 |
| **Contributors** | 95 |
| **Commits** | 1,361 |
| **Releases** | 39 (latest: v1.28.0, March 22 2026) |
| **Created** | December 14, 2025 |
| **Node Requirement** | >= 20.0.0 |

GSD is a **prompt engineering framework** (not a traditional application) that installs as a set of slash commands, agents, and hooks into AI coding assistants. It provides structured workflows for spec-driven development, solving what it calls "context rot" -- the quality degradation that happens as an LLM fills its context window.

**Supported runtimes:** Claude Code, OpenCode, Gemini CLI, Codex, GitHub Copilot, Cursor, Antigravity, and Windsurf.

---

## Architecture

The codebase is organized into clear layers:

```
get-shit-done/
├── bin/               # Installer (install.js) - npx entry point
├── commands/gsd/      # 40+ slash command definitions (.md files)
├── agents/            # 18 specialized sub-agent prompts (.md files)
├── hooks/             # 5 runtime hooks (JS) - context monitor, prompt guard, etc.
├── get-shit-done/     # Core library
│   ├── bin/           # CLI binaries and library code (.cjs)
│   ├── commands/      # Command implementations
│   ├── references/    # Reference documentation
│   ├── templates/     # Document templates
│   └── workflows/     # Workflow orchestration logic
├── scripts/           # Build scripts (hooks bundling, test runner)
├── tests/             # 41 test files (.test.cjs)
└── docs/              # Extensive documentation (EN, JA, ZH-CN, PT-BR)
```

---

## Core Design Patterns

### 1. Multi-Agent Orchestration

A thin orchestrator spawns specialized agents (researchers, planners, executors, verifiers) with fresh context windows. This keeps the main context clean and prevents quality degradation over long sessions.

### 2. Wave-Based Parallel Execution

Plans are dependency-analyzed and grouped into waves. Independent plans run in parallel; dependent plans wait for their prerequisites.

```
WAVE 1 (parallel)          WAVE 2 (parallel)          WAVE 3
┌─────────┐ ┌─────────┐    ┌─────────┐ ┌─────────┐    ┌─────────┐
│ Plan 01 │ │ Plan 02 │ -> │ Plan 03 │ │ Plan 04 │ -> │ Plan 05 │
│ User    │ │ Product │    │ Orders  │ │ Cart    │    │ Checkout│
│ Model   │ │ Model   │    │ API     │ │ API     │    │ UI      │
└─────────┘ └─────────┘    └─────────┘ └─────────┘    └─────────┘
```

### 3. XML-Structured Prompts

Plans are formatted as XML optimized for Claude's parsing, with explicit `<task>`, `<action>`, `<verify>`, and `<done>` tags.

### 4. Atomic Git Commits

Each task produces its own commit, enabling `git bisect` and individual revert.

### 5. Document-Driven State

The system generates and maintains a set of markdown artifacts (`PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md`, etc.) that serve as the LLM's persistent memory across sessions.

---

## Workflow

The core loop is: **discuss -> plan -> execute -> verify -> ship**, per phase:

1. `/gsd:new-project` -- Interactive setup (questions, research, requirements, roadmap)
2. `/gsd:discuss-phase N` -- Capture user intent and preferences
3. `/gsd:plan-phase N` -- Research + create atomic plans + verify plans
4. `/gsd:execute-phase N` -- Run plans in parallel waves with fresh context
5. `/gsd:verify-work N` -- User acceptance testing with auto-debug
6. `/gsd:ship N` -- Create PR from verified work

Additional utilities include `/gsd:quick` for ad-hoc tasks, `/gsd:fast` for trivial inline tasks, `/gsd:next` for auto-advancing the workflow, and workstream management for parallel milestone work.

---

## Specialized Agents (18)

| Agent | Role |
|-------|------|
| `gsd-executor` | Implements plans in fresh context |
| `gsd-planner` | Creates atomic task plans |
| `gsd-plan-checker` | Verifies plans achieve goals |
| `gsd-phase-researcher` | Domain research per phase |
| `gsd-project-researcher` | Broad project-level research |
| `gsd-research-synthesizer` | Synthesizes research findings |
| `gsd-verifier` | Post-execution verification |
| `gsd-debugger` | Systematic debugging |
| `gsd-codebase-mapper` | Analyzes existing codebases |
| `gsd-roadmapper` | Creates phased roadmaps |
| `gsd-assumptions-analyzer` | Surfaces and validates assumptions |
| `gsd-advisor-researcher` | Advisory research agent |
| `gsd-integration-checker` | Cross-component integration checks |
| `gsd-ui-auditor` | UI visual audit |
| `gsd-ui-researcher` | UI pattern research |
| `gsd-ui-checker` | UI quality verification |
| `gsd-nyquist-auditor` | Milestone completeness auditing |
| `gsd-user-profiler` | Developer behavioral profiling |

---

## Context Engineering Artifacts

| File | Purpose |
|------|---------|
| `PROJECT.md` | Project vision, always loaded |
| `research/` | Ecosystem knowledge (stack, features, architecture, pitfalls) |
| `REQUIREMENTS.md` | Scoped v1/v2 requirements with phase traceability |
| `ROADMAP.md` | Where you're going, what's done |
| `STATE.md` | Decisions, blockers, position -- memory across sessions |
| `CONTEXT.md` | Per-phase discussion decisions |
| `PLAN.md` | Atomic task with XML structure, verification steps |
| `SUMMARY.md` | What happened, what changed, committed to history |
| `todos/` | Captured ideas and tasks for later work |
| `threads/` | Persistent context threads for cross-session work |
| `seeds/` | Forward-looking ideas that surface at the right milestone |

---

## Security Posture

Since v1.27, GSD includes defense-in-depth security measures:

- **Path traversal prevention** -- All user-supplied file paths are validated to resolve within the project directory
- **Prompt injection detection** -- Centralized `security.cjs` module scans for injection patterns in user-supplied text
- **PreToolUse prompt guard hook** -- `gsd-prompt-guard` scans writes to `.planning/` for embedded injection vectors
- **Safe JSON parsing** -- Malformed arguments are caught before they corrupt state
- **Shell argument sanitization** -- User text is sanitized before shell interpolation
- **CI-ready injection scanner** -- `prompt-injection-scan.test.cjs` scans all agent/workflow/command files

This is notable because GSD generates markdown that becomes LLM system prompts, making indirect prompt injection a real attack surface.

---

## Test Coverage

- **41 test files** covering core logic, configuration, installers, security, runtime converters, and workflow features
- Coverage target: 70% lines (via `c8`)
- CI via GitHub Actions (`test.yml`)
- Tests cover: agent frontmatter, config parsing, discuss modes, execution waves, forensics, model profiles, runtime converters, security scanning, state management, templates, UAT, workspaces, and workstreams

---

## Development Velocity

- **Extremely active**: 5 releases in the last 7 days (v1.25.0 through v1.28.0)
- **Fast iteration**: 1,361 commits since December 2025 (~3 months)
- Multiple i18n translations (Japanese, Chinese, Portuguese)
- 4 open PRs, 8 open issues at time of analysis

---

## Top Contributors

| Contributor | Commits | Notes |
|-------------|---------|-------|
| `glittercowboy` (TACHES) | 899 | Creator, primary maintainer |
| `trek-e` | 216 | Major contributor |
| `Tibsfox` | 27 | |
| `Solvely-Colin` | 16 | |
| `j2h4u` | 11 | |
| `diegomarino` | 9 | |
| `jecanore` | 7 | |
| `jjshanks` | 6 | |
| `SalesTeamToolbox` | 6 | |
| `davesienkowski` | 6 | |

---

## Strengths

1. **Solves a real problem** -- Context window degradation is the #1 pain point with agentic coding. GSD's approach of spawning fresh sub-agents per plan is architecturally sound.

2. **Well-documented** -- Extensive docs, user guide, architecture docs, multi-language READMEs (EN, JA, ZH-CN, PT-BR).

3. **Broad runtime support** -- 8 AI coding tools supported from a single installer via `npx get-shit-done-cc@latest`.

4. **Strong testing** -- 41 test files for what is essentially a prompt engineering framework is unusually thorough for this category.

5. **Security-conscious** -- Proactive prompt injection defense is rare in the AI tooling space.

6. **Active community** -- 95 contributors, ~40k stars, Discord community, rapid release cadence.

7. **Clean separation of concerns** -- Orchestrator pattern keeps agents focused; document-driven state provides persistence without databases.

8. **Composable workflow** -- Quick mode, fast mode, full planning mode, and autonomous mode serve different task sizes appropriately.

---

## Weaknesses / Risks

1. **Single-maintainer risk** -- `glittercowboy` has 66% of all commits. Bus factor is low despite 95 contributors.

2. **Rapid, possibly unstable release cadence** -- 5 releases in a week suggests either very fast iteration or instability requiring frequent patches.

3. **Runtime coupling** -- Deep integration with Claude Code's command/agent/hook system means breaking changes in any of the 8 supported runtimes could cascade.

4. **No runtime code, only prompts** -- The "core library" is mostly markdown prompt files and a JS installer. The actual work is done by the LLM, making behavior non-deterministic and hard to guarantee.

5. **`--dangerously-skip-permissions` recommended** -- The README explicitly recommends running Claude Code without permission checks, which is a significant security trade-off that contradicts the otherwise security-conscious design.

6. **Crypto token presence** -- A `$GSD` Solana token (Dexscreener link) badge in the README is unusual for a developer tool and may raise credibility concerns for enterprise adoption.

7. **Prompt brittleness** -- As a prompt engineering system, effectiveness is tied to specific model behaviors that can change with model updates from Anthropic, Google, or OpenAI.

8. **Learning curve** -- Despite the "simple" marketing, the system has 40+ commands, 18 agents, multiple modes, and extensive configuration. New users may find the surface area overwhelming.

---

## Configuration Options

### Core Settings

| Setting | Options | Default | Description |
|---------|---------|---------|-------------|
| `mode` | `yolo`, `interactive` | `interactive` | Auto-approve vs confirm at each step |
| `granularity` | `coarse`, `standard`, `fine` | `standard` | How finely scope is sliced |

### Model Profiles

| Profile | Planning | Execution | Verification |
|---------|----------|-----------|--------------|
| `quality` | Opus | Opus | Sonnet |
| `balanced` (default) | Opus | Sonnet | Sonnet |
| `budget` | Sonnet | Sonnet | Haiku |
| `inherit` | Inherit | Inherit | Inherit |

### Workflow Agents (toggleable)

| Setting | Default | Description |
|---------|---------|-------------|
| `workflow.research` | `true` | Research domain before planning |
| `workflow.plan_check` | `true` | Verify plans before execution |
| `workflow.verifier` | `true` | Confirm delivery after execution |
| `workflow.auto_advance` | `false` | Auto-chain workflow steps |
| `workflow.discuss_mode` | `discuss` | Interview vs codebase-first |

---

## Conclusion

GSD is a well-executed prompt engineering framework that has gained significant traction (~40k stars) in approximately 3 months. It addresses a genuine problem -- making agentic coding tools more reliable through structured context management, multi-agent orchestration, and spec-driven workflows. The architecture is clean, the documentation is thorough, and the test coverage is above average for this category.

The main risks are single-maintainer dependency, inherent non-determinism of LLM-driven workflows, and the rapid release cadence that may indicate instability. For teams evaluating GSD, the `inherit` model profile and granular permission settings provide a safer entry point than the recommended `--dangerously-skip-permissions` approach.
