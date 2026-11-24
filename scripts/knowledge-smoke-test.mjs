import fs from "node:fs";
import assert from "node:assert/strict";
import registry from "../knowledge-registry.json" with { type: "json" };
const ids=registry.sources.map(x=>x.id);
assert.ok(registry.sources.length>=20,"catalogue should contain at least 20 curated sources");
assert.equal(new Set(ids).size,ids.length,"source IDs must be unique");
for(const s of registry.sources){
  assert.ok(s.title&&s.publisher&&s.domain&&Array.isArray(s.topics)&&s.topics.length,"source metadata incomplete: "+s.id);
  const u=new URL(s.url);
  assert.equal(u.protocol,"https:","sources must use HTTPS: "+s.id);
}
assert.ok(registry.providers.length>=5,"provider registry should include multiple candidates");
for(const p of registry.providers){assert.ok(p.name&&p.type&&p.url&&p.policy,"provider metadata incomplete: "+p.id);assert.equal(new URL(p.url).protocol,"https:");}
const app=fs.readFileSync(new URL("../knowledge-hub.js",import.meta.url),"utf8");
assert.ok(!/localStorage|sessionStorage|eval\s*\(|new Function/.test(app),"knowledge hub must not persist secrets or execute dynamic code");
assert.ok(app.includes("textContent"),"rendering must use safe text APIs");
console.log("Knowledge registry tests passed: source metadata, unique IDs, HTTPS links, provider metadata and safe rendering.");
