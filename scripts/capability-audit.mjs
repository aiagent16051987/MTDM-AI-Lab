import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const registry=JSON.parse(read("capabilities.json"));
assert.equal(registry.schemaVersion,1,"unsupported capability registry schema");
assert.ok(Array.isArray(registry.capabilities)&&registry.capabilities.length>0,"capabilities must be declared");
const ids=new Set();
for(const capability of registry.capabilities){
  assert.ok(capability.id&&/^[a-z][a-z0-9-]*$/.test(capability.id),"invalid capability ID");
  assert.ok(!ids.has(capability.id),"duplicate capability ID: "+capability.id);ids.add(capability.id);
  assert.ok(["implemented","experimental","planned","prohibited"].includes(capability.status),"invalid status: "+capability.id);
  assert.ok(typeof capability.publicWorkspace==="boolean","publicWorkspace must be explicit: "+capability.id);
  assert.ok(Array.isArray(capability.implementation)&&capability.implementation.length,"implementation evidence missing: "+capability.id);
  assert.ok(Array.isArray(capability.evidence)&&capability.evidence.length,"test/evidence references missing: "+capability.id);
  assert.ok(Array.isArray(capability.limitations)&&capability.limitations.length,"limitations missing: "+capability.id);
  for(const file of [...capability.implementation,...capability.evidence]){
    assert.ok(fs.existsSync(path.join(root,file)),"missing capability evidence "+capability.id+": "+file);
  }
  if(capability.status==="implemented")assert.ok(capability.evidence.some(file=>file.startsWith("tests/")||file.startsWith("scripts/")),"implemented capability requires executable evidence: "+capability.id);
}
const html=read("index.html");
const publicTabs=[...html.matchAll(/data-tab="([^"]+)"/g)].map(m=>m[1]);
const declared=registry.capabilities.filter(c=>c.publicWorkspace).map(c=>c.id);
assert.deepEqual(publicTabs,declared,"public navigation and capability registry must match in order");
const research=registry.capabilities.find(c=>c.id==="research");
assert.ok(research&&!research.publicWorkspace,"Research Hub must remain internal");
assert.ok(/<section[^>]*id="research"[^>]*data-internal-workspace="true"/.test(html),"internal research workspace must remain in source without a public tab");
assert.ok(!publicTabs.includes("research"),"Research Hub must not appear in public navigation");
const records=read("research-engine/records.mjs");
for(const fn of ["createSourceRecord","createClaimRecord","createEvidenceRecord","createHypothesisRecord","createExperimentRecord","createResultRecord","createReviewDecision","assertResearchReferences"])
  assert.ok(records.includes("function "+fn),"research record contract missing: "+fn);
console.log("Capability audit passed: "+declared.length+" public workspaces, "+registry.capabilities.length+" declared capabilities, internal Research Hub, implementation/evidence paths and runtime record contracts.");
