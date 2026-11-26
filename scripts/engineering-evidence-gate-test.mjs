import assert from "node:assert/strict";
import { evaluateEngineeringEvidence } from "../evolution-engine/engineering-evidence-gate.mjs";

const candidate = {
  id: "validated-demo-model", enabled: true, intendedUse: "educational-only", hardwareControl: false,
  parameters: [{ name: "voltage" }], parameterUnits: { voltage: "V" },
  governingEquations: "Vout = Vin * R2 / (R1 + R2)",
  domainOfValidity: { description: "Ideal unloaded DC divider", bounds: { voltage: [0, 48] } },
  uncertainty: { method: "worst-case tolerance propagation", description: "Component tolerances bounded by datasheet limits" },
  evidenceSources: [{ id: "datasheet-a", type: "datasheet", title: "Manufacturer resistor datasheet", publisher: "Example Components", url: "https://example.com/datasheet", accessedAt: "2026-11-26" }],
  independentChecks: [{ method: "independent-analytic-cross-check", result: "passed", evidenceSourceId: "datasheet-a", tolerance: 1e-9 }],
  verification: [{ input: {}, expected: { output: 1 } }, { input: { voltage: 2 }, expected: { output: 2 } }],
  limitations: ["Ideal model only"],
  sourceTemplateSha256: "a".repeat(64)
};
const pass = evaluateEngineeringEvidence(candidate);
assert.equal(pass.status, "evidence-complete-pending-human-approval");
assert.equal(pass.releaseEligible, true);
assert.deepEqual(pass.blockers, []);

const missingSources = evaluateEngineeringEvidence({ ...candidate, evidenceSources: [] });
assert.equal(missingSources.releaseEligible, false);
assert.ok(missingSources.blockers.includes("missing-primary-or-authoritative-evidence-sources"));

const insecure = evaluateEngineeringEvidence({ ...candidate, evidenceSources: [{ ...candidate.evidenceSources[0], url: "http://example.com" }] });
assert.equal(insecure.releaseEligible, false);
assert.ok(insecure.blockers.includes("evidence-url-must-use-https:datasheet-a"));

const unreviewed = evaluateEngineeringEvidence({ ...candidate, enabled: false });
assert.equal(unreviewed.status, "evidence-complete-pending-human-approval");
assert.equal(unreviewed.releaseEligible, false);

const noIndependentCheck = evaluateEngineeringEvidence({ ...candidate, independentChecks: [] });
assert.ok(noIndependentCheck.blockers.includes("missing-independent-validation"));

console.log("PASS engineering evidence gate: provenance, references, units, validity, uncertainty and independent verification");
