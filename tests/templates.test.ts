/**
 * Template validation tests.
 * Verifies all markdown templates contain required sections and are valid.
 * Run: npm run dev -- tests/templates.test.ts
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";

let passed = 0;
let failed = 0;

const TEMPLATES_DIR = join(import.meta.dirname ?? ".", "..", "templates");

function assert(condition: boolean, name: string): void {
  if (condition) {
    console.log(`  PASS: ${name}`);
    passed++;
  } else {
    console.log(`  FAIL: ${name}`);
    failed++;
  }
}

async function readTemplate(filename: string): Promise<string> {
  return readFile(join(TEMPLATES_DIR, filename), "utf-8");
}

async function run(): Promise<void> {
  console.log("\n--- Template Tests ---\n");

  // Plan Brief template
  console.log("Plan Brief template (plan-brief.md):");
  const planBrief = await readTemplate("plan-brief.md");
  assert(planBrief.includes("Problem"), "Has Problem section");
  assert(planBrief.includes("Audience"), "Has Audience section");
  assert(planBrief.includes("Goal"), "Has Goal section");
  assert(planBrief.includes("Appetite"), "Has Appetite section");
  assert(planBrief.includes("Constraints"), "Has Constraints section");
  assert(planBrief.includes("Success Criteria"), "Has Success Criteria section");
  assert(planBrief.includes("Core Assumption"), "Has Core Assumption section");
  assert(planBrief.includes("Rabbit Holes"), "Has Rabbit Holes section");
  assert(planBrief.includes("Out of Scope") || planBrief.includes("out of scope"), "Has Out of Scope section");

  // Research Summary template
  console.log("\nResearch Summary template (research-summary.md):");
  const research = await readTemplate("research-summary.md");
  assert(research.includes("Research Summary"), "Has Research Summary heading");
  assert(research.includes("Question"), "Has Question field");
  assert(research.includes("Key Findings") || research.includes("Findings"), "Has Findings section");
  assert(research.includes("Conclusions"), "Has Conclusions section");
  assert(research.includes("Decision"), "Has Decision section");

  // Plan Validation Log template
  console.log("\nPlan Validation Log template (plan-validation-log.md):");
  const planVal = await readTemplate("plan-validation-log.md");
  assert(planVal.includes("Plan Validation Log"), "Has Plan Validation Log heading");
  assert(planVal.includes("Pass"), "Has Pass number");
  assert(planVal.includes("problem correctly stated"), "Has Question 1 (problem)");
  assert(planVal.includes("plan feasible"), "Has Question 2 (feasibility)");
  assert(planVal.includes("specific enough to build"), "Has Question 3 (specificity)");
  assert(planVal.includes("Additional Checks"), "Has Additional Checks section");
  assert(planVal.includes("Decision"), "Has Decision section");

  // Build Validation template
  console.log("\nBuild Validation template (build-validation.md):");
  const buildVal = await readTemplate("build-validation.md");
  assert(buildVal.includes("Build Validation Report"), "Has Build Validation Report heading");
  assert(buildVal.includes("Does it work"), "Has Question 1 (does it work)");
  assert(buildVal.includes("Does it match the plan") || buildVal.includes("match the plan"), "Has Question 2 (match plan)");
  assert(buildVal.includes("stable enough to ship") || buildVal.includes("Is it stable"), "Has Question 3 (stability)");
  assert(buildVal.includes("Success Criteria Status"), "Has Success Criteria Status table");
  assert(buildVal.includes("Criterion"), "Has Criterion column in table");
  assert(buildVal.includes("Pass") && buildVal.includes("Fail"), "Has Pass/Fail status options");
  assert(buildVal.includes("Scope Drift"), "Has Scope Drift section");
  assert(buildVal.includes("Known Issues"), "Has Known Issues section");
  assert(buildVal.includes("Routing Decision"), "Has Routing Decision section");

  // Pre-Ship Review template
  console.log("\nPre-Ship Review template (pre-ship-review.md):");
  const preShip = await readTemplate("pre-ship-review.md");
  assert(preShip.includes("Pre-Ship Review"), "Has Pre-Ship Review heading");
  assert(preShip.includes("solve the stated problem") || preShip.includes("result solve"), "Has problem-solved question");
  assert(preShip.includes("audience"), "Has audience question");
  assert(preShip.includes("weakest part") || preShip.includes("Weakest part"), "Has weakest-part question");
  assert(preShip.includes("Ship readiness") || preShip.includes("ship readiness"), "Has ship readiness section");
  assert(preShip.includes("ready") || preShip.includes("Ready"), "Has readiness assessment");

  // Post-Ship Review template
  console.log("\nPost-Ship Review template (post-ship-review.md):");
  const postShip = await readTemplate("post-ship-review.md");
  assert(postShip.includes("Post-Ship Review"), "Has Post-Ship Review heading");
  assert(postShip.includes("Success Criteria Measurement"), "Has Success Criteria Measurement section");
  assert(postShip.includes("Criterion"), "Has Criterion column");
  assert(postShip.includes("Evidence"), "Has Evidence column");
  assert(postShip.includes("What worked well") || postShip.includes("worked well"), "Has what-worked section");
  assert(postShip.includes("What didn't work") || postShip.includes("didn't work"), "Has what-didn't-work section");
  assert(postShip.includes("Most impactful decision") || postShip.includes("impactful decision"), "Has most-impactful-decision section");
  assert(postShip.includes("Feed-Forward") || postShip.includes("feed-forward") || postShip.includes("Feed forward"), "Has feed-forward section");
  assert(postShip.includes("New problems") || postShip.includes("new problems"), "Has new-problems feed-forward");
  assert(postShip.includes("Deferred scope") || postShip.includes("deferred scope"), "Has deferred-scope feed-forward");
  assert(postShip.includes("Wrong assumptions") || postShip.includes("wrong assumptions"), "Has wrong-assumptions feed-forward");
  assert(postShip.includes("Open questions") || postShip.includes("open questions"), "Has open-questions feed-forward");

  // Config default template
  console.log("\nConfig default (config-default.json):");
  const configRaw = await readFile(join(TEMPLATES_DIR, "config-default.json"), "utf-8");
  const config = JSON.parse(configRaw);
  assert(config.mode === "interactive", "Default mode is interactive");
  assert(config.gates !== undefined, "Has gates object");
  assert(config.gates.research === true, "Research gate default is true");
  assert(config.gates.plan_validation === true, "Plan validation gate default is true");
  assert(config.gates.build_validation === true, "Build validation gate default is true");
  assert(config.gates.review_pre_ship === true, "Pre-ship review gate default is true");
  assert(config.gates.review_post_ship === true, "Post-ship review gate default is true");
  assert(config.plan_validation_max_passes === 3, "Max passes default is 3");
  assert(config.domain === "software", "Default domain is software");

  console.log(`\n--- Results: ${passed} passed, ${failed} failed ---\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
