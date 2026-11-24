import fs from "node:fs";
import assert from "node:assert/strict";
import path from "node:path";
import {fileURLToPath} from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const html=read("index.html");
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(ids.length,new Set(ids).size,"HTML IDs must be unique");
const tabs=[...html.matchAll(/data-tab="([^"]+)"/g)].map(m=>m[1]);
const panels=[...html.matchAll(/<section\s+id="([^"]+)"\s+class="workspace/g)].map(m=>m[1]);
assert.equal(tabs.length,8,"all eight workspaces should be represented");
assert.deepEqual(tabs,panels,"each tab must map to one workspace in matching order");
assert.equal((html.match(/src="\.\/navigation\.js"/g)||[]).length,1,"navigation module must load exactly once");
assert.equal((html.match(/class="workspace active"/g)||[]).length,1,"exactly one workspace should start active");
const idSet=new Set(ids);
const scripts=["navigation.js","app.js","advanced-labs.js","visual-circuit.js","research-labs.js","research-next.js","printing-lab.js"];
for(const file of scripts){
  assert.ok(fs.existsSync(path.join(root,file)),"script file missing: "+file);
  const js=read(file);
  for(const match of js.matchAll(/\$\(\s*["']([^"']+)["']\s*\)/g)){
    assert.ok(idSet.has(match[1]),file+" references missing DOM id: "+match[1]);
  }
}
for(const asset of ["assets/mtdm-ai-lab-logo.svg","assets/mtdm-ai-lab-favicon.svg","style.css"])
  assert.ok(fs.existsSync(path.join(root,asset)),"required local asset missing: "+asset);
console.log("Integration smoke test passed: unique DOM IDs, all 8 tab/panel mappings, one navigation loader, script files, static DOM references and local brand/style assets.");
