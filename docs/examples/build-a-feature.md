# Worked Example: Building a User Notification Feature

This walkthrough shows a complete solveos-cli cycle -- from initial setup through post-ship review -- using a realistic software feature as the example.

**Scenario:** You're adding an in-app notification system to a web application. Users need to receive notifications for comments on their posts and be able to mark them as read.

---

## Step 1: Initialize the project

```
/solveos-new
```

**What happens:** Creates `.solveos/` directory with default config, empty state, and templates.

**Artifact produced:** `.solveos/STATE.md`

```markdown
# solveOS Cycle State

**Cycle:** 1
**State:** INIT
**Gates skipped:** (none)
**Gates completed:** (none)

## Transitions Log

| # | From | To | Skipped Gate | Completed Gate | Timestamp |
|---|------|----|--------------|----------------|-----------|
```

**State:** `INIT`

---

## Step 2: Research the problem

```
/solveos-research "What notification patterns work best for comment-based systems? Consider real-time vs polling, storage patterns, and read-state tracking."
```

**What happens:** The researcher agent investigates the question within bounded scope, then writes a summary.

**Artifact produced:** `.solveos/research/notification-patterns.md`

```markdown
# Research Summary

## Question
What notification patterns work best for comment-based systems?

## Findings

### Real-time delivery
- **Server-Sent Events (SSE)** is simpler than WebSockets for one-way notification delivery
- Most comment notification systems don't need bidirectional communication
- Polling at 30-second intervals is acceptable for non-urgent notifications

### Storage patterns
- Dedicated `notifications` table with foreign keys to `users` and `comments`
- Columns: id, user_id, type, reference_id, read_at, created_at
- Index on (user_id, read_at) for efficient unread count queries

### Read-state tracking
- Per-notification `read_at` timestamp (null = unread)
- "Mark all as read" sets read_at = NOW() for all user notifications
- Unread count can be cached in Redis or computed on query

### Prior art
- GitHub: per-notification read state, grouped by repository
- Slack: channel-level read state (simpler but less granular)
- Linear: per-item read state with inbox-style UI

## Conclusions
- SSE for delivery, polling as fallback
- Per-notification read_at timestamp pattern
- Dedicated notifications table, not embedded in comments

## Decision
Proceed with SSE + polling fallback, dedicated notifications table, per-notification read tracking.
```

**State:** `INIT -> RESEARCHING` (Research gate completed)

---

## Step 3: Create the Plan Brief

```
/solveos-plan
```

**What happens:** The planner agent asks you each of the 8 Plan Brief questions interactively. You provide answers, the agent writes the brief.

**Artifact produced:** `.solveos/BRIEF.md`

```markdown
# Plan Brief

## Problem
Users have no way to know when someone comments on their posts. They must manually check each post for new comments, which leads to missed conversations and reduced engagement.

## Audience
Registered users who create posts and receive comments from other users.

## Goal
Users receive in-app notifications when someone comments on their posts, can view a list of notifications, and can mark them as read individually or in bulk.

## Appetite
2 days (16 hours of development time). This is a focused feature, not a full notification platform.

## Constraints
- Must work with the existing PostgreSQL database
- No external notification services (email, push) -- in-app only for this cycle
- Must not degrade page load time by more than 50ms
- API must follow existing REST conventions

## Success Criteria
- [ ] New comments on a user's post create a notification record
- [ ] Users can fetch their notifications via GET /api/notifications
- [ ] Unread notifications are visually distinguished in the UI
- [ ] Users can mark a single notification as read via PATCH /api/notifications/:id
- [ ] Users can mark all notifications as read via POST /api/notifications/mark-all-read
- [ ] Notification list paginates (20 per page)
- [ ] Unread count is available via GET /api/notifications/count
- [ ] Page load time increase is under 50ms (measured)

## Core Assumption
The existing database can handle the additional notification writes without requiring infrastructure changes (connection pooling, read replicas).

## Rabbit Holes
- Real-time delivery (SSE/WebSocket) -- research suggests SSE is feasible but could expand scope significantly. Defer to next cycle if time runs short.
- Notification grouping ("3 people commented on your post") -- nice to have but adds complexity. Out of scope for this cycle.

## Out of Scope
- Email notifications
- Push notifications (mobile/desktop)
- Notification preferences/settings
- Notification grouping or batching
- Real-time delivery (SSE) -- deferred to next cycle
```

**State:** `RESEARCHING -> PLANNING`

---

## Step 4: Validate the plan

```
/solveos-validate-plan
```

**What happens:** The plan validator checks three questions: Does it solve the problem? Is it feasible within the appetite? Are the criteria specific?

**Artifact produced:** `.solveos/validations/plan-validation-pass-1.md`

```markdown
# Plan Validation Log

## Pass: 1

### 1. Does this plan solve the stated problem?
**Yes, partially.** The plan addresses comment notifications but doesn't specify what
happens when the commenting user is the post author (self-comments). Should self-comments
generate notifications?

### 2. Is this feasible within the appetite (2 days)?
**Yes.** 8 success criteria, all scoped to REST API + basic UI. No real-time delivery.
Research is done. This is achievable in 16 hours.

### 3. Are the success criteria specific and falsifiable?
**Mostly.** 7 of 8 criteria are testable. The page load criterion ("under 50ms increase")
needs a baseline measurement method specified -- how will we measure this?

### Additional Checks
- Out of scope is well-defined
- Rabbit holes are acknowledged with clear deferral decisions
- Core assumption is reasonable but should be validated early in the build

### Gaps Found
1. Self-comment behavior is undefined
2. Page load measurement method is unspecified

### Decision
**Refine** -- address the 2 gaps, then re-validate.
```

**The validator found gaps.** Now we refine the brief and validate again.

You update the brief to add: "Self-comments do not generate notifications" under Constraints, and change the page load criterion to: "Page load time increase is under 50ms (measured via Lighthouse performance audit on the post list page, compared to pre-feature baseline)."

```
/solveos-validate-plan
```

**Artifact produced:** `.solveos/validations/plan-validation-pass-2.md`

```markdown
# Plan Validation Log

## Pass: 2

### 1. Does this plan solve the stated problem?
**Yes.** Comment notifications are covered. Self-comment edge case is addressed.

### 2. Is this feasible within the appetite (2 days)?
**Yes.** No scope changes from pass 1.

### 3. Are the success criteria specific and falsifiable?
**Yes.** All 8 criteria are now testable with defined measurement methods.

### Gaps Found
(none)

### Decision
**Approve** -- proceed to build.
```

**State:** `PLANNING -> VALIDATING_PLAN -> PLANNING (refine) -> VALIDATING_PLAN -> BUILDING` (Plan Validation gate completed after 2 passes)

---

## Step 5: Build

```
/solveos-build
```

**What happens:** The executor agent reads the Plan Brief, breaks the work into waves, and executes them.

**Wave plan generated:**

```
Wave 1 (parallel):
  - [A] Create notifications database migration (schema + indexes)
  - [B] Create Notification model and TypeScript types

Wave 2 (parallel, depends on Wave 1):
  - [C] Implement notification creation trigger (on comment insert)
  - [D] Implement GET /api/notifications endpoint (list + pagination)
  - [E] Implement GET /api/notifications/count endpoint

Wave 3 (parallel, depends on Wave 2):
  - [F] Implement PATCH /api/notifications/:id (mark as read)
  - [G] Implement POST /api/notifications/mark-all-read

Wave 4 (depends on Wave 2):
  - [H] Add notification UI component with unread badge
```

The executor works through each wave, completing units and checking off success criteria. If a unit fails, dependent units are cascade-skipped and the debugger agent is available to diagnose.

**State:** `BUILDING` throughout execution

---

## Step 6: Validate the build

```
/solveos-validate-build
```

**What happens:** The build validator checks each success criterion against the actual implementation.

**Artifact produced:** `.solveos/validations/build-validation.md`

```markdown
# Build Validation Report

## Success Criteria Status

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | New comments create notification record | Pass | Test: comment.create triggers notification insert |
| 2 | GET /api/notifications returns list | Pass | Endpoint returns paginated JSON array |
| 3 | Unread notifications visually distinguished | Pass | Unread items have `is-unread` CSS class, bold text |
| 4 | PATCH /api/notifications/:id marks as read | Pass | Sets read_at timestamp, returns 200 |
| 5 | POST /api/notifications/mark-all-read | Pass | Updates all user notifications, returns count |
| 6 | Pagination (20 per page) | Pass | ?page=1&limit=20 with Link headers |
| 7 | GET /api/notifications/count | Pass | Returns { unread: N, total: M } |
| 8 | Page load increase under 50ms | Pass | Lighthouse: 12ms increase (baseline 1.2s -> 1.212s) |

## Scope Drift
None detected. All work aligns with the Plan Brief.

## Known Issues
- Notification count query is not cached (acceptable at current scale)
- No database index on `created_at` (pagination uses it for ordering -- minor optimization opportunity)

## Routing Decision
**Proceed** -- all criteria pass. Known issues are non-blocking.
```

**State:** `BUILDING -> VALIDATING_BUILD` (Build Validation gate completed)

---

## Step 7: Pre-ship review

```
/solveos-review
```

**What happens:** The reviewer runs a holistic judgment check before shipping.

**Artifact produced:** `.solveos/reviews/pre-ship-review.md`

```markdown
# Pre-Ship Review

## Does this solve the stated problem?
Yes. Users now receive notifications for comments on their posts and can manage read state.

## Is this good enough for the audience?
Yes. The feature covers the core use case (awareness of new comments). Power users may
want real-time updates, but that's explicitly deferred.

## What is the weakest part?
The notification list UI is functional but minimal. No notification sounds, no toast
popups, no real-time updates. This is expected given the appetite and scope.

## Ship Readiness
**Ready to ship.** All success criteria pass. No scope drift. Known issues are logged
for future cycles.
```

**State:** `VALIDATING_BUILD -> REVIEWING_PRE -> READY_TO_SHIP` (Review Pre-Ship gate completed)

---

## Step 8: Ship

```
/solveos-ship
```

**What happens:** Final confirmation, then the cycle artifacts are archived to `.solveos/history/cycle-1/`.

**State:** `READY_TO_SHIP -> SHIPPED`

---

## Step 9: Post-ship review

```
/solveos-review
```

**What happens:** The reviewer runs outcome measurement and generates feed-forward items.

**Artifact produced:** `.solveos/reviews/post-ship-review.md`

```markdown
# Post-Ship Review

## Success Criteria Measurement

| Criterion | Target | Actual | Evidence |
|-----------|--------|--------|----------|
| Notifications created on comment | Yes | Yes | DB records confirmed |
| Notification list API | Paginated | Paginated | 20/page with Link headers |
| Visual distinction | Bold/badge | Bold + dot | CSS `is-unread` class |
| Mark single as read | PATCH works | Works | 200 response, read_at set |
| Mark all as read | POST works | Works | Bulk update confirmed |
| Pagination | 20/page | 20/page | Correct |
| Count endpoint | Returns counts | Returns counts | { unread, total } |
| Page load impact | < 50ms | 12ms | Lighthouse measured |

## What worked well?
- Plan Brief prevented scope creep (SSE was tempting but explicitly deferred)
- Wave-based execution parallelized the DB migration and model creation
- Build validation caught nothing because the plan was tight -- validation effort was still worth the confidence

## What didn't work well?
- Spent 30 minutes on notification grouping before remembering it was out of scope
- Should have cached the unread count from the start

## Most impactful decision?
Deferring real-time delivery (SSE) to the next cycle. This kept the 2-day appetite achievable.

## Feed-Forward

### New problems discovered
- At scale, the notification count query will need caching (Redis or materialized view)

### Deferred scope
- Real-time notification delivery via SSE
- Notification grouping ("3 people commented on your post")

### Wrong assumptions
- None. The database handled the additional writes fine.

### Open questions
- Should we add a `created_at` index for pagination performance?
- What notification types will we support beyond comments? (mentions, likes, follows?)
```

**State:** `SHIPPED -> REVIEWING_POST` (Review Post-Ship gate completed)

---

## Step 10: Start the next cycle

```
/solveos-new-cycle
```

**What happens:** Reads the feed-forward items from the post-ship review and seeds the next cycle with them.

**State:** `REVIEWING_POST -> CYCLE_COMPLETE -> INIT` (Cycle 2)

The feed-forward items (SSE delivery, notification grouping, count caching, new notification types) are available as starting context for the next `/solveos-plan`. The cycle number increments to 2, and all gates and state reset.

---

## Summary

| Step | Command | Gate | Artifact |
|------|---------|------|----------|
| 1 | `/solveos-new` | -- | `STATE.md` |
| 2 | `/solveos-research` | Research | `research/notification-patterns.md` |
| 3 | `/solveos-plan` | -- | `BRIEF.md` |
| 4 | `/solveos-validate-plan` (x2) | Plan Validation | `validations/plan-validation-pass-{1,2}.md` |
| 5 | `/solveos-build` | -- | Code changes |
| 6 | `/solveos-validate-build` | Build Validation | `validations/build-validation.md` |
| 7 | `/solveos-review` | Review (pre-ship) | `reviews/pre-ship-review.md` |
| 8 | `/solveos-ship` | -- | `history/cycle-1/` |
| 9 | `/solveos-review` | Review (post-ship) | `reviews/post-ship-review.md` |
| 10 | `/solveos-new-cycle` | -- | Cycle 2 initialized |

**Total gates used:** 4 of 4 (Research, Plan Validation, Build Validation, Review)
**Validation passes:** 2 (1 gap found, 1 refinement, then approved)
**Cycle outcome:** All 8 success criteria passed, 2 feed-forward items for next cycle
