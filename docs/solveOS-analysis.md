# Repository & Product Analysis: solveOS

**Repository:** [t0k1dev/solveOS](https://github.com/t0k1dev/solveOS/tree/main)
**Live Site:** [solveos-app.netlify.app](https://solveos-app.netlify.app/)
**Analysis Date:** March 23, 2026

---

## Overview

| Attribute | Value |
|-----------|-------|
| **Name** | solveOS |
| **Description** | A problem-solving framework for builders and makers -- built for AI-first execution |
| **Primary Language** | Astro (97.3%) + JavaScript (2.7%) |
| **License** | None specified |
| **Stars** | 4 |
| **Forks** | 0 |
| **Contributors** | ~1 (t0k1dev) |
| **Commits** | 19 |
| **Releases** | None |
| **Created** | March 18, 2026 |
| **Last Updated** | March 22, 2026 |
| **Hosting** | Netlify |
| **Node Requirement** | >= 20.0.0 |

solveOS is a **mental framework** (not a software tool or library) for structured problem-solving. It provides a repeatable process -- Plan, Build, Ship, with optional validation gates -- designed from the ground up assuming AI can be the primary executor of the Build phase. The repository contains both the framework documentation (as markdown) and a landing page + docs site (as an Astro app).

---

## What solveOS Is

solveOS is a problem-solving methodology, not a code library. It is:

- **Domain-agnostic** -- applies to software, content, product, research, or any creative/building work
- **AI-first** -- assumes AI can own the Build phase; the human's primary output is a written Plan Brief
- **Tool-agnostic** -- works with any AI model, any coding assistant, or no AI at all
- **Cycle-based** -- not a one-time process but a perpetual loop: Plan -> Build -> Ship -> Review -> Plan

### The Core Loop

```
   ┌──────────────────────────────────────────────┐
   |                                              |
 Plan -> Build -> Ship -> [Review] ───────────────┘
```

### The Three Phases

| Phase | Purpose | Output |
|-------|---------|--------|
| **Plan** | Define the problem, audience, goal, constraints, and success criteria | A Plan Brief |
| **Build** | Execute against the plan; structured discovery, not blind execution | A working result |
| **Ship** | Put it in the world, in front of real people | Something live |

### The Four Optional Gates

| Gate | Position | Purpose |
|------|----------|---------|
| **Research** | Before/during Plan | Understand the problem space before committing to a direction |
| **Plan Validation** | After Plan, before Build | Verify the plan is sound; refining loop (1-3 passes) |
| **Build Validation** | During/after Build, before Ship | Verify the output matches success criteria |
| **Review** | Before Ship (pre-ship) + After Ship (post-ship) | Pre-ship: holistic judgment check. Post-ship: measure outcomes, feed into next cycle |

---

## Framework Design Philosophy

### Six Principles

1. **Clarity before action** -- State the problem, audience, and success criteria in writing before executing
2. **Build to learn** -- Building is structured discovery, not pure execution; it reveals what planning cannot
3. **Reality is the only validator** -- Only shipping and real-world feedback tells you if something works
4. **Gates reduce cost, not momentum** -- Optional checkpoints catch expensive mistakes early; skip them when stakes are low
5. **The brief is your compass** -- The Plan Brief is an active reference, not a starting artifact; silent drift is how projects fail
6. **Context must be carried forward** -- Every phase transition requires carrying what was learned, in writing; critical for AI (no memory between sessions)

### Diverge/Converge Model

Every phase and gate alternates between diverging (exploring possibilities) and converging (making decisions). The framework makes this explicit:

- **Research** -- Diverge
- **Plan** -- Diverge -> Converge
- **Plan Validation** -- Converge
- **Build** -- Diverge
- **Build Validation** -- Converge
- **Review (pre-ship)** -- Converge
- **Ship** -- Converge
- **Review (post-ship)** -- Diverge -> Converge

Common failures map to misaligned modes: diverging when you should converge (endless planning, scope creep) or converging when you should diverge (locking in before understanding the problem).

### Two Feedback Loops

**Loop 1 -- Refine before you build:**
Plan -> [Plan Validation] -> gaps found -> Plan (repeat 1-3 times until plan is executable without guesswork)

**Loop 2 -- Keep building after you ship:**
Ship -> [Review] -> Plan -> (perpetual; each cycle starts smarter than the last)

### AI-Human Division

The framework explicitly separates AI capabilities from human responsibilities:

| | AI Can | Human Must |
|---|---|---|
| **Plan** | Challenge the problem statement, sharpen constraints | Own the goal, decide what success means |
| **Build** | Produce code, text, designs from a clear brief | Decide approach, recognize when output misses the goal |
| **Validate** | Check output against criteria, flag gaps | Decide whether to ship, iterate, or cut scope |
| **Ship** | Write release notes, generate checklists | Decide "this goes in front of real people" |
| **Review** | Measure, summarize, surface patterns | Decide what to learn and change next cycle |

### The Plan Brief

The central artifact -- a written document answering eight questions:

1. What is the problem?
2. Who is this for?
3. What is the goal?
4. What is the appetite? (a conscious bet, not an estimate)
5. What are the constraints?
6. What are the success criteria?
7. What is the core assumption?
8. What are the rabbit holes?

The brief doubles as the instruction set for AI execution. Every ambiguity becomes a guess in the output.

---

## Repository Architecture

```
solveOS/
├── app/                     # Astro web application
│   ├── src/
│   │   ├── layouts/
│   │   │   ├── Layout.astro         # Base layout (design tokens, global CSS)
│   │   │   └── DocsLayout.astro     # Docs layout (left nav, search, content area)
│   │   └── pages/
│   │       ├── index.astro          # Landing page
│   │       ├── search-index.json.js # Build-time search index generator
│   │       └── docs/               # 16 documentation pages
│   ├── public/                      # Static assets
│   ├── package.json                 # Astro 4.16+, zero other dependencies
│   ├── astro.config.mjs
│   └── tsconfig.json
├── docs/                    # Framework documentation (source of truth)
│   ├── README.md            # Framework overview (8,300+ words)
│   ├── phases/
│   │   ├── plan.md          # Phase 1: Plan
│   │   ├── build.md         # Phase 2: Build
│   │   └── ship.md          # Phase 3: Ship
│   ├── gates/
│   │   ├── research.md      # Gate: Research
│   │   ├── validate-plan.md # Gate: Plan Validation
│   │   ├── validate-build.md# Gate: Build Validation
│   │   ├── validate.md      # (likely legacy or combined)
│   │   └── review.md        # Gate: Review
│   └── examples/
│       ├── write-an-article.md  # Worked example: technical article
│       └── build-a-feature.md   # Worked example: software feature
├── plans/                   # Plan briefs used to build the site itself
│   ├── webpage-plan.md      # Landing page plan brief
│   └── docs-plan.md         # Documentation site plan brief
├── .gitignore
├── netlify.toml             # Netlify deployment config
└── README.md                # Repository README
```

### Tech Stack

| Component | Technology |
|-----------|-----------|
| **Framework** | Astro 4.16+ |
| **Language** | Astro components + vanilla JavaScript |
| **Styling** | CSS custom properties (design tokens in Layout.astro) |
| **Search** | Client-side (build-time JSON index + vanilla JS fuzzy match) |
| **Hosting** | Netlify (static site) |
| **Dependencies** | Astro only -- zero runtime dependencies |
| **Build** | `astro build` via Netlify |
| **Node** | 20+ |

### Content Architecture

The project uses a strict sync hierarchy:

```
docs/               <- Source of truth for all content (never modified during web tasks)
  |
plans/docs-plan.md  <- Synced with docs/
  |
app/src/pages/docs/ <- Must stay in sync with plans/docs-plan.md
plans/webpage-plan.md <- Synced with plans/docs-plan.md for shared content
  |
app/src/pages/index.astro <- Must stay in sync with plans/webpage-plan.md
```

This is a notable design decision: the framework documentation in `docs/` is the canonical source, and the web application renders it. The plan briefs serve as intermediary specifications.

---

## Live Site Analysis (solveos-app.netlify.app)

### Landing Page

The landing page follows a 6-section commercial structure:

1. **Hero** -- Tagline, core loop diagram, CTAs
2. **The Problem** -- Four failure modes (skip planning, over-plan, lose direction, never measure)
3. **How It Works** -- Three phases with outputs
4. **AI-First Design** -- Human/AI division, context as first-class artifact
5. **The Cycle** -- Two feedback loops explained
6. **Notify** -- Email capture (currently disabled)

**Bilingual:** The entire site is EN/ES with a language toggle. All content is duplicated inline (not i18n framework).

### Documentation Site

- **16 pages** across 5 sections: Guide, Concepts, Phases, Gates, Examples
- **Left sidebar navigation** with section grouping and active page highlighting
- **Client-side search** across all documentation content
- **Dark/light mode toggle** with system default detection
- **Mobile responsive** with collapsible sidebar
- **Prev/Next navigation** at the bottom of each page

### Current State

- Framework documentation is complete and thorough
- Landing page is live and functional
- Some CTAs are marked "coming soon" (email capture disabled)
- No CLI or tooling exists yet -- purely documentation at this stage
- No releases, no npm package, no installable artifact

---

## Documentation Quality Assessment

### Depth and Completeness

The documentation is remarkably thorough for a 5-day-old project:

| Document | Approx. Words | Quality |
|----------|--------------|---------|
| Framework Overview (README.md) | ~8,300 | Comprehensive; covers philosophy, structure, AI integration, and all six principles |
| Plan Phase | ~2,100 | Strong; includes template, common mistakes table, AI prompts, exit checklist |
| Build Phase | ~2,400 | Strong; includes AI failure modes table, mid-build check guidance |
| Ship Phase | ~1,800 | Good; includes context-specific definitions of "shipped" |
| Research Gate | ~1,200 | Good; includes Five Whys technique, time-bounded approach |
| Plan Validation Gate | ~2,000 | Strong; includes 3-pass refinement loop, exit conditions |
| Build Validation Gate | ~1,000 | Good; covers functional, scope, and stability checks |
| Review Gate | ~3,000 | Comprehensive; covers both pre-ship and post-ship modes, continuation loop, when to stop |
| Article Example | ~1,600 | Excellent; full worked cycle with clear agent/human/decision structure |
| Feature Example | ~2,500 | Excellent; includes Plan Validation x2, mid-build blocker, post-ship review at day 10 |

**Total framework documentation:** ~26,000+ words across 10+ files.

### Worked Examples

The two examples are the strongest part of the documentation. They demonstrate the framework applied to:

1. **Writing a technical article** -- Research -> Plan -> Plan Validation -> Build -> Ship
2. **Fixing a slow analytics dashboard** -- Research -> Plan -> Plan Validation (x2) -> Build -> Build Validation -> Review (pre + post) -> Ship

Each example uses a consistent structure: **Instruction given to agent -> Output from agent -> Human decision**. This makes the human/AI handoff concrete rather than abstract.

---

## Strengths

1. **Intellectually rigorous** -- The framework is well-thought-out. The diverge/converge model, the two feedback loops, and the explicit AI/human division are sophisticated design decisions, not marketing fluff.

2. **Genuinely domain-agnostic** -- The worked examples prove this: one is writing an article, one is fixing software. The framework structure applies equally to both.

3. **Documentation-first approach** -- Shipping 26,000+ words of framework documentation before any tooling is a deliberate choice that matches the framework's own principles (clarity before action).

4. **Self-referential integrity** -- The `plans/` directory contains the Plan Briefs used to build the website itself. The project practices what it preaches. The webpage plan brief and docs plan brief are excellent examples of the Plan Brief template in action.

5. **AI-native design** -- Unlike frameworks that bolt AI onto existing processes, solveOS treats AI as a first-class participant with explicit guidance on where AI adds value and where human judgment must lead.

6. **Minimal tech stack** -- Astro with zero additional dependencies. The site is fast, static, and simple. No overengineering.

7. **Strong worked examples** -- The feature example includes a race condition discovered mid-build, a Plan Validation that catches vague success criteria, and a post-ship review with real metrics. These are realistic scenarios, not sanitized demos.

8. **Context as first-class artifact** -- The principle that AI has no memory between sessions and context must be explicitly carried forward is a practical insight that most AI frameworks ignore.

---

## Weaknesses / Risks

1. **No tooling exists** -- solveOS is currently a set of markdown documents and a landing page. There is no CLI, no npm package, no templates you can install, no automation. Compared to competitors like GSD (40+ commands, 18 agents, hooks, installer), solveOS is purely conceptual at this stage.

2. **Single contributor, 5 days old** -- 19 commits from one author over 5 days. The project has no community, no external validation, and no track record of iteration based on real-world usage.

3. **No license** -- The repository has no license file. This means it is technically "all rights reserved" by default, which prevents legal reuse, forking, or contribution.

4. **No tests** -- Zero test files. The Astro site has no build verification beyond `astro build` succeeding.

5. **No CI/CD** -- No GitHub Actions, no automated testing, no linting. Deployment relies solely on Netlify's build pipeline.

6. **Bilingual inline duplication** -- The EN/ES content is duplicated inline in every Astro component rather than using an i18n framework. This will become a maintenance burden as content grows.

7. **"Coming soon" surface area** -- Email capture, several CTAs, and CLI references are disabled. The landing page promises things that don't exist yet.

8. **No enforcement mechanism** -- The framework is advisory. Unlike GSD (which enforces structure through slash commands and agents), solveOS relies on the human to follow the process manually. There is nothing that prevents someone from skipping Plan Validation or ignoring the Review gate.

9. **No versioning strategy** -- No releases, no changelog, no version numbering. The framework documentation may change without any way to track what changed.

10. **Untested in the wild** -- The framework's effectiveness claims are theoretical. The worked examples are constructed scenarios, not case studies from real adoption.

---

## Comparison with GSD (Get Shit Done)

Since GSD and solveOS operate in the same space (structured AI-assisted building), a comparison is useful:

| Dimension | solveOS | GSD |
|-----------|---------|-----|
| **Type** | Conceptual framework (documentation) | Tooling system (commands, agents, hooks) |
| **Maturity** | 5 days old, 19 commits | 3 months, 1,361 commits, 39 releases |
| **Community** | 4 stars, 1 contributor | 39,868 stars, 95 contributors |
| **Enforcement** | Advisory (human follows process manually) | Automated (slash commands, agents enforce structure) |
| **AI integration** | Framework describes where AI fits; no code | 18 specialized agents, hooks, context management |
| **Domain scope** | Any problem (software, content, research, strategy) | Software development specifically |
| **Philosophy** | "AI executes, human decides" at every gate | "Claude does the work, GSD makes it reliable" |
| **Plan artifact** | Plan Brief (8-question template) | PROJECT.md + REQUIREMENTS.md + ROADMAP.md + STATE.md |
| **Feedback loops** | Explicit: Plan Validation loop + Ship/Review loop | Implicit: discuss -> plan -> execute -> verify -> ship cycle |
| **Tooling** | None (markdown + Astro site) | npm installer, 40+ commands, 18 agents, 5 hooks |
| **Runtime support** | Any (framework is tool-agnostic) | 8 specific AI coding tools |
| **License** | None | MIT |

### Key Differences

- **GSD is a tool; solveOS is a method.** GSD gives you commands to run. solveOS gives you a process to follow.
- **GSD is software-specific; solveOS is universal.** solveOS explicitly supports non-code work (articles, strategy, research). GSD is designed for code.
- **GSD enforces; solveOS advises.** GSD's agents prevent context rot automatically. solveOS's context principle requires the human to carry context forward manually.
- **GSD has traction; solveOS has ideas.** GSD's 40k stars validate market demand. solveOS's 4 stars mean it's untested.

### Complementary Potential

The two approaches are not mutually exclusive. solveOS's conceptual framework (Plan Brief, diverge/converge, gates, feedback loops) could serve as the mental model behind GSD's tooling. GSD's execution engine could be the enforcement mechanism for solveOS's advisory process.

---

## Development Velocity

| Date | Activity |
|------|----------|
| Mar 18, 2026 | Repository created; initial commit with framework docs + landing page |
| Mar 19, 2026 | Netlify deployment; gitignore cleanup |
| Mar 20, 2026 | Complete docs site (16 pages, search, dark mode); landing page polish; language toggle; Research gate reframe |
| Mar 20-22 | No further commits |

The bulk of the work was done in a single day (March 20), suggesting heavy AI-assisted development -- which would be consistent with the framework's own philosophy.

---

## Conclusion

solveOS is an intellectually strong problem-solving framework with thorough documentation and a clear philosophy. Its AI-first design, explicit diverge/converge model, dual feedback loops, and Plan Brief template are well-conceived contributions to the space.

However, it is currently a conceptual framework with no tooling, no community, no license, and no real-world validation. The documentation quality is high, but documentation alone does not solve the enforcement problem: nothing prevents users from skipping the steps that make the framework effective.

The project's next steps will determine whether it remains an interesting set of ideas or becomes a practical system. The most impactful additions would be:

1. **Add a license** (MIT or similar) to enable adoption and contribution
2. **Build a CLI or template system** that generates Plan Briefs, gates, and review artifacts
3. **Publish real case studies** from actual projects using the framework
4. **Create integration points** with AI coding assistants (Claude Code commands, OpenCode slash commands) to bridge the gap between advisory framework and enforced process
5. **Version the framework** with a changelog so users can track evolution

The framework's ideas are sound. Whether they gain traction depends on execution -- which, fittingly, is exactly what solveOS itself is about.
