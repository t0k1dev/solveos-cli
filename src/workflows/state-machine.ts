/**
 * Cycle state machine for solveos-cli.
 *
 * Tracks which phase/gate the user is in, enforces valid transitions,
 * and provides helpers for state queries. Persistence (load/save to
 * .solveos/STATE.md) is handled by the artifacts module.
 *
 * The transition map encodes all ~20 valid transitions from docs/plan.md.
 * Invalid transitions throw — they are programming errors, not user errors.
 */

import { CycleState } from "../types.js";
import type { CycleStateData, GateName, StateTransition } from "../types.js";

// ---------------------------------------------------------------------------
// Transition Map
// ---------------------------------------------------------------------------

/**
 * Map from each state to its valid target states.
 * This is the runtime representation of the StateTransition type.
 */
const TRANSITION_MAP: Record<CycleState, CycleState[]> = {
  [CycleState.INIT]: [CycleState.RESEARCHING, CycleState.PLANNING],
  [CycleState.RESEARCHING]: [CycleState.PLANNING],
  [CycleState.PLANNING]: [CycleState.VALIDATING_PLAN, CycleState.BUILDING],
  [CycleState.VALIDATING_PLAN]: [CycleState.PLANNING, CycleState.BUILDING],
  [CycleState.BUILDING]: [
    CycleState.VALIDATING_BUILD,
    CycleState.REVIEWING_PRE,
    CycleState.READY_TO_SHIP,
  ],
  [CycleState.VALIDATING_BUILD]: [
    CycleState.BUILDING,
    CycleState.PLANNING,
    CycleState.REVIEWING_PRE,
    CycleState.READY_TO_SHIP,
  ],
  [CycleState.REVIEWING_PRE]: [CycleState.BUILDING, CycleState.READY_TO_SHIP],
  [CycleState.READY_TO_SHIP]: [CycleState.SHIPPED],
  [CycleState.SHIPPED]: [CycleState.REVIEWING_POST, CycleState.CYCLE_COMPLETE],
  [CycleState.REVIEWING_POST]: [CycleState.CYCLE_COMPLETE],
  [CycleState.CYCLE_COMPLETE]: [CycleState.INIT],
};

// ---------------------------------------------------------------------------
// Gate Tracking Helpers
// ---------------------------------------------------------------------------

/**
 * Map from state to the gate it represents (if any).
 * States not in this map are phases, not gates.
 */
const STATE_TO_GATE: Partial<Record<CycleState, GateName>> = {
  [CycleState.RESEARCHING]: "RESEARCH",
  [CycleState.VALIDATING_PLAN]: "PLAN_VALIDATION",
  [CycleState.VALIDATING_BUILD]: "BUILD_VALIDATION",
  [CycleState.REVIEWING_PRE]: "REVIEW_PRE_SHIP",
  [CycleState.REVIEWING_POST]: "REVIEW_POST_SHIP",
};

/**
 * Determines which gates were skipped when transitioning from `from` to `to`.
 * A gate is "skipped" when a transition bypasses a state that has a gate.
 *
 * Returns the list of gate names that were skipped (may be empty).
 */
function detectSkippedGates(
  from: CycleState,
  to: CycleState,
  alreadySkipped: GateName[],
  alreadyCompleted: GateName[],
): GateName[] {
  const skipped: GateName[] = [];

  // INIT -> PLANNING skips RESEARCH
  if (from === CycleState.INIT && to === CycleState.PLANNING) {
    const gate: GateName = "RESEARCH";
    if (!alreadySkipped.includes(gate) && !alreadyCompleted.includes(gate)) {
      skipped.push(gate);
    }
  }

  // PLANNING -> BUILDING skips PLAN_VALIDATION
  if (from === CycleState.PLANNING && to === CycleState.BUILDING) {
    const gate: GateName = "PLAN_VALIDATION";
    if (!alreadySkipped.includes(gate) && !alreadyCompleted.includes(gate)) {
      skipped.push(gate);
    }
  }

  // BUILDING -> REVIEWING_PRE skips BUILD_VALIDATION
  if (from === CycleState.BUILDING && to === CycleState.REVIEWING_PRE) {
    const gate: GateName = "BUILD_VALIDATION";
    if (!alreadySkipped.includes(gate) && !alreadyCompleted.includes(gate)) {
      skipped.push(gate);
    }
  }

  // BUILDING -> READY_TO_SHIP skips BUILD_VALIDATION and REVIEW_PRE_SHIP
  if (from === CycleState.BUILDING && to === CycleState.READY_TO_SHIP) {
    for (const gate of ["BUILD_VALIDATION", "REVIEW_PRE_SHIP"] as GateName[]) {
      if (!alreadySkipped.includes(gate) && !alreadyCompleted.includes(gate)) {
        skipped.push(gate);
      }
    }
  }

  // VALIDATING_BUILD -> READY_TO_SHIP skips REVIEW_PRE_SHIP
  if (from === CycleState.VALIDATING_BUILD && to === CycleState.READY_TO_SHIP) {
    const gate: GateName = "REVIEW_PRE_SHIP";
    if (!alreadySkipped.includes(gate) && !alreadyCompleted.includes(gate)) {
      skipped.push(gate);
    }
  }

  // SHIPPED -> CYCLE_COMPLETE skips REVIEW_POST_SHIP
  if (from === CycleState.SHIPPED && to === CycleState.CYCLE_COMPLETE) {
    const gate: GateName = "REVIEW_POST_SHIP";
    if (!alreadySkipped.includes(gate) && !alreadyCompleted.includes(gate)) {
      skipped.push(gate);
    }
  }

  return skipped;
}

/**
 * Determines which gate was completed when leaving a gate state.
 * Returns the gate name if the `from` state is a gate, otherwise null.
 */
function detectCompletedGate(
  from: CycleState,
  to: CycleState,
): GateName | null {
  const gate = STATE_TO_GATE[from];
  if (!gate) return null;

  // A gate is "completed" when we transition forward from it.
  // Going backward (e.g., VALIDATING_PLAN -> PLANNING) means the gate
  // found issues and is not yet complete.
  const backwardTransitions: Partial<Record<CycleState, CycleState[]>> = {
    [CycleState.VALIDATING_PLAN]: [CycleState.PLANNING],
    [CycleState.VALIDATING_BUILD]: [CycleState.BUILDING, CycleState.PLANNING],
    [CycleState.REVIEWING_PRE]: [CycleState.BUILDING],
  };

  const backward = backwardTransitions[from];
  if (backward && backward.includes(to)) {
    return null; // Going backward — gate not completed
  }

  return gate;
}

// ---------------------------------------------------------------------------
// Transition Result
// ---------------------------------------------------------------------------

export interface TransitionResult {
  /** The transition that was applied. */
  transition: StateTransition;
  /** Updated state data after the transition. */
  stateData: CycleStateData;
  /** Gates that were skipped by this transition. */
  gatesSkipped: GateName[];
  /** Gate that was completed by this transition, if any. */
  gateCompleted: GateName | null;
  /** Whether the plan validation max passes was reached (escalation signal). */
  planValidationEscalation: boolean;
}

// ---------------------------------------------------------------------------
// State Machine API
// ---------------------------------------------------------------------------

/**
 * Validate and apply a state transition.
 *
 * @param stateData - Current cycle state data.
 * @param target - The desired next state.
 * @param maxPlanValidationPasses - From config; defaults to 3.
 * @returns TransitionResult with updated state data and metadata.
 * @throws Error if the transition is invalid.
 */
export function transition(
  stateData: CycleStateData,
  target: CycleState,
  maxPlanValidationPasses: number = 3,
): TransitionResult {
  const from = stateData.current_state;
  const validTargets = TRANSITION_MAP[from];

  if (!validTargets.includes(target)) {
    throw new Error(
      `Invalid transition: ${from} -> ${target}. ` +
        `Valid targets from ${from}: [${validTargets.join(", ")}]`,
    );
  }

  // Detect gate events
  const gatesSkipped = detectSkippedGates(
    from,
    target,
    stateData.gates_skipped,
    stateData.gates_completed,
  );
  const gateCompleted = detectCompletedGate(from, target);

  // Track plan validation passes
  let planValidationPasses = stateData.plan_validation_passes;
  let planValidationEscalation = false;

  if (target === CycleState.VALIDATING_PLAN) {
    planValidationPasses += 1;
    if (planValidationPasses > maxPlanValidationPasses) {
      planValidationEscalation = true;
    }
  }

  // Build updated state
  const now = new Date().toISOString();
  const updatedState: CycleStateData = {
    ...stateData,
    current_state: target,
    gates_skipped: [...stateData.gates_skipped, ...gatesSkipped],
    gates_completed: gateCompleted
      ? [...stateData.gates_completed, gateCompleted]
      : [...stateData.gates_completed],
    plan_validation_passes: planValidationPasses,
    updated_at: now,
  };

  // Reset state when starting a new cycle
  if (from === CycleState.CYCLE_COMPLETE && target === CycleState.INIT) {
    updatedState.cycle_number = stateData.cycle_number + 1;
    updatedState.gates_skipped = [];
    updatedState.gates_completed = [];
    updatedState.plan_validation_passes = 0;
    updatedState.blockers = [];
  }

  return {
    transition: [from, target] as StateTransition,
    stateData: updatedState,
    gatesSkipped,
    gateCompleted,
    planValidationEscalation,
  };
}

/**
 * Get all valid next states from the current state.
 */
export function getNextStates(currentState: CycleState): CycleState[] {
  return [...TRANSITION_MAP[currentState]];
}

/**
 * Check if a transition is valid without applying it.
 */
export function isValidTransition(
  from: CycleState,
  to: CycleState,
): boolean {
  return TRANSITION_MAP[from].includes(to);
}

/**
 * Create initial state data for a new cycle.
 */
export function createInitialState(cycleNumber: number = 1): CycleStateData {
  const now = new Date().toISOString();
  return {
    current_state: CycleState.INIT,
    cycle_number: cycleNumber,
    gates_skipped: [],
    gates_completed: [],
    plan_validation_passes: 0,
    blockers: [],
    created_at: now,
    updated_at: now,
  };
}

/**
 * Get a human-readable description of the current state.
 */
export function describeState(state: CycleState): string {
  const descriptions: Record<CycleState, string> = {
    [CycleState.INIT]: "Project initialized — ready to start",
    [CycleState.RESEARCHING]: "Research gate — gathering information",
    [CycleState.PLANNING]: "Plan phase — creating the Plan Brief",
    [CycleState.VALIDATING_PLAN]: "Plan Validation gate — checking the brief",
    [CycleState.BUILDING]: "Build phase — executing against the plan",
    [CycleState.VALIDATING_BUILD]: "Build Validation gate — checking the output",
    [CycleState.REVIEWING_PRE]: "Pre-ship Review gate — final check before shipping",
    [CycleState.READY_TO_SHIP]: "Ready to ship — all checks passed",
    [CycleState.SHIPPED]: "Shipped — work delivered",
    [CycleState.REVIEWING_POST]: "Post-ship Review gate — reflecting on the cycle",
    [CycleState.CYCLE_COMPLETE]: "Cycle complete — ready for next cycle",
  };
  return descriptions[state];
}

/**
 * Get the suggested next command for a given state.
 */
export function suggestNextCommand(state: CycleState): string {
  const suggestions: Record<CycleState, string> = {
    [CycleState.INIT]: "/solveos:research or /solveos:plan",
    [CycleState.RESEARCHING]: "Complete research, then /solveos:plan",
    [CycleState.PLANNING]: "/solveos:validate-plan or /solveos:build",
    [CycleState.VALIDATING_PLAN]: "Address gaps, then /solveos:plan to refine",
    [CycleState.BUILDING]: "/solveos:validate-build or /solveos:ship",
    [CycleState.VALIDATING_BUILD]: "Fix issues or /solveos:review",
    [CycleState.REVIEWING_PRE]: "Address feedback or proceed to ship",
    [CycleState.READY_TO_SHIP]: "/solveos:ship",
    [CycleState.SHIPPED]: "/solveos:review (post-ship) or /solveos:new-cycle",
    [CycleState.REVIEWING_POST]: "/solveos:new-cycle",
    [CycleState.CYCLE_COMPLETE]: "/solveos:new-cycle",
  };
  return suggestions[state];
}
