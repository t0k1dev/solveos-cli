/**
 * Security module for solveos-cli.
 *
 * Protects against:
 * 1. Path traversal attacks — ensures all file operations stay within .solveos/
 * 2. Prompt injection — scans user-supplied content for injection patterns
 *    before it's used as AI agent context
 *
 * Since solveos-cli generates markdown that becomes LLM system prompts,
 * indirect prompt injection is a real attack surface.
 */

import { resolve, relative } from "node:path";
import { realpath } from "node:fs/promises";

// ---------------------------------------------------------------------------
// Path Validation
// ---------------------------------------------------------------------------

/**
 * Validate that a target path resolves within a base directory.
 * Prevents path traversal attacks (../../etc/passwd, symlinks, null bytes).
 *
 * @param basePath - The allowed root directory (e.g., /project/.solveos)
 * @param targetPath - The path to validate (absolute or relative to basePath)
 * @returns The resolved, validated absolute path
 * @throws Error if the path escapes the base directory
 */
export function validatePath(basePath: string, targetPath: string): string {
  // Reject null bytes — used in null byte injection attacks
  if (basePath.includes("\0") || targetPath.includes("\0")) {
    throw new PathTraversalError(
      "Null byte detected in path",
      targetPath,
      basePath,
    );
  }

  const resolvedBase = resolve(basePath);
  const resolvedTarget = resolve(resolvedBase, targetPath);
  const rel = relative(resolvedBase, resolvedTarget);

  // Check 1: relative path must not start with ".." (escaping base)
  if (rel.startsWith("..")) {
    throw new PathTraversalError(
      `Path resolves outside allowed directory`,
      targetPath,
      basePath,
    );
  }

  // Check 2: empty relative path means target IS the base (allowed)
  // Check 3: absolute paths that don't start with base are rejected
  if (!resolvedTarget.startsWith(resolvedBase)) {
    throw new PathTraversalError(
      `Path resolves outside allowed directory`,
      targetPath,
      basePath,
    );
  }

  return resolvedTarget;
}

/**
 * Validate path with symlink resolution.
 * Resolves symlinks first, then validates the real path.
 * Use this for operations where the target file already exists.
 *
 * @param basePath - The allowed root directory
 * @param targetPath - The path to validate
 * @returns The resolved, validated real path
 * @throws Error if the real path escapes the base directory
 */
export async function validatePathWithSymlinks(
  basePath: string,
  targetPath: string,
): Promise<string> {
  // First do the basic validation
  const validated = validatePath(basePath, targetPath);

  // Then resolve symlinks and re-validate
  try {
    const realBase = await realpath(basePath);
    const realTarget = await realpath(validated);
    const rel = relative(realBase, realTarget);

    if (rel.startsWith("..") || !realTarget.startsWith(realBase)) {
      throw new PathTraversalError(
        `Symlink resolves outside allowed directory`,
        targetPath,
        basePath,
      );
    }

    return realTarget;
  } catch (err) {
    // If realpath fails (file doesn't exist yet), the basic validation is sufficient
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return validated;
    }
    throw err;
  }
}

/**
 * Custom error for path traversal attempts.
 */
export class PathTraversalError extends Error {
  readonly attemptedPath: string;
  readonly basePath: string;

  constructor(message: string, attemptedPath: string, basePath: string) {
    super(`Path traversal detected: ${message} (attempted: "${attemptedPath}", base: "${basePath}")`);
    this.name = "PathTraversalError";
    this.attemptedPath = attemptedPath;
    this.basePath = basePath;
  }
}

// ---------------------------------------------------------------------------
// Prompt Injection Scanning
// ---------------------------------------------------------------------------

/** Severity level for injection detection. */
export type InjectionSeverity = "block" | "warn";

/** Result of scanning content for injection patterns. */
export interface InjectionScanResult {
  /** Whether any patterns were detected. */
  detected: boolean;
  /** Highest severity of detected patterns. */
  severity: InjectionSeverity | null;
  /** List of matched patterns with descriptions. */
  matches: InjectionMatch[];
}

/** A single injection pattern match. */
export interface InjectionMatch {
  /** Human-readable description of the pattern. */
  pattern: string;
  /** The matched text (truncated to 100 chars). */
  matched: string;
  /** Severity level. */
  severity: InjectionSeverity;
  /** Line number where the match was found (1-indexed). */
  line: number;
}

interface PatternDef {
  name: string;
  regex: RegExp;
  severity: InjectionSeverity;
}

/**
 * Patterns that indicate prompt injection attempts.
 * Ordered from most to least suspicious.
 */
const INJECTION_PATTERNS: PatternDef[] = [
  // BLOCK-level: almost certainly injection attempts
  {
    name: "System prompt override",
    regex: /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?|directions?)/i,
    severity: "block",
  },
  {
    name: "System prompt reset",
    regex: /forget\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|context|conversation)/i,
    severity: "block",
  },
  {
    name: "Role switching",
    regex: /you\s+are\s+now\s+(a|an|the)\s+(?!solveos)/i,
    severity: "block",
  },
  {
    name: "New system prompt injection",
    regex: /\[?\s*system\s*\]?\s*:?\s*you\s+are/i,
    severity: "block",
  },
  {
    name: "Instruction boundary escape (XML)",
    regex: /<\/?system>|<\/?instructions?>|<\/?prompt>/i,
    severity: "block",
  },
  {
    name: "Base64-encoded instruction injection",
    regex: /(?:eval|decode|execute)\s*\(\s*(?:atob|base64|Buffer\.from)/i,
    severity: "block",
  },
  {
    name: "Hidden instruction delimiter",
    regex: /---\s*(?:BEGIN|START)\s+(?:HIDDEN|SECRET|REAL)\s+(?:INSTRUCTIONS?|PROMPT)/i,
    severity: "block",
  },

  // WARN-level: suspicious but possibly legitimate
  {
    name: "Disregard instruction",
    regex: /(?:disregard|override|bypass|skip)\s+(?:the\s+)?(?:above|previous|prior|system)\s+(?:instructions?|rules?|constraints?)/i,
    severity: "warn",
  },
  {
    name: "Act as different entity",
    regex: /(?:act|behave|pretend|respond)\s+(?:as|like)\s+(?:a|an|the|if\s+you\s+(?:are|were))/i,
    severity: "warn",
  },
  {
    name: "Jailbreak attempt",
    regex: /(?:DAN|DUDE|jailbreak|do\s+anything\s+now)/i,
    severity: "warn",
  },
  {
    name: "Output manipulation",
    regex: /(?:when\s+(?:asked|prompted|queried)|if\s+(?:anyone|someone)\s+asks)\s+.*(?:say|respond|output|answer)/i,
    severity: "warn",
  },
  {
    name: "Instruction in markdown comment",
    regex: /<!--\s*(?:ignore|override|system|instruction)/i,
    severity: "warn",
  },
];

/**
 * Scan content for prompt injection patterns.
 *
 * @param content - The text to scan (Plan Brief content, research summaries, etc.)
 * @returns Scan result with detected patterns, severity, and matches.
 */
export function scanForInjection(content: string): InjectionScanResult {
  const matches: InjectionMatch[] = [];
  const lines = content.split("\n");

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    for (const pattern of INJECTION_PATTERNS) {
      const match = pattern.regex.exec(line);
      if (match) {
        matches.push({
          pattern: pattern.name,
          matched: match[0].slice(0, 100),
          severity: pattern.severity,
          line: lineIdx + 1,
        });
      }
    }
  }

  // Determine highest severity
  let severity: InjectionSeverity | null = null;
  if (matches.some((m) => m.severity === "block")) {
    severity = "block";
  } else if (matches.length > 0) {
    severity = "warn";
  }

  return {
    detected: matches.length > 0,
    severity,
    matches,
  };
}

// ---------------------------------------------------------------------------
// Content Sanitization
// ---------------------------------------------------------------------------

/**
 * Wrap user-supplied content with clear delimiters so the LLM can distinguish
 * between system instructions and user content.
 *
 * This doesn't prevent injection but makes it harder for injected instructions
 * to be confused with system-level prompts.
 *
 * @param content - The user-supplied content
 * @param label - A label describing what this content is (e.g., "Plan Brief", "Research Summary")
 * @returns Content wrapped with delimiters
 */
export function wrapUserContent(content: string, label: string): string {
  return [
    `<user-content label="${label}">`,
    content,
    `</user-content>`,
  ].join("\n");
}

/**
 * Sanitize a filename to prevent path traversal via filename manipulation.
 * Allows: alphanumeric, hyphens, underscores, dots.
 * Rejects: slashes, null bytes, special characters.
 */
export function sanitizeFilename(name: string): string {
  // Reject null bytes
  if (name.includes("\0")) {
    throw new Error("Null byte detected in filename");
  }

  // Strip path separators and directory components
  const base = name.replace(/.*[/\\]/, "");

  // Replace unsafe characters
  return base.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}
