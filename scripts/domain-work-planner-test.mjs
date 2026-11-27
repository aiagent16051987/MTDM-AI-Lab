import assert from "node:assert/strict";
import { buildDomainWorkPlan } from "../evolution-engine/domain-work-planner.mjs";
const plan = buildDomainWorkPlan({
  domains: ["electronics", "robotics", "quantum", "manufacturing"],
  capabilities: [
    { id: "electronics", status: "experimental", implementation: ["app.js"], evidence: ["scripts/electronics.test.mjs"] },
    { id: "robotics", status: "experimental", implementation: ["robotics-core.js"], evidence: ["scripts/robotics.test.mjs"] },
    { id: "quantum", status: "experimental", implementation: ["advanced-labs.js"], evidence: ["scripts/quantum.test.mjs"] },
    { id: "printing", status: "experimental", implementation: ["printing-core.mjs"], evidence: ["scripts/printing.test.mjs"] }
  ],
  discovery: { proposals: [{ domain: "electronics" }] }, audit: { findings: [] }
});
assert.equal(plan.domainCount, 4);
assert.equal(plan.domainsWithCapability, 4);
assert.equal(plan.domainsWithExecutableEvidence, 4);
assert.equal(plan.domainsWithDiscoveryTemplates, 1);
assert.deepEqual(plan.untemplatedDomains, ["manufacturing", "quantum", "robotics"]);
assert.equal(plan.workItems[0].domain, "manufacturing");
assert.equal(plan.workItems[0].capabilityId, "printing");
assert.ok(plan.workItems.every(item => item.approvalRequired && item.automaticExecution === "proposal-only"));
assert.throws(() => buildDomainWorkPlan({ domains: ["bad/slug"], capabilities: [], discovery: { proposals: [] }, audit: { findings: [] } }), /Invalid domain work-plan inputs/);
console.log("PASS — domain coverage, alias mapping, deterministic prioritization and review-only work planning.");
