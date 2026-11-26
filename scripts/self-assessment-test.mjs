import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {auditCapabilities,buildImprovementQueue} from "../evolution-engine/audit.mjs";

const root=process.cwd();
const audit=auditCapabilities({root});
assert.ok(["pass","needs-attention","blocked"].includes(audit.status));
assert.ok(audit.summary.capabilities>=8);
assert.equal(audit.findings.some(item=>item.id==="research-visibility-policy"),false);
const queue=buildImprovementQueue(audit);
assert.equal(queue.length,audit.findings.length);
assert.ok(queue.every(item=>item.automaticExecution==="disabled"&&item.approvalRequired===true));

const temp=fs.mkdtempSync(path.join(os.tmpdir(),"mtdm-evolution-"));
try {
  fs.writeFileSync(path.join(temp,"index.html"),'<button data-tab="electronics"></button>');
  fs.writeFileSync(path.join(temp,"capabilities.json"),JSON.stringify({schemaVersion:1,capabilities:[
    {id:"electronics",status:"implemented",publicWorkspace:true,implementation:["missing.js"],evidence:["missing.test.js"]},
    {id:"research",status:"experimental",publicWorkspace:true,implementation:["missing.js"],evidence:["missing.test.js"]}
  ]}));
  const broken=auditCapabilities({root:temp});
  assert.equal(broken.status,"blocked");
  assert.ok(broken.findings.some(item=>item.id==="research-visibility-policy"));
  assert.ok(broken.findings.some(item=>item.category==="integrity"));
} finally {fs.rmSync(temp,{recursive:true,force:true});}
console.log("PASS — self-assessment detects broken capability references, navigation drift and internal Research Hub policy violations; improvement queue is review-gated.");
