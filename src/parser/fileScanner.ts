import * as fs from "node:fs";
import * as path from "node:path";

const DEFAULT_IGNORES = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  ".next",
  ".turbo",
  "coverage",
  ".cache",
  ".yarn",
]);

const EXT_OK = new Set([".ts", ".tsx", ".js", ".jsx"]);

// Pseudo-flow: walk repo recursively, skip ignored dirs, collect supported source files.
export function discoverSourceFiles(opts: {
  repoRoot: string;
  extraIgnores?: string[];
}): string[] {
  const repoRoot = path.resolve(opts.repoRoot);
  const ignore = new Set(DEFAULT_IGNORES);
  for (const i of opts.extraIgnores ?? []) ignore.add(i);

  const results: string[] = [];

  function walk(dirAbs: string): void {
    const entries = fs.readdirSync(dirAbs, { withFileTypes: true });

    for (const ent of entries) {
      const abs = path.join(dirAbs, ent.name);
      const rel = path.relative(repoRoot, abs);

      if (ent.isDirectory()) {
        if (ignore.has(ent.name)) continue;
        walk(abs);
        continue;
      }

      if (!ent.isFile()) continue;
      if (!EXT_OK.has(path.extname(ent.name))) continue;

      // Normalize separators for cross-platform deterministic output.
      results.push(rel.split(path.sep).join("/"));
    }
  }

  walk(repoRoot);
  results.sort();
  return results;
}
