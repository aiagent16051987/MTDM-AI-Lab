import assert from "node:assert/strict";
import {runStraightDriveValidation} from "../research-engine/experiment-runner.mjs";
import {runVoltageDividerValidation} from "../research-engine/spice-experiment-runner.mjs";
import {assertResearchReferences} from "../research-engine/records.mjs";
const robotics=runStraightDriveValidation(),electronics=await runVoltageDividerValidation();
const combined=[...robotics.records,...electronics.records];
assert.equal(assertResearchReferences(combined),true);
assert.deepEqual(new Set(combined.filter(r=>r.recordType==="experiment").map(r=>r.moduleId)),
 new Set(["robotics.diff-drive","electronics.spice-divider"]));
for(const result of combined.filter(r=>r.recordType==="result")){
 const experiment=combined.find(r=>r.id===result.experimentId);
 assert.ok(experiment,"result must retain its experiment provenance");
 assert.ok(result.inputHash.startsWith("sha256:"),"every result must carry an input digest");
}
console.log("Cross-domain contract passed: robotics and electronics experiments exchange the same typed, versioned, provenance-linked records without domain-specific adapters in the record store.");
