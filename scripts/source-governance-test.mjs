import assert from "node:assert/strict";
import {fetchPermittedOpenDocument} from "../research-engine/source-governance.mjs";
const base={id:"src:open-doc",url:"https://raw.githubusercontent.com/example/project/main/README.md",status:"permitted",
 license:{status:"open-verified",name:"CC-BY-4.0",termsUrl:"https://creativecommons.org/licenses/by/4.0/"}};
const mock=(body,type="text/markdown",status=200,extra={})=>async(url,options)=>{
 assert.equal(options.redirect,"error");assert.equal(options.method,"GET");
 return new Response(body,{status,headers:{"content-type":type,...extra}});
};
const result=await fetchPermittedOpenDocument(base,{fetchImpl:mock("# Allowed technical note\n")});
assert.match(result.text,/Allowed technical note/);assert.equal(result.license.name,"CC-BY-4.0");assert.equal(result.republishAllowed,false);
await assert.rejects(()=>fetchPermittedOpenDocument({...base,license:{status:"not-assessed"}},{fetchImpl:mock("x")}),/verified open licence/);
await assert.rejects(()=>fetchPermittedOpenDocument({...base,url:"https://example.com/private"},{fetchImpl:mock("x")}),/not in the reviewed allowlist/);
await assert.rejects(()=>fetchPermittedOpenDocument(base,{fetchImpl:mock("<html>","text/html")}),/content type is not permitted/);
await assert.rejects(()=>fetchPermittedOpenDocument(base,{fetchImpl:mock("x".repeat(300000),"text/plain")}),/256 KiB/);
await assert.rejects(()=>fetchPermittedOpenDocument(base,{fetchImpl:mock("x","text/plain",302)}),/HTTP 302/);
console.log("Source governance passed: explicit licence gate, HTTPS host allowlist, redirect rejection, MIME allowlist, strict 256 KiB streaming cap and provenance hash.");
