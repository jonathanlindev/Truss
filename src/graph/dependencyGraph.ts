import { parseImportsFromFile } from "../parser/importExtractor";
import { DependencyEdge, ParserIssue } from "../core/types";
import { logger } from "../utils/logger";

export function buildDependencyEdges(opts: {
  repoRoot: string;
  files: string[];
}): { edges: DependencyEdge[]; parserIssues: ParserIssue[] } {
  const edges: DependencyEdge[] = [];
  const parserIssues: ParserIssue[] = [];

  logger.debug(`Building dependency edges for ${opts.files.length} files`);

  for (const file of opts.files) {
    // Each file contributes both resolved dependency edges and any non-fatal parser warnings.
    const parsed = parseImportsFromFile({ repoRoot: opts.repoRoot, file });
    edges.push(...parsed.edges);
    parserIssues.push(...parsed.parserIssues);
  }

  // Sorting by source location and target keeps reports and snapshots stable across runs.
  edges.sort(
    (a, b) =>
      a.fromFile.localeCompare(b.fromFile) ||
      a.line - b.line ||
      targetKey(a).localeCompare(targetKey(b)),
  );

  logger.debug(`Final dependency edge count: ${edges.length}`);
  logger.debug(`Total parser issues: ${parserIssues.length}`);

  return { edges, parserIssues };
}

function targetKey(e: DependencyEdge): string {
  // Internal edges sort by destination file, external edges by package name.
  return e.importKind === "internal" ? e.toFile : e.packageName;
}
