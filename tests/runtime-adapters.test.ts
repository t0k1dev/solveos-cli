/**
 * Tests for runtime adapters: Claude Code, Cursor, Gemini CLI.
 *
 * Tests the core transformation and installation logic for each adapter.
 * Uses temporary directories to verify file output.
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { claudeCode } from "../src/lib/runtime-adapters/claude-code.js";
import { cursor } from "../src/lib/runtime-adapters/cursor.js";
import { gemini } from "../src/lib/runtime-adapters/gemini-cli.js";

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

const SAMPLE_COMMAND = `---
description: Start a new solveOS project or cycle
---

# /solveos:new — Initialize a New Project or Cycle

You are initializing a new solveOS project. Follow these steps carefully.
`;

const SAMPLE_COMMAND_NO_FRONTMATTER = `# /solveos:quick — Quick Mode

Run a quick solveOS cycle without gates.
`;

const SAMPLE_AGENT = `---
description: Agent that guides Plan Brief creation through interactive questioning
mode: subagent
---

# solveos-planner

## Role

You are the **solveOS Planner**.
`;

const SAMPLE_AGENT_NO_FRONTMATTER = `# solveos-debugger

You are the solveOS Debugger.
`;

// ---------------------------------------------------------------------------
// Claude Code Adapter
// ---------------------------------------------------------------------------

describe("Claude Code adapter", () => {
  let tmpDir: string;
  let sourceCommandsDir: string;
  let sourceAgentsDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "solveos-claude-"));
    sourceCommandsDir = join(tmpDir, "commands");
    sourceAgentsDir = join(tmpDir, "agents");
    await mkdir(sourceCommandsDir, { recursive: true });
    await mkdir(sourceAgentsDir, { recursive: true });

    // Stub process.cwd to point to our temp dir
    const originalCwd = process.cwd;
    process.cwd = () => tmpDir;
    // Store original for restore
    (globalThis as any).__originalCwd = originalCwd;
  });

  afterEach(async () => {
    process.cwd = (globalThis as any).__originalCwd;
    await rm(tmpDir, { recursive: true, force: true });
  });

  describe("installCommands", () => {
    it("creates skill directories with SKILL.md", async () => {
      await writeFile(join(sourceCommandsDir, "new.md"), SAMPLE_COMMAND);
      await claudeCode.installCommands(sourceCommandsDir);

      const skillDir = join(tmpDir, ".claude", "skills", "solveos-new");
      const files = await readdir(skillDir);
      assert.ok(files.includes("SKILL.md"));
    });

    it("transforms frontmatter to skill format", async () => {
      await writeFile(join(sourceCommandsDir, "new.md"), SAMPLE_COMMAND);
      await claudeCode.installCommands(sourceCommandsDir);

      const content = await readFile(
        join(tmpDir, ".claude", "skills", "solveos-new", "SKILL.md"),
        "utf-8"
      );
      assert.ok(content.includes("name: solveos-new"));
      assert.ok(content.includes("description: Start a new solveOS project or cycle"));
      assert.ok(content.includes("disable-model-invocation: true"));
    });

    it("preserves markdown body after frontmatter", async () => {
      await writeFile(join(sourceCommandsDir, "new.md"), SAMPLE_COMMAND);
      await claudeCode.installCommands(sourceCommandsDir);

      const content = await readFile(
        join(tmpDir, ".claude", "skills", "solveos-new", "SKILL.md"),
        "utf-8"
      );
      assert.ok(content.includes("# /solveos:new"));
      assert.ok(content.includes("Follow these steps carefully"));
    });

    it("handles commands without frontmatter", async () => {
      await writeFile(join(sourceCommandsDir, "quick.md"), SAMPLE_COMMAND_NO_FRONTMATTER);
      await claudeCode.installCommands(sourceCommandsDir);

      const content = await readFile(
        join(tmpDir, ".claude", "skills", "solveos-quick", "SKILL.md"),
        "utf-8"
      );
      assert.ok(content.includes("name: solveos-quick"));
      assert.ok(content.includes("disable-model-invocation: true"));
      assert.ok(content.includes("# /solveos:quick"));
    });

    it("installs multiple commands", async () => {
      await writeFile(join(sourceCommandsDir, "new.md"), SAMPLE_COMMAND);
      await writeFile(join(sourceCommandsDir, "quick.md"), SAMPLE_COMMAND_NO_FRONTMATTER);
      await claudeCode.installCommands(sourceCommandsDir);

      const skillsDir = join(tmpDir, ".claude", "skills");
      const dirs = await readdir(skillsDir);
      assert.ok(dirs.includes("solveos-new"));
      assert.ok(dirs.includes("solveos-quick"));
    });

    it("skips non-.md files", async () => {
      await writeFile(join(sourceCommandsDir, "notes.txt"), "not a command");
      await writeFile(join(sourceCommandsDir, "new.md"), SAMPLE_COMMAND);
      await claudeCode.installCommands(sourceCommandsDir);

      const skillsDir = join(tmpDir, ".claude", "skills");
      const dirs = await readdir(skillsDir);
      assert.equal(dirs.length, 1);
    });
  });

  describe("installAgents", () => {
    it("copies agents to .claude/agents/", async () => {
      await writeFile(join(sourceAgentsDir, "solveos-planner.md"), SAMPLE_AGENT);
      await claudeCode.installAgents(sourceAgentsDir);

      const targetDir = join(tmpDir, ".claude", "agents");
      const files = await readdir(targetDir);
      assert.ok(files.includes("solveos-planner.md"));
    });

    it("transforms frontmatter for Claude Code", async () => {
      await writeFile(join(sourceAgentsDir, "solveos-planner.md"), SAMPLE_AGENT);
      await claudeCode.installAgents(sourceAgentsDir);

      const content = await readFile(
        join(tmpDir, ".claude", "agents", "solveos-planner.md"),
        "utf-8"
      );
      assert.ok(content.includes("name: solveos-planner"));
      assert.ok(content.includes("description: Agent that guides Plan Brief creation"));
      // mode: subagent should be stripped (not a Claude Code field)
      assert.ok(!content.includes("mode: subagent"));
    });

    it("handles agents without frontmatter", async () => {
      await writeFile(join(sourceAgentsDir, "solveos-debugger.md"), SAMPLE_AGENT_NO_FRONTMATTER);
      await claudeCode.installAgents(sourceAgentsDir);

      const content = await readFile(
        join(tmpDir, ".claude", "agents", "solveos-debugger.md"),
        "utf-8"
      );
      assert.ok(content.includes("name: solveos-debugger"));
    });
  });

  describe("installHooks", () => {
    it("does not throw (no-op for now)", async () => {
      await claudeCode.installHooks("");
    });
  });
});

// ---------------------------------------------------------------------------
// Cursor Adapter
// ---------------------------------------------------------------------------

describe("Cursor adapter", () => {
  let tmpDir: string;
  let sourceCommandsDir: string;
  let sourceAgentsDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "solveos-cursor-"));
    sourceCommandsDir = join(tmpDir, "commands");
    sourceAgentsDir = join(tmpDir, "agents");
    await mkdir(sourceCommandsDir, { recursive: true });
    await mkdir(sourceAgentsDir, { recursive: true });

    const originalCwd = process.cwd;
    process.cwd = () => tmpDir;
    (globalThis as any).__originalCwd = originalCwd;
  });

  afterEach(async () => {
    process.cwd = (globalThis as any).__originalCwd;
    await rm(tmpDir, { recursive: true, force: true });
  });

  describe("installCommands", () => {
    it("creates skill directories with SKILL.md in .cursor/skills/", async () => {
      await writeFile(join(sourceCommandsDir, "new.md"), SAMPLE_COMMAND);
      await cursor.installCommands(sourceCommandsDir);

      const skillDir = join(tmpDir, ".cursor", "skills", "solveos-new");
      const files = await readdir(skillDir);
      assert.ok(files.includes("SKILL.md"));
    });

    it("transforms frontmatter to Cursor skill format", async () => {
      await writeFile(join(sourceCommandsDir, "new.md"), SAMPLE_COMMAND);
      await cursor.installCommands(sourceCommandsDir);

      const content = await readFile(
        join(tmpDir, ".cursor", "skills", "solveos-new", "SKILL.md"),
        "utf-8"
      );
      assert.ok(content.includes("name: solveos-new"));
      assert.ok(content.includes("disable-model-invocation: true"));
    });

    it("preserves markdown body", async () => {
      await writeFile(join(sourceCommandsDir, "new.md"), SAMPLE_COMMAND);
      await cursor.installCommands(sourceCommandsDir);

      const content = await readFile(
        join(tmpDir, ".cursor", "skills", "solveos-new", "SKILL.md"),
        "utf-8"
      );
      assert.ok(content.includes("Follow these steps carefully"));
    });
  });

  describe("installAgents", () => {
    it("copies agents to .cursor/agents/", async () => {
      await writeFile(join(sourceAgentsDir, "solveos-planner.md"), SAMPLE_AGENT);
      await cursor.installAgents(sourceAgentsDir);

      const targetDir = join(tmpDir, ".cursor", "agents");
      const files = await readdir(targetDir);
      assert.ok(files.includes("solveos-planner.md"));
    });

    it("transforms frontmatter for Cursor", async () => {
      await writeFile(join(sourceAgentsDir, "solveos-planner.md"), SAMPLE_AGENT);
      await cursor.installAgents(sourceAgentsDir);

      const content = await readFile(
        join(tmpDir, ".cursor", "agents", "solveos-planner.md"),
        "utf-8"
      );
      assert.ok(content.includes("name: solveos-planner"));
      assert.ok(!content.includes("mode: subagent"));
    });
  });

  describe("installHooks", () => {
    it("does not throw (no-op for now)", async () => {
      await cursor.installHooks("");
    });
  });
});

// ---------------------------------------------------------------------------
// Gemini CLI Adapter
// ---------------------------------------------------------------------------

describe("Gemini CLI adapter", () => {
  let tmpDir: string;
  let sourceCommandsDir: string;
  let sourceAgentsDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "solveos-gemini-"));
    sourceCommandsDir = join(tmpDir, "commands");
    sourceAgentsDir = join(tmpDir, "agents");
    await mkdir(sourceCommandsDir, { recursive: true });
    await mkdir(sourceAgentsDir, { recursive: true });

    const originalCwd = process.cwd;
    process.cwd = () => tmpDir;
    (globalThis as any).__originalCwd = originalCwd;
  });

  afterEach(async () => {
    process.cwd = (globalThis as any).__originalCwd;
    await rm(tmpDir, { recursive: true, force: true });
  });

  describe("installCommands", () => {
    it("creates TOML files in .gemini/commands/solveos/", async () => {
      await writeFile(join(sourceCommandsDir, "new.md"), SAMPLE_COMMAND);
      await gemini.installCommands(sourceCommandsDir);

      const tomlDir = join(tmpDir, ".gemini", "commands", "solveos");
      const files = await readdir(tomlDir);
      assert.ok(files.includes("new.toml"));
    });

    it("wraps markdown in TOML prompt field", async () => {
      await writeFile(join(sourceCommandsDir, "new.md"), SAMPLE_COMMAND);
      await gemini.installCommands(sourceCommandsDir);

      const content = await readFile(
        join(tmpDir, ".gemini", "commands", "solveos", "new.toml"),
        "utf-8"
      );
      assert.ok(content.includes('prompt = """'));
      assert.ok(content.includes("# /solveos:new"));
      assert.ok(content.includes('"""'));
    });

    it("extracts description from frontmatter", async () => {
      await writeFile(join(sourceCommandsDir, "new.md"), SAMPLE_COMMAND);
      await gemini.installCommands(sourceCommandsDir);

      const content = await readFile(
        join(tmpDir, ".gemini", "commands", "solveos", "new.toml"),
        "utf-8"
      );
      assert.ok(content.includes('description = "Start a new solveOS project or cycle"'));
    });

    it("handles commands without frontmatter", async () => {
      await writeFile(join(sourceCommandsDir, "quick.md"), SAMPLE_COMMAND_NO_FRONTMATTER);
      await gemini.installCommands(sourceCommandsDir);

      const content = await readFile(
        join(tmpDir, ".gemini", "commands", "solveos", "quick.toml"),
        "utf-8"
      );
      assert.ok(content.includes('description = "solveOS quick command"'));
      assert.ok(content.includes('prompt = """'));
    });

    it("installs multiple commands as separate TOML files", async () => {
      await writeFile(join(sourceCommandsDir, "new.md"), SAMPLE_COMMAND);
      await writeFile(join(sourceCommandsDir, "quick.md"), SAMPLE_COMMAND_NO_FRONTMATTER);
      await gemini.installCommands(sourceCommandsDir);

      const tomlDir = join(tmpDir, ".gemini", "commands", "solveos");
      const files = await readdir(tomlDir);
      assert.ok(files.includes("new.toml"));
      assert.ok(files.includes("quick.toml"));
    });
  });

  describe("installAgents", () => {
    it("copies agents to .gemini/agents/", async () => {
      await writeFile(join(sourceAgentsDir, "solveos-planner.md"), SAMPLE_AGENT);
      await gemini.installAgents(sourceAgentsDir);

      const targetDir = join(tmpDir, ".gemini", "agents");
      const files = await readdir(targetDir);
      assert.ok(files.includes("solveos-planner.md"));
    });

    it("transforms frontmatter for Gemini CLI", async () => {
      await writeFile(join(sourceAgentsDir, "solveos-planner.md"), SAMPLE_AGENT);
      await gemini.installAgents(sourceAgentsDir);

      const content = await readFile(
        join(tmpDir, ".gemini", "agents", "solveos-planner.md"),
        "utf-8"
      );
      assert.ok(content.includes("name: solveos-planner"));
      assert.ok(content.includes("kind: local"));
      assert.ok(!content.includes("mode: subagent"));
    });

    it("handles agents without frontmatter", async () => {
      await writeFile(join(sourceAgentsDir, "solveos-debugger.md"), SAMPLE_AGENT_NO_FRONTMATTER);
      await gemini.installAgents(sourceAgentsDir);

      const content = await readFile(
        join(tmpDir, ".gemini", "agents", "solveos-debugger.md"),
        "utf-8"
      );
      assert.ok(content.includes("name: solveos-debugger"));
      assert.ok(content.includes("kind: local"));
    });
  });

  describe("installHooks", () => {
    it("does not throw (no-op for now)", async () => {
      await gemini.installHooks("");
    });
  });
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

describe("# --- Runtime Adapters Tests Summary ---", () => {
  it("", () => {
    // Placeholder for TAP output formatting
  });
});
