#!/usr/bin/env node
import * as path from "node:path";
import { Command } from "commander";
import { loadTrussConfig, ConfigError } from "../src/config/configLoader";
import { runCheck } from "../src/core/engine";
import { renderHumanReport, renderJsonReport } from "../src/core/reporter";
import { ExitCode } from "../src/core/types";

const program = new Command();

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
  .option(
    "--show-suppressed",
    "Print suppressed violations in full detail (human only)",
    false,
  )
  .action(async (options) => {
    const repoRoot = path.resolve(options.repo);
    const configPath = options.config;
    const format = options.format === "json" ? "json" : "human";

    // Preflight config errors so users get a clear exit=2 message.
    try {
      loadTrussConfig(path.resolve(repoRoot, configPath));
    } catch (e) {
      const msg =
        e instanceof ConfigError
          ? e.message
          : `Failed to load config: ${(e as Error).message}`;
      if (format === "json") {
        console.log(
          JSON.stringify(
            { error: msg, exitCode: ExitCode.CONFIG_ERROR },
            null,
            2,
          ),
        );
      } else {
        console.error("Truss: Configuration error");
        console.error(msg);
      }
      process.exitCode = ExitCode.CONFIG_ERROR;
      return;
    }

    const { exitCode, report } = await runCheck({
      repoRoot,
      configPath,
      format,
      showSuppressed: Boolean(options.showSuppressed),
    });

    if (format === "json") {
      console.log(renderJsonReport(report));
    } else {
      console.log(
        renderHumanReport(report, {
          showSuppressed: Boolean(options.showSuppressed),
        }),
      );
    }

    process.exitCode = exitCode;
    ``;
  });

program.parse(process.argv);
