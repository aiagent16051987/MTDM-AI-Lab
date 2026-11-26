import assert from "node:assert/strict";
import { evaluateEngineeringEvidence } from "../evolution-engine/engineering-evidence-gate.mjs";

const candidate = {
  schemaVersion: 1, id: "validated-demo-model", enabled: true, intendedUse: "educational-only", hardwareControl: false,
  parameters: [{ name: "voltage", min: 0, max: 48, default: 12 }],
  outputs: [{ name: "output", unit: "V", expression: { op: "mul", args: [{ param: "voltage" }, 0.5] } }],
  parameterUnits: { voltage: "V" },
  governingEquations: "Vout = Vin * 0.5",
  domainOfValidity: { description: "Ideal linear model", bounds: { voltage: [0, 48] } },
  uncertainty: { method: "bounded-input-analysis", description: "Input range is explicitly bounded; component uncertainty not represented." },
  evidenceSources: [{ id: "datasheet-a", type: "datasheet", title: "Manufacturer reference document", publisher: "Example Components", url: "https://example.com/datasheet", accessedAt: "2026-11-26", documentSha256: "b".repeat(64) }],
  independentChecks: [{ method: "independent-analytic-cross-check", result: "passed", evidenceSourceId: "datasheet-a", tolerance: 1e-9 }],
  verification: [{ input: {}, expected: { output: 6 } }, { input: { voltage: 2 }, expected: { output: 1 } }],
  limitations: ["Ideal model only"],
  sourceTemplateSha256: "a".repeat(64)
};
const pass = evaluateEngineeringEvidence(candidate);
assert.equal(pass.status, "evidence-complete-pending-human-approval");
assert.equal(pass.releaseEligible, true);
assert.equal(pass.replayedVectors, 2);
assert.deepEqual(pass.blockers, []);

const missingSources = evaluateEngineeringEvidence({ ...candidate, evidenceSources: [] });
assert.ok(missingSources.blockers.includes("missing-primary-or-authoritative-evidence-sources"));

const insecure = evaluateEngineeringEvidence({ ...candidate, evidenceSources: [{ ...candidate.evidenceSources[0], url: "http://example.com" }] });
assert.ok(insecure.blockers.includes("evidence-url-must-use-https:datasheet-a"));

const unreviewed = evaluateEngineeringEvidence({ ...candidate, enabled: false });
assert.equal(unreviewed.releaseEligible, false);

const noIndependentCheck = evaluateEngineeringEvidence({ ...candidate, independentChecks: [] });
assert.ok(noIndependentCheck.blockers.includes("missing-independent-validation"));

const falseClaimedPass = evaluateEngineeringEvidence({ ...candidate, verification: [{ input: {}, expected: { output: 600 } }, candidate.verification[1]] });
assert.ok(falseClaimedPass.blockers.includes("numerical-replay-mismatch:0:output"));
assert.equal(falseClaimedPass.releaseEligible, false);

const missingUnits = evaluateEngineeringEvidence({ ...candidate, parameterUnits: {} });
assert.ok(missingUnits.blockers.includes("missing-unit:voltage"));

const invalidDate = evaluateEngineeringEvidence({ ...candidate, evidenceSources: [{ ...candidate.evidenceSources[0], accessedAt: "2026-02-31" }] });
assert.ok(invalidDate.blockers.includes("invalid-evidence-access-date:datasheet-a"));

const missingHash = evaluateEngineeringEvidence({ ...candidate, evidenceSources: [{ ...candidate.evidenceSources[0], documentSha256: "" }] });
assert.ok(missingHash.blockers.includes("missing-evidence-document-hash:datasheet-a"));

console.log("PASS engineering evidence gate: independent AST replay, source metadata, bounds, units, uncertainty and fail-closed release decision");
