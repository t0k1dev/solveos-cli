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
  describeState,
  suggestNextCommand,
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

// RESEARCHING -> PLANNING
const r3 = transition(r2.stateData, CycleState.PLANNING);
assert(r3.stateData.current_state === CycleState.PLANNING, "RESEARCHING -> PLANNING succeeds");
assert(r3.gateCompleted === "RESEARCH", "RESEARCHING -> PLANNING completes RESEARCH gate");

// PLANNING -> VALIDATING_PLAN
const r4 = transition(r3.stateData, CycleState.VALIDATING_PLAN);
assert(r4.stateData.current_state === CycleState.VALIDATING_PLAN, "PLANNING -> VALIDATING_PLAN succeeds");

// PLANNING -> BUILDING (skip validation)
const r5 = transition(r3.stateData, CycleState.BUILDING);
assert(r5.stateData.current_state === CycleState.BUILDING, "PLANNING -> BUILDING succeeds");
assert(r5.gatesSkipped.includes("PLAN_VALIDATION"), "PLANNING -> BUILDING skips PLAN_VALIDATION");

// VALIDATING_PLAN -> PLANNING (gaps found, backward)
const r6 = transition(r4.stateData, CycleState.PLANNING);
assert(r6.stateData.current_state === CycleState.PLANNING, "VALIDATING_PLAN -> PLANNING succeeds");
assert(r6.gateCompleted === null, "VALIDATING_PLAN -> PLANNING does not complete gate");

// VALIDATING_PLAN -> BUILDING (validation passed)
const r7 = transition(r4.stateData, CycleState.BUILDING);
assert(r7.stateData.current_state === CycleState.BUILDING, "VALIDATING_PLAN -> BUILDING succeeds");
assert(r7.gateCompleted === "PLAN_VALIDATION", "VALIDATING_PLAN -> BUILDING completes PLAN_VALIDATION");

// BUILDING -> VALIDATING_BUILD
const buildState = r7.stateData;
const r8 = transition(buildState, CycleState.VALIDATING_BUILD);
assert(r8.stateData.current_state === CycleState.VALIDATING_BUILD, "BUILDING -> VALIDATING_BUILD succeeds");

// BUILDING -> REVIEWING_PRE (skip build validation)
const r9 = transition(buildState, CycleState.REVIEWING_PRE);
assert(r9.stateData.current_state === CycleState.REVIEWING_PRE, "BUILDING -> REVIEWING_PRE succeeds");
assert(r9.gatesSkipped.includes("BUILD_VALIDATION"), "BUILDING -> REVIEWING_PRE skips BUILD_VALIDATION");

// BUILDING -> READY_TO_SHIP (skip build validation + review)
const r10 = transition(buildState, CycleState.READY_TO_SHIP);
assert(r10.stateData.current_state === CycleState.READY_TO_SHIP, "BUILDING -> READY_TO_SHIP succeeds");
assert(r10.gatesSkipped.includes("BUILD_VALIDATION"), "BUILDING -> READY_TO_SHIP skips BUILD_VALIDATION");
assert(r10.gatesSkipped.includes("REVIEW_PRE_SHIP"), "BUILDING -> READY_TO_SHIP skips REVIEW_PRE_SHIP");

// VALIDATING_BUILD -> BUILDING (issues found)
const r11 = transition(r8.stateData, CycleState.BUILDING);
assert(r11.stateData.current_state === CycleState.BUILDING, "VALIDATING_BUILD -> BUILDING succeeds");
assert(r11.gateCompleted === null, "VALIDATING_BUILD -> BUILDING does not complete gate");

// VALIDATING_BUILD -> PLANNING (major issues)
const r12 = transition(r8.stateData, CycleState.PLANNING);
assert(r12.stateData.current_state === CycleState.PLANNING, "VALIDATING_BUILD -> PLANNING succeeds");

// VALIDATING_BUILD -> REVIEWING_PRE (passed)
const r13 = transition(r8.stateData, CycleState.REVIEWING_PRE);
assert(r13.stateData.current_state === CycleState.REVIEWING_PRE, "VALIDATING_BUILD -> REVIEWING_PRE succeeds");
assert(r13.gateCompleted === "BUILD_VALIDATION", "VALIDATING_BUILD -> REVIEWING_PRE completes BUILD_VALIDATION");

// VALIDATING_BUILD -> READY_TO_SHIP (skip review)
const r14 = transition(r8.stateData, CycleState.READY_TO_SHIP);
assert(r14.stateData.current_state === CycleState.READY_TO_SHIP, "VALIDATING_BUILD -> READY_TO_SHIP succeeds");
assert(r14.gatesSkipped.includes("REVIEW_PRE_SHIP"), "VALIDATING_BUILD -> READY_TO_SHIP skips REVIEW_PRE_SHIP");

// REVIEWING_PRE -> BUILDING (not ready)
const r15 = transition(r13.stateData, CycleState.BUILDING);
assert(r15.stateData.current_state === CycleState.BUILDING, "REVIEWING_PRE -> BUILDING succeeds");
assert(r15.gateCompleted === null, "REVIEWING_PRE -> BUILDING does not complete gate");

// REVIEWING_PRE -> READY_TO_SHIP (ready)
const r16 = transition(r13.stateData, CycleState.READY_TO_SHIP);
assert(r16.stateData.current_state === CycleState.READY_TO_SHIP, "REVIEWING_PRE -> READY_TO_SHIP succeeds");
assert(r16.gateCompleted === "REVIEW_PRE_SHIP", "REVIEWING_PRE -> READY_TO_SHIP completes REVIEW_PRE_SHIP");

// READY_TO_SHIP -> SHIPPED
const r17 = transition(r16.stateData, CycleState.SHIPPED);
assert(r17.stateData.current_state === CycleState.SHIPPED, "READY_TO_SHIP -> SHIPPED succeeds");

// SHIPPED -> REVIEWING_POST
const r18 = transition(r17.stateData, CycleState.REVIEWING_POST);
assert(r18.stateData.current_state === CycleState.REVIEWING_POST, "SHIPPED -> REVIEWING_POST succeeds");

// SHIPPED -> CYCLE_COMPLETE (skip post-ship review)
const r19 = transition(r17.stateData, CycleState.CYCLE_COMPLETE);
assert(r19.stateData.current_state === CycleState.CYCLE_COMPLETE, "SHIPPED -> CYCLE_COMPLETE succeeds");
assert(r19.gatesSkipped.includes("REVIEW_POST_SHIP"), "SHIPPED -> CYCLE_COMPLETE skips REVIEW_POST_SHIP");

// REVIEWING_POST -> CYCLE_COMPLETE
const r20 = transition(r18.stateData, CycleState.CYCLE_COMPLETE);
assert(r20.stateData.current_state === CycleState.CYCLE_COMPLETE, "REVIEWING_POST -> CYCLE_COMPLETE succeeds");
assert(r20.gateCompleted === "REVIEW_POST_SHIP", "REVIEWING_POST -> CYCLE_COMPLETE completes REVIEW_POST_SHIP");

// CYCLE_COMPLETE -> INIT (new cycle)
const r21 = transition(r20.stateData, CycleState.INIT);
assert(r21.stateData.current_state === CycleState.INIT, "CYCLE_COMPLETE -> INIT succeeds");

// Invalid transitions
console.log("\nInvalid transitions:");
assertThrows(() => transition(state, CycleState.BUILDING), "INIT -> BUILDING throws (can't skip planning)");
assertThrows(() => transition(state, CycleState.SHIPPED), "INIT -> SHIPPED throws");
assertThrows(() => transition(state, CycleState.VALIDATING_BUILD), "INIT -> VALIDATING_BUILD throws");
assertThrows(() => transition(state, CycleState.CYCLE_COMPLETE), "INIT -> CYCLE_COMPLETE throws");
assertThrows(() => transition(state, CycleState.READY_TO_SHIP), "INIT -> READY_TO_SHIP throws");
assertThrows(
  () => transition(r3.stateData, CycleState.SHIPPED),
  "PLANNING -> SHIPPED throws"
);
assertThrows(
  () => transition(r17.stateData, CycleState.BUILDING),
  "SHIPPED -> BUILDING throws"
);

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

// Transitions log
console.log("\nTransitions log:");
let logState = createInitialState();
assert(logState.transitions_log.length === 0, "Initial transitions_log is empty");

logState = transition(logState, CycleState.PLANNING).stateData;
assert(logState.transitions_log.length === 1, "One entry after first transition");
assert(logState.transitions_log[0].from === CycleState.INIT, "Log entry from is INIT");
assert(logState.transitions_log[0].to === CycleState.PLANNING, "Log entry to is PLANNING");
assert(logState.transitions_log[0].gate_skipped === "RESEARCH", "Log entry records skipped RESEARCH gate");
assert(typeof logState.transitions_log[0].at === "string", "Log entry has timestamp");

logState = transition(logState, CycleState.BUILDING).stateData;
assert(logState.transitions_log.length === 2, "Two entries after second transition");
assert(logState.transitions_log[1].gate_skipped === "PLAN_VALIDATION", "Second log entry records skipped PLAN_VALIDATION");

logState = transition(logState, CycleState.VALIDATING_BUILD).stateData;
logState = transition(logState, CycleState.REVIEWING_PRE).stateData;
assert(logState.transitions_log.length === 4, "Four entries after four transitions");
assert(logState.transitions_log[3].gate_completed === "BUILD_VALIDATION", "Log entry records completed BUILD_VALIDATION");

// New cycle resets transitions_log
logState = transition(logState, CycleState.READY_TO_SHIP).stateData;
logState = transition(logState, CycleState.SHIPPED).stateData;
logState = transition(logState, CycleState.CYCLE_COMPLETE).stateData;
const newCycleLog = transition(logState, CycleState.INIT);
assert(newCycleLog.stateData.transitions_log.length === 0, "New cycle resets transitions_log");

// getNextStates
console.log("\ngetNextStates:");
const initNext = getNextStates(CycleState.INIT);
assert(initNext.length === 2, "INIT has 2 next states");
assert(initNext.includes(CycleState.RESEARCHING), "INIT -> RESEARCHING");
assert(initNext.includes(CycleState.PLANNING), "INIT -> PLANNING");

const buildNext = getNextStates(CycleState.BUILDING);
assert(buildNext.length === 3, "BUILDING has 3 next states");
assert(buildNext.includes(CycleState.VALIDATING_BUILD), "BUILDING -> VALIDATING_BUILD");
assert(buildNext.includes(CycleState.REVIEWING_PRE), "BUILDING -> REVIEWING_PRE");
assert(buildNext.includes(CycleState.READY_TO_SHIP), "BUILDING -> READY_TO_SHIP");

const valBuildNext = getNextStates(CycleState.VALIDATING_BUILD);
assert(valBuildNext.length === 4, "VALIDATING_BUILD has 4 next states");

const shipNext = getNextStates(CycleState.READY_TO_SHIP);
assert(shipNext.length === 1, "READY_TO_SHIP has 1 next state");
assert(shipNext.includes(CycleState.SHIPPED), "READY_TO_SHIP -> SHIPPED");

// isValidTransition
console.log("\nisValidTransition:");
assert(isValidTransition(CycleState.INIT, CycleState.PLANNING) === true, "INIT -> PLANNING is valid");
assert(isValidTransition(CycleState.INIT, CycleState.BUILDING) === false, "INIT -> BUILDING is invalid");
assert(isValidTransition(CycleState.BUILDING, CycleState.VALIDATING_BUILD) === true, "BUILDING -> VALIDATING_BUILD is valid");
assert(isValidTransition(CycleState.SHIPPED, CycleState.INIT) === false, "SHIPPED -> INIT is invalid");

// describeState
console.log("\ndescribeState:");
assert(describeState(CycleState.INIT).includes("initialized"), "INIT description includes initialized");
assert(describeState(CycleState.BUILDING).includes("Build phase"), "BUILDING description includes Build phase");
assert(describeState(CycleState.SHIPPED).includes("Shipped"), "SHIPPED description includes Shipped");

// suggestNextCommand
console.log("\nsuggestNextCommand:");
assert(suggestNextCommand(CycleState.INIT).includes("/solveos:plan"), "INIT suggests /solveos:plan");
assert(suggestNextCommand(CycleState.READY_TO_SHIP).includes("/solveos:ship"), "READY_TO_SHIP suggests /solveos:ship");
assert(suggestNextCommand(CycleState.CYCLE_COMPLETE).includes("/solveos:new-cycle"), "CYCLE_COMPLETE suggests /solveos:new-cycle");

// Full cycle with all gates
console.log("\nFull cycle with all gates:");
let fg = createInitialState();
fg = transition(fg, CycleState.RESEARCHING).stateData;
fg = transition(fg, CycleState.PLANNING).stateData;
fg = transition(fg, CycleState.VALIDATING_PLAN).stateData;
fg = transition(fg, CycleState.BUILDING).stateData;
fg = transition(fg, CycleState.VALIDATING_BUILD).stateData;
fg = transition(fg, CycleState.REVIEWING_PRE).stateData;
fg = transition(fg, CycleState.READY_TO_SHIP).stateData;
fg = transition(fg, CycleState.SHIPPED).stateData;
fg = transition(fg, CycleState.REVIEWING_POST).stateData;
fg = transition(fg, CycleState.CYCLE_COMPLETE).stateData;
assert(fg.current_state === CycleState.CYCLE_COMPLETE, "Full gate cycle reaches CYCLE_COMPLETE");
assert(fg.gates_skipped.length === 0, "Full gate cycle skips no gates");
assert(fg.gates_completed.includes("RESEARCH"), "Full gate cycle completes RESEARCH");
assert(fg.gates_completed.includes("PLAN_VALIDATION"), "Full gate cycle completes PLAN_VALIDATION");
assert(fg.gates_completed.includes("BUILD_VALIDATION"), "Full gate cycle completes BUILD_VALIDATION");
assert(fg.gates_completed.includes("REVIEW_PRE_SHIP"), "Full gate cycle completes REVIEW_PRE_SHIP");
assert(fg.gates_completed.includes("REVIEW_POST_SHIP"), "Full gate cycle completes REVIEW_POST_SHIP");
assert(fg.transitions_log.length === 10, "Full gate cycle has 10 transitions in log");

// Full cycle without gates (skip everything)
console.log("\nFull cycle without gates:");
let s = createInitialState();
s = transition(s, CycleState.PLANNING).stateData;
s = transition(s, CycleState.BUILDING).stateData;
s = transition(s, CycleState.READY_TO_SHIP).stateData;
s = transition(s, CycleState.SHIPPED).stateData;
s = transition(s, CycleState.CYCLE_COMPLETE).stateData;
assert(s.current_state === CycleState.CYCLE_COMPLETE, "Skip-gate cycle reaches CYCLE_COMPLETE");
assert(s.gates_skipped.includes("RESEARCH"), "Tracked skipped RESEARCH");
assert(s.gates_skipped.includes("PLAN_VALIDATION"), "Tracked skipped PLAN_VALIDATION");
assert(s.gates_skipped.includes("BUILD_VALIDATION"), "Tracked skipped BUILD_VALIDATION");
assert(s.gates_skipped.includes("REVIEW_PRE_SHIP"), "Tracked skipped REVIEW_PRE_SHIP");
assert(s.gates_skipped.includes("REVIEW_POST_SHIP"), "Tracked skipped REVIEW_POST_SHIP");

// New cycle resets state
const newCycle = transition(s, CycleState.INIT);
assert(newCycle.stateData.cycle_number === 2, "New cycle increments cycle_number");
assert(newCycle.stateData.gates_skipped.length === 0, "New cycle resets gates_skipped");
assert(newCycle.stateData.gates_completed.length === 0, "New cycle resets gates_completed");
assert(newCycle.stateData.transitions_log.length === 0, "New cycle resets transitions_log");

console.log(`\n--- Results: ${passed} passed, ${failed} failed ---\n`);
process.exit(failed > 0 ? 1 : 0);
