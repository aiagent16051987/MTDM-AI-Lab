import assert from "node:assert/strict";
import { discoverEngineeringFeatures, validateEngineeringProposal } from "../evolution-engine/engineering-discovery.mjs";

const result = discoverEngineeringFeatures({
  existingIds: ["battery-runtime-estimator"],
  domains: ["electronics"],
  maxCandidates: 10
});
assert.equal(result.status, "proposals-ready-for-review");
assert.equal(result.summary.proposals, 2);
assert.equal(result.summary.autoEnabled, 0);
assert.deepEqual(result.proposals.map(item => item.id), [
  "led-series-resistor-design",
  "series-parallel-resistor-network"
]);
for (const proposal of result.proposals) {
  assert.equal(validateEngineeringProposal(proposal), true);
  assert.equal(proposal.enabled, false);
  assert.equal(proposal.hardwareControl, false);
  assert.equal(proposal.intendedUse, "educational-only");
  assert.ok(proposal.limitations.length > 0);
}
const none = discoverEngineeringFeatures({
  existingIds: ["led-series-resistor-design", "battery-runtime-estimator", "series-parallel-resistor-network"],
  domains: ["electronics"]
});
assert.equal(none.status, "no-new-candidates");
assert.equal(none.proposals.length, 0);
assert.throws(() => discoverEngineeringFeatures({ domains: ["electronics"], maxCandidates: 26 }), /Invalid discovery request/);
const tampered = structuredClone(result.proposals[0]);
tampered.outputs[0].expression = { op: "raw", args: ["process.exit(1)"] };
assert.throws(() => validateEngineeringProposal(tampered), /Unsupported AST operation/);
const outOfBounds = structuredClone(result.proposals[0]);
outOfBounds.verification[0].input = { supplyVoltage: 1000 };
assert.throws(() => validateEngineeringProposal(outOfBounds), /out of bounds/);

const allDomains = discoverEngineeringFeatures({
  existingIds: [],
  domains: ["electronics", "iot", "ai", "robotics", "quantum", "nano", "manufacturing"],
  maxCandidates: 25
});
assert.deepEqual(
  [...new Set(allDomains.proposals.map(item => item.domain))].sort(),
  ["ai", "electronics", "iot", "manufacturing", "nano", "quantum", "robotics"]
);
assert.equal(allDomains.summary.autoEnabled, 0);
assert.ok(allDomains.proposals.every(item => item.enabled === false && item.hardwareControl === false));
for (const proposal of allDomains.proposals) assert.equal(validateEngineeringProposal(proposal), true);
assert.ok(allDomains.proposals.length >= 8);
const balanced = discoverEngineeringFeatures({
  existingIds: [],
  domains: ["electronics", "iot", "ai", "robotics", "quantum", "nano", "manufacturing"],
  maxCandidates: 7
});
assert.equal(balanced.proposals.length, 7);
assert.deepEqual(
  balanced.proposals.map(item => item.domain),
  ["electronics", "iot", "ai", "robotics", "quantum", "nano", "manufacturing"]
);
const expandedBudget = discoverEngineeringFeatures({
  existingIds: [],
  domains: ["electronics", "iot", "ai", "robotics", "quantum", "nano", "manufacturing"],
  maxCandidates: 9
});
assert.equal(expandedBudget.proposals.length, 9);
assert.equal(expandedBudget.proposals.filter(item => item.domain === "electronics").length, 3);

const unknownInput = structuredClone(result.proposals[0]);
unknownInput.verification[0].input = { supplyVoltage: 12, ghostParameter: 1 };
assert.throws(() => validateEngineeringProposal(unknownInput), /Unknown verification input/);
const missingOutput = structuredClone(result.proposals[0]);
delete missingOutput.verification[0].expected.resistorPower;
assert.throws(() => validateEngineeringProposal(missingOutput), /output set must exactly match/);
const extraOutput = structuredClone(result.proposals[0]);
extraOutput.verification[0].expected.unmodelledOutput = 42;
assert.throws(() => validateEngineeringProposal(extraOutput), /output set must exactly match/);
const badTolerance = structuredClone(result.proposals[0]);
badTolerance.verification[0].tolerance = 0.1;
assert.throws(() => validateEngineeringProposal(badTolerance), /Invalid verification tolerance/);
const nanExpected = structuredClone(result.proposals[0]);
nanExpected.verification[0].expected.resistance = Number.NaN;
assert.throws(() => validateEngineeringProposal(nanExpected), /Numerical verification failed/);
const malformedParameter = structuredClone(result.proposals[0]);
malformedParameter.parameters[0] = null;
assert.throws(() => validateEngineeringProposal(malformedParameter), /Invalid or duplicate parameter/);
const extraAstProperty = structuredClone(result.proposals[0]);
extraAstProperty.outputs[0].expression.unreviewed = "ignored";
assert.throws(() => validateEngineeringProposal(extraAstProperty), /Unexpected expression property/);
const malformedAstReference = structuredClone(result.proposals[0]);
malformedAstReference.outputs[0].expression = { param: "supplyVoltage", ignored: true };
assert.throws(() => validateEngineeringProposal(malformedAstReference), /malformed parameter reference/);
const emptyVectors = structuredClone(result.proposals[0]);
emptyVectors.verification = [];
assert.throws(() => validateEngineeringProposal(emptyVectors), /Numerical verification vectors are required/);
const negativeTolerance = structuredClone(result.proposals[0]);
negativeTolerance.verification[0].tolerance = -1;
assert.throws(() => validateEngineeringProposal(negativeTolerance), /Invalid verification tolerance/);

console.log("PASS — deterministic discovery, strict model contracts, malformed AST rejection, complete vector validation and safety controls.");
