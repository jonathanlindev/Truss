import { parseImportsFromFile } from "../parser/importExtractor";
import { DependencyEdge } from "../core/types";

// Build full dependency edge list and keep ordering stable for CI output.
export function buildDependencyEdges(opts: {
  repoRoot: string;
  files: string[];
}): DependencyEdge[] {
  const edges: DependencyEdge[] = [];

  for (const file of opts.files) {
    edges.push(...parseImportsFromFile({ repoRoot: opts.repoRoot, file }));
  }

  edges.sort(
    (a, b) =>
      a.fromFile.localeCompare(b.fromFile) ||
      a.line - b.line ||
      a.toFile.localeCompare(b.toFile),
  );

  return edges;
}
