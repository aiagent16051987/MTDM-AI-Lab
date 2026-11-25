import crypto from "node:crypto";

const DOMAIN_SET = new Set(["electronics","iot","ai","robotics","quantum","nano","manufacturing"]);
const clean = (value, max=500) => String(value ?? "").replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim().slice(0,max);
const stableId = value => crypto.createHash("sha256").update(String(value)).digest("hex").slice(0,16);

export function validateRegistry(registry) {
  if (!registry || registry.schemaVersion !== 1 || !registry.policy) throw new Error("Unsupported registry schema");
  const p=registry.policy;
  if (!Number.isInteger(p.maxSourcesPerRun) || p.maxSourcesPerRun<1 || p.maxSourcesPerRun>20 ||
      !Number.isInteger(p.maxRecordsPerSource) || p.maxRecordsPerSource<1 || p.maxRecordsPerSource>10 ||
      !Number.isInteger(p.timeoutMs) || p.timeoutMs<1000 || p.timeoutMs>15000 ||
      !Number.isInteger(p.minimumDelayMs) || p.minimumDelayMs<500 || p.minimumDelayMs>10000)
    throw new Error("Registry limits out of bounds");
  if (!Array.isArray(p.allowedHosts) || p.allowedHosts.length!==2 ||
      !p.allowedHosts.includes("api.github.com") || !p.allowedHosts.includes("api.crossref.org"))
    throw new Error("Host allowlist must contain only the two reviewed API hosts");
  if (typeof p.userAgent!=="string" || p.userAgent.length<10 || p.userAgent.length>200)
    throw new Error("Research user agent is missing or out of bounds");
  if(!Array.isArray(registry.openDocumentHosts)||registry.openDocumentHosts.length!==1||registry.openDocumentHosts[0]!=="raw.githubusercontent.com")
    throw new Error("Open-document host allowlist must contain only the reviewed raw GitHub host");
  const github=registry.githubReleases||[],crossref=registry.crossrefQueries||[];
  if (!Array.isArray(github)||!Array.isArray(crossref)||github.length+crossref.length>p.maxSourcesPerRun)
    throw new Error("Source registry exceeds the configured per-run budget");
  const ids=new Set();
  for (const source of [...(registry.githubReleases||[]),...(registry.crossrefQueries||[])]) {
    if (!source.id || ids.has(source.id)) throw new Error("Missing or duplicate source ID");
    ids.add(source.id);
    if (!Array.isArray(source.domains) || !source.domains.length || source.domains.some(d=>!DOMAIN_SET.has(d)) || new Set(source.domains).size!==source.domains.length)
      throw new Error("Invalid or duplicate domain in source "+source.id);
    if(source.type==="github" || source.repository!==undefined){
      if(typeof source.repository!=="string" || !/^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/.test(source.repository))
        throw new Error("Invalid GitHub repository locator for "+source.id);
    }
    if(source.query!==undefined && (typeof source.query!=="string" || !source.query.trim() || source.query.length>200))
      throw new Error("Invalid bounded Crossref query for "+source.id);
  }
  return true;
}

export function normalizeRecord(record) {
  const title=clean(record.title,300);
  const url=clean(record.url,1000);
  if (!title || !url.toLowerCase().startsWith("https://")) return null;
  let canonical;
  try { canonical=new URL(url); } catch { return null; }
  if (canonical.protocol!=="https:") return null;
  canonical.hash="";
  const id=stableId(canonical.href.toLowerCase());
  return {
    id,title,url:canonical.href,
    publisher:clean(record.publisher||"Unknown publisher",120),
    sourceId:clean(record.sourceId,80),
    sourceType:clean(record.sourceType,40),
    domains:(record.domains||[]).filter(d=>DOMAIN_SET.has(d)),
    publishedAt:clean(record.publishedAt,40)||null,
    retrievedAt:record.retrievedAt,
    description:clean(record.description,500),
    license:"Not assessed — consult original source terms",
    evidenceStatus:"metadata-only; not independently validated"
  };
}

export function deduplicateRecords(records) {
  const map=new Map();
  for (const raw of records) {
    const item=normalizeRecord(raw);
    if (!item) continue;
    const old=map.get(item.id);
    if (!old || (item.description.length>(old.description||"").length)) map.set(item.id,item);
  }
  return [...map.values()].sort((a,b)=>a.title.localeCompare(b.title));
}

export function generateHypotheses(domains=[]) {
  const selected=[...new Set(domains)].filter(d=>DOMAIN_SET.has(d)).sort();
  const candidates=[];
  for(let i=0;i<selected.length;i++) for(let j=i+1;j<selected.length;j++) {
    const a=selected[i],b=selected[j];
    candidates.push({
      id:"H-"+stableId([a,b].join("|")).slice(0,8).toUpperCase(),
      title:"Explore a "+a+" × "+b+" integrated system",
      hypothesis:"A bounded prototype combining "+a+" methods with "+b+" methods may improve a predeclared engineering metric compared with a single-domain baseline.",
      domains:[a,b],
      assumptions:["Domain tags describe metadata categories only; they do not establish technical compatibility.","No performance improvement is assumed before a controlled comparison.","A single-domain baseline and resource budget must be declared before testing."],
      alternatives:["The single-domain baseline performs equally or better.","Any apparent improvement is caused by workload, tuning or measurement confounders."],
      predictions:["A reproducible comparison can determine whether the integrated prototype improves the predeclared metric under equal workload and resource constraints."],
      falsificationCriteria:["The integrated prototype fails to exceed the baseline within a predeclared tolerance, or the result cannot be independently reproduced."],
      validationPlan:["Define one measurable target, unit, baseline and acceptance threshold before implementation","Specify constraints, cost, compute budget and failure limits","Build a deterministic simulation or supervised bench test","Run repeated trials and compare against the baseline","Record negative results, uncertainty and reproducible evidence"],
      priority:"unranked",
      status:"unvalidated hypothesis seed",
      evidenceStatus:"no supporting or opposing evidence attached; generated from source metadata domain tags only",
      safety:"Concept generation only. No physical, biological, medical or safety-critical deployment."
    });
  }
  return candidates;
}

export function buildResearchReport({records=[],errors=[],generatedAt=new Date().toISOString(),registryVersion=1}) {
  const unique=deduplicateRecords(records);
  const domains=[...new Set(unique.flatMap(r=>r.domains))];
  return {
    engine:"MTDM Autonomous Research & Invention Engine (MARIE)",
    engineVersion:"0.1.0",
    registryVersion,
    generatedAt,
    operatingMode:"LLM-independent deterministic metadata research",
    summary:{recordsReceived:records.length,uniqueRecords:unique.length,sourceErrors:errors.length,domainsCovered:domains.sort()},
    records:unique,
    hypotheses:generateHypotheses(domains),
    sourceErrors:errors.map(e=>({sourceId:clean(e.sourceId,80),message:clean(e.message,240)})),
    limitations:[
      "This run collects public metadata, not complete scientific knowledge or full-text papers.",
      "Metadata presence is not evidence that a claim is true, current, licensed for reuse, or independently reproduced.",
      "Generated hypotheses are structured research prompts, not inventions, discoveries, or validated designs.",
      "Human review and domain-specific tests are required before engineering adoption."
    ]
  };
}
