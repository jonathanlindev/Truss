"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateRules = evaluateRules;
exports.applySuppressions = applySuppressions;
function matchLayer(file, layers) {
    for (const [layerName, patterns] of Object.entries(layers)) {
        for (const p of patterns) {
            const normalized = p.replace(/\*\*$/, "");
            if (file.startsWith(normalized))
                return layerName;
        }
    }
    return null;
}
// Evaluate all edges against rules; do not stop at first violation.
function evaluateRules(opts) {
    const { config, edges } = opts;
    const fileToLayer = new Map();
    const getLayer = (file) => {
        if (fileToLayer.has(file))
            return fileToLayer.get(file) ?? null;
        const layer = matchLayer(file, config.layers);
        if (layer)
            fileToLayer.set(file, layer);
        return layer;
    };
    const violations = [];
    for (const edge of edges) {
        const fromLayer = getLayer(edge.fromFile);
        const toLayer = getLayer(edge.toFile);
        if (!fromLayer || !toLayer)
            continue;
        for (const rule of config.rules) {
            if (rule.from !== fromLayer)
                continue;
            if (!rule.disallow.includes(toLayer))
                continue;
            violations.push({
                ruleName: rule.name,
                fromLayer,
                toLayer,
                fromFile: edge.fromFile,
                toFile: edge.toFile,
                line: edge.line,
                importText: edge.importText,
                reason: rule.message ?? `${fromLayer} layer must not depend on ${toLayer} layer.`,
            });
        }
    }
    return { violations, fileToLayer };
}
// Split violations into unsuppressed (failing) and suppressed (intentional) buckets.
function applySuppressions(opts) {
    const suppressions = opts.config.suppressions ?? [];
    const suppressed = [];
    const unsuppressed = [];
    for (const v of opts.violations) {
        const s = suppressions.find((x) => x.file === v.fromFile && x.rule === v.ruleName);
        if (s)
            suppressed.push({ ...v, suppressionReason: s.reason });
        else
            unsuppressed.push(v);
    }
    suppressed.sort((a, b) => a.fromFile.localeCompare(b.fromFile) || a.line - b.line);
    unsuppressed.sort((a, b) => a.fromFile.localeCompare(b.fromFile) || a.line - b.line);
    return { unsuppressed, suppressed };
}
