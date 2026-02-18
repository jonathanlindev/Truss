"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.discoverSourceFiles = discoverSourceFiles;
const fs = require("node:fs");
const path = require("node:path");
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
function discoverSourceFiles(opts) {
    const repoRoot = path.resolve(opts.repoRoot);
    const ignore = new Set(DEFAULT_IGNORES);
    for (const i of opts.extraIgnores ?? [])
        ignore.add(i);
    const results = [];
    function walk(dirAbs) {
        const entries = fs.readdirSync(dirAbs, { withFileTypes: true });
        for (const ent of entries) {
            const abs = path.join(dirAbs, ent.name);
            const rel = path.relative(repoRoot, abs);
            if (ent.isDirectory()) {
                if (ignore.has(ent.name))
                    continue;
                walk(abs);
                continue;
            }
            if (!ent.isFile())
                continue;
            if (!EXT_OK.has(path.extname(ent.name)))
                continue;
            // Normalize separators for cross-platform deterministic output.
            results.push(rel.split(path.sep).join("/"));
        }
    }
    walk(repoRoot);
    results.sort();
    return results;
}
