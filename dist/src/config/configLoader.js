"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigError = void 0;
exports.loadTrussConfig = loadTrussConfig;
const fs = require("node:fs");
const path = require("node:path");
const yaml = require("yaml");
class ConfigError extends Error {
    constructor(message) {
        super(message);
        this.name = "ConfigError";
    }
}
exports.ConfigError = ConfigError;
function labelPath(displayPath, fallbackPath) {
    return displayPath ?? fallbackPath ?? "truss.yml";
}
// Pseudo-flow: read YAML -> validate required shape -> return typed config.
function loadTrussConfig(configPath, displayPath) {
    const abs = path.resolve(configPath);
    const shownPath = labelPath(displayPath, configPath);
    if (!fs.existsSync(abs)) {
        throw new ConfigError(`Missing config at ${shownPath}. Create truss.yml or pass --config <path>.`);
    }
    let parsed;
    try {
        const raw = fs.readFileSync(abs, "utf8");
        parsed = yaml.parse(raw);
    }
    catch (e) {
        const detail = e.message.split("\n")[0].trim();
        throw new ConfigError(`Invalid YAML in ${shownPath}. Fix YAML syntax and try again. Details: ${detail}`);
    }
    if (!parsed || typeof parsed !== "object") {
        throw new ConfigError(`Invalid config in ${shownPath}: expected a YAML object at the document root.`);
    }
    const cfg = parsed;
    if (!cfg.layers || typeof cfg.layers !== "object" || Array.isArray(cfg.layers)) {
        throw new ConfigError(`Invalid config in ${shownPath}: "layers" must be an object mapping layer names to path patterns.`);
    }
    const layerNames = Object.keys(cfg.layers);
    if (layerNames.length === 0) {
        throw new ConfigError(`Invalid config in ${shownPath}: "layers" must define at least one layer.`);
    }
    for (const [layerName, patterns] of Object.entries(cfg.layers)) {
        if (!Array.isArray(patterns) || patterns.length === 0 || patterns.some((p) => typeof p !== "string")) {
            throw new ConfigError(`Invalid layer config for "${layerName}" in ${shownPath}: expected a non-empty string[] of path patterns.`);
        }
    }
    if (!cfg.rules || !Array.isArray(cfg.rules) || cfg.rules.length === 0) {
        throw new ConfigError(`Invalid config in ${shownPath}: "rules" must be a non-empty array. Add at least one rule entry.`);
    }
    const knownLayers = new Set(layerNames);
    for (const r of cfg.rules) {
        if (!r || typeof r !== "object") {
            throw new ConfigError(`Invalid rule entry in ${shownPath}: expected an object.`);
        }
        if (!r.name || typeof r.name !== "string") {
            throw new ConfigError(`Invalid rule entry in ${shownPath}: missing "name".`);
        }
        if (!r.from || typeof r.from !== "string") {
            throw new ConfigError(`Rule "${r.name}" in ${shownPath} is missing "from".`);
        }
        if (!knownLayers.has(r.from)) {
            throw new ConfigError(`Rule "${r.name}" in ${shownPath} references unknown layer in "from": "${r.from}".`);
        }
        if (!Array.isArray(r.disallow) || r.disallow.length === 0 || r.disallow.some((x) => typeof x !== "string")) {
            throw new ConfigError(`Rule "${r.name}" in ${shownPath} must define "disallow" as a non-empty string[].`);
        }
        for (const target of r.disallow) {
            if (!knownLayers.has(target)) {
                throw new ConfigError(`Rule "${r.name}" in ${shownPath} references unknown disallow layer: "${target}".`);
            }
        }
    }
    return cfg;
}
