/**
 * Gemini CLI runtime adapter for solveos-cli.
 *
 * Handles detection and installation of commands, agents, and hooks
 * into Gemini CLI's directory structure.
 *
 * Gemini CLI conventions:
 * - Commands: .gemini/commands/<name>.toml -> /<name>
 *   Subdirectories create namespaced commands: .gemini/commands/solveos/<name>.toml -> /solveos:<name>
 * - Agents:  .gemini/agents/<name>.md -> @name / auto-delegation
 * - Hooks:   .gemini/settings.json -> hooks object
 *
 * Key difference: Gemini CLI uses TOML for commands (not Markdown).
 * We wrap our markdown prompt content in TOML's `prompt` field.
 */

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, basename } from "node:path";
import type { RuntimeAdapter, DetectResult } from "../../types.js";
import { detectRuntime } from "../runtime-detect.js";

/**
 * Convert a markdown command file to Gemini CLI's TOML format.
 *
 * Extracts the description from frontmatter for the TOML `description` field,
 * and wraps the full markdown body in a multi-line TOML `prompt` string.
 */
function markdownToToml(content: string, commandName: string): string {
  let description = `solveOS ${commandName} command`;
  let body = content;

  // Extract and strip frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    const descMatch = frontmatter.match(/^description:\s*(.+)$/m);
    if (descMatch) {
      description = descMatch[1].trim();
    }
    body = content.slice(frontmatterMatch[0].length);
  }

  // Escape triple quotes in the body (extremely unlikely but safe)
  const escapedBody = body.replace(/"""/g, '"\\"\\""');

  return `description = "${escapeTomlString(description)}"\nprompt = """\n${escapedBody}"""\n`;
}

/**
 * Escape a string for use in a TOML double-quoted string.
 */
function escapeTomlString(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t");
}

/**
 * Transform OpenCode-style agent frontmatter to Gemini CLI agent frontmatter.
 *
 * Gemini CLI agents use: name, description, kind, tools, model, temperature,
 * max_turns, timeout_mins.
 */
function transformAgentForGemini(content: string, agentName: string): string {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!frontmatterMatch) {
    return `---\nname: ${agentName}\ndescription: solveOS ${agentName} agent\nkind: local\n---\n\n${content}`;
  }

  const frontmatter = frontmatterMatch[1];
  const body = content.slice(frontmatterMatch[0].length);

  const descMatch = frontmatter.match(/^description:\s*(.+)$/m);
  const description = descMatch ? descMatch[1].trim() : `solveOS ${agentName} agent`;

  return `---\nname: ${agentName}\ndescription: ${description}\nkind: local\n---\n\n${body}`;
}

export const gemini: RuntimeAdapter = {
  async detect(): Promise<DetectResult> {
    const cwd = process.cwd();
    const result = await detectRuntime(cwd);
    if (result && result.runtime === "gemini") {
      return {
        detected: true,
        name: "Gemini CLI",
        configPath: result.configPath,
      };
    }
    return {
      detected: false,
      name: "Gemini CLI",
    };
  },

  async installCommands(sourceDir: string): Promise<void> {
    const cwd = process.cwd();
    // Use subdirectory for namespacing: .gemini/commands/solveos/<name>.toml -> /solveos:<name>
    const targetDir = join(cwd, ".gemini", "commands", "solveos");
    await mkdir(targetDir, { recursive: true });

    const files = await readdir(sourceDir);
    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      const commandName = basename(file, ".md");
      const sourcePath = join(sourceDir, file);

      const content = await readFile(sourcePath, "utf-8");
      const tomlContent = markdownToToml(content, commandName);
      await writeFile(join(targetDir, `${commandName}.toml`), tomlContent, "utf-8");
    }
  },

  async installAgents(sourceDir: string): Promise<void> {
    const cwd = process.cwd();
    const targetDir = join(cwd, ".gemini", "agents");
    await mkdir(targetDir, { recursive: true });

    const files = await readdir(sourceDir);
    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      const agentName = basename(file, ".md");
      const sourcePath = join(sourceDir, file);

      const content = await readFile(sourcePath, "utf-8");
      const transformed = transformAgentForGemini(content, agentName);
      await writeFile(join(targetDir, file), transformed, "utf-8");
    }
  },

  async installHooks(_sourceDir: string): Promise<void> {
    // Gemini CLI hooks are configured in .gemini/settings.json with
    // event-based handlers (shell commands). The mechanism is different
    // from OpenCode's TypeScript plugins.
    //
    // The solveOS state files (.solveos/STATE.md, BRIEF.md) remain readable
    // by any hook script the user configures.
    //
    // Future: generate shell-based hooks for context monitor and brief anchor.
  },
};
