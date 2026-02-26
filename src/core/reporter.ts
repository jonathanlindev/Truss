import {
  JsonErrorV1,
  JsonReportV1,
  REPORT_SCHEMA_VERSION,
  TrussReport,
  Violation,
} from "./types";

/**
 * renderHumanReport()
 * Purpose: Format TrussReport into readable CLI text output.
 *
 * Input:
 *  - report: final TrussReport object (contains violations and summary)
 *  - opts.showSuppressed: optional flag to show suppressed violation details
 *
 * Output:
 *  - string (formatted text for terminal)
 */
export function renderHumanReport(
  report: TrussReport,
  opts?: { showSuppressed?: boolean }
): string {

  const lines: string[] = [];
  const uns = report.unsuppressed.length;
  const sup = report.suppressed.length;

  if (uns > 0) {
    lines.push(`Truss: Architectural violations found (${uns})`);
    lines.push("");

    for (const v of report.unsuppressed) {
      lines.push(`${v.ruleName}`);
      lines.push(`Layers: ${v.fromLayer} -> ${v.toLayer}`);
      lines.push(`${v.edge.fromFile}:${v.edge.line}`);
      lines.push(`${v.edge.importText}`);
      lines.push(`Reason: ${v.reason}`);
      lines.push("");
    }

    if (sup > 0) {
      lines.push(`Suppressed violations: ${sup} (intentional, still reported)`);

      if (opts?.showSuppressed) {
        lines.push("");
        for (const v of report.suppressed) {
          lines.push(`${v.ruleName} (suppressed)`);
          lines.push(`Layers: ${v.fromLayer} -> ${v.toLayer}`);
          lines.push(`${v.edge.fromFile}:${v.edge.line}`);
          lines.push(`${v.edge.importText}`);
          lines.push(`Reason: ${v.reason}`);
          lines.push(`Suppression: ${v.suppressionReason}`);
          lines.push("");
        }
      }
    }

    lines.push("Summary:");
    lines.push(`Unsuppressed: ${report.summary.unsuppressedCount}`);
    lines.push(`Suppressed: ${report.summary.suppressedCount}`);
    lines.push(`Total: ${report.summary.totalCount}`);

    return lines.join("\n");
  }

  lines.push("Truss: No Architectural violations found");
  lines.push(`Checked ${report.checkedFiles} files`);
  return lines.join("\n");
}

function compareViolations(a: Violation, b: Violation): number {
  if (a.ruleName !== b.ruleName) return a.ruleName.localeCompare(b.ruleName);
  if (a.edge.fromFile !== b.edge.fromFile) {
    return a.edge.fromFile.localeCompare(b.edge.fromFile);
  }
  if (a.edge.line !== b.edge.line) return a.edge.line - b.edge.line;
  return a.edge.importText.localeCompare(b.edge.importText);
}

export function buildJsonReport(report: TrussReport, exitCode: number): JsonReportV1 {
  const unsuppressed = [...report.unsuppressed].sort(compareViolations);
  const suppressed = [...report.suppressed].sort(compareViolations);

  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    kind: "report",
    exitCode,
    checkedFiles: report.checkedFiles,
    edges: report.edges,
    unsuppressed,
    suppressed,
    summary: {
      unsuppressedCount: report.summary.unsuppressedCount,
      suppressedCount: report.summary.suppressedCount,
      totalCount: report.summary.totalCount,
    },
  };
}

export function buildJsonError(error: string, exitCode: number): JsonErrorV1 {
  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    kind: "error",
    exitCode,
    error,
  };
}

/**
 * renderJsonReport()
 * Purpose: Format TrussReport into machine-readable JSON.
 *
 * Input:
 *  - report: final TrussReport object
 *
 * Output:
 *  - string (JSON format with indentation)
 */
export function renderJsonReport(report: TrussReport, exitCode: number): string {
  return JSON.stringify(buildJsonReport(report, exitCode), null, 2);
}

export function renderJsonError(error: string, exitCode: number): string {
  return JSON.stringify(buildJsonError(error, exitCode), null, 2);
}
