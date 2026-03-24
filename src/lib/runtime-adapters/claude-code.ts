/**
 * Claude Code runtime adapter for solveos-cli.
 *
 * Handles detection and installation of commands, agents, and hooks
 * into Claude Code's directory structure.
 *
 * Claude Code conventions:
 * - Skills (commands): .claude/skills/<name>/SKILL.md -> /name
 * - Agents:           .claude/agents/<name>.md -> @name / auto-delegation
 * - Hooks:            .claude/settings.json -> hooks object
 * - Legacy commands:  .claude/commands/<name>.md -> /name (still works)
 *
 * We use the skills format as it's the current standard and takes
 * precedence over legacy commands.
 */

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, basename } from "node:path";
import type { RuntimeAdapter, DetectResult } from "../../types.js";
import { detectRuntime } from "../runtime-detect.js";

/**
 * Transform OpenCode-style command frontmatter to Claude Code skill frontmatter.
 *
 * OpenCode: ---\ndescription: ...\n---
 * Claude Code: ---\nname: solveos-{name}\ndescription: ...\ndisable-model-invocation: true\n---
 *
 * We set disable-model-invocation: true so skills are only invoked via
 * explicit /solveos-{name} command (not auto-applied by the model).
 */
function transformCommandToSkill(content: string, commandName: string): string {
  const skillName = `solveos-${commandName}`;

  // Parse existing frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!frontmatterMatch) {
    // No frontmatter — add skill frontmatter
    return `---\nname: ${skillName}\ndescription: solveOS ${commandName} command\ndisable-model-invocation: true\n---\n\n${content}`;
  }

  const frontmatter = frontmatterMatch[1];
  const body = content.slice(frontmatterMatch[0].length);

  // Extract description from existing frontmatter
  const descMatch = frontmatter.match(/^description:\s*(.+)$/m);
  const description = descMatch ? descMatch[1].trim() : `solveOS ${commandName} command`;

  // Build Claude Code skill frontmatter
  return `---\nname: ${skillName}\ndescription: ${description}\ndisable-model-invocation: true\n---\n\n${body}`;
}

/**
 * Transform OpenCode-style agent frontmatter to Claude Code agent frontmatter.
 *
 * OpenCode: ---\ndescription: ...\nmode: subagent\n---
 * Claude Code: ---\nname: ...\ndescription: ...\n---
 */
function transformAgentForClaudeCode(content: string, agentName: string): string {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!frontmatterMatch) {
    return `---\nname: ${agentName}\ndescription: solveOS ${agentName} agent\n---\n\n${content}`;
  }

  const frontmatter = frontmatterMatch[1];
  const body = content.slice(frontmatterMatch[0].length);

  // Extract description
  const descMatch = frontmatter.match(/^description:\s*(.+)$/m);
  const description = descMatch ? descMatch[1].trim() : `solveOS ${agentName} agent`;

  return `---\nname: ${agentName}\ndescription: ${description}\n---\n\n${body}`;
}

export const claudeCode: RuntimeAdapter = {
  async detect(): Promise<DetectResult> {
    const cwd = process.cwd();
    const result = await detectRuntime(cwd);
    if (result && result.runtime === "claude-code") {
      return {
        detected: true,
        name: "Claude Code",
        configPath: result.configPath,
      };
    }
    return {
      detected: false,
      name: "Claude Code",
    };
  },

  async installCommands(sourceDir: string): Promise<void> {
    const cwd = process.cwd();
    const skillsBase = join(cwd, ".claude", "skills");

    // sourceDir is the commands/solveos/ directory
    const files = await readdir(sourceDir);
    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      const commandName = basename(file, ".md");
      const sourcePath = join(sourceDir, file);

      // Claude Code skills live in directories: .claude/skills/solveos-{name}/SKILL.md
      const skillDir = join(skillsBase, `solveos-${commandName}`);
      await mkdir(skillDir, { recursive: true });

      const content = await readFile(sourcePath, "utf-8");
      const transformed = transformCommandToSkill(content, commandName);
      await writeFile(join(skillDir, "SKILL.md"), transformed, "utf-8");
    }
  },

  async installAgents(sourceDir: string): Promise<void> {
    const cwd = process.cwd();
    const targetDir = join(cwd, ".claude", "agents");
    await mkdir(targetDir, { recursive: true });

    const files = await readdir(sourceDir);
    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      const agentName = basename(file, ".md");
      const sourcePath = join(sourceDir, file);

      const content = await readFile(sourcePath, "utf-8");
      const transformed = transformAgentForClaudeCode(content, agentName);
      await writeFile(join(targetDir, file), transformed, "utf-8");
    }
  },

  async installHooks(_sourceDir: string): Promise<void> {
    // Claude Code hooks are configured in .claude/settings.json, not as
    // standalone files. For now, we don't auto-configure hooks because
    // Claude Code hooks use a different mechanism (shell commands, HTTP
    // endpoints, or prompt-based handlers) than OpenCode's TypeScript plugins.
    //
    // Users can manually configure hooks in .claude/settings.json. The
    // solveOS state files (.solveos/STATE.md, BRIEF.md) are still readable
    // by any hook script the user configures.
    //
    // Future: generate a .claude/hooks/ directory with shell scripts that
    // read solveOS state and provide context monitor / brief anchor functionality.
  },
};
