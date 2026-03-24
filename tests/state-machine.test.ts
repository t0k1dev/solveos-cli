/**
 * Smoke test for the state machine.
 * Run: npm run dev -- tests/state-machine.test.ts
 */

import { CycleState } from "../src/types.js";
import {
  transition,
  getNextStates,
  isValidTransition,
  createInitialState,
} from "../src/workflows/state-machine.js";

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string): void {
  if (condition) {
    console.log(`  PASS: ${name}`);
    passed++;
  } else {
    console.log(`  FAIL: ${name}`);
    failed++;
  }
}

function assertThrows(fn: () => void, name: string): void {
  try {
    fn();
    console.log(`  FAIL: ${name} (did not throw)`);
    failed++;
  } catch {
    console.log(`  PASS: ${name}`);
    passed++;
  }
}

console.log("\n--- State Machine Tests ---\n");

// Valid transitions
console.log("Valid transitions:");
const state = createInitialState();
assert(state.current_state === CycleState.INIT, "Initial state is INIT");

const r1 = transition(state, CycleState.PLANNING);
assert(r1.stateData.current_state === CycleState.PLANNING, "INIT -> PLANNING succeeds");
assert(r1.gatesSkipped.includes("RESEARCH"), "INIT -> PLANNING skips RESEARCH");

const r2 = transition(state, CycleState.RESEARCHING);
assert(r2.stateData.current_state === CycleState.RESEARCHING, "INIT -> RESEARCHING succeeds");
assert(r2.gatesSkipped.length === 0, "INIT -> RESEARCHING skips nothing");

// Invalid transition
console.log("\nInvalid transitions:");
assertThrows(() => transition(state, CycleState.BUILDING), "INIT -> BUILDING throws (can't skip planning)");
assertThrows(() => transition(state, CycleState.SHIPPED), "INIT -> SHIPPED throws");

// Validation loop
console.log("\nValidation loop:");
const planState = transition(state, CycleState.PLANNING).stateData;
const valState = transition(planState, CycleState.VALIDATING_PLAN);
assert(valState.stateData.plan_validation_passes === 1, "First validation pass = 1");

const backToPlan = transition(valState.stateData, CycleState.PLANNING);
assert(backToPlan.gateCompleted === null, "VALIDATING_PLAN -> PLANNING does not complete the gate");

const val2 = transition(backToPlan.stateData, CycleState.VALIDATING_PLAN);
assert(val2.stateData.plan_validation_passes === 2, "Second validation pass = 2");

const val2ToBuild = transition(val2.stateData, CycleState.BUILDING);
assert(val2ToBuild.gateCompleted === "PLAN_VALIDATION", "VALIDATING_PLAN -> BUILDING completes PLAN_VALIDATION");

// Plan validation escalation
console.log("\nPlan validation escalation:");
let escState = createInitialState();
escState = transition(escState, CycleState.PLANNING).stateData;
for (let i = 0; i < 3; i++) {
  escState = transition(escState, CycleState.VALIDATING_PLAN).stateData;
  escState = transition(escState, CycleState.PLANNING).stateData;
}
const esc = transition(escState, CycleState.VALIDATING_PLAN, 3);
assert(esc.planValidationEscalation === true, "4th validation pass triggers escalation");

// getNextStates
console.log("\ngetNextStates:");
const buildNext = getNextStates(CycleState.BUILDING);
assert(buildNext.length === 3, "BUILDING has 3 next states");
assert(buildNext.includes(CycleState.VALIDATING_BUILD), "BUILDING -> VALIDATING_BUILD");
assert(buildNext.includes(CycleState.REVIEWING_PRE), "BUILDING -> REVIEWING_PRE");
assert(buildNext.includes(CycleState.READY_TO_SHIP), "BUILDING -> READY_TO_SHIP");

// isValidTransition
console.log("\nisValidTransition:");
assert(isValidTransition(CycleState.INIT, CycleState.PLANNING) === true, "INIT -> PLANNING is valid");
assert(isValidTransition(CycleState.INIT, CycleState.BUILDING) === false, "INIT -> BUILDING is invalid");

// Full cycle
console.log("\nFull cycle:");
let s = createInitialState();
s = transition(s, CycleState.PLANNING).stateData;
s = transition(s, CycleState.BUILDING).stateData;
s = transition(s, CycleState.READY_TO_SHIP).stateData;
s = transition(s, CycleState.SHIPPED).stateData;
s = transition(s, CycleState.CYCLE_COMPLETE).stateData;
assert(s.current_state === CycleState.CYCLE_COMPLETE, "Reached CYCLE_COMPLETE");
assert(s.gates_skipped.includes("PLAN_VALIDATION"), "Tracked skipped PLAN_VALIDATION");
assert(s.gates_skipped.includes("BUILD_VALIDATION"), "Tracked skipped BUILD_VALIDATION");
assert(s.gates_skipped.includes("REVIEW_PRE_SHIP"), "Tracked skipped REVIEW_PRE_SHIP");
assert(s.gates_skipped.includes("REVIEW_POST_SHIP"), "Tracked skipped REVIEW_POST_SHIP");

// New cycle resets state
const newCycle = transition(s, CycleState.INIT);
assert(newCycle.stateData.cycle_number === 2, "New cycle increments cycle_number");
assert(newCycle.stateData.gates_skipped.length === 0, "New cycle resets gates_skipped");
assert(newCycle.stateData.gates_completed.length === 0, "New cycle resets gates_completed");

console.log(`\n--- Results: ${passed} passed, ${failed} failed ---\n`);
process.exit(failed > 0 ? 1 : 0);
