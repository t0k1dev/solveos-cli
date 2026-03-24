/**
 * solveOS Context Monitor — OpenCode plugin.
 *
 * Monitors context window utilization during Build phase execution.
 * When message count exceeds a configurable threshold (proxy for context usage),
 * warns the user and suggests spawning a fresh sub-agent for remaining work.
 *
 * This prevents the quality degradation that happens as context fills
 * with accumulated state — inspired by GSD's approach of keeping the
 * orchestrator at 30-40% utilization.
 *
 * Installed to: .opencode/plugins/solveos-context-monitor.ts
 * Events: message.updated
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Types (inlined to avoid import issues in plugin runtime)
// ---------------------------------------------------------------------------

interface SolveosConfig {
  hooks?: {
    context_monitor?: boolean;
    context_monitor_threshold?: number;
  };
}

interface CycleStateData {
  current_state: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SOLVEOS_DIR = ".solveos";
const DEFAULT_THRESHOLD = 60;

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
 * Check if the hook is enabled via config.
 */
function isEnabled(config: SolveosConfig | null): boolean {
  if (!config?.hooks) return true; // enabled by default
  return config.hooks.context_monitor !== false;
}

/**
 * Get the message count threshold from config.
 */
function getThreshold(config: SolveosConfig | null): number {
  return config?.hooks?.context_monitor_threshold ?? DEFAULT_THRESHOLD;
}

// ---------------------------------------------------------------------------
// Warning message templates
// ---------------------------------------------------------------------------

const WARNING_60 = `
---
**solveOS Context Monitor** — context usage is growing.

You've exchanged a significant number of messages in this session. Context quality may start degrading.

**Recommendation:** Consider summarizing progress so far, then spawning a fresh sub-agent for the remaining work using a new subtask. Pass it:
1. The Plan Brief (\`.solveos/BRIEF.md\`)
2. A summary of what's been completed
3. What remains to be done

This keeps each agent working with clean, focused context.
---
`.trim();

const WARNING_80 = `
---
**solveOS Context Monitor** — HIGH context usage.

This session has accumulated substantial context. Response quality is likely degrading — the AI may start forgetting earlier instructions, repeating itself, or making errors it wouldn't make with fresh context.

**Strong recommendation:** Wrap up the current unit of work and spawn a fresh sub-agent immediately. The Plan Brief and build summary will bring the new agent up to speed quickly.

Run \`/solveos:status\` to capture current state before transitioning.
---
`.trim();

// ---------------------------------------------------------------------------
// Plugin export
// ---------------------------------------------------------------------------

/**
 * Context monitor plugin state — tracks message count per session.
 * Resets when a new session starts.
 */
interface MonitorState {
  messageCount: number;
  warned60: boolean;
  warned80: boolean;
  sessionId: string | null;
}

/**
 * Create a fresh monitor state.
 */
export function createMonitorState(): MonitorState {
  return {
    messageCount: 0,
    warned60: false,
    warned80: false,
    sessionId: null,
  };
}

/**
 * Check if a warning should be emitted based on current message count.
 * Returns the warning message or null.
 */
export function checkContextUsage(
  state: MonitorState,
  threshold: number,
): { warning: string | null; level: "60" | "80" | null } {
  const pct60 = Math.floor(threshold * 0.6);
  const pct80 = Math.floor(threshold * 0.8);

  if (state.messageCount >= pct80 && !state.warned80) {
    state.warned80 = true;
    return { warning: WARNING_80, level: "80" };
  }

  if (state.messageCount >= pct60 && !state.warned60) {
    state.warned60 = true;
    return { warning: WARNING_60, level: "60" };
  }

  return { warning: null, level: null };
}

/**
 * The OpenCode plugin export.
 *
 * Subscribes to message.updated events to track context usage.
 * When thresholds are crossed, logs a warning via the client.
 */
export const SolveosContextMonitor = async (ctx: {
  directory: string;
  worktree: string;
  client: { app: { log: (opts: { body: { service: string; level: string; message: string } }) => Promise<void> } };
}) => {
  const config = readSolveosConfig(ctx.worktree || ctx.directory);

  if (!isEnabled(config)) {
    return {}; // Hook disabled — no event subscriptions
  }

  const threshold = getThreshold(config);
  const state = createMonitorState();

  return {
    event: async ({ event }: { event: { type: string; properties?: { sessionID?: string } } }) => {
      // Only track message events
      if (event.type !== "message.updated") return;

      // Check if we're in a Build phase
      const currentState = readCurrentState(ctx.worktree || ctx.directory);
      if (currentState !== "BUILDING") return;

      // Reset state if session changed
      const sessionId = event.properties?.sessionID ?? null;
      if (sessionId && sessionId !== state.sessionId) {
        state.messageCount = 0;
        state.warned60 = false;
        state.warned80 = false;
        state.sessionId = sessionId;
      }

      state.messageCount++;

      const { warning } = checkContextUsage(state, threshold);
      if (warning) {
        await ctx.client.app.log({
          body: {
            service: "solveos-context-monitor",
            level: "warn",
            message: warning,
          },
        });
      }
    },
  };
};
