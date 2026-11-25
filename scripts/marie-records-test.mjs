import assert from "node:assert/strict";
import {buildMARIERecords} from "../research-engine/marie-records.mjs";
const report={generatedAt:"2026-11-25T17:00:00Z",records:[
 {id:"abc123",title:"Release notes",url:"https://github.com/example/project/releases/tag/v1",publisher:"Example",sourceType:"github-release",retrievedAt:"2026-11-25T17:00:00Z",publishedAt:"2026-11-24T12:00:00Z"}
],hypotheses:[
 {id:"H-ABCD1234",title:"AI × Robotics candidate",hypothesis:"A bounded integrated prototype may improve a declared metric.",domains:["ai","robotics"],
 assumptions:["Metadata tags do not establish compatibility."],alternatives:["The baseline performs equally or better."],
 predictions:["Compare the integrated prototype to a predeclared baseline."],falsificationCriteria:["No reproducible improvement over the baseline."],
 validationPlan:["Define metric and baseline before testing."]}
]};
const result=buildMARIERecords(report);
assert.equal(result.sourceCount,1);assert.equal(result.hypothesisSeedCount,1);
const source=result.records.find(r=>r.recordType==="source");
assert.equal(source.license.status,"metadata-only");
assert.equal(source.status,"metadata-only");
assert.equal(source.freshness.reviewAfter,"2026-12-25T17:00:00.000Z");
const hypothesis=result.records.find(r=>r.recordType==="hypothesis");
assert.equal(hypothesis.status,"unvalidated");assert.deepEqual(hypothesis.supportingEvidenceIds,[]);
assert.match(hypothesis.uncertainty,/not a literature-supported claim/);
assert.throws(()=>buildMARIERecords({...report,records:[{...report.records[0],retrievedAt:"invalid"}]}),/valid retrieval timestamp/);
console.log("MARIE records passed: metadata-only source provenance, source-specific review deadlines, unvalidated falsifiable hypothesis seeds and no invented evidence.");
