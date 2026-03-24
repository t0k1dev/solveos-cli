/**
 * Runtime detection for solveos-cli.
 *
 * Checks for known AI coding assistant indicators in order of priority.
 * Returns the first detected runtime, or null if none found.
 */

import { access } from "node:fs/promises";
import { join } from "node:path";
import type { Runtime } from "../types.js";

interface DetectionResult {
  runtime: Runtime;
  name: string;
  configPath: string;
}

/**
 * Attempt to detect which AI coding assistant runtime is active.
 * Checks in priority order: OpenCode, Claude Code, Cursor, Gemini CLI.
 *
 * @param projectDir - The project directory to check.
 * @returns Detection result, or null if no runtime found.
 */
export async function detectRuntime(projectDir: string): Promise<DetectionResult | null> {
  // OpenCode: .opencode/ directory or opencode.json
  const opencodeDir = join(projectDir, ".opencode");
  const opencodeJson = join(projectDir, "opencode.json");
  for (const indicator of [opencodeDir, opencodeJson]) {
    if (await exists(indicator)) {
      return {
        runtime: "opencode",
        name: "OpenCode",
        configPath: indicator,
      };
    }
  }

  // Claude Code: .claude/ directory or CLAUDE.md
  const claudeDir = join(projectDir, ".claude");
  const claudeMd = join(projectDir, "CLAUDE.md");
  for (const indicator of [claudeDir, claudeMd]) {
    if (await exists(indicator)) {
      return {
        runtime: "claude-code",
        name: "Claude Code",
        configPath: indicator,
      };
    }
  }

  // Cursor: .cursor/ directory or .cursorrules
  const cursorDir = join(projectDir, ".cursor");
  const cursorRules = join(projectDir, ".cursorrules");
  for (const indicator of [cursorDir, cursorRules]) {
    if (await exists(indicator)) {
      return {
        runtime: "cursor",
        name: "Cursor",
        configPath: indicator,
      };
    }
  }

  // Gemini CLI: .gemini/ directory
  const geminiDir = join(projectDir, ".gemini");
  if (await exists(geminiDir)) {
    return {
      runtime: "gemini",
      name: "Gemini CLI",
      configPath: geminiDir,
    };
  }

  return null;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
