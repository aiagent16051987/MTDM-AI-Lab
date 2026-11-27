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

console.log("PASS — deterministic engineering feature discovery, numerical verification, deduplication and safety rejection.");
