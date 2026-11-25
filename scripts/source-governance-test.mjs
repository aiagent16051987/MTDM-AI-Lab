import assert from "node:assert/strict";
import {fetchPermittedOpenDocument,evaluateSourceFreshness} from "../research-engine/source-governance.mjs";
const base={id:"src:open-doc",url:"https://raw.githubusercontent.com/example/project/main/README.md",status:"permitted",
 license:{status:"open-verified",name:"CC-BY-4.0",termsUrl:"https://creativecommons.org/licenses/by/4.0/"}};
const freshSource={...base,freshness:{lastCheckedAt:"2026-11-01T00:00:00Z",reviewAfter:"2026-12-01T00:00:00Z",etag:'"abc"',lastModified:"Sat, 01 Nov 2026 00:00:00 GMT"}};
const mock=(body,type="text/markdown",status=200,extra={})=>async(url,options)=>{
 assert.equal(options.redirect,"error");assert.equal(options.method,"GET");
 return new Response(body,{status,headers:{"content-type":type,...extra}});
};
assert.equal(evaluateSourceFreshness(freshSource,"2026-11-25T00:00:00Z"),"fresh");
assert.equal(evaluateSourceFreshness(freshSource,"2026-12-01T00:00:00Z"),"stale");
assert.equal(evaluateSourceFreshness(base),"unknown");
const result=await fetchPermittedOpenDocument(freshSource,{fetchImpl:async(url,options)=>{
 assert.equal(options.headers["if-none-match"],'"abc"');assert.ok(options.headers["if-modified-since"]);
 return mock("# Allowed technical note\n")(url,options);
}});
assert.match(result.text,/Allowed technical note/);assert.equal(result.license.name,"CC-BY-4.0");assert.equal(result.republishAllowed,false);
const unchanged=await fetchPermittedOpenDocument(freshSource,{fetchImpl:async()=>new Response(null,{status:304})});
assert.equal(unchanged.notModified,true);
await assert.rejects(()=>fetchPermittedOpenDocument({...base,license:{status:"not-assessed"}},{fetchImpl:mock("x")}),/verified open licence/);
await assert.rejects(()=>fetchPermittedOpenDocument({...base,url:"https://example.com/private"},{fetchImpl:mock("x")}),/not in the reviewed allowlist/);
await assert.rejects(()=>fetchPermittedOpenDocument(base,{fetchImpl:mock("<html>","text/html")}),/content type is not permitted/);
await assert.rejects(()=>fetchPermittedOpenDocument(base,{fetchImpl:mock("x".repeat(300000),"text/plain")}),/256 KiB/);
await assert.rejects(()=>fetchPermittedOpenDocument(base,{fetchImpl:mock("x","text/plain",302)}),/HTTP 302/);
console.log("Source governance passed: explicit licence gate, HTTPS host allowlist, redirect rejection, MIME allowlist, strict 256 KiB cap, conditional revalidation and freshness state.");
