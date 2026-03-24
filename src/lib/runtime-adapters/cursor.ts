/**
 * Cursor runtime adapter for solveos-cli.
 *
 * Handles detection and installation of commands, agents, and hooks
 * into Cursor's directory structure.
 *
 * Cursor conventions:
 * - Skills (commands): .cursor/skills/<name>/SKILL.md -> /name
 * - Agents:           .cursor/agents/<name>.md -> auto-delegation
 * - Hooks:            .cursor/hooks.json -> event-based config
 * - Rules:            .cursor/rules/<name>.mdc -> contextual instructions
 *
 * Cursor also reads from .claude/ and .codex/ for cross-tool compatibility,
 * but we install to .cursor/ for clarity and priority.
 */

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, basename } from "node:path";
import type { RuntimeAdapter, DetectResult } from "../../types.js";
import { detectRuntime } from "../runtime-detect.js";

/**
 * Transform OpenCode-style command frontmatter to Cursor skill frontmatter.
 *
 * Cursor uses the same SKILL.md format as Claude Code skills.
 * We set disable-model-invocation: true so skills are explicit-only.
 */
function transformCommandToSkill(content: string, commandName: string): string {
  const skillName = `solveos-${commandName}`;

  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!frontmatterMatch) {
    return `---\nname: ${skillName}\ndescription: solveOS ${commandName} command\ndisable-model-invocation: true\n---\n\n${content}`;
  }

  const frontmatter = frontmatterMatch[1];
  const body = content.slice(frontmatterMatch[0].length);

  const descMatch = frontmatter.match(/^description:\s*(.+)$/m);
  const description = descMatch ? descMatch[1].trim() : `solveOS ${commandName} command`;

  return `---\nname: ${skillName}\ndescription: ${description}\ndisable-model-invocation: true\n---\n\n${body}`;
}

/**
 * Transform OpenCode-style agent frontmatter to Cursor agent frontmatter.
 *
 * Cursor agents use: name, description, model, readonly, is_background
 */
function transformAgentForCursor(content: string, agentName: string): string {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!frontmatterMatch) {
    return `---\nname: ${agentName}\ndescription: solveOS ${agentName} agent\n---\n\n${content}`;
  }

  const frontmatter = frontmatterMatch[1];
  const body = content.slice(frontmatterMatch[0].length);

  const descMatch = frontmatter.match(/^description:\s*(.+)$/m);
  const description = descMatch ? descMatch[1].trim() : `solveOS ${agentName} agent`;

  return `---\nname: ${agentName}\ndescription: ${description}\n---\n\n${body}`;
}

export const cursor: RuntimeAdapter = {
  async detect(): Promise<DetectResult> {
    const cwd = process.cwd();
    const result = await detectRuntime(cwd);
    if (result && result.runtime === "cursor") {
      return {
        detected: true,
        name: "Cursor",
        configPath: result.configPath,
      };
    }
    return {
      detected: false,
      name: "Cursor",
    };
  },

  async installCommands(sourceDir: string): Promise<void> {
    const cwd = process.cwd();
    const skillsBase = join(cwd, ".cursor", "skills");

    const files = await readdir(sourceDir);
    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      const commandName = basename(file, ".md");
      const sourcePath = join(sourceDir, file);

      // Cursor skills live in directories: .cursor/skills/solveos-{name}/SKILL.md
      const skillDir = join(skillsBase, `solveos-${commandName}`);
      await mkdir(skillDir, { recursive: true });

      const content = await readFile(sourcePath, "utf-8");
      const transformed = transformCommandToSkill(content, commandName);
      await writeFile(join(skillDir, "SKILL.md"), transformed, "utf-8");
    }
  },

  async installAgents(sourceDir: string): Promise<void> {
    const cwd = process.cwd();
    const targetDir = join(cwd, ".cursor", "agents");
    await mkdir(targetDir, { recursive: true });

    const files = await readdir(sourceDir);
    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      const agentName = basename(file, ".md");
      const sourcePath = join(sourceDir, file);

      const content = await readFile(sourcePath, "utf-8");
      const transformed = transformAgentForCursor(content, agentName);
      await writeFile(join(targetDir, file), transformed, "utf-8");
    }
  },

  async installHooks(_sourceDir: string): Promise<void> {
    // Cursor hooks are configured in .cursor/hooks.json with event-based
    // handlers (shell commands). Similar to Claude Code, the mechanism is
    // different from OpenCode's TypeScript plugins.
    //
    // The solveOS state files (.solveos/STATE.md, BRIEF.md) remain readable
    // by any hook script the user configures.
    //
    // Future: generate .cursor/hooks.json with shell-based context monitor
    // and brief anchor hooks.
  },
};
