/**
 * Artifact management for solveos-cli.
 *
 * Handles creating, reading, writing, and archiving files in the
 * .solveos/ directory. All cycle state persists as markdown and JSON
 * files — no databases, no cloud, no accounts.
 */

import { readFile, writeFile, mkdir, cp, rm, access, readdir } from "node:fs/promises";
import { join, resolve, relative } from "node:path";
import type { Config, CycleStateData, PlanBrief } from "../types.js";
import { DEFAULT_CONFIG } from "./config.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SOLVEOS_DIR = ".solveos";
const BRIEF_FILE = "BRIEF.md";
const STATE_FILE = "STATE.md";
const CONFIG_FILE = "config.json";

const SUBDIRS = [
  "research",
  "validations",
  "reviews",
  "history",
  "notes",
] as const;

// ---------------------------------------------------------------------------
// Path Safety
// ---------------------------------------------------------------------------

/**
 * Resolve a path within .solveos/ and validate it doesn't escape.
 * Throws if the resolved path is outside the .solveos/ directory.
 */
function safePath(projectDir: string, ...segments: string[]): string {
  const base = resolve(projectDir, SOLVEOS_DIR);
  const target = resolve(base, ...segments);
  const rel = relative(base, target);
  if (rel.startsWith("..") || resolve(target) !== target.replace(/\/+$/, "")) {
    // Extra check: the relative path must not escape the base
    if (rel.startsWith("..")) {
      throw new Error(
        `Path traversal detected: "${segments.join("/")}" resolves outside .solveos/`,
      );
    }
  }
  return target;
}

/**
 * Get the .solveos/ directory path for a project.
 */
function solveosDir(projectDir: string): string {
  return resolve(projectDir, SOLVEOS_DIR);
}

// ---------------------------------------------------------------------------
// Existence Checks
// ---------------------------------------------------------------------------

/**
 * Check if a .solveos/ directory exists and is valid.
 */
export async function projectExists(projectDir: string): Promise<boolean> {
  try {
    await access(solveosDir(projectDir));
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a file exists.
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Project Initialization
// ---------------------------------------------------------------------------

/**
 * Create the .solveos/ directory structure.
 * Safe to run multiple times — does not overwrite existing files.
 */
export async function initProject(projectDir: string): Promise<void> {
  const base = solveosDir(projectDir);

  // Create base directory and subdirectories
  await mkdir(base, { recursive: true });
  for (const sub of SUBDIRS) {
    await mkdir(join(base, sub), { recursive: true });
  }

  // Write default config if it doesn't exist
  const configPath = join(base, CONFIG_FILE);
  if (!(await fileExists(configPath))) {
    await writeFile(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2) + "\n", "utf-8");
  }

  // Write initial STATE.md if it doesn't exist
  const statePath = join(base, STATE_FILE);
  if (!(await fileExists(statePath))) {
    const initialState: CycleStateData = {
      current_state: "INIT" as CycleStateData["current_state"],
      cycle_number: 1,
      gates_skipped: [],
      gates_completed: [],
      plan_validation_passes: 0,
      blockers: [],
      transitions_log: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await writeState(projectDir, initialState);
  }
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Read .solveos/config.json. Returns defaults for any missing fields.
 */
export async function readConfig(projectDir: string): Promise<Config> {
  const configPath = safePath(projectDir, CONFIG_FILE);
  try {
    const raw = await readFile(configPath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<Config>;
    return { ...DEFAULT_CONFIG, ...parsed, gates: { ...DEFAULT_CONFIG.gates, ...parsed.gates } };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Write .solveos/config.json.
 */
export async function writeConfig(projectDir: string, config: Config): Promise<void> {
  const configPath = safePath(projectDir, CONFIG_FILE);
  await writeFile(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

// ---------------------------------------------------------------------------
// State (STATE.md)
// ---------------------------------------------------------------------------

/**
 * Read and parse .solveos/STATE.md.
 * STATE.md uses a JSON frontmatter block between `---` markers.
 */
export async function readState(projectDir: string): Promise<CycleStateData | null> {
  const statePath = safePath(projectDir, STATE_FILE);
  try {
    const raw = await readFile(statePath, "utf-8");
    return parseStateMd(raw);
  } catch {
    return null;
  }
}

/**
 * Write structured state to .solveos/STATE.md.
 * Format: YAML-like frontmatter (JSON) between --- markers, then human-readable summary.
 */
export async function writeState(projectDir: string, state: CycleStateData): Promise<void> {
  const statePath = safePath(projectDir, STATE_FILE);
  const content = renderStateMd(state);
  await writeFile(statePath, content, "utf-8");
}

/**
 * Parse STATE.md content into CycleStateData.
 */
function parseStateMd(content: string): CycleStateData {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) {
    throw new Error("STATE.md is missing frontmatter block");
  }
  return JSON.parse(fmMatch[1]) as CycleStateData;
}

/**
 * Render CycleStateData to STATE.md markdown.
 */
function renderStateMd(state: CycleStateData): string {
  const json = JSON.stringify(state, null, 2);
  const lines = [
    "---",
    json,
    "---",
    "",
    `# Cycle ${state.cycle_number} — State`,
    "",
    `**Current State:** ${state.current_state}`,
    `**Updated:** ${state.updated_at}`,
    "",
  ];

  if (state.gates_completed.length > 0) {
    lines.push("## Gates Completed");
    for (const g of state.gates_completed) {
      lines.push(`- [x] ${g}`);
    }
    lines.push("");
  }

  if (state.gates_skipped.length > 0) {
    lines.push("## Gates Skipped");
    for (const g of state.gates_skipped) {
      lines.push(`- [~] ${g}`);
    }
    lines.push("");
  }

  if (state.plan_validation_passes > 0) {
    lines.push(`**Plan Validation Passes:** ${state.plan_validation_passes}`);
    lines.push("");
  }

  if (state.blockers.length > 0) {
    lines.push("## Blockers");
    for (const b of state.blockers) {
      lines.push(`- ${b}`);
    }
    lines.push("");
  }

  if (state.transitions_log && state.transitions_log.length > 0) {
    lines.push("## Transitions Log");
    lines.push("");
    lines.push("| # | From | To | At | Gate Skipped | Gate Completed |");
    lines.push("|---|------|----|----|--------------|----------------|");
    for (let i = 0; i < state.transitions_log.length; i++) {
      const entry = state.transitions_log[i];
      const skipped = entry.gate_skipped ?? "—";
      const completed = entry.gate_completed ?? "—";
      lines.push(`| ${i + 1} | ${entry.from} | ${entry.to} | ${entry.at} | ${skipped} | ${completed} |`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Plan Brief (BRIEF.md)
// ---------------------------------------------------------------------------

/**
 * Read .solveos/BRIEF.md and return its raw content, or null if not found.
 */
export async function readBrief(projectDir: string): Promise<string | null> {
  const briefPath = safePath(projectDir, BRIEF_FILE);
  try {
    return await readFile(briefPath, "utf-8");
  } catch {
    return null;
  }
}

/**
 * Write a Plan Brief to .solveos/BRIEF.md.
 * Accepts either a PlanBrief object (rendered to markdown) or raw markdown string.
 */
export async function writeBrief(
  projectDir: string,
  brief: PlanBrief | string,
): Promise<void> {
  const briefPath = safePath(projectDir, BRIEF_FILE);
  const content = typeof brief === "string" ? brief : renderBriefMd(brief);
  await writeFile(briefPath, content, "utf-8");
}

/**
 * Render a PlanBrief object to markdown matching the Plan Brief template.
 */
function renderBriefMd(brief: PlanBrief): string {
  const lines = [
    "# Plan Brief",
    "",
    "## Problem",
    "",
    brief.problem,
    "",
    "## Audience",
    "",
    brief.audience,
    "",
    "## Goal",
    "",
    brief.goal,
    "",
    "## Appetite",
    "",
    brief.appetite,
    "",
    "## Constraints",
    "",
  ];

  for (const c of brief.constraints) {
    lines.push(`- ${c}`);
  }
  lines.push("");

  lines.push("## Success Criteria");
  lines.push("");
  for (const sc of brief.success_criteria) {
    lines.push(`- [ ] ${sc}`);
  }
  lines.push("");

  lines.push("## Core Assumption");
  lines.push("");
  lines.push(brief.core_assumption);
  lines.push("");

  lines.push("## Rabbit Holes");
  lines.push("");
  for (const rh of brief.rabbit_holes) {
    lines.push(`- ${rh}`);
  }
  lines.push("");

  lines.push("## Out of Scope");
  lines.push("");
  for (const oos of brief.out_of_scope) {
    lines.push(`- ${oos}`);
  }
  lines.push("");

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Cycle Archival
// ---------------------------------------------------------------------------

/**
 * Archive the current cycle to .solveos/history/cycle-{n}/.
 * Copies BRIEF.md, STATE.md, and validations/ to the archive.
 * Clears current BRIEF.md and validations/ after archiving.
 */
export async function archiveCycle(
  projectDir: string,
  cycleNumber: number,
): Promise<void> {
  const base = solveosDir(projectDir);
  const archiveDir = safePath(projectDir, "history", `cycle-${cycleNumber}`);

  // Create archive directory
  await mkdir(archiveDir, { recursive: true });

  // Copy BRIEF.md if it exists
  const briefPath = join(base, BRIEF_FILE);
  if (await fileExists(briefPath)) {
    await cp(briefPath, join(archiveDir, BRIEF_FILE));
  }

  // Copy STATE.md
  const statePath = join(base, STATE_FILE);
  if (await fileExists(statePath)) {
    await cp(statePath, join(archiveDir, STATE_FILE));
  }

  // Copy validations/ directory
  const validationsDir = join(base, "validations");
  const archiveValidationsDir = join(archiveDir, "validations");
  if (await fileExists(validationsDir)) {
    try {
      const files = await readdir(validationsDir);
      if (files.length > 0) {
        await cp(validationsDir, archiveValidationsDir, { recursive: true });
      }
    } catch {
      // validations/ may be empty, that's fine
    }
  }

  // Clear current BRIEF.md (remove it)
  if (await fileExists(briefPath)) {
    await rm(briefPath);
  }

  // Clear validations/ contents
  try {
    const files = await readdir(validationsDir);
    for (const file of files) {
      await rm(join(validationsDir, file));
    }
  } catch {
    // Already empty or doesn't exist
  }
}

// ---------------------------------------------------------------------------
// Research & Validation Artifact Helpers
// ---------------------------------------------------------------------------

/**
 * Write a research summary to .solveos/research/{topic}-research.md.
 */
export async function writeResearch(
  projectDir: string,
  topic: string,
  content: string,
): Promise<void> {
  const filename = `${sanitizeFilename(topic)}-research.md`;
  const filePath = safePath(projectDir, "research", filename);
  await writeFile(filePath, content, "utf-8");
}

/**
 * Write a validation artifact.
 */
export async function writeValidation(
  projectDir: string,
  filename: string,
  content: string,
): Promise<void> {
  const filePath = safePath(projectDir, "validations", sanitizeFilename(filename));
  await writeFile(filePath, content, "utf-8");
}

/**
 * Write a review artifact.
 */
export async function writeReview(
  projectDir: string,
  filename: string,
  content: string,
): Promise<void> {
  const filePath = safePath(projectDir, "reviews", sanitizeFilename(filename));
  await writeFile(filePath, content, "utf-8");
}

/**
 * Sanitize a string for use as a filename.
 * Allows alphanumeric, hyphens, underscores, and dots.
 */
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}
