/**
 * OpenCode runtime adapter for solveos-cli.
 *
 * Handles detection and installation of commands, agents, and hooks
 * into OpenCode's directory structure.
 *
 * OpenCode conventions (from docs):
 * - Commands: .opencode/commands/{name}.md -> /name
 * - Agents:  .opencode/agents/{name}.md   -> @name
 * - Plugins: .opencode/plugins/{name}.ts  -> loaded at startup
 */

import { mkdir, readdir, copyFile } from "node:fs/promises";
import { join, basename } from "node:path";
import type { RuntimeAdapter, DetectResult } from "../../types.js";
import { detectRuntime } from "../runtime-detect.js";

/**
 * Maps our command directory structure (commands/solveos/*.md)
 * to OpenCode's flat convention (.opencode/commands/solveos-{name}.md).
 *
 * e.g., commands/solveos/new.md -> .opencode/commands/solveos-new.md
 *       This becomes /solveos-new in OpenCode.
 */
function toOpencodeCommandName(filename: string): string {
  // Remove .md extension, prepend solveos- namespace
  const name = basename(filename, ".md");
  return `solveos-${name}.md`;
}

/**
 * Maps our agent files (agents/solveos-*.md)
 * to OpenCode's convention (.opencode/agents/solveos-{name}.md).
 */
function toOpencodeAgentName(filename: string): string {
  return basename(filename);
}

/**
 * Maps our hook files (src/hooks/*.ts compiled to dist/hooks/*.js)
 * to OpenCode's plugin convention (.opencode/plugins/solveos-{name}.ts).
 *
 * Note: We copy the TypeScript source directly — OpenCode's plugin loader
 * supports TypeScript files natively.
 */
function toOpencodePluginName(filename: string): string {
  return basename(filename);
}

export const opencode: RuntimeAdapter = {
  async detect(): Promise<DetectResult> {
    // We detect OpenCode by checking for .opencode/ dir or opencode.json
    // in the current working directory
    const cwd = process.cwd();
    const result = await detectRuntime(cwd);
    if (result && result.runtime === "opencode") {
      return {
        detected: true,
        name: "OpenCode",
        configPath: result.configPath,
      };
    }
    return {
      detected: false,
      name: "OpenCode",
    };
  },

  async installCommands(sourceDir: string): Promise<void> {
    const cwd = process.cwd();
    const targetDir = join(cwd, ".opencode", "commands");
    await mkdir(targetDir, { recursive: true });

    // sourceDir is the commands/solveos/ directory
    const files = await readdir(sourceDir);
    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      const sourcePath = join(sourceDir, file);
      const targetName = toOpencodeCommandName(file);
      const targetPath = join(targetDir, targetName);
      await copyFile(sourcePath, targetPath);
    }
  },

  async installAgents(sourceDir: string): Promise<void> {
    const cwd = process.cwd();
    const targetDir = join(cwd, ".opencode", "agents");
    await mkdir(targetDir, { recursive: true });

    const files = await readdir(sourceDir);
    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      const sourcePath = join(sourceDir, file);
      const targetName = toOpencodeAgentName(file);
      const targetPath = join(targetDir, targetName);
      await copyFile(sourcePath, targetPath);
    }
  },

  async installHooks(sourceDir: string): Promise<void> {
    const cwd = process.cwd();
    const targetDir = join(cwd, ".opencode", "plugins");
    await mkdir(targetDir, { recursive: true });

    // sourceDir is src/hooks/ — contains TypeScript plugin files.
    // OpenCode's plugin loader supports TypeScript natively.
    const files = await readdir(sourceDir);
    for (const file of files) {
      if (!file.endsWith(".ts")) continue;
      const sourcePath = join(sourceDir, file);
      const targetName = toOpencodePluginName(file);
      // Prefix with solveos- to namespace our plugins
      const targetPath = join(targetDir, `solveos-${targetName}`);
      await copyFile(sourcePath, targetPath);
    }
  },
};
