---
description: Conduct bounded research on a specific question before planning
---

# /solveos:research — Research Gate

You are running the **Research gate** of the solveOS cycle. Research helps you understand the problem space before committing to a plan. It is bounded — you research a specific question for a specific amount of time, then decide whether you know enough to plan.

## Prerequisites

1. Check that `.solveos/` exists. If not: "No solveOS project found. Run `/solveos:new` first."
2. Read `.solveos/STATE.md` to verify the current state allows research:
   - Valid entry states: `INIT`, `PLANNING` (re-researching while planning)
   - If state is `BUILDING` or later: "You're past the research stage. If you need to research mid-build, note it as a discovered task."
3. Read `.solveos/config.json` to check if the research gate is enabled.
   - If `gates.research` is `false`: "The research gate is disabled in your config. You can still run it — do you want to proceed?"

## Step 1: Get a Specific Research Question

Ask the user:
> "What specific question do you need answered before you can plan?"

**Quality check the question:**
- If the question is vague ("tell me about X", "research Y"), push back:
  > "That's broad. What specific thing do you need to know about X? What decision will this research inform?"
- If the question is a symptom, not a root cause, use the **Five Whys technique**:
  > "Why is that important? What happens if you don't know this?"
  Keep asking "why?" (up to 5 times) until you reach the real question.
- A good research question is specific enough that you could answer "yes, I know this" or "no, I don't."

**Examples of good questions:**
- "What are the latency characteristics of DynamoDB vs. PostgreSQL for our access pattern?"
- "How do other CLI tools install slash commands into OpenCode?"
- "What does the existing codebase use for configuration management?"

**Examples of bad questions:**
- "Tell me about databases" (too broad)
- "What should we build?" (that's planning, not research)
- "Is this a good idea?" (not answerable with research)

## Step 2: Set a Time Limit

Ask the user:
> "How much time should I spend on this? (e.g., 10 minutes, 30 minutes, 1 hour)"

The time limit is a scope constraint. It prevents research from becoming an infinite rabbit hole. If the user says "as long as it takes," push back:
> "Research expands to fill available time. Pick a limit. You can always do another round."

## Step 3: Conduct Research

Invoke the **solveos-researcher** agent behavior:

1. State the question and time boundary clearly
2. Investigate using available tools (read files, search codebase, fetch URLs)
3. Focus on the specific question — don't go on tangents
4. Track key findings as you go
5. When time is up (or question is answered), stop and synthesize

## Step 4: Write Research Summary

Write the output to `.solveos/research/{topic}-research.md` using the Research Summary template:

```markdown
## Research Summary

**Question:** {the specific question}
**Time spent:** {actual time}

### Key Findings

- {finding 1}
- {finding 2}
- {finding 3}

### Conclusions

- {what this means for the Plan Brief}

### Open Questions / Remaining Unknowns

- {what you still don't know}

### Decision

- [ ] I have enough information to write the Plan Brief
- [ ] I need more research: {what specifically}
```

**Filename convention:** Use a descriptive, kebab-case topic name.
- Good: `dynamodb-vs-postgres-latency-research.md`
- Bad: `research-1.md`

## Step 5: Update State

Update `.solveos/STATE.md`:
- If this is the first research: transition to `RESEARCHING`
- If the user is done researching (decision = "enough to plan"): state stays ready for `/solveos:plan`
- Update `updated_at` timestamp

If the research gate was previously marked as skipped (user went straight to planning, then came back), remove it from `gates_skipped`.

## Step 6: Suggest Next Step

Present the decision to the user:

If **enough to plan**:
> "Research complete. Your findings are saved in `.solveos/research/{topic}-research.md`. Ready to plan: run `/solveos:plan`."

If **need more research**:
> "Research saved. You identified more questions to investigate. Run `/solveos:research` again with the next question."

## Important Rules

- Multiple research sessions produce separate files — never overwrite previous research
- Research is scoped: one question per session, bounded by time
- Research informs planning but does not replace it — don't start solving during research
- If the user's question is really a planning question ("what should we build?"), redirect to `/solveos:plan`
