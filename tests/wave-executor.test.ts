/**
 * Wave executor tests.
 * Tests work unit creation, dependency validation, cycle detection,
 * wave grouping (topological sort), execution state management,
 * cascade skip, discovered units, result generation, and rendering.
 *
 * Run: npm test
 */

import {
  createWorkUnit,
  validateDependencies,
  groupIntoWaves,
  buildExecutionPlan,
  startUnit,
  completeUnit,
  failUnit,
  skipUnit,
  cascadeSkip,
  addDiscoveredUnit,
  generateResult,
  getNextWave,
  getPendingUnits,
  isWaveComplete,
  isPlanComplete,
  getProgressSummary,
  renderPlanMarkdown,
  GRANULARITY_RANGES,
} from "../src/workflows/wave-executor.js";
import type { WorkUnit, WaveExecutionPlan } from "../src/types.js";

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

function assertThrows(fn: () => void, name: string, messageContains?: string): void {
  try {
    fn();
    console.log(`  FAIL: ${name} (did not throw)`);
    failed++;
  } catch (err) {
    if (messageContains && !(err as Error).message.includes(messageContains)) {
      console.log(`  FAIL: ${name} (message "${(err as Error).message}" doesn't contain "${messageContains}")`);
      failed++;
    } else {
      console.log(`  PASS: ${name}`);
      passed++;
    }
  }
}

// ---------------------------------------------------------------------------
// createWorkUnit
// ---------------------------------------------------------------------------

function testCreateWorkUnit(): void {
  console.log("createWorkUnit:");

  const unit = createWorkUnit("unit-1", "Setup project", "Initialize the project structure");
  assert(unit.id === "unit-1", "ID is set");
  assert(unit.name === "Setup project", "Name is set");
  assert(unit.description === "Initialize the project structure", "Description is set");
  assert(unit.depends_on.length === 0, "No dependencies by default");
  assert(unit.criteria.length === 0, "No criteria by default");
  assert(unit.status === "pending", "Status is pending by default");
  assert(unit.discovered === false, "Not discovered by default");

  const unitWithOpts = createWorkUnit("unit-2", "Build API", "Create REST endpoints", {
    depends_on: ["unit-1"],
    criteria: ["API endpoints respond correctly"],
    discovered: true,
  });
  assert(unitWithOpts.depends_on[0] === "unit-1", "Dependencies set via options");
  assert(unitWithOpts.criteria[0] === "API endpoints respond correctly", "Criteria set via options");
  assert(unitWithOpts.discovered === true, "Discovered flag set via options");
}

// ---------------------------------------------------------------------------
// validateDependencies
// ---------------------------------------------------------------------------

function testValidateDependencies(): void {
  console.log("validateDependencies:");

  // Valid graph — no errors
  const validUnits = [
    createWorkUnit("a", "A", "First"),
    createWorkUnit("b", "B", "Second", { depends_on: ["a"] }),
    createWorkUnit("c", "C", "Third", { depends_on: ["a"] }),
    createWorkUnit("d", "D", "Fourth", { depends_on: ["b", "c"] }),
  ];
  const validErrors = validateDependencies(validUnits);
  assert(validErrors.length === 0, "Valid dependency graph has no errors");

  // Self-reference
  const selfRef: WorkUnit = { ...createWorkUnit("x", "X", "Self"), depends_on: ["x"] };
  const selfErrors = validateDependencies([selfRef]);
  assert(selfErrors.some((e) => e.includes("depends on itself")), "Detects self-reference");

  // Dangling reference
  const dangling = createWorkUnit("y", "Y", "Dangling", { depends_on: ["nonexistent"] });
  const danglingErrors = validateDependencies([dangling]);
  assert(danglingErrors.some((e) => e.includes("unknown unit")), "Detects dangling reference");

  // Simple cycle: A -> B -> A
  const cycleA: WorkUnit = { ...createWorkUnit("ca", "CA", "Cycle A"), depends_on: ["cb"] };
  const cycleB: WorkUnit = { ...createWorkUnit("cb", "CB", "Cycle B"), depends_on: ["ca"] };
  const cycleErrors = validateDependencies([cycleA, cycleB]);
  assert(cycleErrors.some((e) => e.includes("cycle")), "Detects simple A->B->A cycle");

  // No dependencies — valid
  const noDeps = [
    createWorkUnit("p", "P", "Independent 1"),
    createWorkUnit("q", "Q", "Independent 2"),
    createWorkUnit("r", "R", "Independent 3"),
  ];
  const noDepErrors = validateDependencies(noDeps);
  assert(noDepErrors.length === 0, "All-independent graph is valid");
}

// ---------------------------------------------------------------------------
// groupIntoWaves
// ---------------------------------------------------------------------------

function testGroupIntoWaves(): void {
  console.log("groupIntoWaves:");

  // Linear chain: A -> B -> C
  const linear = [
    createWorkUnit("a", "A", "First"),
    createWorkUnit("b", "B", "Second", { depends_on: ["a"] }),
    createWorkUnit("c", "C", "Third", { depends_on: ["b"] }),
  ];
  const linearWaves = groupIntoWaves(linear);
  assert(linearWaves.length === 3, "Linear chain produces 3 waves");
  assert(linearWaves[0].unit_ids[0] === "a", "Wave 1 contains A");
  assert(linearWaves[1].unit_ids[0] === "b", "Wave 2 contains B");
  assert(linearWaves[2].unit_ids[0] === "c", "Wave 3 contains C");

  // Diamond: A -> B, A -> C, B+C -> D
  const diamond = [
    createWorkUnit("a", "A", "Root"),
    createWorkUnit("b", "B", "Left", { depends_on: ["a"] }),
    createWorkUnit("c", "C", "Right", { depends_on: ["a"] }),
    createWorkUnit("d", "D", "Merge", { depends_on: ["b", "c"] }),
  ];
  const diamondWaves = groupIntoWaves(diamond);
  assert(diamondWaves.length === 3, "Diamond produces 3 waves");
  assert(diamondWaves[0].unit_ids.length === 1, "Wave 1 has 1 unit (A)");
  assert(diamondWaves[1].unit_ids.length === 2, "Wave 2 has 2 units (B, C parallel)");
  assert(diamondWaves[1].unit_ids.includes("b"), "Wave 2 contains B");
  assert(diamondWaves[1].unit_ids.includes("c"), "Wave 2 contains C");
  assert(diamondWaves[2].unit_ids[0] === "d", "Wave 3 contains D");

  // All independent — single wave
  const independent = [
    createWorkUnit("x", "X", "Independent 1"),
    createWorkUnit("y", "Y", "Independent 2"),
    createWorkUnit("z", "Z", "Independent 3"),
  ];
  const indWaves = groupIntoWaves(independent);
  assert(indWaves.length === 1, "All-independent produces 1 wave");
  assert(indWaves[0].unit_ids.length === 3, "Single wave has all 3 units");

  // Empty
  const emptyWaves = groupIntoWaves([]);
  assert(emptyWaves.length === 0, "Empty input produces 0 waves");

  // Wide graph: A and B independent, C depends on A, D depends on B
  const wide = [
    createWorkUnit("a", "A", "Root 1"),
    createWorkUnit("b", "B", "Root 2"),
    createWorkUnit("c", "C", "Branch 1", { depends_on: ["a"] }),
    createWorkUnit("d", "D", "Branch 2", { depends_on: ["b"] }),
  ];
  const wideWaves = groupIntoWaves(wide);
  assert(wideWaves.length === 2, "Wide graph produces 2 waves");
  assert(wideWaves[0].unit_ids.length === 2, "Wave 1 has 2 independent roots");
  assert(wideWaves[1].unit_ids.length === 2, "Wave 2 has 2 parallel branches");
}

// ---------------------------------------------------------------------------
// buildExecutionPlan
// ---------------------------------------------------------------------------

function testBuildExecutionPlan(): void {
  console.log("buildExecutionPlan:");

  const units = [
    createWorkUnit("u1", "Setup", "Init project"),
    createWorkUnit("u2", "API", "Build API", { depends_on: ["u1"] }),
    createWorkUnit("u3", "UI", "Build UI", { depends_on: ["u1"] }),
    createWorkUnit("u4", "Integration", "Wire up", { depends_on: ["u2", "u3"] }),
  ];

  const plan = buildExecutionPlan(units, "standard");
  assert(plan.units.length === 4, "Plan has 4 units");
  assert(plan.waves.length === 3, "Plan has 3 waves");
  assert(plan.granularity === "standard", "Granularity is standard");
  assert(plan.single_unit === false, "Not a single-unit plan");
  assert(plan.created_at.length > 0, "Has created_at timestamp");

  // Single unit plan
  const singlePlan = buildExecutionPlan(
    [createWorkUnit("only", "Only one", "Single task")],
    "coarse",
  );
  assert(singlePlan.single_unit === true, "Single unit plan detected");
  assert(singlePlan.waves.length === 1, "Single unit produces 1 wave");

  // Invalid dependencies should throw
  const invalid = [
    createWorkUnit("a", "A", "First", { depends_on: ["b"] }),
    createWorkUnit("b", "B", "Second", { depends_on: ["a"] }),
  ];
  assertThrows(
    () => buildExecutionPlan(invalid, "standard"),
    "Throws on cyclic dependencies",
    "cycle",
  );
}

// ---------------------------------------------------------------------------
// Execution state management
// ---------------------------------------------------------------------------

function testExecutionStateManagement(): void {
  console.log("Execution state management:");

  const units = [
    createWorkUnit("u1", "Step 1", "First step"),
    createWorkUnit("u2", "Step 2", "Second step", { depends_on: ["u1"] }),
  ];
  const plan = buildExecutionPlan(units, "standard");

  // Start unit
  startUnit(plan, "u1");
  assert(plan.units[0].status === "in_progress", "startUnit sets status to in_progress");
  assert(plan.waves[0].status === "in_progress", "Starting first unit updates wave status");

  // Can't start already started unit
  assertThrows(
    () => startUnit(plan, "u1"),
    "Can't start already in-progress unit",
    "status is \"in_progress\"",
  );

  // Complete unit
  completeUnit(plan, "u1", "Set up the project structure");
  assert(plan.units[0].status === "completed", "completeUnit sets status to completed");
  assert(plan.units[0].summary === "Set up the project structure", "completeUnit sets summary");
  assert(plan.waves[0].status === "completed", "Wave marked completed when all units done");

  // Can't complete non-in-progress unit
  assertThrows(
    () => completeUnit(plan, "u1", "Again"),
    "Can't complete already completed unit",
    "status is \"completed\"",
  );

  // Start and fail unit
  startUnit(plan, "u2");
  failUnit(plan, "u2", "Build error: missing dependency");
  assert(plan.units[1].status === "failed", "failUnit sets status to failed");
  assert(plan.units[1].error === "Build error: missing dependency", "failUnit sets error");
  assert(plan.waves[1].status === "failed", "Wave marked failed when a unit fails");

  // Skip unit
  const plan2 = buildExecutionPlan(
    [createWorkUnit("s1", "Skip me", "Will be skipped")],
    "standard",
  );
  skipUnit(plan2, "s1", "Not needed");
  assert(plan2.units[0].status === "skipped", "skipUnit sets status to skipped");
  assert(plan2.units[0].error === "Not needed", "skipUnit records reason in error");
}

// ---------------------------------------------------------------------------
// cascadeSkip
// ---------------------------------------------------------------------------

function testCascadeSkip(): void {
  console.log("cascadeSkip:");

  // A -> B -> D
  // A -> C -> D
  // Fail A → should skip B, C, D
  const units = [
    createWorkUnit("a", "A", "Root"),
    createWorkUnit("b", "B", "Mid 1", { depends_on: ["a"] }),
    createWorkUnit("c", "C", "Mid 2", { depends_on: ["a"] }),
    createWorkUnit("d", "D", "End", { depends_on: ["b", "c"] }),
  ];
  const plan = buildExecutionPlan(units, "standard");

  // Simulate A failing
  startUnit(plan, "a");
  failUnit(plan, "a", "Root failure");

  const skipped = cascadeSkip(plan, "a");
  assert(skipped.length === 3, "Cascade skips 3 dependent units");
  assert(skipped.includes("b"), "B is skipped");
  assert(skipped.includes("c"), "C is skipped");
  assert(skipped.includes("d"), "D is skipped");
  assert(plan.units[1].status === "skipped", "B status is skipped");
  assert(plan.units[3].error?.includes("failed"), "D error references the failed dependency");

  // Partial cascade: fail B, only D should skip (C is independent)
  const units2 = [
    createWorkUnit("a", "A", "Root"),
    createWorkUnit("b", "B", "Mid 1", { depends_on: ["a"] }),
    createWorkUnit("c", "C", "Mid 2", { depends_on: ["a"] }),
    createWorkUnit("d", "D", "End", { depends_on: ["b"] }), // only depends on B, not C
  ];
  const plan2 = buildExecutionPlan(units2, "standard");

  // Complete A, then fail B
  startUnit(plan2, "a");
  completeUnit(plan2, "a", "Done");
  startUnit(plan2, "b");
  failUnit(plan2, "b", "B failed");

  const skipped2 = cascadeSkip(plan2, "b");
  assert(skipped2.length === 1, "Only D is skipped (C is independent of B)");
  assert(skipped2[0] === "d", "D is the skipped unit");
  assert(plan2.units[2].status === "pending", "C remains pending (not dependent on B)");
}

// ---------------------------------------------------------------------------
// addDiscoveredUnit
// ---------------------------------------------------------------------------

function testAddDiscoveredUnit(): void {
  console.log("addDiscoveredUnit:");

  const units = [
    createWorkUnit("u1", "Setup", "Init"),
    createWorkUnit("u2", "Build", "Build stuff", { depends_on: ["u1"] }),
  ];
  const plan = buildExecutionPlan(units, "standard");

  // Add discovered unit with no dependencies → should go in Wave 1
  const discovered1 = createWorkUnit("d1", "Fix typo", "Small fix");
  addDiscoveredUnit(plan, discovered1);
  assert(plan.units.length === 3, "Plan has 3 units after adding discovered");
  assert(plan.units[2].discovered === true, "Discovered flag is set");
  assert(plan.waves[0].unit_ids.includes("d1"), "Discovered unit with no deps goes in Wave 1");

  // Add discovered unit depending on u2 → should go in Wave 3
  const discovered2 = createWorkUnit("d2", "Post-build fix", "Fix after build", {
    depends_on: ["u2"],
  });
  addDiscoveredUnit(plan, discovered2);
  assert(plan.units.length === 4, "Plan has 4 units after second discovered");
  const d2Wave = plan.waves.find((w) => w.unit_ids.includes("d2"));
  assert(d2Wave !== undefined, "d2 is assigned to a wave");
  assert(d2Wave!.number === 3, "d2 goes in wave 3 (after u2 in wave 2)");

  // Plan is no longer single_unit
  assert(plan.single_unit === false, "Plan is not single_unit after adding units");
}

// ---------------------------------------------------------------------------
// generateResult
// ---------------------------------------------------------------------------

function testGenerateResult(): void {
  console.log("generateResult:");

  // All completed
  const units = [
    createWorkUnit("a", "A", "First"),
    createWorkUnit("b", "B", "Second"),
  ];
  const plan = buildExecutionPlan(units, "standard");
  startUnit(plan, "a");
  completeUnit(plan, "a", "Done A");
  startUnit(plan, "b");
  completeUnit(plan, "b", "Done B");

  const result = generateResult(plan);
  assert(result.status === "completed", "All-complete status is 'completed'");
  assert(result.units_completed === 2, "2 units completed");
  assert(result.units_total === 2, "2 units total");
  assert(result.wave_summaries.length === 1, "1 wave summary (both in wave 1)");

  // Partial: one completed, one failed
  const units2 = [
    createWorkUnit("x", "X", "First"),
    createWorkUnit("y", "Y", "Second"),
  ];
  const plan2 = buildExecutionPlan(units2, "standard");
  startUnit(plan2, "x");
  completeUnit(plan2, "x", "Done X");
  startUnit(plan2, "y");
  failUnit(plan2, "y", "Y broke");

  const result2 = generateResult(plan2);
  assert(result2.status === "partial", "Mixed complete/fail status is 'partial'");
  assert(result2.units_completed === 1, "1 unit completed in partial result");
  assert(result2.wave_summaries[0].failed.includes("y"), "Failed unit in wave summary");

  // All failed
  const units3 = [createWorkUnit("z", "Z", "Only")];
  const plan3 = buildExecutionPlan(units3, "standard");
  startUnit(plan3, "z");
  failUnit(plan3, "z", "Total failure");

  const result3 = generateResult(plan3);
  assert(result3.status === "failed", "All-failed status is 'failed'");
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

function testQueryHelpers(): void {
  console.log("Query helpers:");

  const units = [
    createWorkUnit("a", "A", "Root"),
    createWorkUnit("b", "B", "Mid", { depends_on: ["a"] }),
    createWorkUnit("c", "C", "End", { depends_on: ["b"] }),
  ];
  const plan = buildExecutionPlan(units, "standard");

  // getNextWave
  const nextWave = getNextWave(plan);
  assert(nextWave !== null, "Next wave is not null");
  assert(nextWave!.number === 1, "Next wave is wave 1");

  // getPendingUnits
  const pending = getPendingUnits(plan, 1);
  assert(pending.length === 1, "1 pending unit in wave 1");
  assert(pending[0].id === "a", "Pending unit is A");

  // isWaveComplete before execution
  assert(isWaveComplete(plan, 1) === false, "Wave 1 not complete before execution");

  // isPlanComplete before execution
  assert(isPlanComplete(plan) === false, "Plan not complete before execution");

  // Execute wave 1
  startUnit(plan, "a");
  completeUnit(plan, "a", "Done");
  assert(isWaveComplete(plan, 1) === true, "Wave 1 complete after execution");
  assert(isPlanComplete(plan) === false, "Plan still not complete");

  // getNextWave should now return wave 2
  const nextWave2 = getNextWave(plan);
  assert(nextWave2 !== null && nextWave2.number === 2, "Next wave is now wave 2");

  // Execute all
  startUnit(plan, "b");
  completeUnit(plan, "b", "Done B");
  startUnit(plan, "c");
  completeUnit(plan, "c", "Done C");
  assert(isPlanComplete(plan) === true, "Plan complete after all units done");
  assert(getNextWave(plan) === null, "No next wave when all complete");

  // getProgressSummary
  const summary = getProgressSummary(plan);
  assert(summary.includes("3/3 units completed"), "Progress summary shows completion count");
}

// ---------------------------------------------------------------------------
// renderPlanMarkdown
// ---------------------------------------------------------------------------

function testRenderPlanMarkdown(): void {
  console.log("renderPlanMarkdown:");

  const units = [
    createWorkUnit("u1", "Setup", "Init project", { criteria: ["Project scaffolded"] }),
    createWorkUnit("u2", "API", "Build API", { depends_on: ["u1"], criteria: ["API works"] }),
  ];
  const plan = buildExecutionPlan(units, "standard");

  const md = renderPlanMarkdown(plan);
  assert(md.includes("## Wave Execution Plan"), "Has heading");
  assert(md.includes("**Granularity:** standard"), "Shows granularity");
  assert(md.includes("**Units:** 2"), "Shows unit count");
  assert(md.includes("**Waves:** 2"), "Shows wave count");
  assert(md.includes("### Wave 1"), "Has Wave 1 section");
  assert(md.includes("### Wave 2"), "Has Wave 2 section");
  assert(md.includes("Setup"), "Contains unit name");
  assert(md.includes("Project scaffolded"), "Contains criteria");
  assert(md.includes("○ pending"), "Shows pending status");

  // After completing a unit, status should update
  startUnit(plan, "u1");
  completeUnit(plan, "u1", "Project initialized");
  const md2 = renderPlanMarkdown(plan);
  assert(md2.includes("✓ completed"), "Shows completed status after execution");
  assert(md2.includes("Project initialized"), "Shows summary in render");
}

// ---------------------------------------------------------------------------
// GRANULARITY_RANGES
// ---------------------------------------------------------------------------

function testGranularityRanges(): void {
  console.log("GRANULARITY_RANGES:");

  assert(GRANULARITY_RANGES.coarse.min === 2, "Coarse min is 2");
  assert(GRANULARITY_RANGES.coarse.max === 4, "Coarse max is 4");
  assert(GRANULARITY_RANGES.standard.min === 3, "Standard min is 3");
  assert(GRANULARITY_RANGES.standard.max === 6, "Standard max is 6");
  assert(GRANULARITY_RANGES.fine.min === 5, "Fine min is 5");
  assert(GRANULARITY_RANGES.fine.max === 10, "Fine max is 10");
}

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

function testEdgeCases(): void {
  console.log("Edge cases:");

  // Large graph — verify no stack overflow in cycle detection
  const largeUnits: WorkUnit[] = [];
  for (let i = 0; i < 100; i++) {
    largeUnits.push(
      createWorkUnit(`u${i}`, `Unit ${i}`, `Task ${i}`, {
        depends_on: i > 0 ? [`u${i - 1}`] : [],
      }),
    );
  }
  const largeErrors = validateDependencies(largeUnits);
  assert(largeErrors.length === 0, "100-unit linear chain validates without error");

  const largeWaves = groupIntoWaves(largeUnits);
  assert(largeWaves.length === 100, "100-unit linear chain produces 100 waves");

  // Wide graph — many parallel units
  const wideUnits: WorkUnit[] = [];
  for (let i = 0; i < 50; i++) {
    wideUnits.push(createWorkUnit(`w${i}`, `Wide ${i}`, `Parallel task ${i}`));
  }
  const wideWaves = groupIntoWaves(wideUnits);
  assert(wideWaves.length === 1, "50 independent units produce 1 wave");
  assert(wideWaves[0].unit_ids.length === 50, "Single wave has all 50 units");

  // getPendingUnits for nonexistent wave
  const plan = buildExecutionPlan([createWorkUnit("a", "A", "Only")], "standard");
  const noUnits = getPendingUnits(plan, 999);
  assert(noUnits.length === 0, "Nonexistent wave returns empty pending list");

  // isWaveComplete for nonexistent wave
  assert(isWaveComplete(plan, 999) === true, "Nonexistent wave is considered complete");

  // findUnit error
  assertThrows(
    () => startUnit(plan, "nonexistent"),
    "Starting nonexistent unit throws",
    "not found",
  );
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function run(): Promise<void> {
  console.log("# --- Wave Executor Tests ---");

  testCreateWorkUnit();
  testValidateDependencies();
  testGroupIntoWaves();
  testBuildExecutionPlan();
  testExecutionStateManagement();
  testCascadeSkip();
  testAddDiscoveredUnit();
  testGenerateResult();
  testQueryHelpers();
  testRenderPlanMarkdown();
  testGranularityRanges();
  testEdgeCases();

  console.log(`# --- Results: ${passed} passed, ${failed} failed ---`);
  if (failed > 0) process.exit(1);
}

import { test } from "node:test";
test("Wave executor", async () => {
  await run();
});
