import assert from "node:assert/strict";
import fs from "node:fs";
import registry from "../research-engine/registry.json" with { type: "json" };
import {validateRegistry,normalizeRecord,deduplicateRecords,generateHypotheses,buildResearchReport} from "../research-engine/core.mjs";

assert.equal(validateRegistry(registry),true);
assert.throws(()=>validateRegistry({...registry,policy:{...registry.policy,maxSourcesPerRun:999}}),/limits out of bounds/);
assert.throws(()=>validateRegistry({...registry,githubReleases:[...registry.githubReleases,{...registry.githubReleases[0]}]}),/duplicate source ID/);
assert.equal(normalizeRecord({title:"bad",url:"javascript:alert(1)"}),null);
assert.equal(normalizeRecord({title:"bad",url:"http://example.com"}),null);
assert.ok(normalizeRecord({title:"valid",url:"https://example.com/a#fragment",domains:["ai","unknown"]}).domains.includes("ai"));
assert.equal(deduplicateRecords([
 {title:"one",url:"https://example.com/a#x",domains:["ai"]},
 {title:"one duplicate",url:"https://example.com/a#y",domains:["ai"]}
]).length,1);
assert.equal(generateHypotheses(["ai","robotics","ai"]).length,1);
assert.equal(generateHypotheses(["ai","malware"]).length,0);
const report=buildResearchReport({records:[
 {title:"Research paper",url:"https://doi.org/10.1000/example",domains:["ai"],sourceId:"crossref"}
]});
assert.equal(report.summary.uniqueRecords,1);
assert.ok(report.hypotheses.length===0);
assert.match(report.limitations[0],/metadata/);
const runner=fs.readFileSync(new URL("./run-marie.mjs",import.meta.url),"utf8");
assert.ok(runner.includes('redirect:"error"'));
assert.ok(runner.includes("allowedHosts"));
assert.ok(!runner.includes("eval(") && !runner.includes("new Function"));
console.log("PASS — MARIE registry validation, HTTPS-only normalization, deduplication, domain constraints, deterministic hypotheses, report limitations and fetch hardening.");
