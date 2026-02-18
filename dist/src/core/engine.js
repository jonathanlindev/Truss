"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCheck = runCheck;
const path = require("node:path");
const configLoader_1 = require("../config/configLoader");
const fileScanner_1 = require("../parser/fileScanner");
const dependencyGraph_1 = require("../graph/dependencyGraph");
const validator_1 = require("./validator");
const types_1 = require("./types");
function emptyReport() {
    return {
        checkedFiles: 0,
        edges: 0,
        unsuppressed: [],
        suppressed: [],
        summary: { unsuppressedCount: 0, suppressedCount: 0, totalCount: 0 },
    };
}
// Orchestration flow: config -> scan -> edges -> rules -> suppressions -> report.
async function runCheck(opts) {
    try {
        const repoRoot = path.resolve(opts.repoRoot);
        const config = (0, configLoader_1.loadTrussConfig)(path.resolve(repoRoot, opts.configPath));
        const files = (0, fileScanner_1.discoverSourceFiles)({
            repoRoot,
            extraIgnores: config.ignore,
        });
        if (files.length === 0) {
            throw new configLoader_1.ConfigError("No source files found (.ts/.tsx/.js/.jsx). Check repoRoot/ignore settings.");
        }
        const edges = (0, dependencyGraph_1.buildDependencyEdges)({ repoRoot, files });
        const { violations } = (0, validator_1.evaluateRules)({ config, edges });
        const { unsuppressed, suppressed } = (0, validator_1.applySuppressions)({ config, violations });
        const report = {
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
        const exitCode = report.summary.unsuppressedCount > 0 ? types_1.ExitCode.VIOLATIONS : types_1.ExitCode.OK;
        return { exitCode, report };
    }
    catch (e) {
        if (e instanceof configLoader_1.ConfigError) {
            return { exitCode: types_1.ExitCode.CONFIG_ERROR, report: emptyReport() };
        }
        return { exitCode: types_1.ExitCode.INTERNAL_ERROR, report: emptyReport() };
    }
}
