# Changelog

## v0.1.0 (2026-03-23)

First public release.

### Features

- **Core cycle:** Plan -> Build -> Ship with 11 states and ~20 transitions
- **14 slash commands:** new, research, plan, validate-plan, build, validate-build, review, ship, status, next, new-cycle, quick, fast, archive
- **7 specialized agents:** planner, researcher, executor, plan-validator, build-validator, reviewer, debugger
- **4 quality gates:** Research, Plan Validation, Build Validation, Review (pre-ship and post-ship)
- **Wave-based parallel execution** for complex builds with dependency tracking
- **Rigor scaling:** full cycle, quick mode, and fast mode for different task sizes
- **5 domain modes:** software, content, research, strategy, general
- **Security module:** path traversal prevention, prompt injection scanning, filename sanitization
- **Context monitor hook:** warns at 60% and 80% context window usage
- **Brief anchor hook:** periodic re-surfacing of success criteria and scope boundaries

### Supported Runtimes

- OpenCode (P0)
- Claude Code (P1)
- Cursor (P2)
- Gemini CLI (P3)

### Technical

- TypeScript ESM with NodeNext module resolution
- Zero runtime dependencies
- 480 tests, 89.67% line coverage
- GitHub Actions CI with Node 20/22 matrix
