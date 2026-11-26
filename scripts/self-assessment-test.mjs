import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {auditCapabilities,buildImprovementQueue} from "../evolution-engine/audit.mjs";

const root=process.cwd();
const audit=auditCapabilities({root});
assert.ok(["pass","needs-attention","blocked"].includes(audit.status));
assert.equal(audit.summary.capabilities>=8,true);
assert.equal(audit.findings.some(item=>item.id==="research-visibility-policy"),false);
assert.equal(audit.findings.some(item=>item.id.startsWith("e2e-coverage-missing:")),false);
const queue=buildImprovementQueue(audit);
assert.equal(queue.length,audit.findings.length);
assert.ok(queue.every(item=>item.automaticExecution==="disabled"&&item.approvalRequired===true));

const temp=fs.mkdtempSync(path.join(os.tmpdir(),"mtdm-evolution-"));
const outside=fs.mkdtempSync(path.join(os.tmpdir(),"mtdm-outside-"));
try {
  fs.mkdirSync(path.join(temp,"tests","e2e"),{recursive:true});
  fs.writeFileSync(path.join(temp,"index.html"),'<button data-tab="electronics"></button>');
  fs.writeFileSync(path.join(temp,"tests","e2e","workspaces.spec.js"),'const workspaces = [["electronics", /Electronics/i]];');
  fs.writeFileSync(path.join(temp,"implementation.js"),"export const fixture = true;");
  fs.writeFileSync(path.join(temp,"evidence.test.js"),"import assert from 'node:assert';");
  fs.writeFileSync(path.join(outside,"secret.js"),"outside repository");
  fs.symlinkSync(path.join(outside,"secret.js"),path.join(temp,"escape.js"));
  fs.writeFileSync(path.join(temp,"capabilities.json"),JSON.stringify({schemaVersion:1,capabilities:[
    {id:"electronics",status:"implemented",publicWorkspace:true,implementation:["implementation.js"],evidence:["evidence.test.js","escape.js"]},
    {id:"research",status:"experimental",publicWorkspace:true,implementation:["implementation.js"],evidence:["evidence.test.js"]}
  ]}));
  const broken=auditCapabilities({root:temp});
  assert.equal(broken.status,"blocked");
  assert.ok(broken.findings.some(item=>item.id==="research-visibility-policy"));
  assert.ok(broken.findings.some(item=>item.id==="invalid-file:electronics:escape.js"));
  assert.ok(broken.findings.some(item=>item.id==="navigation-unregistered:research"));
} finally {
  fs.rmSync(temp,{recursive:true,force:true});
  fs.rmSync(outside,{recursive:true,force:true});
}
console.log("PASS — self-assessment verifies repository-contained evidence, workspace/E2E alignment, Research Hub isolation and approval-gated improvement work.");
