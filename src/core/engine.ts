import * as path from "node:path";
import { loadTrussConfig, ConfigError } from "../config/configLoader";
import { discoverSourceFiles } from "../parser/fileScanner";
import { buildDependencyEdges } from "../graph/dependencyGraph";
import { applySuppressions, evaluateRules } from "./validator";
import { CheckOptions, ExitCode, TrussReport } from "./types";

function emptyReport(): TrussReport {
  return {
    checkedFiles: 0,
    edges: 0,
    unsuppressed: [],
    suppressed: [],
    summary: { unsuppressedCount: 0, suppressedCount: 0, totalCount: 0 },
  };
}

// Orchestration flow: config -> scan -> edges -> rules -> suppressions -> report.
export async function runCheck(opts: CheckOptions): Promise<{ exitCode: number; report: TrussReport }> {
  try {
    const repoRoot = path.resolve(opts.repoRoot);
    const config = loadTrussConfig(path.resolve(repoRoot, opts.configPath));

    const files = discoverSourceFiles({
      repoRoot,
      extraIgnores: config.ignore,
    });

    if (files.length === 0) {
      throw new ConfigError("No source files found (.ts/.tsx/.js/.jsx). Check repoRoot/ignore settings.");
    }

    const edges = buildDependencyEdges({ repoRoot, files });
    const { violations } = evaluateRules({ config, edges });
    const { unsuppressed, suppressed } = applySuppressions({ config, violations });

    const report: TrussReport = {
      checkedFiles: files.length,
      edges: edges.length,
      unsuppressed,
      suppressed,
      summary: {
        unsuppressedCount: unsuppressed.length,
        suppressedCount: suppressed.length,
        totalCount: unsuppressed.length + suppressed.length,
      },
    };

    const exitCode = report.summary.unsuppressedCount > 0 ? ExitCode.VIOLATIONS : ExitCode.OK;
    return { exitCode, report };
  } catch (e) {
    if (e instanceof ConfigError) {
      return { exitCode: ExitCode.CONFIG_ERROR, report: emptyReport() };
    }
    return { exitCode: ExitCode.INTERNAL_ERROR, report: emptyReport() };
  }
}
