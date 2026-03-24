#!/usr/bin/env node

/**
 * solveos-cli installer entry point.
 *
 * Usage: npx solveos-cli@latest [--runtime opencode|claude-code|cursor|gemini]
 *
 * Detects the active AI coding assistant, installs slash commands and agents,
 * and initializes the .solveos/ project directory.
 */

import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readdir } from "node:fs/promises";
import { detectRuntime } from "../lib/runtime-detect.js";
import { opencode } from "../lib/runtime-adapters/opencode.js";
import { initProject, projectExists } from "../lib/artifacts.js";
import type { Runtime, RuntimeAdapter } from "../types.js";

// ---------------------------------------------------------------------------
// Resolve package root (where commands/, agents/, templates/ live)
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// From dist/bin/install.js -> go up two levels to package root
const PACKAGE_ROOT = resolve(__dirname, "..", "..");

// ---------------------------------------------------------------------------
// Adapter registry
// ---------------------------------------------------------------------------

const ADAPTERS: Partial<Record<Runtime, RuntimeAdapter>> = {
  opencode,
  // claude-code, cursor, gemini adapters added in Phase 4
};

// ---------------------------------------------------------------------------
// CLI argument parsing (minimal — no dep needed)
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): { runtime?: Runtime } {
  const runtimeIndex = argv.indexOf("--runtime");
  if (runtimeIndex !== -1 && argv[runtimeIndex + 1]) {
    return { runtime: argv[runtimeIndex + 1] as Runtime };
  }
  return {};
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const cwd = process.cwd();
  const args = parseArgs(process.argv);

  console.log("");
  console.log("  solveos-cli — Install the solveOS framework");
  console.log("  ─────────────────────────────────────────────");
  console.log("");

  // Step 1: Detect or select runtime
  let runtimeName: Runtime;
  let runtimeDisplayName: string;

  if (args.runtime) {
    runtimeName = args.runtime;
    runtimeDisplayName = args.runtime;
    console.log(`  Runtime: ${runtimeDisplayName} (from --runtime flag)`);
  } else {
    const detected = await detectRuntime(cwd);
    if (detected) {
      runtimeName = detected.runtime;
      runtimeDisplayName = detected.name;
      console.log(`  Detected runtime: ${runtimeDisplayName}`);
      console.log(`  Config: ${detected.configPath}`);
    } else {
      console.log("  No supported AI coding assistant detected.");
      console.log("");
      console.log("  Supported runtimes:");
      console.log("    - OpenCode  (.opencode/ or opencode.json)");
      console.log("    - Claude Code  (.claude/ or CLAUDE.md)");
      console.log("    - Cursor  (.cursor/ or .cursorrules)");
      console.log("    - Gemini CLI  (.gemini/)");
      console.log("");
      console.log("  Use --runtime <name> to specify manually:");
      console.log("    npx solveos-cli --runtime opencode");
      console.log("");
      process.exit(1);
    }
  }

  console.log("");

  // Step 2: Get adapter
  const adapter = ADAPTERS[runtimeName];
  if (!adapter) {
    console.log(`  Runtime "${runtimeName}" is not yet supported.`);
    console.log("  Currently supported: opencode");
    console.log("  Claude Code, Cursor, and Gemini CLI support coming in Phase 4.");
    console.log("");
    process.exit(1);
  }

  // Step 3: Install commands
  const commandsDir = join(PACKAGE_ROOT, "commands", "solveos");
  try {
    const commandFiles = await readdir(commandsDir);
    const mdFiles = commandFiles.filter((f) => f.endsWith(".md"));
    console.log(`  Installing ${mdFiles.length} commands...`);
    await adapter.installCommands(commandsDir);
    for (const f of mdFiles) {
      console.log(`    /solveos-${f.replace(".md", "")}`);
    }
  } catch (err) {
    console.log(`  Warning: Could not install commands: ${err}`);
  }

  // Step 4: Install agents
  const agentsDir = join(PACKAGE_ROOT, "agents");
  try {
    const agentFiles = await readdir(agentsDir);
    const mdFiles = agentFiles.filter((f) => f.endsWith(".md"));
    console.log(`  Installing ${mdFiles.length} agents...`);
    await adapter.installAgents(agentsDir);
    for (const f of mdFiles) {
      console.log(`    @${f.replace(".md", "")}`);
    }
  } catch (err) {
    console.log(`  Warning: Could not install agents: ${err}`);
  }

  // Step 5: Install hooks (stub for now)
  await adapter.installHooks("");

  // Step 6: Initialize .solveos/ project directory
  console.log("");
  if (await projectExists(cwd)) {
    console.log("  .solveos/ directory already exists (preserving existing state)");
  } else {
    await initProject(cwd);
    console.log("  Created .solveos/ directory");
  }

  // Step 7: Print quickstart guide
  console.log("");
  console.log("  ─────────────────────────────────────────────");
  console.log("  Installation complete!");
  console.log("");
  console.log("  Available commands:");
  console.log("    /solveos-new      Start a new project or cycle");
  console.log("    /solveos-plan     Create a Plan Brief");
  console.log("    /solveos-build    Execute against the plan");
  console.log("    /solveos-ship     Ship and archive the cycle");
  console.log("    /solveos-status   Show current cycle status");
  console.log("    /solveos-next     Suggest the next step");
  console.log("");
  console.log("  Quick start:");
  console.log("    1. Run /solveos-new to initialize a project");
  console.log("    2. Run /solveos-plan to create your Plan Brief");
  console.log("    3. Run /solveos-build to execute");
  console.log("    4. Run /solveos-ship when done");
  console.log("");
}

main().catch((err) => {
  console.error("Installation failed:", err);
  process.exit(1);
});
