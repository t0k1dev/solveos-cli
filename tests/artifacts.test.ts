/**
 * Smoke test for artifact management.
 * Run: npm run dev -- tests/artifacts.test.ts
 */

import { mkdtemp, rm, readFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  initProject,
  projectExists,
  readConfig,
  writeConfig,
  readState,
  writeState,
  readBrief,
  writeBrief,
  archiveCycle,
} from "../src/lib/artifacts.js";
import { CycleState } from "../src/types.js";
import type { Config, CycleStateData, PlanBrief } from "../src/types.js";
import { DEFAULT_CONFIG } from "../src/lib/config.js";

let passed = 0;
let failed = 0;
let tmpDir: string;

function assert(condition: boolean, name: string): void {
  if (condition) {
    console.log(`  PASS: ${name}`);
    passed++;
  } else {
    console.log(`  FAIL: ${name}`);
    failed++;
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function setup(): Promise<void> {
  tmpDir = await mkdtemp(join(tmpdir(), "solveos-test-"));
}

async function teardown(): Promise<void> {
  await rm(tmpDir, { recursive: true, force: true });
}

async function run(): Promise<void> {
  await setup();

  console.log("\n--- Artifact Management Tests ---\n");

  // projectExists before init
  console.log("projectExists:");
  assert((await projectExists(tmpDir)) === false, "Returns false before init");

  // initProject
  console.log("\ninitProject:");
  await initProject(tmpDir);
  assert((await projectExists(tmpDir)) === true, "Returns true after init");
  assert(await exists(join(tmpDir, ".solveos", "config.json")), "config.json created");
  assert(await exists(join(tmpDir, ".solveos", "STATE.md")), "STATE.md created");
  assert(await exists(join(tmpDir, ".solveos", "research")), "research/ created");
  assert(await exists(join(tmpDir, ".solveos", "validations")), "validations/ created");
  assert(await exists(join(tmpDir, ".solveos", "reviews")), "reviews/ created");
  assert(await exists(join(tmpDir, ".solveos", "history")), "history/ created");
  assert(await exists(join(tmpDir, ".solveos", "notes")), "notes/ created");

  // Safe to run twice
  await initProject(tmpDir);
  assert(true, "initProject() does not throw on second run");

  // readConfig
  console.log("\nreadConfig:");
  const config = await readConfig(tmpDir);
  assert(config.mode === "interactive", "Default mode is interactive");
  assert(config.gates.research === true, "Default research gate is true");
  assert(config.runtime === "auto", "Default runtime is auto");

  // writeConfig
  console.log("\nwriteConfig:");
  const newConfig: Config = { ...config, mode: "auto", domain: "content" };
  await writeConfig(tmpDir, newConfig);
  const reRead = await readConfig(tmpDir);
  assert(reRead.mode === "auto", "Mode updated to auto");
  assert(reRead.domain === "content", "Domain updated to content");

  // readState / writeState
  console.log("\nreadState / writeState:");
  const state = await readState(tmpDir);
  assert(state !== null, "State exists after init");
  assert(state!.current_state === CycleState.INIT, "Initial state is INIT");
  assert(state!.cycle_number === 1, "Cycle number is 1");

  const updatedState: CycleStateData = {
    ...state!,
    current_state: CycleState.BUILDING,
    gates_skipped: ["RESEARCH", "PLAN_VALIDATION"],
    updated_at: new Date().toISOString(),
  };
  await writeState(tmpDir, updatedState);
  const reReadState = await readState(tmpDir);
  assert(reReadState!.current_state === CycleState.BUILDING, "State updated to BUILDING");
  assert(reReadState!.gates_skipped.length === 2, "2 gates skipped");

  // STATE.md is human-readable
  const stateContent = await readFile(join(tmpDir, ".solveos", "STATE.md"), "utf-8");
  assert(stateContent.includes("# Cycle 1"), "STATE.md has human-readable heading");
  assert(stateContent.includes("**Current State:** BUILDING"), "STATE.md shows current state");

  // readBrief / writeBrief
  console.log("\nreadBrief / writeBrief:");
  assert((await readBrief(tmpDir)) === null, "No brief before writing");

  const brief: PlanBrief = {
    problem: "API response times exceed 2s under load.",
    audience: "Backend engineers on the payments team.",
    goal: "Reduce p95 API response time to under 500ms.",
    appetite: "4 hours of focused work.",
    constraints: ["Must use existing database", "No new dependencies"],
    success_criteria: ["p95 < 500ms at current load", "No regressions in test suite"],
    core_assumption: "The bottleneck is in the query layer, not the network.",
    rabbit_holes: ["Don't rewrite the ORM", "Avoid premature caching"],
    out_of_scope: ["Frontend performance", "Database migration"],
  };
  await writeBrief(tmpDir, brief);
  const briefContent = await readBrief(tmpDir);
  assert(briefContent !== null, "Brief exists after writing");
  assert(briefContent!.includes("# Plan Brief"), "Brief has heading");
  assert(briefContent!.includes("## Problem"), "Brief has Problem section");
  assert(briefContent!.includes("- [ ] p95 < 500ms"), "Success criteria use checkbox format");
  assert(briefContent!.includes("- Must use existing database"), "Constraints use bullet format");

  // writeBrief with raw string
  await writeBrief(tmpDir, "# Custom Brief\n\nRaw markdown content.");
  const rawBrief = await readBrief(tmpDir);
  assert(rawBrief!.includes("# Custom Brief"), "Raw string brief works");

  // archiveCycle
  console.log("\narchiveCycle:");
  await writeBrief(tmpDir, brief); // Restore brief for archival
  await archiveCycle(tmpDir, 1);
  assert(await exists(join(tmpDir, ".solveos", "history", "cycle-1")), "Archive dir created");
  assert(await exists(join(tmpDir, ".solveos", "history", "cycle-1", "BRIEF.md")), "BRIEF.md archived");
  assert(await exists(join(tmpDir, ".solveos", "history", "cycle-1", "STATE.md")), "STATE.md archived");
  assert((await readBrief(tmpDir)) === null, "BRIEF.md cleared after archive");

  await teardown();

  console.log(`\n--- Results: ${passed} passed, ${failed} failed ---\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
