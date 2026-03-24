# Similarities Between GSD and solveOS

**Analysis Date:** March 23, 2026

**Subjects:**
- [Get Shit Done (GSD)](https://github.com/gsd-build/get-shit-done) -- v1.28.0, 39,868 stars
- [solveOS](https://github.com/t0k1dev/solveOS) -- 4 stars, no releases

---

## Executive Summary

Despite differing dramatically in maturity, form factor, and community size, GSD and solveOS share a remarkably similar set of core beliefs about how AI-assisted work should be structured. Both projects arrived at nearly identical conclusions about the problems worth solving and the patterns that solve them -- one through tooling, the other through theory. This document maps where they converge.

---

## 1. The Same Core Problem

Both projects identify the same root failure modes in AI-assisted work:

| Failure Mode | GSD's Framing | solveOS's Framing |
|---|---|---|
| No planning | "Vibecoding has a bad reputation. You describe what you want, AI generates code, and you get inconsistent garbage." | "They skip planning. They jump into execution without a clear goal and end up building the wrong thing." |
| Context loss | "Context rot -- the quality degradation that happens as Claude fills its context window." | "They lose direction. The goal defined at the start gets distorted by the time execution ends." |
| No verification | GSD's `/gsd:verify-work` exists because without it, "automated verification checks that code exists and tests pass, but does the feature *work*?" | "They never measure. They ship something, move on, and never find out if it worked." |
| Over-planning | GSD offers `/gsd:fast` and `/gsd:quick` explicitly to avoid over-planning small tasks | "They over-plan. They get stuck refining the plan and never ship anything real." |

Both projects frame these as the **primary reasons AI-assisted work fails** -- not AI capability, but human process around AI.

---

## 2. Plan Before You Build

Both systems treat a written planning artifact as the foundation of all execution.

| Aspect | GSD | solveOS |
|--------|-----|---------|
| **Central artifact** | `PROJECT.md` + `REQUIREMENTS.md` + `ROADMAP.md` | Plan Brief (single document, 8 questions) |
| **Created when** | `/gsd:new-project` (interactive questions -> research -> requirements -> roadmap) | Plan phase (define problem, audience, goal, constraints, success criteria) |
| **Purpose** | "Gives Claude everything it needs to do the work *and* verify it" | "The instruction set you hand to an AI agent when Build begins. Every ambiguity becomes a guess." |
| **Written, not verbal** | All artifacts are markdown files committed to `.planning/` | "Clarity established in Plan doesn't maintain itself... commit to the plan -- in writing." |

**The shared insight:** A written plan specific enough for an AI to execute without clarifying questions is the highest-leverage artifact in AI-assisted work.

---

## 3. Research Before Planning

Both systems include a dedicated research step before planning begins.

| Aspect | GSD | solveOS |
|--------|-----|---------|
| **Mechanism** | `/gsd:new-project` spawns parallel research agents; `/gsd:plan-phase` runs phase-specific research | Research gate (optional, before/during Plan) |
| **Agents** | `gsd-project-researcher`, `gsd-phase-researcher`, `gsd-research-synthesizer` | No automated agents; human or AI conducts research manually |
| **Output** | `.planning/research/` directory with ecosystem knowledge | Research Summary (question, findings, conclusions, open questions) |
| **Time-bounded** | Research agents run within execution context | "Research without a time limit becomes avoidance. Set a specific limit." |

**The shared insight:** Understanding the problem space before committing to a plan prevents building the wrong thing. Both systems place research before plan creation, not during execution.

---

## 4. Plan Validation Loop

Both systems validate plans before execution -- and both treat validation as an iterative loop, not a one-time check.

| Aspect | GSD | solveOS |
|--------|-----|---------|
| **Mechanism** | `gsd-plan-checker` agent verifies plans achieve phase goals; loops until pass | Plan Validation gate: 3 questions, 1-3 passes, loop until plan is executable |
| **The 3 questions** | Plans checked against requirements, phase goals, and implementation feasibility | "Is the problem correctly stated? Is the plan feasible? Is it specific enough to build from?" |
| **Loop behavior** | "Validates, manages iteration... loop until pass" | "Plan -> [Plan Validation] -> gaps found -> Plan... typically 1-3 passes" |
| **Can be skipped** | `--skip-verify` flag; `/gsd:fast` skips entirely | "Gates are not mandatory, but skipping them has a cost" |

**The shared insight:** Plans feel complete when written but usually aren't. A structured check-and-refine loop before execution catches ambiguity when it's cheapest to fix.

---

## 5. Fresh Context Per Task

Both systems recognize that context accumulation degrades AI output quality, and both solve it by isolating execution into fresh contexts.

| Aspect | GSD | solveOS |
|--------|-----|---------|
| **Implementation** | Sub-agents spawned with fresh 200k token context per plan; main context stays at 30-40% | "AI has no memory between sessions. solveOS treats context as a first-class artifact." |
| **Mechanism** | Automated: orchestrator spawns executors in parallel waves | Manual: Plan Brief + reference files carry context forward between sessions |
| **Key principle** | "Fresh context per plan -- 200k tokens purely for implementation, zero accumulated garbage" | "Context must be carried forward... every phase transition requires carrying what was learned, in writing" |

**The shared insight:** AI context windows are finite and degrade with accumulation. Both systems address this -- GSD through automated context isolation, solveOS through explicit context handoff documentation.

---

## 6. Document-Driven State

Both systems use written markdown artifacts as the persistent memory layer for AI work.

### GSD's Artifacts

| Artifact | Purpose |
|----------|---------|
| `PROJECT.md` | Project vision, always loaded |
| `REQUIREMENTS.md` | Scoped requirements with phase traceability |
| `ROADMAP.md` | Phase plan and completion status |
| `STATE.md` | Decisions, blockers, current position |
| `CONTEXT.md` | Per-phase discussion decisions |
| `PLAN.md` | Atomic task with verification steps |
| `SUMMARY.md` | What happened, committed to history |

### solveOS's Artifacts

| Artifact | Purpose |
|----------|---------|
| Plan Brief | Problem, audience, goal, constraints, success criteria, assumptions |
| Research Summary | Question, findings, conclusions, open questions |
| Plan Validation Log | Pass number, gaps found, changes made, decision |
| Build Validation | Success criteria status, scope drift, known issues |
| Review (pre-ship) | Goal alignment, weakest part, ship readiness |
| Review (post-ship) | Criteria measurement, what worked/didn't, feed forward |

**The shared insight:** AI has no memory. Written documents are the only reliable way to carry decisions, constraints, and learnings across sessions. Both systems generate structured documents at every phase transition.

---

## 7. Human Decides, AI Executes

Both systems draw the same line between human and AI responsibility.

| Role | GSD | solveOS |
|------|-----|---------|
| **AI's role** | "Claude Code does [the work]"; agents research, plan, execute, verify | "AI can... produce code, text, designs given a clear brief" |
| **Human's role** | "You approve the roadmap"; user accepts/rejects at each gate | "The human reads that output and makes a decision: accept, reject, revise, iterate" |
| **Decision authority** | Human approves roadmap, verifies work, decides to ship | "AI does not decide what gets shipped. That call belongs to the human at every step." |
| **Gate pattern** | `/gsd:verify-work` presents deliverables one at a time; human says yes/no | "At every gate, the human reads the output and decides whether to proceed or go back" |

**The shared insight:** AI is capable of execution but not of judgment about what should exist. The human owns the goal, the plan, and the ship decision. AI owns the implementation.

---

## 8. Phased, Sequential Workflow

Both systems enforce a linear phase progression where each phase must complete before the next begins.

| GSD Phase | solveOS Phase | Shared Purpose |
|-----------|---------------|----------------|
| `/gsd:new-project` | Plan | Define the problem, scope, and success criteria |
| `/gsd:discuss-phase` | Plan (discussion within) | Capture preferences and resolve ambiguity before building |
| `/gsd:plan-phase` | Plan + [Plan Validation] | Create executable plans and verify they're sound |
| `/gsd:execute-phase` | Build | Execute against the plan |
| `/gsd:verify-work` | [Build Validation] + [Review pre-ship] | Verify output matches the goal |
| `/gsd:ship` | Ship | Put it in front of real people |
| `/gsd:complete-milestone` -> `/gsd:new-milestone` | [Review post-ship] -> Plan | Capture learnings, start the next cycle |

**The shared insight:** Phases must be completed in order. Skipping ahead (building before planning, shipping before verifying) is the primary cause of quality problems.

---

## 9. Verification Against Success Criteria

Both systems verify completed work against predefined success criteria, not just "does it run."

| Aspect | GSD | solveOS |
|--------|-----|---------|
| **Pre-execution verification** | `gsd-plan-checker` validates plans against phase goals | Plan Validation checks feasibility and specificity |
| **Post-execution verification** | `gsd-verifier` checks codebase against goals; `/gsd:verify-work` runs user acceptance testing | Build Validation: "Does it work? Does it match the plan? Is it stable enough to ship?" |
| **Human verification** | "Automated verification checks code exists and tests pass. But does the feature *work*?" | "At every gate, the human reads the output and decides whether to proceed or go back" |
| **Fix loop** | Creates fix plans for re-execution | "If issues found, iterate -- go back to Build" |

**The shared insight:** "It compiles" and "it passes tests" are not sufficient verification. Both systems require checking output against the original goals and success criteria, with human judgment as the final arbiter.

---

## 10. Cyclical, Not Linear

Both systems treat shipping as the beginning of the next cycle, not the end of work.

| Aspect | GSD | solveOS |
|--------|-----|---------|
| **Cycle mechanism** | `/gsd:complete-milestone` -> `/gsd:new-milestone` starts next version with same flow | "Ship -> [Review] -> Plan -> Build -> Ship -> ..." |
| **Learning transfer** | `STATE.md` carries decisions and blockers; `SUMMARY.md` captures what happened | "Review captures what worked, what didn't, and what you discovered -- feeds directly into next Plan" |
| **Explicit framing** | "Each milestone is a clean cycle: define -> build -> ship" | "Shipping is the beginning of knowing, not the end of the work. Every cycle starts smarter than the last." |

**The shared insight:** Software (and any creative work) is never "done." Both systems treat completion as a transition point that feeds learnings into the next iteration.

---

## 11. Optional Rigor Based on Stakes

Both systems provide mechanisms to scale process rigor up or down based on task complexity.

| Rigor Level | GSD | solveOS |
|-------------|-----|---------|
| **Minimal** | `/gsd:fast` -- inline trivial tasks, skip planning entirely | Skip all gates; go Plan -> Build -> Ship directly |
| **Light** | `/gsd:quick` -- planner + executor, no research or verification | Use Research and Plan Validation only; skip Build Validation |
| **Standard** | Full cycle: discuss -> plan -> execute -> verify -> ship | Full cycle with all gates: Research -> Plan -> Plan Validation -> Build -> Build Validation -> Review -> Ship |
| **Maximum** | `/gsd:quick --full --discuss --research` or full phase with all agents enabled | Multiple Plan Validation passes + Build Validation + pre-ship Review + post-ship Review |

**The shared insight:** Not every task needs full ceremony. Both systems provide lighter paths for small tasks and heavier paths for high-stakes work, rather than forcing one-size-fits-all process.

---

## 12. Anti-Scope-Creep Mechanisms

Both systems explicitly address scope drift during execution.

| Mechanism | GSD | solveOS |
|-----------|-----|---------|
| **Scope definition** | `REQUIREMENTS.md` with v1/v2/out-of-scope classification | Plan Brief includes "Out of scope" and "Rabbit holes" sections |
| **Drift detection** | Plans are atomic and scoped; verification checks against original goals | "Every decision made during Build is an opportunity to drift from the original goal" |
| **Course correction** | Plan checker verifies against requirements; verification flags gaps | "When what you're building no longer matches the brief, you either update the brief in writing or course correct. Silent drift is how projects fail." |
| **Brief as anchor** | `PROJECT.md` is "always loaded" as context | "The Plan Brief is not a starting artifact -- it is an active reference" |

**The shared insight:** Plans drift silently during execution. Both systems use the planning document as an active anchor that is checked against repeatedly, not a write-once artifact.

---

## 13. Structured AI Prompting

Both systems create structured, specific instructions for AI execution rather than relying on conversational prompting.

| Aspect | GSD | solveOS |
|--------|-----|---------|
| **Format** | XML-structured plans: `<task>`, `<action>`, `<verify>`, `<done>` tags | Plan Brief template: Problem, Audience, Goal, Appetite, Constraints, Success Criteria, Core Assumption, Rabbit Holes |
| **Specificity standard** | "Precise instructions. No guessing. Verification built in." | "Write it so that someone who didn't write it could execute it and produce the same result" |
| **Verification built-in** | Each task has a `<verify>` step: e.g., "curl -X POST localhost:3000/api/auth/login returns 200" | Each plan has success criteria: measurable, checkable conditions |
| **Reference material** | Context files, codebase mapping, research artifacts loaded alongside plans | "Reference files -- files that help AI understand the environment it is building in" |

**The shared insight:** Conversational prompting produces inconsistent results. Both systems move toward structured, template-driven instructions where the AI receives precise context, clear goals, and built-in verification criteria.

---

## 14. Atomic, Verifiable Units of Work

Both systems break large tasks into small, independently completable and verifiable units.

| Aspect | GSD | solveOS |
|--------|-----|---------|
| **Unit size** | "Each plan is small enough to execute in a fresh context window" | "The smallest possible units of work that can be completed and verified independently" |
| **Verifiability** | Each task has `<verify>` and `<done>` conditions | "Independently verifiable ('is this done?')" |
| **Traceability** | "Traceable back to requirements"; atomic git commits per task | "Traceable back to the Plan Brief" |
| **Commit strategy** | One commit per task: `feat(08-02): add email confirmation flow` | Not prescribed (no tooling), but the principle is the same |

**The shared insight:** Large, monolithic tasks are harder to verify, harder to debug, and harder to revert. Both systems decompose work into small units that can be independently checked and committed.

---

## Summary Table: Shared Principles

| # | Shared Principle | GSD Implementation | solveOS Implementation |
|---|---|---|---|
| 1 | Same core problem (unstructured AI work fails) | Tooling that enforces structure | Documentation that teaches structure |
| 2 | Plan before you build | `PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md` | Plan Brief (8-question template) |
| 3 | Research before planning | Parallel research agents | Research gate with time limits |
| 4 | Plan validation loop | `gsd-plan-checker` iterates until pass | Plan Validation gate, 1-3 passes |
| 5 | Fresh context per task | Sub-agents with fresh 200k token windows | Explicit context handoff in writing |
| 6 | Document-driven state | 11+ artifact types in `.planning/` | 6+ artifact types per cycle |
| 7 | Human decides, AI executes | User approves at each gate | Human reads output, makes the call |
| 8 | Phased, sequential workflow | discuss -> plan -> execute -> verify -> ship | Plan -> Build -> Ship with gates |
| 9 | Verification against criteria | Automated + human UAT | Build Validation + Review gates |
| 10 | Cyclical iteration | Milestone completion -> new milestone | Ship -> Review -> next Plan |
| 11 | Scalable rigor | fast / quick / full modes | Skip or include gates based on stakes |
| 12 | Anti-scope-creep | Requirements scoping + plan checker | Out of scope + rabbit holes + brief as anchor |
| 13 | Structured AI instructions | XML task format with verify/done | Plan Brief template with success criteria |
| 14 | Atomic units of work | Plans per fresh context + atomic commits | Smallest independently verifiable units |

---

## What This Convergence Means

GSD and solveOS were developed independently, by different authors, with different goals (tooling vs. theory), for different audiences (Claude Code power users vs. general builders). Yet they converged on 14 shared principles about how AI-assisted work should be structured.

This convergence suggests these principles are not arbitrary design choices but **emerging best practices** in the AI-assisted development space:

1. **Written plans beat conversational prompting** -- Both systems invest heavily in structured planning artifacts.
2. **Context management is the #1 problem** -- Both systems treat context loss as the primary failure mode, not AI capability.
3. **Verification must be explicit** -- Both systems require checking output against predefined criteria, not vibes.
4. **Humans own decisions, AI owns execution** -- Both systems draw this line at the same place.
5. **Process should scale with stakes** -- Both systems provide lighter and heavier paths rather than one-size-fits-all.

The difference is in delivery: GSD enforces these principles through tooling; solveOS teaches them through documentation. A system that combines both -- the mental model of solveOS with the automation of GSD -- would be stronger than either alone.
