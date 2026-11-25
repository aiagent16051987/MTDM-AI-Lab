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
const publicPanels=panels.filter(id=>!new RegExp('<section[^>]*id="'+id+'"[^>]*data-internal-workspace').test(html));
assert.equal(tabs.length,7,"seven public workspaces should be represented");
assert.deepEqual(tabs,publicPanels,"public tabs must map to public workspaces in matching order");
assert.ok(panels.includes("research"),"internal research workspace must remain implemented");
assert.ok(!tabs.includes("research"),"Research Hub must remain off public navigation");
assert.match(html,/<section[^>]*id="research"[^>]*data-internal-workspace="true"[^>]*hidden/,"internal research workspace must be hidden by default");
assert.equal((html.match(/src="\.\/navigation\.js"/g)||[]).length,1,"navigation module must load exactly once");
assert.equal((html.match(/class="workspace active"/g)||[]).length,1,"exactly one workspace should start active");
const idSet=new Set(ids);
const scripts=["navigation.js","app.js","advanced-labs.js","visual-circuit.js","research-labs.js","research-next.js","printing-lab.js"];
for(const file of scripts){
 assert.ok(fs.existsSync(path.join(root,file)),"script file missing: "+file);
 const js=read(file);
 for(const match of js.matchAll(/\$\(\s*["']([^"']+)["']\s*\)/g))assert.ok(idSet.has(match[1]),file+" references missing DOM id: "+match[1]);
}
for(const asset of ["assets/mtdm-ai-lab-logo.svg","assets/mtdm-ai-lab-favicon.svg","style.css"])assert.ok(fs.existsSync(path.join(root,asset)),"required local asset missing: "+asset);
console.log("Integration smoke test passed: seven public tabs, retained hidden Research Hub, unique DOM IDs, module loaders, static DOM references and local assets.");
