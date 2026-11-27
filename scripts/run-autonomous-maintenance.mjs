import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { auditCapabilities, buildImprovementQueue } from "../evolution-engine/audit.mjs";
import { applyRemediationRecipes } from "../evolution-engine/remediation-engine.mjs";
import { compileEnabledSpecs } from "../evolution-engine/model-codegen.mjs";
import { discoverEngineeringFeatures } from "../evolution-engine/engineering-discovery.mjs";
import { evaluateEngineeringEvidence } from "../evolution-engine/engineering-evidence-gate.mjs";
import { buildDomainWorkPlan } from "../evolution-engine/domain-work-planner.mjs";

const root = process.cwd();
const outputDir = path.join(root, "artifacts", "autonomous-maintenance");
const generatedDir = path.join(root, "generated-simulations");
const proposalsDir = path.join(root, "evolution-engine", "proposals");
fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(proposalsDir, { recursive: true });
const reportPath = path.join(outputDir, "report.json");
const audit = auditCapabilities({ root });
const queue = buildImprovementQueue(audit);
const catalog = JSON.parse(fs.readFileSync(path.join(root, "evolution-engine", "remediation-catalog.json"), "utf8"));
const inventionRegistry = JSON.parse(fs.readFileSync(path.join(root, "research-engine", "registry.json"), "utf8"));
const capabilityRegistry = JSON.parse(fs.readFileSync(path.join(root, "capabilities.json"), "utf8"));
const domains = inventionRegistry.inventionDomains;
if (!Array.isArray(domains) || !domains.length || domains.some(domain => typeof domain !== "string") ||
    new Set(domains).size !== domains.length || !Array.isArray(capabilityRegistry.capabilities)) {
  throw new Error("Domain or capability registry is invalid; maintenance must fail closed.");
}
const report = {
  schemaVersion: 1,
  runId: process.env.GITHUB_RUN_ID || null,
  commit: process.env.GITHUB_SHA || null,
  generatedAt: new Date().toISOString(),
  audit: { status: audit.status, summary: audit.summary },
  queuedFindings: queue.length,
  engineeringDiscovery: { status: "not-run", proposed: [], autoEnabled: 0, domainCoverage: [] },
  domainWorkPlan: { status: "not-run", workItems: [] },
  evidenceGate: { status: "not-run", evaluated: 0, blocked: 0, eligible: 0, results: [] },
  codeGeneration: { compiled: [], status: "no-approved-specifications" },
  remediation: { applied: [], changedFiles: [], status: "no-applicable-recipe" },
  validation: { tests: "not-run", build: "not-run" },
  safety: { allowlistedRecipePatchesOnly: true, declarativeCodeGenerationOnly: true,
    proposedFeaturesRemainDisabled: true, evidenceGateRequiredForRelease: true, noEvidenceNoRelease: true, maxFilesPerRun: 1, workflowChanges: false,
    dependencyChanges: false, engineeringSafetyRuleChanges: false, automaticMerge: false,
    productionDeployment: false }
};

let transaction;
let compiled = [];
const createdProposals = [];
function rollbackAll() {
  if (transaction?.applied.length) transaction.rollback();
  for (const item of compiled) {
    fs.rmSync(item.modelPath, { force: true });
    fs.rmSync(item.testPath, { force: true });
  }
  for (const file of createdProposals) fs.rmSync(file, { force: true });
}
function runNpm(label, args) {
  const result = spawnSync("npm", args, { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  report.validation[label] = result.status === 0 ? "passed" : "failed";
  if (result.status !== 0) {
    rollbackAll();
    throw new Error(label + " failed; generated files, proposals and automated source edits were rolled back.\n" +
      (result.stdout || "") + "\n" + (result.stderr || ""));
  }
}

try {
  const knownIds = new Set();
  for (const directory of [path.join(root, "evolution-engine", "generation-specs"), proposalsDir]) {
    if (!fs.existsSync(directory)) continue;
    for (const file of fs.readdirSync(directory).filter(name => name.endsWith(".json"))) {
      const item = JSON.parse(fs.readFileSync(path.join(directory, file), "utf8"));
      if (typeof item.id === "string") knownIds.add(item.id);
    }
  }
  const discovery = discoverEngineeringFeatures({
    existingIds: [...knownIds],
    domains,
    maxCandidates: 10
  });
  report.engineeringDiscovery.status = discovery.status;
  const domainWorkPlan = buildDomainWorkPlan({ domains, capabilities: capabilityRegistry.capabilities, discovery, audit });
  report.engineeringDiscovery.domainCoverage = domainWorkPlan.workItems.map(item => ({
    domain: item.domain, capabilityStatus: item.capabilityStatus,
    deterministicCandidates: item.deterministicCandidates,
    executableTestReferences: item.executableTestReferences
  }));
  report.domainWorkPlan = domainWorkPlan;
  report.evidenceGate.status = "evaluated";
  for (const proposal of discovery.proposals) {
    const evidence = evaluateEngineeringEvidence(proposal, { evidenceRoot: root });
    report.evidenceGate.evaluated += 1;
    if (evidence.blockers.length) report.evidenceGate.blocked += 1;
    if (evidence.releaseEligible) report.evidenceGate.eligible += 1;
    report.evidenceGate.results.push({
      id: proposal.id,
      status: evidence.status,
      releaseEligible: evidence.releaseEligible,
      blockers: evidence.blockers
    });
    const destination = path.join(proposalsDir, proposal.id + ".json");
    if (fs.existsSync(destination)) continue;
    fs.writeFileSync(destination, JSON.stringify(proposal, null, 2) + "\n", { flag: "wx" });
    createdProposals.push(destination);
    report.engineeringDiscovery.proposed.push({ id: proposal.id, file: path.relative(root, destination), verificationVectors: proposal.verification.length });
  }

  const specsDirectory = path.join(root, "evolution-engine", "generation-specs");
  const allSpecs = fs.readdirSync(specsDirectory).filter(name => name.endsWith(".json")).map(name => ({
    file: name,
    spec: JSON.parse(fs.readFileSync(path.join(specsDirectory, name), "utf8"))
  }));
  const enabledSpecs = allSpecs.filter(item => item.spec.enabled === true);
  const existingEvidence = allSpecs.map(item => ({
    id: item.spec.id,
    file: item.file,
    enabled: item.spec.enabled === true,
    result: evaluateEngineeringEvidence(item.spec, { evidenceRoot: root })
  }));
  report.evidenceGate.existingSpecifications = existingEvidence.map(item => ({
    id: item.id,
    file: item.file,
    enabled: item.enabled,
    status: item.result.status,
    releaseEligible: item.result.releaseEligible,
    blockers: item.result.blockers
  }));
  const blockedEnabledSpecs = existingEvidence.filter(item => item.enabled && !item.result.releaseEligible);
  const blockedCandidates = existingEvidence.filter(item => item.result.blockers.length > 0);
  if (blockedEnabledSpecs.length) {
    report.evidenceGate.status = "blocked-existing-enabled-specifications";
    report.evidenceGate.blocked += blockedEnabledSpecs.length;
    report.codeGeneration.status = "withheld-evidence-incomplete";
    compiled = [];
  } else if (blockedCandidates.length) {
    report.evidenceGate.status = "blocked-candidates-withheld";
    report.codeGeneration.status = "no-model-compiled-evidence-incomplete";
    compiled = [];
  } else {
    report.evidenceGate.status = "evidence-complete-pending-human-approval";
    compiled = compileEnabledSpecs({
      specsDirectory,
      outputDirectory: generatedDir
    });
  }
  report.codeGeneration.compiled = compiled.map(item => ({ id: item.id, model: path.relative(root, item.modelPath), test: path.relative(root, item.testPath) }));
  if (compiled.length) {
    report.codeGeneration.status = "compiled-pending-validation";
    for (const item of compiled) {
      const result = spawnSync(process.execPath, [item.testPath], { cwd: root, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
      if (result.status !== 0) {
        rollbackAll();
        report.codeGeneration.status = "rolled-back-generated-test-failed";
        throw new Error("Generated model verification failed: " + item.id + "\n" + (result.stdout || "") + "\n" + (result.stderr || ""));
      }
    }
    report.codeGeneration.status = "generated-tests-passed";
  }

  transaction = applyRemediationRecipes({ root, findings: audit.findings, catalog });
  report.remediation.applied = transaction.applied;
  report.remediation.changedFiles = transaction.changedFiles;
  if (transaction.applied.length) report.remediation.status = "patched-pending-validation";

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
