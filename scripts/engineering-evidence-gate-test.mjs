import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { evaluateEngineeringEvidence } from "../evolution-engine/engineering-evidence-gate.mjs";

const evidenceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mtdm-evidence-"));
const evidenceFile = "manufacturer-reference.txt";
fs.writeFileSync(path.join(evidenceRoot, evidenceFile), "Archived source excerpt for test fixture; not a real engineering reference.");
const documentSha256 = crypto.createHash("sha256").update(fs.readFileSync(path.join(evidenceRoot, evidenceFile))).digest("hex");
const candidate = {
  schemaVersion: 1, id: "validated-demo-model", enabled: true, intendedUse: "educational-only", hardwareControl: false,
  parameters: [{ name: "voltage", min: 0, max: 48, default: 12 }],
  outputs: [{ name: "output", unit: "V", expression: { op: "mul", args: [{ param: "voltage" }, 0.5] } }],
  parameterUnits: { voltage: "V" }, governingEquations: "Vout = Vin * 0.5",
  domainOfValidity: { description: "Ideal linear model", bounds: { voltage: [0, 48] } },
  uncertainty: { method: "bounded-input-analysis", description: "Input range is explicitly bounded; component uncertainty not represented." },
  evidenceSources: [{ id: "datasheet-a", type: "datasheet", title: "Manufacturer reference document", publisher: "Example Components", url: "https://example.com/datasheet", accessedAt: "2026-11-26", documentSha256, evidenceFile }],
  independentChecks: [{ method: "independent-analytic-cross-check", result: "passed", evidenceSourceId: "datasheet-a", tolerance: 1e-9 }],
  verification: [{ input: {}, expected: { output: 6 } }, { input: { voltage: 2 }, expected: { output: 1 } }],
  limitations: ["Ideal model only"], sourceTemplateSha256: "a".repeat(64)
};
try {
  const pass = evaluateEngineeringEvidence(candidate, { evidenceRoot });
  assert.equal(pass.releaseEligible, true);
  assert.equal(pass.replayedVectors, 2);
  assert.deepEqual(pass.blockers, []);

  const noSources = evaluateEngineeringEvidence({ ...candidate, evidenceSources: [] }, { evidenceRoot });
  assert.ok(noSources.blockers.includes("missing-primary-or-authoritative-evidence-sources"));
  const insecure = evaluateEngineeringEvidence({ ...candidate, evidenceSources: [{ ...candidate.evidenceSources[0], url: "http://example.com" }] }, { evidenceRoot });
  assert.ok(insecure.blockers.includes("evidence-url-must-use-https:datasheet-a"));
  const unreviewed = evaluateEngineeringEvidence({ ...candidate, enabled: false }, { evidenceRoot });
  assert.equal(unreviewed.releaseEligible, false);
  const noCheck = evaluateEngineeringEvidence({ ...candidate, independentChecks: [] }, { evidenceRoot });
  assert.ok(noCheck.blockers.includes("missing-independent-validation"));
  const falseClaim = evaluateEngineeringEvidence({ ...candidate, verification: [{ input: {}, expected: { output: 600 } }, candidate.verification[1]] }, { evidenceRoot });
  assert.ok(falseClaim.blockers.includes("numerical-replay-mismatch:0:output"));
  const badDate = evaluateEngineeringEvidence({ ...candidate, evidenceSources: [{ ...candidate.evidenceSources[0], accessedAt: "2026-02-31" }] }, { evidenceRoot });
  assert.ok(badDate.blockers.includes("invalid-evidence-access-date:datasheet-a"));
  const tampered = path.join(evidenceRoot, evidenceFile);
  fs.writeFileSync(tampered, "tampered content");
  const badHash = evaluateEngineeringEvidence(candidate, { evidenceRoot });
  assert.ok(badHash.blockers.includes("evidence-document-hash-mismatch:datasheet-a"));
  const traversal = evaluateEngineeringEvidence({ ...candidate, evidenceSources: [{ ...candidate.evidenceSources[0], evidenceFile: "../escape.txt" }] }, { evidenceRoot });
  assert.ok(traversal.blockers.includes("evidence-document-path-escapes-root:datasheet-a"));
  console.log("PASS evidence gate: archived document hash verification, path containment, AST replay and fail-closed checks");
} finally {
  fs.rmSync(evidenceRoot, { recursive: true, force: true });
}
