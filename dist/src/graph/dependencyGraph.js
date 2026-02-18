"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDependencyEdges = buildDependencyEdges;
const importExtractor_1 = require("../parser/importExtractor");
// Build full dependency edge list and keep ordering stable for CI output.
function buildDependencyEdges(opts) {
    const edges = [];
    for (const file of opts.files) {
        edges.push(...(0, importExtractor_1.parseImportsFromFile)({ repoRoot: opts.repoRoot, file }));
    }
    edges.sort((a, b) => a.fromFile.localeCompare(b.fromFile) ||
        a.line - b.line ||
        a.toFile.localeCompare(b.toFile));
    return edges;
}
