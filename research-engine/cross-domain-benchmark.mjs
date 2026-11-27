import { runVoltageDividerValidation } from "./spice-experiment-runner.mjs";
import { runTelemetrySchemaValidation } from "./iot-experiment-runner.mjs";
import { runClassificationMetricsValidation } from "./ai-experiment-runner.mjs";
import { runStraightDriveValidation } from "./experiment-runner.mjs";
import { runQuantumUnitaryValidation } from "./quantum-experiment-runner.mjs";
import { runNanoInvariantValidation } from "./nano-experiment-runner.mjs";
import { runPrintingEstimateValidation } from "./printing-experiment-runner.mjs";
import { assertResearchReferences } from "./records.mjs";

const FIXED_TIME = "2026-11-27T00:00:00Z";
const CASES = [
  { domain: "electronics", run: () => runVoltageDividerValidation({ createdAt: FIXED_TIME }) },
  { domain: "iot", run: () => runTelemetrySchemaValidation({ createdAt: FIXED_TIME }) },
  { domain: "ai", run: () => runClassificationMetricsValidation({ createdAt: FIXED_TIME }) },
  { domain: "robotics", run: () => runStraightDriveValidation({ createdAt: FIXED_TIME }) },
  { domain: "quantum", run: () => runQuantumUnitaryValidation({ createdAt: FIXED_TIME }) },
  { domain: "nano", run: () => runNanoInvariantValidation({ createdAt: FIXED_TIME }) },
  { domain: "manufacturing", run: () => runPrintingEstimateValidation({ createdAt: FIXED_TIME }) }
];

export async function runCrossDomainBenchmarkSuite() {
  const results = [];
  const allRecords = [];
  for (const item of CASES) {
    const first = await item.run();
    const replay = await item.run();
    if (!first?.result || first.result.status !== "pass") {
      throw new Error(item.domain + " benchmark did not pass its domain runner");
    }
    if (first.result.inputHash !== replay.result.inputHash ||
        JSON.stringify(first.result.outputs) !== JSON.stringify(replay.result.outputs)) {
      throw new Error(item.domain + " benchmark is not reproducible for fixed inputs");
    }
    if (!Array.isArray(first.records) || !first.records.some(record => record.id === first.result.experimentId)) {
      throw new Error(item.domain + " benchmark omitted experiment provenance");
    }
    results.push({
      domain: item.domain,
      status: first.result.status,
      moduleId: first.records.find(record => record.recordType === "experiment")?.moduleId,
      inputHash: first.result.inputHash,
      outputKeys: Object.keys(first.result.outputs || {}).sort()
    });
    allRecords.push(...first.records);
  }
  assertResearchReferences(allRecords);
  const uniqueDomains = new Set(results.map(item => item.domain));
  if (uniqueDomains.size !== CASES.length) throw new Error("Benchmark suite contains duplicate or missing domains");
  return {
    schemaVersion: 1,
    suite: "mtdm-cross-domain-regression",
    status: "pass",
    reproducible: true,
    domainCount: results.length,
    recordCount: allRecords.length,
    results
  };
}
