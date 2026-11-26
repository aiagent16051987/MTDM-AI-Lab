import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { auditCapabilities, buildImprovementQueue } from "../evolution-engine/audit.mjs";
import { applyRemediationRecipes } from "../evolution-engine/remediation-engine.mjs";

const root = process.cwd();
const outputDir = path.join(root, "artifacts", "autonomous-maintenance");
fs.mkdirSync(outputDir, { recursive: true });
const reportPath = path.join(outputDir, "report.json");
const audit = auditCapabilities({ root });
const queue = buildImprovementQueue(audit);
const catalog = JSON.parse(fs.readFileSync(path.join(root, "evolution-engine", "remediation-catalog.json"), "utf8"));
const report = {
  schemaVersion: 1,
  runId: process.env.GITHUB_RUN_ID || null,
  commit: process.env.GITHUB_SHA || null,
  generatedAt: new Date().toISOString(),
  audit: { status: audit.status, summary: audit.summary },
  queuedFindings: queue.length,
  remediation: { applied: [], changedFiles: [], status: "no-applicable-recipe" },
  validation: { tests: "not-run", build: "not-run" },
  safety: { allowlistedExactPatchesOnly: true, maxFilesPerRun: 3, workflowChanges: false,
    dependencyChanges: false, engineeringSafetyRuleChanges: false, automaticMerge: false,
    productionDeployment: false }
};

let transaction;
try {
  transaction = applyRemediationRecipes({ root, findings: audit.findings, catalog });
  report.remediation.applied = transaction.applied;
  report.remediation.changedFiles = transaction.changedFiles;
  if (transaction.applied.length) {
    report.remediation.status = "patched-pending-validation";
    for (const [label, args] of [["tests", ["test"]], ["build", ["run", "build"]]]) {
      const result = spawnSync("npm", args, { cwd: root, encoding: "utf8", maxBuffer: 12 * 1024 * 1024 });
      report.validation[label] = result.status === 0 ? "passed" : "failed";
      if (result.status !== 0) {
        transaction.rollback();
        report.remediation.status = "rolled-back-validation-failed";
        throw new Error(label + " failed; all automated edits were rolled back.\n" + (result.stdout || "") + "\n" + (result.stderr || ""));
      }
    }
    report.remediation.status = "validated";
  }
  if (audit.status === "blocked") throw new Error("Baseline capability audit is blocked; no remediation is eligible for PR creation.");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.error = error.message;
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
  console.error(error.message);
  process.exitCode = 1;
}
