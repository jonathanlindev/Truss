export type DependencyEdge = {
  fromFile: string;
  toFile: string;
  importText: string;
  line: number;
};

export type Violation = {
  ruleName: string;
  fromLayer: string;
  toLayer: string;
  fromFile: string;
  toFile: string;
  line: number;
  importText: string;
  reason: string;
};

export type SuppressedViolation = Violation & {
  suppressionReason: string;
};

export type TrussReport = {
  checkedFiles: number;
  edges: number;
  unsuppressed: Violation[];
  suppressed: SuppressedViolation[];
  summary: {
    unsuppressedCount: number;
    suppressedCount: number;
    totalCount: number;
  };
};

export const ExitCode = {
  OK: 0,
  VIOLATIONS: 1,
  CONFIG_ERROR: 2,
  INTERNAL_ERROR: 3,
} as const;

export type ExitCode = (typeof ExitCode)[keyof typeof ExitCode];

export type CheckOptions = {
  repoRoot: string;
  configPath: string;
  format: "human" | "json";
  showSuppressed: boolean;
};
