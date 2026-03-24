## Build Validation Report

**Date:** _YYYY-MM-DD_
**Plan Brief:** _Problem statement or title from BRIEF.md_

---

### Question 1: Does it work?

<!-- Does the output function as intended? Can the primary use case be completed
     end-to-end without critical failures? -->

**Assessment:** _Works / Partially works / Does not work_

**Details:**
_Explanation of what works and what doesn't_

**Issues found:**
- _Issue description_

---

### Question 2: Does it match the plan?

#### Success Criteria Status

<!-- Check each success criterion from BRIEF.md individually.
     Status: Pass = fully met, Partial = partially met, Fail = not met -->

| # | Criterion | Status | Notes |
|---|-----------|--------|-------|
| 1 | _Criterion from BRIEF.md_ | _Pass / Partial / Fail_ | _Details_ |
| 2 | _Criterion from BRIEF.md_ | _Pass / Partial / Fail_ | _Details_ |

**Criteria summary:** _{x} Pass, {y} Partial, {z} Fail out of {total}_

#### Scope Drift

<!-- Was anything added that wasn't in the plan? Cut from the plan?
     Modified from the original scope? -->

**Additions (not in plan):**
- _Addition — justified / unjustified_

**Cuts (in plan but not built):**
- _Cut — intentional / accidental_

**Modifications:**
- _What changed and why_

---

### Question 3: Is it stable enough to ship?

<!-- Are remaining issues known, bounded, and acceptable?
     Would the stated audience have a good experience? -->

**Assessment:** _Stable / Conditionally stable / Not stable_

**Details:**
_Explanation_

**Time bombs (if any):**
- _Thing that will break and when_

---

### Known Issues

<!-- Catalog all issues found during validation -->

| # | Issue | Severity | Decision | Notes |
|---|-------|----------|----------|-------|
| 1 | _Description_ | _Critical / High / Medium / Low_ | _Fix now / Defer / Accept_ | _Rationale_ |

---

### Routing Decision

- [ ] Pass — ready for Review or Ship
- [ ] Iterate — return to Build to fix issues
- [ ] Re-plan — fundamental plan gaps require revising the Plan Brief
