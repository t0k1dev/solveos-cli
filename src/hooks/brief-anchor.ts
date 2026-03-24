/**
 * solveOS Brief Anchor — OpenCode plugin.
 *
 * Periodically reminds the AI agent to check work against the Plan Brief
 * during the Build phase. Triggers after every N tool calls (configurable),
 * injecting a reminder to verify alignment with success criteria and
 * out-of-scope boundaries.
 *
 * Implements the solveOS principle: "The brief is your compass."
 *
 * Installed to: .opencode/plugins/solveos-brief-anchor.ts
 * Events: tool.execute.after
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Types (inlined to avoid import issues in plugin runtime)
// ---------------------------------------------------------------------------

interface SolveosConfig {
  hooks?: {
    brief_anchor?: boolean;
    brief_anchor_interval?: number;
  };
}

interface CycleStateData {
  current_state: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SOLVEOS_DIR = ".solveos";
const DEFAULT_INTERVAL = 10;

/**
 * Read .solveos/config.json from the project directory.
 * Returns null if not found or unparseable.
 */
function readSolveosConfig(projectDir: string): SolveosConfig | null {
  try {
    const raw = readFileSync(join(projectDir, SOLVEOS_DIR, "config.json"), "utf-8");
    return JSON.parse(raw) as SolveosConfig;
  } catch {
    return null;
  }
}

/**
 * Read current cycle state from .solveos/STATE.md frontmatter.
 * Returns the current_state string or null.
 */
function readCurrentState(projectDir: string): string | null {
  try {
    const raw = readFileSync(join(projectDir, SOLVEOS_DIR, "STATE.md"), "utf-8");
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) return null;
    const data = JSON.parse(fmMatch[1]) as CycleStateData;
    return data.current_state;
  } catch {
    return null;
  }
}

/**
 * Read the Plan Brief from .solveos/BRIEF.md.
 * Returns the raw content or null.
 */
function readBrief(projectDir: string): string | null {
  try {
    return readFileSync(join(projectDir, SOLVEOS_DIR, "BRIEF.md"), "utf-8");
  } catch {
    return null;
  }
}

/**
 * Extract success criteria from a Plan Brief markdown string.
 * Looks for `- [ ] criterion` lines under ## Success Criteria.
 */
export function extractSuccessCriteria(brief: string): string[] {
  const criteria: string[] = [];
  const lines = brief.split("\n");
  let inSection = false;

  for (const line of lines) {
    if (line.startsWith("## Success Criteria")) {
      inSection = true;
      continue;
    }
    if (inSection && line.startsWith("## ")) {
      break; // Next section
    }
    if (inSection) {
      const match = line.match(/^- \[[ x]\] (.+)$/);
      if (match) {
        criteria.push(match[1]);
      }
    }
  }

  return criteria;
}

/**
 * Extract out-of-scope items from a Plan Brief markdown string.
 */
export function extractOutOfScope(brief: string): string[] {
  const items: string[] = [];
  const lines = brief.split("\n");
  let inSection = false;

  for (const line of lines) {
    if (line.startsWith("## Out of Scope")) {
      inSection = true;
      continue;
    }
    if (inSection && line.startsWith("## ")) {
      break;
    }
    if (inSection) {
      const match = line.match(/^- (.+)$/);
      if (match) {
        items.push(match[1]);
      }
    }
  }

  return items;
}

/**
 * Check if the hook is enabled via config.
 */
function isEnabled(config: SolveosConfig | null): boolean {
  if (!config?.hooks) return true; // enabled by default
  return config.hooks.brief_anchor !== false;
}

/**
 * Get the tool call interval from config.
 */
function getInterval(config: SolveosConfig | null): number {
  return config?.hooks?.brief_anchor_interval ?? DEFAULT_INTERVAL;
}

// ---------------------------------------------------------------------------
// Reminder message
// ---------------------------------------------------------------------------

/**
 * Generate a brief anchor reminder with the actual criteria and boundaries.
 */
export function generateReminder(criteria: string[], outOfScope: string[]): string {
  const criteriaList = criteria.length > 0
    ? criteria.map((c, i) => `  ${i + 1}. ${c}`).join("\n")
    : "  (no criteria found — check .solveos/BRIEF.md)";

  const oosLine = outOfScope.length > 0
    ? `\n**Out of scope:** ${outOfScope.join(", ")}`
    : "";

  return `
---
**solveOS Brief Anchor** — alignment check

Pause and verify your current work:

**Success Criteria:**
${criteriaList}
${oosLine}

**Ask yourself:**
1. Does my current task connect to one of these criteria?
2. Am I within scope?
3. Am I approaching a rabbit hole?

If any answer is wrong, stop and recalibrate before continuing.
---
`.trim();
}

/**
 * Generate a minimal reminder when no brief is found.
 */
export function generateMinimalReminder(): string {
  return `
---
**solveOS Brief Anchor** — alignment check

No Plan Brief found at \`.solveos/BRIEF.md\`. Consider running \`/solveos:plan\` to create one.

If you have a brief, verify your current work still aligns with the plan's success criteria and out-of-scope boundaries.
---
`.trim();
}

// ---------------------------------------------------------------------------
// Plugin state
// ---------------------------------------------------------------------------

export interface AnchorState {
  toolCallCount: number;
  sessionId: string | null;
}

export function createAnchorState(): AnchorState {
  return {
    toolCallCount: 0,
    sessionId: null,
  };
}

/**
 * Check if a reminder should be emitted based on current tool call count.
 */
export function shouldRemind(state: AnchorState, interval: number): boolean {
  return state.toolCallCount > 0 && state.toolCallCount % interval === 0;
}

// ---------------------------------------------------------------------------
// Plugin export
// ---------------------------------------------------------------------------

/**
 * The OpenCode plugin export.
 *
 * Subscribes to tool.execute.after events to count tool calls during Build.
 * At configurable intervals, logs a brief anchor reminder.
 */
export const SolveosBriefAnchor = async (ctx: {
  directory: string;
  worktree: string;
  client: { app: { log: (opts: { body: { service: string; level: string; message: string } }) => Promise<void> } };
}) => {
  const config = readSolveosConfig(ctx.worktree || ctx.directory);

  if (!isEnabled(config)) {
    return {}; // Hook disabled — no event subscriptions
  }

  const interval = getInterval(config);
  const state = createAnchorState();

  return {
    "tool.execute.after": async (
      input: { tool: string; sessionID?: string },
      _output: unknown,
    ) => {
      // Check if we're in a Build phase
      const projectDir = ctx.worktree || ctx.directory;
      const currentState = readCurrentState(projectDir);
      if (currentState !== "BUILDING") return;

      // Reset state if session changed
      const sessionId = input.sessionID ?? null;
      if (sessionId && sessionId !== state.sessionId) {
        state.toolCallCount = 0;
        state.sessionId = sessionId;
      }

      state.toolCallCount++;

      if (shouldRemind(state, interval)) {
        const brief = readBrief(projectDir);
        let message: string;

        if (brief) {
          const criteria = extractSuccessCriteria(brief);
          const outOfScope = extractOutOfScope(brief);
          message = generateReminder(criteria, outOfScope);
        } else {
          message = generateMinimalReminder();
        }

        await ctx.client.app.log({
          body: {
            service: "solveos-brief-anchor",
            level: "info",
            message,
          },
        });
      }
    },
  };
};
