import { TrussConfig } from "../config/configSchema";
import { SuppressedViolation, Violation, DependencyEdge } from "./types";

/**
 * function matchLayer()
 * Purpose: Find a layer name for a file using config.layers patterns.
 * Input:
 *  - file: file path (string)
 *  - layers: config "layers" object (layerName -> patterns[])
 * Output:
 *  - layer name (string) if matched, otherwise null
 */
function matchLayer(
  file: string,
  layers: TrussConfig["layers"],
): string | null {
  for (const [layerName, patterns] of Object.entries(layers)) {
    for (const pattern of patterns) {
      // Remove "**" at the end (very simple glob support).
      const normalized = pattern.replace(/\*\*$/, "");

      // If file path starts with the pattern → it belongs to this layer.
      if (file.startsWith(normalized)) return layerName;
    }
  }

  // No match → file is not in any layer.
  return null;
}

/**
 * evaluateRules()
 * Purpose: Check all dependency edges against config rules and collect violations.
 * Input:
 *  - opts.config: full Truss config (layers + rules + suppressions)
 *  - opts.edges: list of dependency edges between files
 * Output:
 *  - violations: all rule violations found
 *  - fileToLayer: cache map (file path -> layer name) for matched files
 */
export function evaluateRules(opts: {
  config: TrussConfig;
  edges: DependencyEdge[];
}): { violations: Violation[]; fileToLayer: Map<string, string> } {
  const { config, edges } = opts;
  // #region agent log
  fetch("http://127.0.0.1:7861/ingest/8b9c63fd-394c-4722-bece-a02463c6f64a", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "8d2d4f",
    },
    body: JSON.stringify({
      sessionId: "8d2d4f",
      runId: "pre-fix",
      hypothesisId: "H2",
      location: "src/core/validator.ts:evaluateRules:entry",
      message: "evaluateRules entry",
      data: {
        edgeCount: edges.length,
        ruleCount: config.rules.length,
        layerCount: Object.keys(config.layers ?? {}).length,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  // Cache: file path -> layer name (only for files that match).
  const fileToLayer = new Map<string, string>();
  const violations: Violation[] = [];
  const internalEdges = edges.filter(
    (edge): edge is Extract<DependencyEdge, { importKind: "internal" }> =>
      edge.importKind === "internal",
  );
  const outgoingByFile = new Map<string, typeof internalEdges>();
  let didLogMatchLayerProbe = false;

  for (const edge of internalEdges) {
    const bucket = outgoingByFile.get(edge.fromFile);
    if (bucket) {
      bucket.push(edge);
      continue;
    }
    outgoingByFile.set(edge.fromFile, [edge]);
  }

  for (const [fromFile, outgoing] of outgoingByFile.entries()) {
    outgoing.sort(
      (a, b) =>
        a.line - b.line ||
        a.toFile.localeCompare(b.toFile) ||
        a.importText.localeCompare(b.importText),
    );
    outgoingByFile.set(fromFile, outgoing);
  }

  const getLayer = (file: string): string | null => {
    // Caches resolved layers so repeated files do not need to scan the config again.
    const cached = fileToLayer.get(file);
    if (cached) return cached;

    if (!didLogMatchLayerProbe) {
      didLogMatchLayerProbe = true;
      // #region agent log
      fetch(
        "http://127.0.0.1:7861/ingest/8b9c63fd-394c-4722-bece-a02463c6f64a",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Debug-Session-Id": "8d2d4f",
          },
          body: JSON.stringify({
            sessionId: "8d2d4f",
            runId: "pre-fix",
            hypothesisId: "H1",
            location: "src/core/validator.ts:getLayer:beforeMatchLayer",
            message: "matchLayer probe before invocation",
            data: { probeFile: file, matchLayerType: typeof matchLayer },
            timestamp: Date.now(),
          }),
        },
      ).catch(() => {});
      // #endregion
    }

    if (!didLogMatchLayerProbe) {
      didLogMatchLayerProbe = true;
      // #region agent log
      fetch(
        "http://127.0.0.1:7861/ingest/8b9c63fd-394c-4722-bece-a02463c6f64a",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Debug-Session-Id": "8d2d4f",
          },
          body: JSON.stringify({
            sessionId: "8d2d4f",
            runId: "pre-fix",
            hypothesisId: "H1",
            location: "src/core/validator.ts:getLayer:beforeMatchLayer",
            message: "matchLayer probe before invocation",
            data: { probeFile: file, matchLayerType: typeof matchLayer },
            timestamp: Date.now(),
          }),
        },
      ).catch(() => {});
      // #endregion
    }

    const layer = matchLayer(file, config.layers);
    if (layer) fileToLayer.set(file, layer);

    return layer;
  };

  const emittedViolationKeys = new Set<string>();

  for (const edge of internalEdges) {
    const fromLayer = getLayer(edge.fromFile);
    if (!fromLayer) continue;

    const applicableRules = config.rules.filter((rule) => rule.from === fromLayer);
    if (applicableRules.length === 0) continue;

    // Walk outward from the first imported file to evaluate both direct and transitive targets.
    const queue: string[] = [edge.toFile];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentFile = queue.shift() as string;
      if (visited.has(currentFile)) continue;
      visited.add(currentFile);

      const currentLayer = getLayer(currentFile);
      if (currentLayer) {
        for (const rule of applicableRules) {
          if (!rule.disallow.includes(currentLayer)) continue;

          const key = [
            rule.name,
            edge.fromFile,
            currentFile,
            edge.line.toString(),
            edge.importText,
          ].join("|");
          if (emittedViolationKeys.has(key)) continue;
          emittedViolationKeys.add(key);

          violations.push({
            ruleName: rule.name,
            fromLayer,
            toLayer: currentLayer,
            edge: { ...edge, toFile: currentFile },
            reason:
              rule.message ??
              `${fromLayer} layer must not depend on ${currentLayer} layer.`,
          });
        }
      }

      const next = outgoingByFile.get(currentFile);
      if (!next) continue;
      for (const out of next) queue.push(out.toFile);
    }
  }

  return { violations, fileToLayer };
}

/**
 * applySuppressions()
 * Purpose: Split violations into two lists:
 *  - unsuppressed: real violations (should fail the check)
 *  - suppressed: violations that are allowed with a suppression reason
 * Input:
 *  - opts.config: Truss config (we use config.suppressions)
 *  - opts.violations: violations found by evaluateRules
 * Output:
 *  - unsuppressed + suppressed arrays
 */
export function applySuppressions(opts: {
  config: TrussConfig;
  violations: Violation[];
}): { unsuppressed: Violation[]; suppressed: SuppressedViolation[] } {
  const suppressions = opts.config.suppressions ?? [];

  const suppressed: SuppressedViolation[] = [];
  const unsuppressed: Violation[] = [];

  for (const v of opts.violations) {
    // Find suppression that matches "from file" + rule name.
    const s = suppressions.find(
      (x) => x.file === v.edge.fromFile && x.rule === v.ruleName,
    );

    if (s) suppressed.push({ ...v, suppressionReason: s.reason });
    else unsuppressed.push(v);
  }

  // Sort by file path, then by line number (stable output).
  const byLocation = (a: Violation, b: Violation) =>
    a.edge.fromFile.localeCompare(b.edge.fromFile) || a.edge.line - b.edge.line;

  suppressed.sort(byLocation);
  unsuppressed.sort(byLocation);

  return { unsuppressed, suppressed };
}
