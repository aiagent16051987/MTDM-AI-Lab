import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { evaluateEngineeringEvidence } from "../evolution-engine/engineering-evidence-gate.mjs";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "mtdm-evidence-"));
const write = (name, value) => {
  fs.writeFileSync(path.join(root, name), value);
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(root, name))).digest("hex");
};
const hashA = write("source-a.pdf", "Archived source artifact A for deterministic test fixture.");
const hashB = write("source-b.pdf", "Archived source artifact B for deterministic test fixture.");
const templateHash = write("model.template.md", "# Verified test model template\\nVout = Vin * 0.5\\n");
const candidate = {
  schemaVersion: 1, id: "validated-demo-model", enabled: true, intendedUse: "educational-only", hardwareControl: false,
  parameters: [{ name: "voltage", min: 0, max: 48, default: 12 }],
  outputs: [{ name: "output", unit: "V", expression: { op: "mul", args: [{ param: "voltage" }, 0.5] } }],
  parameterUnits: { voltage: "V" }, governingEquations: "Vout = Vin * 0.5",
  domainOfValidity: { description: "Ideal linear model", bounds: { voltage: [0, 48] } },
  uncertainty: { method: "bounded-input-analysis", description: "Input range is bounded; component uncertainty is not represented." },
  evidenceSources: [
    { id: "source-a", type: "official-documentation", artifactKind: "primary-document", title: "Primary reference A", publisher: "Publisher A", url: "https://a.example.org/reference", accessedAt: "2026-11-26", documentSha256: hashA, evidenceFile: "source-a.pdf" },
    { id: "source-b", type: "official-documentation", artifactKind: "official-reference", title: "Independent reference B", publisher: "Publisher B", url: "https://b.example.org/reference", accessedAt: "2026-11-26", documentSha256: hashB, evidenceFile: "source-b.pdf" }
  ],
  independentChecks: [
    { method: "independent-analytic-cross-check", result: "passed", evidenceSourceId: "source-a", tolerance: 1e-9 },
    { method: "reference-implementation", result: "passed", evidenceSourceId: "source-b", tolerance: 1e-9 }
  ],
  verification: [{ input: {}, expected: { output: 6 } }, { input: { voltage: 2 }, expected: { output: 1 } }],
  limitations: ["Ideal model only"], sourceTemplateFile: "model.template.md", sourceTemplateSha256: templateHash
};
try {
  const pass = evaluateEngineeringEvidence(candidate, { evidenceRoot: root });
  assert.equal(pass.releaseEligible, true);
  assert.equal(pass.replayedVectors, 2);
  assert.deepEqual(pass.blockers, []);
  const noSources = evaluateEngineeringEvidence({ ...candidate, evidenceSources: [] }, { evidenceRoot: root });
  assert.ok(noSources.blockers.includes("at-least-two-independent-authoritative-evidence-sources-required"));
  const summaryOnly = evaluateEngineeringEvidence({ ...candidate, evidenceSources: candidate.evidenceSources.map(source => ({ ...source, artifactKind: "source-summary" })) }, { evidenceRoot: root });
  assert.ok(summaryOnly.blockers.includes("non-authoritative-or-summary-artifact:source-a"));
  const samePublisher = evaluateEngineeringEvidence({ ...candidate, evidenceSources: candidate.evidenceSources.map(source => ({ ...source, publisher: "Same publisher" })) }, { evidenceRoot: root });
  assert.ok(samePublisher.blockers.includes("two-distinct-evidence-publishers-required"));
  const insecure = evaluateEngineeringEvidence({ ...candidate, evidenceSources: [{ ...candidate.evidenceSources[0], url: "http://a.example.org/reference" }, candidate.evidenceSources[1]] }, { evidenceRoot: root });
  assert.ok(insecure.blockers.includes("evidence-url-must-use-https:source-a"));
  const unreviewed = evaluateEngineeringEvidence({ ...candidate, enabled: false }, { evidenceRoot: root });
  assert.equal(unreviewed.releaseEligible, false);
  const noCheck = evaluateEngineeringEvidence({ ...candidate, independentChecks: [] }, { evidenceRoot: root });
  assert.ok(noCheck.blockers.includes("at-least-two-independent-validation-checks-required"));
  const sameCheck = evaluateEngineeringEvidence({ ...candidate, independentChecks: [candidate.independentChecks[0], { ...candidate.independentChecks[0], evidenceSourceId: "source-b" }] }, { evidenceRoot: root });
  assert.ok(sameCheck.blockers.includes("two-distinct-independent-validation-methods-required"));
  const falseClaim = evaluateEngineeringEvidence({ ...candidate, verification: [{ input: {}, expected: { output: 600 } }, candidate.verification[1]] }, { evidenceRoot: root });
  assert.ok(falseClaim.blockers.includes("numerical-replay-mismatch:0:output"));
  const badDate = evaluateEngineeringEvidence({ ...candidate, evidenceSources: [{ ...candidate.evidenceSources[0], accessedAt: "2026-02-31" }, candidate.evidenceSources[1]] }, { evidenceRoot: root });
  assert.ok(badDate.blockers.includes("invalid-evidence-access-date:source-a"));
  fs.writeFileSync(path.join(root, "source-a.pdf"), "tampered content");
  const badHash = evaluateEngineeringEvidence(candidate, { evidenceRoot: root });
  assert.ok(badHash.blockers.includes("evidence-document-hash-mismatch:source-a"));
  const traversal = evaluateEngineeringEvidence({ ...candidate, evidenceSources: [{ ...candidate.evidenceSources[0], evidenceFile: "../escape.txt" }, candidate.evidenceSources[1]] }, { evidenceRoot: root });
  assert.ok(traversal.blockers.includes("evidence-document-path-escapes-root:source-a"));
  const badTemplateHash = evaluateEngineeringEvidence({ ...candidate, sourceTemplateSha256: "a".repeat(64) }, { evidenceRoot: root });
  assert.ok(badTemplateHash.blockers.includes("source-template-hash-mismatch"));
  const missingTemplate = evaluateEngineeringEvidence({ ...candidate, sourceTemplateFile: "../outside.template.md" }, { evidenceRoot: root });
  assert.ok(missingTemplate.blockers.includes("source-template-path-escapes-root"));
  console.log("PASS evidence gate: two independent sources, artifact class, publisher diversity, source/template hashes, path containment, independent checks and numerical AST replay");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
