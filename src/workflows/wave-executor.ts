/**
 * Wave-based parallel execution engine for the Build phase.
 *
 * Implements GSD's wave execution model:
 *  1. Decompose goal into atomic work units
 *  2. Analyze dependencies between units
 *  3. Group independent units into waves (topological sort)
 *  4. Execute units within a wave concurrently
 *  5. Wait for all units in a wave before starting the next
 *
 * The "execution" is orchestrated by the AI agent — this module manages
 * the data structures, wave grouping algorithm, and state tracking.
 * The AI agent (solveos-executor) reads the plan and processes units.
 */

import type {
  WorkUnit,
  WorkUnitStatus,
  Wave,
  WaveExecutionPlan,
  WaveExecutionResult,
  WaveSummary,
  Granularity,
} from "../types.js";

// ---------------------------------------------------------------------------
// Granularity Ranges
// ---------------------------------------------------------------------------

/** Target unit count ranges per granularity level. */
export const GRANULARITY_RANGES: Record<Granularity, { min: number; max: number }> = {
  coarse: { min: 2, max: 4 },
  standard: { min: 3, max: 6 },
  fine: { min: 5, max: 10 },
};

// ---------------------------------------------------------------------------
// Work Unit Creation
// ---------------------------------------------------------------------------

/**
 * Create a work unit with defaults.
 * Used by the build command / executor agent to register decomposed units.
 */
export function createWorkUnit(
  id: string,
  name: string,
  description: string,
  opts?: {
    depends_on?: string[];
    criteria?: string[];
    discovered?: boolean;
  },
): WorkUnit {
  return {
    id,
    name,
    description,
    depends_on: opts?.depends_on ?? [],
    criteria: opts?.criteria ?? [],
    status: "pending",
    discovered: opts?.discovered ?? false,
  };
}

// ---------------------------------------------------------------------------
// Dependency Validation
// ---------------------------------------------------------------------------

/**
 * Validate that all dependency references in a unit list are valid
 * (no dangling references, no self-references, no cycles).
 *
 * @returns Array of error messages (empty if valid).
 */
export function validateDependencies(units: WorkUnit[]): string[] {
  const errors: string[] = [];
  const ids = new Set(units.map((u) => u.id));

  for (const unit of units) {
    // Self-reference check
    if (unit.depends_on.includes(unit.id)) {
      errors.push(`Unit "${unit.id}" depends on itself`);
    }

    // Dangling reference check
    for (const dep of unit.depends_on) {
      if (!ids.has(dep)) {
        errors.push(`Unit "${unit.id}" depends on unknown unit "${dep}"`);
      }
    }
  }

  // Cycle detection via DFS
  const cycleErrors = detectCycles(units);
  errors.push(...cycleErrors);

  return errors;
}

/**
 * Detect cycles in the dependency graph using iterative DFS.
 * Returns error messages for each cycle found.
 */
function detectCycles(units: WorkUnit[]): string[] {
  const errors: string[] = [];
  const WHITE = 0; // unvisited
  const GRAY = 1;  // in current path
  const BLACK = 2; // fully processed

  const color = new Map<string, number>();
  const parent = new Map<string, string | null>();
  const adjMap = new Map<string, string[]>();

  for (const unit of units) {
    color.set(unit.id, WHITE);
    adjMap.set(unit.id, unit.depends_on);
  }

  for (const unit of units) {
    if (color.get(unit.id) !== WHITE) continue;

    // Iterative DFS using an explicit stack
    const stack: Array<{ id: string; childIdx: number }> = [{ id: unit.id, childIdx: 0 }];
    color.set(unit.id, GRAY);
    parent.set(unit.id, null);

    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      const deps = adjMap.get(top.id) ?? [];

      if (top.childIdx < deps.length) {
        const dep = deps[top.childIdx];
        top.childIdx++;

        // Only process if the dependency exists in our graph
        if (!color.has(dep)) continue;

        const depColor = color.get(dep)!;
        if (depColor === GRAY) {
          // Found a cycle — trace back
          const cyclePath = [dep, top.id];
          for (let i = stack.length - 2; i >= 0; i--) {
            if (stack[i].id === dep) break;
            cyclePath.push(stack[i].id);
          }
          cyclePath.reverse();
          errors.push(`Dependency cycle detected: ${cyclePath.join(" → ")}`);
        } else if (depColor === WHITE) {
          color.set(dep, GRAY);
          parent.set(dep, top.id);
          stack.push({ id: dep, childIdx: 0 });
        }
      } else {
        color.set(top.id, BLACK);
        stack.pop();
      }
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Wave Grouping (Topological Sort)
// ---------------------------------------------------------------------------

/**
 * Group work units into waves based on dependency analysis.
 *
 * Algorithm:
 *  1. Find all units with no unsatisfied dependencies → Wave 1
 *  2. Remove those units from the graph
 *  3. Find the next set of units with satisfied dependencies → Wave 2
 *  4. Repeat until all units are assigned
 *
 * This is essentially Kahn's algorithm for topological sorting,
 * but instead of producing a linear order, it groups by "level".
 */
export function groupIntoWaves(units: WorkUnit[]): Wave[] {
  if (units.length === 0) return [];

  const waves: Wave[] = [];
  const assigned = new Set<string>();
  let remaining = units.map((u) => u.id);
  const depsMap = new Map<string, string[]>();

  for (const unit of units) {
    depsMap.set(unit.id, [...unit.depends_on]);
  }

  let waveNum = 1;
  while (remaining.length > 0) {
    // Find units whose dependencies are all in the assigned set
    const ready: string[] = [];
    const notReady: string[] = [];

    for (const id of remaining) {
      const deps = depsMap.get(id) ?? [];
      const allSatisfied = deps.every((d) => assigned.has(d));
      if (allSatisfied) {
        ready.push(id);
      } else {
        notReady.push(id);
      }
    }

    // If nothing is ready, there's a cycle (shouldn't happen if validateDependencies passed)
    if (ready.length === 0) {
      // Force-assign remaining to avoid infinite loop — mark as a degraded wave
      waves.push({
        number: waveNum,
        unit_ids: notReady,
        status: "pending",
      });
      break;
    }

    waves.push({
      number: waveNum,
      unit_ids: ready,
      status: "pending",
    });

    for (const id of ready) {
      assigned.add(id);
    }

    remaining = notReady;
    waveNum++;
  }

  return waves;
}

// ---------------------------------------------------------------------------
// Execution Plan Creation
// ---------------------------------------------------------------------------

/**
 * Build a complete wave execution plan from a list of work units.
 * Validates dependencies, groups into waves, and detects single-unit tasks.
 *
 * @throws Error if dependency validation fails.
 */
export function buildExecutionPlan(
  units: WorkUnit[],
  granularity: Granularity,
): WaveExecutionPlan {
  // Validate dependencies
  const errors = validateDependencies(units);
  if (errors.length > 0) {
    throw new Error(`Invalid dependency graph:\n${errors.map((e) => `  - ${e}`).join("\n")}`);
  }

  // Group into waves
  const waves = groupIntoWaves(units);

  return {
    units,
    waves,
    granularity,
    single_unit: units.length === 1,
    created_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Execution State Management
// ---------------------------------------------------------------------------

/**
 * Mark a unit as in-progress.
 */
export function startUnit(plan: WaveExecutionPlan, unitId: string): void {
  const unit = findUnit(plan, unitId);
  if (unit.status !== "pending") {
    throw new Error(`Cannot start unit "${unitId}": status is "${unit.status}", expected "pending"`);
  }
  unit.status = "in_progress";

  // Also update wave status if this is the first unit starting in that wave
  const wave = findWaveForUnit(plan, unitId);
  if (wave && wave.status === "pending") {
    wave.status = "in_progress";
  }
}

/**
 * Mark a unit as completed with a summary.
 */
export function completeUnit(plan: WaveExecutionPlan, unitId: string, summary: string): void {
  const unit = findUnit(plan, unitId);
  if (unit.status !== "in_progress") {
    throw new Error(`Cannot complete unit "${unitId}": status is "${unit.status}", expected "in_progress"`);
  }
  unit.status = "completed";
  unit.summary = summary;

  // Check if wave is fully completed
  updateWaveStatus(plan, unitId);
}

/**
 * Mark a unit as failed with an error message.
 */
export function failUnit(plan: WaveExecutionPlan, unitId: string, error: string): void {
  const unit = findUnit(plan, unitId);
  if (unit.status !== "in_progress") {
    throw new Error(`Cannot fail unit "${unitId}": status is "${unit.status}", expected "in_progress"`);
  }
  unit.status = "failed";
  unit.error = error;

  // Check if wave is fully completed/failed
  updateWaveStatus(plan, unitId);
}

/**
 * Skip a unit (e.g., due to a dependency failure).
 */
export function skipUnit(plan: WaveExecutionPlan, unitId: string, reason: string): void {
  const unit = findUnit(plan, unitId);
  unit.status = "skipped";
  unit.error = reason;
}

/**
 * Skip all units that depend on a failed unit (cascade).
 * Returns the IDs of units that were skipped.
 */
export function cascadeSkip(plan: WaveExecutionPlan, failedUnitId: string): string[] {
  const skipped: string[] = [];
  const toCheck = [failedUnitId];
  const failedSet = new Set<string>([failedUnitId]);

  while (toCheck.length > 0) {
    const currentId = toCheck.pop()!;
    // Find all units that depend on the current failed/skipped unit
    for (const unit of plan.units) {
      if (failedSet.has(unit.id)) continue;
      if (unit.depends_on.includes(currentId) && unit.status === "pending") {
        skipUnit(plan, unit.id, `Dependency "${currentId}" failed`);
        skipped.push(unit.id);
        failedSet.add(unit.id);
        toCheck.push(unit.id);
      }
    }
  }

  return skipped;
}

/**
 * Add a discovered work unit to the plan.
 * Discovered units are added to the current or next wave depending on dependencies.
 */
export function addDiscoveredUnit(
  plan: WaveExecutionPlan,
  unit: WorkUnit,
): void {
  unit.discovered = true;
  plan.units.push(unit);
  plan.single_unit = false;

  // Re-calculate which wave it belongs to
  // Find the highest wave number among its dependencies
  let maxDepWave = 0;
  for (const depId of unit.depends_on) {
    const wave = findWaveForUnit(plan, depId);
    if (wave && wave.number > maxDepWave) {
      maxDepWave = wave.number;
    }
  }

  const targetWaveNum = maxDepWave + 1;

  // Find or create the target wave
  let targetWave = plan.waves.find((w) => w.number === targetWaveNum);
  if (!targetWave) {
    targetWave = {
      number: targetWaveNum,
      unit_ids: [],
      status: "pending",
    };
    plan.waves.push(targetWave);
    plan.waves.sort((a, b) => a.number - b.number);
  }

  targetWave.unit_ids.push(unit.id);
}

// ---------------------------------------------------------------------------
// Execution Result Generation
// ---------------------------------------------------------------------------

/**
 * Generate an execution result from the current plan state.
 */
export function generateResult(plan: WaveExecutionPlan): WaveExecutionResult {
  const completed = plan.units.filter((u) => u.status === "completed").length;
  const total = plan.units.length;
  const discovered = plan.units.filter((u) => u.discovered).length;

  let status: WaveExecutionResult["status"];
  if (plan.units.every((u) => u.status === "completed")) {
    status = "completed";
  } else if (plan.units.some((u) => u.status === "failed")) {
    status = plan.units.some((u) => u.status === "completed") ? "partial" : "failed";
  } else {
    status = "partial";
  }

  const waveSummaries: WaveSummary[] = plan.waves.map((wave) => {
    const waveUnits = wave.unit_ids.map((id) => findUnit(plan, id));
    return {
      wave_number: wave.number,
      completed: waveUnits.filter((u) => u.status === "completed").map((u) => u.id),
      failed: waveUnits.filter((u) => u.status === "failed").map((u) => u.id),
      skipped: waveUnits.filter((u) => u.status === "skipped").map((u) => u.id),
    };
  });

  return {
    status,
    units_completed: completed,
    units_total: total,
    discovered_tasks: discovered,
    wave_summaries: waveSummaries,
    completed_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Query Helpers
// ---------------------------------------------------------------------------

/**
 * Get the next wave that needs execution (first wave with pending/in_progress status).
 * Returns null if all waves are completed or failed.
 */
export function getNextWave(plan: WaveExecutionPlan): Wave | null {
  return plan.waves.find((w) => w.status === "pending" || w.status === "in_progress") ?? null;
}

/**
 * Get all pending units in a specific wave.
 */
export function getPendingUnits(plan: WaveExecutionPlan, waveNumber: number): WorkUnit[] {
  const wave = plan.waves.find((w) => w.number === waveNumber);
  if (!wave) return [];
  return wave.unit_ids
    .map((id) => findUnit(plan, id))
    .filter((u) => u.status === "pending");
}

/**
 * Check if a wave is fully completed (all units completed, failed, or skipped).
 */
export function isWaveComplete(plan: WaveExecutionPlan, waveNumber: number): boolean {
  const wave = plan.waves.find((w) => w.number === waveNumber);
  if (!wave) return true;
  return wave.unit_ids.every((id) => {
    const unit = findUnit(plan, id);
    return unit.status === "completed" || unit.status === "failed" || unit.status === "skipped";
  });
}

/**
 * Check if the entire plan is finished (all units in terminal state).
 */
export function isPlanComplete(plan: WaveExecutionPlan): boolean {
  return plan.units.every(
    (u) => u.status === "completed" || u.status === "failed" || u.status === "skipped",
  );
}

/**
 * Get a progress summary string for display.
 */
export function getProgressSummary(plan: WaveExecutionPlan): string {
  const completed = plan.units.filter((u) => u.status === "completed").length;
  const failed = plan.units.filter((u) => u.status === "failed").length;
  const skipped = plan.units.filter((u) => u.status === "skipped").length;
  const inProgress = plan.units.filter((u) => u.status === "in_progress").length;
  const pending = plan.units.filter((u) => u.status === "pending").length;
  const total = plan.units.length;
  const currentWave = getNextWave(plan);

  const parts: string[] = [
    `${completed}/${total} units completed`,
  ];
  if (failed > 0) parts.push(`${failed} failed`);
  if (skipped > 0) parts.push(`${skipped} skipped`);
  if (inProgress > 0) parts.push(`${inProgress} in progress`);
  if (pending > 0) parts.push(`${pending} pending`);
  if (currentWave) parts.push(`Wave ${currentWave.number}/${plan.waves.length}`);

  return parts.join(" | ");
}

// ---------------------------------------------------------------------------
// Rendering (for STATE.md integration)
// ---------------------------------------------------------------------------

/**
 * Render the wave execution plan as a markdown section for STATE.md.
 */
export function renderPlanMarkdown(plan: WaveExecutionPlan): string {
  const lines: string[] = [
    "## Wave Execution Plan",
    "",
    `**Granularity:** ${plan.granularity}`,
    `**Units:** ${plan.units.length}`,
    `**Waves:** ${plan.waves.length}`,
    `**Single-unit:** ${plan.single_unit ? "yes (no wave overhead)" : "no"}`,
    "",
  ];

  for (const wave of plan.waves) {
    const waveUnits = wave.unit_ids.map((id) => findUnit(plan, id));
    const statusIcon = wave.status === "completed" ? "✓" :
      wave.status === "failed" ? "✗" :
      wave.status === "in_progress" ? "▶" : "○";

    lines.push(`### Wave ${wave.number} ${statusIcon}`);
    lines.push("");
    lines.push("| Unit | Status | Criteria | Summary |");
    lines.push("|------|--------|----------|---------|");

    for (const unit of waveUnits) {
      const statusEmoji = statusIcon_(unit.status);
      const criteria = unit.criteria.length > 0 ? unit.criteria.join(", ") : "—";
      const summary = unit.summary?.slice(0, 60) ?? unit.error?.slice(0, 60) ?? "—";
      const discovered = unit.discovered ? " (discovered)" : "";
      lines.push(`| ${unit.name}${discovered} | ${statusEmoji} ${unit.status} | ${criteria} | ${summary} |`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/** Status icon for a work unit. */
function statusIcon_(status: WorkUnitStatus): string {
  switch (status) {
    case "completed": return "✓";
    case "failed": return "✗";
    case "in_progress": return "▶";
    case "skipped": return "⊘";
    case "pending": return "○";
  }
}

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

function findUnit(plan: WaveExecutionPlan, unitId: string): WorkUnit {
  const unit = plan.units.find((u) => u.id === unitId);
  if (!unit) throw new Error(`Unit "${unitId}" not found in plan`);
  return unit;
}

function findWaveForUnit(plan: WaveExecutionPlan, unitId: string): Wave | null {
  return plan.waves.find((w) => w.unit_ids.includes(unitId)) ?? null;
}

function updateWaveStatus(plan: WaveExecutionPlan, unitId: string): void {
  const wave = findWaveForUnit(plan, unitId);
  if (!wave) return;

  const waveUnits = wave.unit_ids.map((id) => findUnit(plan, id));
  const allDone = waveUnits.every(
    (u) => u.status === "completed" || u.status === "failed" || u.status === "skipped",
  );

  if (allDone) {
    const anyFailed = waveUnits.some((u) => u.status === "failed");
    wave.status = anyFailed ? "failed" : "completed";
  }
}
