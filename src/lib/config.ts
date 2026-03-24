/**
 * Configuration loading and defaults for solveos-cli.
 *
 * Reads .solveos/config.json if it exists, merges with defaults,
 * and returns a fully typed Config object.
 */

import type { Config } from "../types.js";

/** Default configuration — matches templates/config-default.json. */
export const DEFAULT_CONFIG: Config = {
  mode: "interactive",
  gates: {
    research: true,
    plan_validation: true,
    build_validation: true,
    review_pre_ship: true,
    review_post_ship: true,
  },
  plan_validation_max_passes: 3,
  granularity: "standard",
  auto_advance: false,
  domain: "software",
  runtime: "auto",
  hooks: {
    context_monitor: true,
    context_monitor_threshold: 60,
    brief_anchor: true,
    brief_anchor_interval: 10,
  },
};
