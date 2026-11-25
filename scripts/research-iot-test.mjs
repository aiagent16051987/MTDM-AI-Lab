import assert from "node:assert/strict";
import {runTelemetrySchemaValidation} from "../research-engine/iot-experiment-runner.mjs";
const a=runTelemetrySchemaValidation(),b=runTelemetrySchemaValidation();
assert.equal(a.result.status,"pass");
assert.equal(a.result.inputHash,b.result.inputHash);
assert.equal(a.result.outputs.sourceClass,"synthetic-test-fixture");
assert.equal(a.result.outputs.normalized.timestamp,"2026-11-25T16:00:00.000Z");
assert.equal(a.records.length,3);
for(const sample of [
 {voltage:"5",current:1,temperature:20,timestamp:"2026-11-25T16:00:00Z"},
 {voltage:5,current:-1,temperature:20,timestamp:"2026-11-25T16:00:00Z"},
 {voltage:5,current:1,temperature:20,timestamp:"not-a-date"}
])assert.throws(()=>runTelemetrySchemaValidation({sample}));
console.log("Research-to-IoT bridge passed: strict numeric/range validation, UTC timestamp canonicalization, synthetic-source disclosure and provenance-linked result.");
