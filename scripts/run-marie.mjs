import fs from "node:fs";
import path from "node:path";
import registry from "../research-engine/registry.json" with { type: "json" };
import { validateRegistry, buildResearchReport } from "../research-engine/core.mjs";
import { buildMARIERecords } from "../research-engine/marie-records.mjs";

validateRegistry(registry);
const policy=registry.policy;
const timeoutMs=Math.min(15000,Math.max(1000,policy.timeoutMs));
const maxRecords=Math.min(10,Math.max(1,policy.maxRecordsPerSource));
const sources=[
  ...registry.githubReleases.map(x=>({...x,type:"github"})),
  ...registry.crossrefQueries.map(x=>({...x,type:"crossref"}))
].slice(0,Math.min(20,policy.maxSourcesPerRun));
const records=[],errors=[];
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function requestJson(url,expectedHost) {
  const parsed=new URL(url);
  if(parsed.protocol!=="https:"||parsed.hostname!==expectedHost||!policy.allowedHosts.includes(parsed.hostname)) throw new Error("Blocked endpoint outside HTTPS host allowlist");
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try {
    const response=await fetch(url,{signal:controller.signal,redirect:"error",headers:{"user-agent":policy.userAgent,"accept":"application/vnd.github+json, application/json"}});
    if(!response.ok) throw new Error("HTTP "+response.status);
    const length=Number(response.headers.get("content-length")||0);
    if(length>1_000_000) throw new Error("Response exceeds 1 MB safety limit");
    const text=await response.text();
    if(text.length>1_000_000) throw new Error("Response exceeds 1 MB safety limit");
    return JSON.parse(text);
  } finally {clearTimeout(timer);}
}

for(const source of sources) {
  try {
    const retrievedAt=new Date().toISOString();
    if(source.type==="github") {
      const url="https://api.github.com/repos/"+encodeURIComponent(source.repository).replace("%2F","/")+"/releases?per_page="+maxRecords;
      const data=await requestJson(url,"api.github.com");
      if(!Array.isArray(data)) throw new Error("Unexpected GitHub API response");
      for(const release of data) {
        if(!release || release.draft || release.prerelease) continue;
        records.push({title:release.name||release.tag_name,url:release.html_url,publisher:source.name,sourceId:source.id,sourceType:"github-release",domains:source.domains,publishedAt:release.published_at,description:release.body||"",retrievedAt});
      }
    } else {
      const url=new URL("https://api.crossref.org/works");
      url.searchParams.set("query.bibliographic",source.query);
      url.searchParams.set("rows",String(maxRecords));
      url.searchParams.set("select","DOI,title,publisher,URL,published,created,abstract");
      const data=await requestJson(url.href,"api.crossref.org");
      const items=data?.message?.items;
      if(!Array.isArray(items)) throw new Error("Unexpected Crossref API response");
      for(const item of items) {
        const date=item.published?.["date-parts"]?.[0]?.join("-")||null;
        records.push({title:item.title?.[0],url:item.URL,publisher:item.publisher||"Crossref-indexed publisher",sourceId:source.id,sourceType:"crossref-metadata",domains:source.domains,publishedAt:date,description:item.abstract||"",retrievedAt});
      }
    }
  } catch(error) {
    errors.push({sourceId:source.id,message:error.name==="AbortError"?"Request timed out":String(error.message||error)});
  }
  await sleep(Math.max(500,policy.minimumDelayMs));
}

const report=buildResearchReport({records,errors,registryVersion:registry.schemaVersion});
const researchRecords=buildMARIERecords(report);
const outputDir="artifacts/marie";
fs.mkdirSync(outputDir,{recursive:true});
fs.writeFileSync(path.join(outputDir,"research-report.json"),JSON.stringify(report,null,2)+"\n");
fs.writeFileSync(path.join(outputDir,"research-records.json"),JSON.stringify(researchRecords,null,2)+"\n");
const markdown=[
"# MARIE Research Run",
"",
"- Generated: "+report.generatedAt,
"- Unique metadata records: "+report.summary.uniqueRecords,
"- Source errors: "+report.summary.sourceErrors,
"- Operating mode: "+report.operatingMode,
"",
"## Candidate hypotheses",
"",
...report.hypotheses.slice(0,20).map(h=>"- **"+h.title+"** — "+h.status+"; "+h.evidenceStatus),
"",
"## Retrieved sources",
"",
...report.records.map(r=>"- ["+r.title.replace(/[\\[\\]]/g,"")+"]("+r.url+") — "+r.publisher+"; retrieved "+r.retrievedAt+"; "+r.evidenceStatus),
"",
"## Limitations",
"",
...report.limitations.map(x=>"- "+x)
].join("\n")+"\n";
fs.writeFileSync(path.join(outputDir,"research-report.md"),markdown);
console.log(JSON.stringify(report.summary,null,2));
if(report.summary.uniqueRecords===0) process.exitCode=1;
