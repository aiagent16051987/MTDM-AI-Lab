import assert from "node:assert/strict";
import fs from "node:fs";
import { buildAutonomousEngineeringPlan } from "../evolution-engine/autonomous-engineering-plan.mjs";

const objective = JSON.parse(fs.readFileSync(new URL("../evolution-engine/autonomous-engineering-objective.json", import.meta.url), "utf8"));
const capabilities = ["robotics","electronics","nano","printing","ai"].map(id => ({id,status:"experimental"}));
const plan = buildAutonomousEngineeringPlan({objective,capabilities,audit:{findings:[]}});
assert.equal(plan.domainCount,5);
assert.equal(plan.workstreamCount,21);
assert.equal(plan.queuedTasks,21);
assert.equal(plan.completedTasks,0);
assert.ok(plan.tasks.every(task => task.approvalRequired && task.implementationAuthorized === false));
assert.ok(plan.tasks.every(task => task.acceptanceCriteria.length >= 2 && task.evidenceGates.length >= 5));
assert.equal(plan.status,"engineering-objective-planned-agent-capability-gap-open");
assert.throws(() => buildAutonomousEngineeringPlan({objective:{...objective,safety:{...objective.safety,automaticMerge:true}},capabilities,audit:{findings:[]}}),/Invalid autonomous engineering objective/);
console.log("PASS — five-domain autonomous engineering objective, 21 workstreams, acceptance gates and fail-closed policy.");
