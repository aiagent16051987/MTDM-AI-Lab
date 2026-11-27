import assert from "node:assert/strict";
import { runCrossDomainBenchmarkSuite } from "../research-engine/cross-domain-benchmark.mjs";

const first = await runCrossDomainBenchmarkSuite();
const second = await runCrossDomainBenchmarkSuite();
assert.equal(first.status, "pass");
assert.equal(first.domainCount, 7);
assert.equal(first.reproducible, true);
assert.equal(first.recordCount, 21);
assert.deepEqual(first.results.map(item => item.domain), [
  "electronics", "iot", "ai", "robotics", "quantum", "nano", "manufacturing"
]);
assert.deepEqual(first.results.map(item => item.inputHash), second.results.map(item => item.inputHash));
assert.ok(first.results.every(item => item.status === "pass" && item.inputHash.startsWith("sha256:")));
console.log("PASS — seven-domain benchmark suite, provenance integrity and deterministic replay.");
console.log(JSON.stringify(first, null, 2));
