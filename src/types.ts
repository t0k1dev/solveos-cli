/**
 * Shared type definitions for solveos-cli.
 *
 * Covers: cycle states, state transitions, configuration, artifacts,
 * and runtime adapter interface. This file is the single source of truth
 * for all type contracts.
 *
 * NOTE: This file contains types only — everything is erased at compile time.
 */

// ---------------------------------------------------------------------------
// Cycle States
// ---------------------------------------------------------------------------

/**
 * The 11 states of a solveOS cycle.
 * Maps directly to the state machine in docs/plan.md.
 */
export enum CycleState {
  INIT = "INIT",
  RESEARCHING = "RESEARCHING",
  PLANNING = "PLANNING",
  VALIDATING_PLAN = "VALIDATING_PLAN",
  BUILDING = "BUILDING",
  VALIDATING_BUILD = "VALIDATING_BUILD",
  REVIEWING_PRE = "REVIEWING_PRE",
  READY_TO_SHIP = "READY_TO_SHIP",
  SHIPPED = "SHIPPED",
  REVIEWING_POST = "REVIEWING_POST",
  CYCLE_COMPLETE = "CYCLE_COMPLETE",
}

// ---------------------------------------------------------------------------
// State Transitions
// ---------------------------------------------------------------------------

/**
 * All valid state transitions. Each tuple is [from, to].
 * Invalid transitions are not representable as this type.
 */
export type StateTransition =
  // From INIT
  | [CycleState.INIT, CycleState.RESEARCHING]
  | [CycleState.INIT, CycleState.PLANNING]
  // From RESEARCHING
  | [CycleState.RESEARCHING, CycleState.PLANNING]
  // From PLANNING
  | [CycleState.PLANNING, CycleState.VALIDATING_PLAN]
  | [CycleState.PLANNING, CycleState.BUILDING]
  // From VALIDATING_PLAN
  | [CycleState.VALIDATING_PLAN, CycleState.PLANNING]
  | [CycleState.VALIDATING_PLAN, CycleState.BUILDING]
  // From BUILDING
  | [CycleState.BUILDING, CycleState.VALIDATING_BUILD]
  | [CycleState.BUILDING, CycleState.REVIEWING_PRE]
  | [CycleState.BUILDING, CycleState.READY_TO_SHIP]
  // From VALIDATING_BUILD
  | [CycleState.VALIDATING_BUILD, CycleState.BUILDING]
  | [CycleState.VALIDATING_BUILD, CycleState.PLANNING]
  | [CycleState.VALIDATING_BUILD, CycleState.REVIEWING_PRE]
  | [CycleState.VALIDATING_BUILD, CycleState.READY_TO_SHIP]
  // From REVIEWING_PRE
  | [CycleState.REVIEWING_PRE, CycleState.BUILDING]
  | [CycleState.REVIEWING_PRE, CycleState.READY_TO_SHIP]
  // From READY_TO_SHIP
  | [CycleState.READY_TO_SHIP, CycleState.SHIPPED]
  // From SHIPPED
  | [CycleState.SHIPPED, CycleState.REVIEWING_POST]
  | [CycleState.SHIPPED, CycleState.CYCLE_COMPLETE]
  // From REVIEWING_POST
  | [CycleState.REVIEWING_POST, CycleState.CYCLE_COMPLETE]
  // From CYCLE_COMPLETE
  | [CycleState.CYCLE_COMPLETE, CycleState.INIT];

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Gate toggle flags — each gate can be independently enabled/disabled. */
export interface GateConfig {
  research: boolean;
  plan_validation: boolean;
  build_validation: boolean;
  review_pre_ship: boolean;
  review_post_ship: boolean;
}

/** Domain setting — adjusts agent prompts and artifact templates. */
export type Domain = "software" | "content" | "research" | "strategy" | "general";

/** Interaction mode. */
export type Mode = "interactive" | "auto";

/** Work decomposition granularity for the Build phase. */
export type Granularity = "coarse" | "standard" | "fine";

/** Supported AI coding assistant runtimes. */
export type Runtime = "opencode" | "claude-code" | "cursor" | "gemini" | "auto";

/** Project-level configuration stored in .solveos/config.json. */
export interface Config {
  mode: Mode;
  gates: GateConfig;
  plan_validation_max_passes: number;
  granularity: Granularity;
  auto_advance: boolean;
  domain: Domain;
  runtime: Runtime;
}

// ---------------------------------------------------------------------------
// Cycle State Data (STATE.md structured data)
// ---------------------------------------------------------------------------

/** The names of gates that can be skipped or completed. */
export type GateName =
  | "RESEARCH"
  | "PLAN_VALIDATION"
  | "BUILD_VALIDATION"
  | "REVIEW_PRE_SHIP"
  | "REVIEW_POST_SHIP";

/** A single entry in the transitions log — records every state change. */
export interface TransitionLogEntry {
  from: CycleState;
  to: CycleState;
  at: string;
  gate_skipped?: GateName;
  gate_completed?: GateName;
}

/** Structured data tracked in .solveos/STATE.md. */
export interface CycleStateData {
  current_state: CycleState;
  cycle_number: number;
  gates_skipped: GateName[];
  gates_completed: GateName[];
  plan_validation_passes: number;
  blockers: string[];
  transitions_log: TransitionLogEntry[];
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Plan Brief
// ---------------------------------------------------------------------------

/**
 * The Plan Brief — the central artifact of every solveOS cycle.
 * Maps to the 8 questions from the solveOS framework.
 */
export interface PlanBrief {
  /** What problem are we solving? */
  problem: string;
  /** Who is this for? */
  audience: string;
  /** What does success look like? */
  goal: string;
  /** How much time/effort are we willing to spend? */
  appetite: string;
  /** What are the constraints? (tech stack, style, etc.) */
  constraints: string[];
  /** How will we know this is done? (measurable criteria) */
  success_criteria: string[];
  /** What is the core assumption we're betting on? */
  core_assumption: string;
  /** Known rabbit holes to avoid. */
  rabbit_holes: string[];
  /** Explicitly out of scope. */
  out_of_scope: string[];
}

// ---------------------------------------------------------------------------
// Runtime Adapter
// ---------------------------------------------------------------------------

/** Result of runtime detection. */
export interface DetectResult {
  /** Whether the runtime was detected. */
  detected: boolean;
  /** Human-readable name of the detected runtime. */
  name: string;
  /** Path to the runtime's config directory or file, if found. */
  configPath?: string;
}

/**
 * Interface that each runtime adapter must implement.
 * Handles detection and installation for a specific AI coding assistant.
 */
export interface RuntimeAdapter {
  /** Check if this runtime is available in the current project/environment. */
  detect(): Promise<DetectResult>;
  /** Install slash command .md files to the runtime's command directory. */
  installCommands(sourceDir: string): Promise<void>;
  /** Install agent .md files to the runtime's agent directory. */
  installAgents(sourceDir: string): Promise<void>;
  /** Install compiled hook .js files to the runtime's hook directory. */
  installHooks(sourceDir: string): Promise<void>;
}
