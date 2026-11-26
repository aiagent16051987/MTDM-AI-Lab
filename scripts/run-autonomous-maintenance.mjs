import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { auditCapabilities, buildImprovementQueue } from "../evolution-engine/audit.mjs";
import { applyRemediationRecipes } from "../evolution-engine/remediation-engine.mjs";
import { compileEnabledSpecs } from "../evolution-engine/model-codegen.mjs";

const root = process.cwd();
const outputDir = path.join(root, "artifacts", "autonomous-maintenance");
const generatedDir = path.join(root, "generated-simulations");
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
  codeGeneration: { compiled: [], status: "no-approved-specifications" },
  remediation: { applied: [], changedFiles: [], status: "no-applicable-recipe" },
  validation: { tests: "not-run", build: "not-run" },
  safety: { allowlistedExactPatchesOnly: true, maxFilesPerRun: 1, workflowChanges: false,
    dependencyChanges: false, engineeringSafetyRuleChanges: false, automaticMerge: false,
    productionDeployment: false }
};

let transaction;
let compiled = [];
function rollbackAll() {
  if (transaction?.applied.length) transaction.rollback();
  for (const item of compiled) {
    fs.rmSync(item.modelPath, { force: true });
    fs.rmSync(item.testPath, { force: true });
  }
}
function runNpm(label, args) {
  const result = spawnSync("npm", args, { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  report.validation[label] = result.status === 0 ? "passed" : "failed";
  if (result.status !== 0) {
    rollbackAll();
    throw new Error(label + " failed; generated files and automated source edits were rolled back.\n" +
      (result.stdout || "") + "\n" + (result.stderr || ""));
  }
}

try {
  compiled = compileEnabledSpecs({
    specsDirectory: path.join(root, "evolution-engine", "generation-specs"),
    outputDirectory: generatedDir
  });
  report.codeGeneration.compiled = compiled.map(item => ({ id: item.id, model: path.relative(root, item.modelPath), test: path.relative(root, item.testPath) }));
  if (compiled.length) {
    report.codeGeneration.status = "compiled-pending-validation";
    for (const item of compiled) {
      const result = spawnSync(process.execPath, [item.testPath], { cwd: root, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
      if (result.status !== 0) {
        rollbackAll();
        report.codeGeneration.status = "rolled-back-generated-test-failed";
        throw new Error("Generated model verification failed: " + item.id + "\\n" + (result.stdout || "") + "\\n" + (result.stderr || ""));
      }
    }
    report.codeGeneration.status = "generated-tests-passed";
  }

  transaction = applyRemediationRecipes({ root, findings: audit.findings, catalog });
  report.remediation.applied = transaction.applied;
  report.remediation.changedFiles = transaction.changedFiles;
  if (transaction.applied.length) report.remediation.status = "patched-pending-validation";

  // Every scheduled/manual run validates the generator, project and production bundle,
  // even when no remediation recipe or enabled model spec currently exists.
  runNpm("tests", ["test"]);
  runNpm("build", ["run", "build"]);

  const postRepairAudit = auditCapabilities({ root });
  report.postRepairAudit = { status: postRepairAudit.status, summary: postRepairAudit.summary };
  if (postRepairAudit.status === "blocked") {
    rollbackAll();
    report.remediation.status = "rolled-back-post-audit-failed";
    throw new Error("Post-maintenance capability audit is blocked; automated edits were rolled back.");
  }

  if (compiled.length) report.codeGeneration.status = "generated-and-validated";
  if (transaction.applied.length) report.remediation.status = "validated";
  if (audit.status === "blocked") throw new Error("Baseline capability audit is blocked; no remediation is eligible for PR creation.");

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.error = error.message;
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
  console.error(error.message);
  process.exitCode = 1;
}
