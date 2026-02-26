#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("node:path");
const commander_1 = require("commander");
const configLoader_1 = require("../src/config/configLoader");
const engine_1 = require("../src/core/engine");
const reporter_1 = require("../src/core/reporter");
const types_1 = require("../src/core/types");
const program = new commander_1.Command();
program
    .name("truss")
    .description("Truss: configuration-driven architectural boundary checks")
    .version("0.1.0");
program
    .command("check")
    .description("Check repository for architectural violations")
    .option("-c, --config <path>", "Path to truss.yml", "truss.yml")
    .option("--repo <path>", "Repo root", ".")
    .option("--format <format>", "Output format: human|json", "human")
    .option("--show-suppressed", "Print suppressed violations in full detail (human only)", false)
    .action(async (options) => {
    const repoRoot = path.resolve(options.repo);
    const configPath = options.config;
    const format = options.format === "json" ? "json" : "human";
    // Preflight config errors so users get a clear exit=2 message.
    try {
        (0, configLoader_1.loadTrussConfig)(path.resolve(repoRoot, configPath));
    }
    catch (e) {
        const msg = e instanceof configLoader_1.ConfigError
            ? e.message
            : `Failed to load config: ${e.message}`;
        if (format === "json") {
            console.log((0, reporter_1.renderJsonError)(msg, types_1.ExitCode.CONFIG_ERROR));
        }
        else {
            console.error("Truss: Configuration error");
            console.error(msg);
        }
        process.exitCode = types_1.ExitCode.CONFIG_ERROR;
        return;
    }
    const { exitCode, report } = await (0, engine_1.runCheck)({
        repoRoot,
        configPath,
        format,
        showSuppressed: Boolean(options.showSuppressed),
    });
    if (format === "json") {
        console.log((0, reporter_1.renderJsonReport)(report, exitCode));
    }
    else {
        console.log((0, reporter_1.renderHumanReport)(report, {
            showSuppressed: Boolean(options.showSuppressed),
        }));
    }
    process.exitCode = exitCode;
});
program.parse(process.argv);
