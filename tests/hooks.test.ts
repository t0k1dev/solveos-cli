/**
 * Tests for solveOS hooks: context monitor and brief anchor.
 *
 * Tests the pure logic functions exported from each hook module —
 * state management, threshold checking, reminder generation, and
 * brief parsing. Does NOT test the OpenCode plugin integration
 * (that requires the OpenCode runtime).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  createMonitorState,
  checkContextUsage,
} from "../src/hooks/context-monitor.js";

import {
  createAnchorState,
  shouldRemind,
  extractSuccessCriteria,
  extractOutOfScope,
  generateReminder,
  generateMinimalReminder,
} from "../src/hooks/brief-anchor.js";

// ===========================================================================
// Context Monitor Tests
// ===========================================================================

describe("Context Monitor", () => {
  // -------------------------------------------------------------------------
  // createMonitorState
  // -------------------------------------------------------------------------

  describe("createMonitorState", () => {
    it("creates fresh state with zero message count", () => {
      const state = createMonitorState();
      assert.equal(state.messageCount, 0);
    });

    it("creates fresh state with no warnings triggered", () => {
      const state = createMonitorState();
      assert.equal(state.warned60, false);
      assert.equal(state.warned80, false);
    });

    it("creates fresh state with null session ID", () => {
      const state = createMonitorState();
      assert.equal(state.sessionId, null);
    });
  });

  // -------------------------------------------------------------------------
  // checkContextUsage
  // -------------------------------------------------------------------------

  describe("checkContextUsage", () => {
    it("returns null warning when below 60% threshold", () => {
      const state = createMonitorState();
      state.messageCount = 10;
      const result = checkContextUsage(state, 60);
      assert.equal(result.warning, null);
      assert.equal(result.level, null);
    });

    it("triggers 60% warning at correct threshold", () => {
      const state = createMonitorState();
      // 60% of 60 = 36
      state.messageCount = 36;
      const result = checkContextUsage(state, 60);
      assert.notEqual(result.warning, null);
      assert.equal(result.level, "60");
    });

    it("marks warned60 after first 60% trigger", () => {
      const state = createMonitorState();
      state.messageCount = 36;
      checkContextUsage(state, 60);
      assert.equal(state.warned60, true);
    });

    it("does not re-trigger 60% warning", () => {
      const state = createMonitorState();
      state.messageCount = 36;
      checkContextUsage(state, 60); // first trigger
      state.messageCount = 37;
      const result = checkContextUsage(state, 60);
      assert.equal(result.warning, null); // already warned
    });

    it("triggers 80% warning at correct threshold", () => {
      const state = createMonitorState();
      // 80% of 60 = 48
      state.messageCount = 48;
      const result = checkContextUsage(state, 60);
      assert.notEqual(result.warning, null);
      assert.equal(result.level, "80");
    });

    it("marks warned80 after 80% trigger", () => {
      const state = createMonitorState();
      state.messageCount = 48;
      checkContextUsage(state, 60);
      assert.equal(state.warned80, true);
    });

    it("80% warning takes precedence over 60% when both thresholds crossed", () => {
      const state = createMonitorState();
      // Jump straight to 80% without triggering 60% first
      state.messageCount = 48;
      const result = checkContextUsage(state, 60);
      assert.equal(result.level, "80");
    });

    it("60% warning includes sub-agent suggestion", () => {
      const state = createMonitorState();
      state.messageCount = 36;
      const result = checkContextUsage(state, 60);
      assert.ok(result.warning!.includes("sub-agent"));
    });

    it("80% warning includes strong recommendation", () => {
      const state = createMonitorState();
      state.messageCount = 48;
      const result = checkContextUsage(state, 60);
      assert.ok(result.warning!.includes("Strong recommendation"));
    });

    it("works with custom threshold of 100", () => {
      const state = createMonitorState();
      // 60% of 100 = 60
      state.messageCount = 59;
      assert.equal(checkContextUsage(state, 100).warning, null);
      state.messageCount = 60;
      assert.notEqual(checkContextUsage(state, 100).warning, null);
    });

    it("works with small threshold of 10", () => {
      const state = createMonitorState();
      // 60% of 10 = 6
      state.messageCount = 6;
      const result = checkContextUsage(state, 10);
      assert.notEqual(result.warning, null);
      assert.equal(result.level, "60");
    });

    it("handles threshold of 0 gracefully", () => {
      const state = createMonitorState();
      state.messageCount = 0;
      const result = checkContextUsage(state, 0);
      // 80% of 0 = 0, 60% of 0 = 0, messageCount 0 >= 0 → trigger
      assert.notEqual(result.warning, null);
    });
  });
});

// ===========================================================================
// Brief Anchor Tests
// ===========================================================================

describe("Brief Anchor", () => {
  // -------------------------------------------------------------------------
  // createAnchorState
  // -------------------------------------------------------------------------

  describe("createAnchorState", () => {
    it("creates fresh state with zero tool call count", () => {
      const state = createAnchorState();
      assert.equal(state.toolCallCount, 0);
    });

    it("creates fresh state with null session ID", () => {
      const state = createAnchorState();
      assert.equal(state.sessionId, null);
    });
  });

  // -------------------------------------------------------------------------
  // shouldRemind
  // -------------------------------------------------------------------------

  describe("shouldRemind", () => {
    it("does not remind at count 0", () => {
      const state = createAnchorState();
      state.toolCallCount = 0;
      assert.equal(shouldRemind(state, 10), false);
    });

    it("does not remind at count 1 with interval 10", () => {
      const state = createAnchorState();
      state.toolCallCount = 1;
      assert.equal(shouldRemind(state, 10), false);
    });

    it("reminds at count 10 with interval 10", () => {
      const state = createAnchorState();
      state.toolCallCount = 10;
      assert.equal(shouldRemind(state, 10), true);
    });

    it("reminds at count 20 with interval 10", () => {
      const state = createAnchorState();
      state.toolCallCount = 20;
      assert.equal(shouldRemind(state, 10), true);
    });

    it("does not remind at count 15 with interval 10", () => {
      const state = createAnchorState();
      state.toolCallCount = 15;
      assert.equal(shouldRemind(state, 10), false);
    });

    it("reminds at count 5 with interval 5", () => {
      const state = createAnchorState();
      state.toolCallCount = 5;
      assert.equal(shouldRemind(state, 5), true);
    });

    it("reminds at count 1 with interval 1", () => {
      const state = createAnchorState();
      state.toolCallCount = 1;
      assert.equal(shouldRemind(state, 1), true);
    });
  });

  // -------------------------------------------------------------------------
  // extractSuccessCriteria
  // -------------------------------------------------------------------------

  describe("extractSuccessCriteria", () => {
    const sampleBrief = `# Plan Brief

## Problem

Some problem

## Audience

Developers

## Goal

Build something

## Success Criteria

- [ ] All 47 existing tests pass
- [ ] API responds within 200ms
- [ ] New endpoint returns correct schema

## Core Assumption

It will work

## Rabbit Holes

- Performance optimization

## Out of Scope

- Mobile support
- Dark mode
`;

    it("extracts all success criteria from brief", () => {
      const criteria = extractSuccessCriteria(sampleBrief);
      assert.equal(criteria.length, 3);
    });

    it("extracts first criterion correctly", () => {
      const criteria = extractSuccessCriteria(sampleBrief);
      assert.equal(criteria[0], "All 47 existing tests pass");
    });

    it("extracts second criterion correctly", () => {
      const criteria = extractSuccessCriteria(sampleBrief);
      assert.equal(criteria[1], "API responds within 200ms");
    });

    it("extracts third criterion correctly", () => {
      const criteria = extractSuccessCriteria(sampleBrief);
      assert.equal(criteria[2], "New endpoint returns correct schema");
    });

    it("handles checked criteria (- [x])", () => {
      const brief = `## Success Criteria\n\n- [x] Done item\n- [ ] Pending item\n\n## Core Assumption`;
      const criteria = extractSuccessCriteria(brief);
      assert.equal(criteria.length, 2);
      assert.equal(criteria[0], "Done item");
    });

    it("returns empty array when no Success Criteria section", () => {
      const brief = "# Plan Brief\n\n## Problem\n\nSomething";
      const criteria = extractSuccessCriteria(brief);
      assert.equal(criteria.length, 0);
    });

    it("returns empty array for empty string", () => {
      const criteria = extractSuccessCriteria("");
      assert.equal(criteria.length, 0);
    });

    it("stops at next section heading", () => {
      const brief = `## Success Criteria\n\n- [ ] Item 1\n\n## Core Assumption\n\n- [ ] This is not a criterion`;
      const criteria = extractSuccessCriteria(brief);
      assert.equal(criteria.length, 1);
    });
  });

  // -------------------------------------------------------------------------
  // extractOutOfScope
  // -------------------------------------------------------------------------

  describe("extractOutOfScope", () => {
    const sampleBrief = `## Out of Scope

- Mobile support
- Dark mode
- Internationalization
`;

    it("extracts all out-of-scope items", () => {
      const items = extractOutOfScope(sampleBrief);
      assert.equal(items.length, 3);
    });

    it("extracts first item correctly", () => {
      const items = extractOutOfScope(sampleBrief);
      assert.equal(items[0], "Mobile support");
    });

    it("returns empty array when no Out of Scope section", () => {
      const items = extractOutOfScope("# Brief\n\n## Problem\n\nSomething");
      assert.equal(items.length, 0);
    });

    it("returns empty array for empty string", () => {
      const items = extractOutOfScope("");
      assert.equal(items.length, 0);
    });

    it("stops at next section heading", () => {
      const brief = `## Out of Scope\n\n- Item 1\n\n## Rabbit Holes\n\n- Not out of scope`;
      const items = extractOutOfScope(brief);
      assert.equal(items.length, 1);
    });
  });

  // -------------------------------------------------------------------------
  // generateReminder
  // -------------------------------------------------------------------------

  describe("generateReminder", () => {
    it("includes Brief Anchor header", () => {
      const msg = generateReminder(["criterion 1"], ["oos 1"]);
      assert.ok(msg.includes("Brief Anchor"));
    });

    it("includes success criteria in numbered list", () => {
      const msg = generateReminder(["All tests pass", "API works"], []);
      assert.ok(msg.includes("1. All tests pass"));
      assert.ok(msg.includes("2. API works"));
    });

    it("includes out-of-scope items", () => {
      const msg = generateReminder([], ["Mobile support"]);
      assert.ok(msg.includes("Mobile support"));
    });

    it("includes alignment check questions", () => {
      const msg = generateReminder(["c1"], []);
      assert.ok(msg.includes("Does my current task connect"));
      assert.ok(msg.includes("Am I within scope"));
      assert.ok(msg.includes("rabbit hole"));
    });

    it("handles empty criteria gracefully", () => {
      const msg = generateReminder([], []);
      assert.ok(msg.includes("no criteria found"));
    });

    it("handles empty out-of-scope gracefully", () => {
      const msg = generateReminder(["c1"], []);
      assert.ok(!msg.includes("Out of scope:"));
    });
  });

  // -------------------------------------------------------------------------
  // generateMinimalReminder
  // -------------------------------------------------------------------------

  describe("generateMinimalReminder", () => {
    it("includes Brief Anchor header", () => {
      const msg = generateMinimalReminder();
      assert.ok(msg.includes("Brief Anchor"));
    });

    it("mentions missing BRIEF.md", () => {
      const msg = generateMinimalReminder();
      assert.ok(msg.includes("No Plan Brief found"));
    });

    it("suggests running /solveos:plan", () => {
      const msg = generateMinimalReminder();
      assert.ok(msg.includes("/solveos:plan"));
    });
  });
});

// ===========================================================================
// Config Integration Tests
// ===========================================================================

describe("Hook Config Integration", () => {
  it("DEFAULT_CONFIG includes hooks section", async () => {
    const { DEFAULT_CONFIG } = await import("../src/lib/config.js");
    assert.ok(DEFAULT_CONFIG.hooks);
    assert.equal(DEFAULT_CONFIG.hooks.context_monitor, true);
    assert.equal(DEFAULT_CONFIG.hooks.context_monitor_threshold, 60);
    assert.equal(DEFAULT_CONFIG.hooks.brief_anchor, true);
    assert.equal(DEFAULT_CONFIG.hooks.brief_anchor_interval, 10);
  });

  it("readConfig merges hooks with defaults", async () => {
    // Import artifacts to test readConfig merging
    const { mkdtemp, writeFile, mkdir } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const { tmpdir } = await import("node:os");
    const { readConfig, initProject } = await import("../src/lib/artifacts.js");

    const tmpDir = await mkdtemp(join(tmpdir(), "solveos-hooks-test-"));
    await initProject(tmpDir);

    // Write a config that only overrides one hook setting
    const configPath = join(tmpDir, ".solveos", "config.json");
    await writeFile(configPath, JSON.stringify({
      mode: "interactive",
      hooks: {
        context_monitor: false,
      },
    }), "utf-8");

    const config = await readConfig(tmpDir);
    assert.equal(config.hooks.context_monitor, false); // overridden
    assert.equal(config.hooks.context_monitor_threshold, 60); // default
    assert.equal(config.hooks.brief_anchor, true); // default
    assert.equal(config.hooks.brief_anchor_interval, 10); // default

    // Cleanup
    const { rm } = await import("node:fs/promises");
    await rm(tmpDir, { recursive: true });
  });

  it("readConfig handles missing hooks section", async () => {
    const { mkdtemp, writeFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const { tmpdir } = await import("node:os");
    const { readConfig, initProject } = await import("../src/lib/artifacts.js");

    const tmpDir = await mkdtemp(join(tmpdir(), "solveos-hooks-test2-"));
    await initProject(tmpDir);

    // Write a config with no hooks section at all
    const configPath = join(tmpDir, ".solveos", "config.json");
    await writeFile(configPath, JSON.stringify({
      mode: "auto",
      domain: "content",
    }), "utf-8");

    const config = await readConfig(tmpDir);
    assert.ok(config.hooks); // should have defaults
    assert.equal(config.hooks.context_monitor, true);
    assert.equal(config.hooks.brief_anchor, true);

    const { rm } = await import("node:fs/promises");
    await rm(tmpDir, { recursive: true });
  });
});

// ===========================================================================
// Summary
// ===========================================================================

// Count tests for reporting
let passCount = 0;
let failCount = 0;

describe("# --- Hooks Tests Summary ---", () => {
  // This is just a marker for the test runner
});
