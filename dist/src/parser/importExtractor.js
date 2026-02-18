"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseImportsFromFile = parseImportsFromFile;
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const RESOLVABLE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mts", ".cts", ".mjs", ".cjs"];
function toRepoRelativePosix(repoRoot, absPath) {
    const rel = path.relative(repoRoot, absPath);
    if (rel.startsWith("..") || path.isAbsolute(rel))
        return null;
    return rel.split(path.sep).join("/");
}
function resolveImportToFile(repoRoot, fromFile, specifier) {
    if (!specifier.startsWith(".") && !specifier.startsWith("/"))
        return null;
    const fromAbs = path.resolve(repoRoot, fromFile);
    const baseDir = path.dirname(fromAbs);
    const unresolved = specifier.startsWith("/")
        ? path.resolve(repoRoot, specifier.slice(1))
        : path.resolve(baseDir, specifier);
    const candidates = [
        unresolved,
        ...RESOLVABLE_EXTENSIONS.map((ext) => `${unresolved}${ext}`),
        ...RESOLVABLE_EXTENSIONS.map((ext) => path.join(unresolved, `index${ext}`)),
    ];
    for (const candidate of candidates) {
        if (!fs.existsSync(candidate))
            continue;
        const stat = fs.statSync(candidate);
        if (!stat.isFile())
            continue;
        return toRepoRelativePosix(repoRoot, candidate);
    }
    return null;
}
// Parse static imports/exports + require()/import() calls and emit local-file dependency edges.
function parseImportsFromFile(opts) {
    const abs = path.resolve(opts.repoRoot, opts.file);
    if (!fs.existsSync(abs))
        return [];
    const sourceText = fs.readFileSync(abs, "utf8");
    const sourceFile = ts.createSourceFile(abs, sourceText, ts.ScriptTarget.Latest, true);
    const edges = [];
    const pushEdge = (specifier, node) => {
        const toFile = resolveImportToFile(opts.repoRoot, opts.file, specifier);
        if (!toFile)
            return;
        const start = node.getStart(sourceFile);
        const line = sourceFile.getLineAndCharacterOfPosition(start).line + 1;
        const importText = sourceText.slice(start, node.end).trim();
        edges.push({
            fromFile: opts.file,
            toFile,
            importText,
            line,
        });
    };
    const visit = (node) => {
        if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
            pushEdge(node.moduleSpecifier.text, node);
        }
        if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
            pushEdge(node.moduleSpecifier.text, node);
        }
        if (ts.isCallExpression(node) &&
            ts.isIdentifier(node.expression) &&
            node.expression.text === "require" &&
            node.arguments.length === 1 &&
            ts.isStringLiteral(node.arguments[0])) {
            pushEdge(node.arguments[0].text, node);
        }
        if (ts.isCallExpression(node) &&
            node.expression.kind === ts.SyntaxKind.ImportKeyword &&
            node.arguments.length === 1 &&
            ts.isStringLiteral(node.arguments[0])) {
            pushEdge(node.arguments[0].text, node);
        }
        ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    return edges;
}
