import fs from "node:fs";
import path from "node:path";

const VALID_STATUS=new Set(["implemented","experimental","planned","prohibited"]);
const safePath=value=>typeof value==="string"&&value.length>0&&!path.isAbsolute(value)&&!value.split(/[\\/]/).includes("..");

export function auditCapabilities({root=process.cwd(),registryPath="capabilities.json",htmlPath="index.html"}={}) {
  const registry=JSON.parse(fs.readFileSync(path.join(root,registryPath),"utf8"));
  const html=fs.readFileSync(path.join(root,htmlPath),"utf8");
  const findings=[],seen=new Set();
  if(registry.schemaVersion!==1||!Array.isArray(registry.capabilities)) {
    return {schemaVersion:1,generatedAt:new Date().toISOString(),status:"blocked",summary:{capabilities:0,findings:1,blockers:1},findings:[{id:"registry-invalid",severity:"blocker",category:"integrity",message:"Capability registry schema is invalid."}]};
  }
  const tabs=[...html.matchAll(/data-tab="([^"]+)"/g)].map(match=>match[1]);
  const publicIds=registry.capabilities.filter(item=>item.publicWorkspace===true).map(item=>item.id);
  for(const id of publicIds) if(!tabs.includes(id)) findings.push({id:"navigation-missing:"+id,severity:"high",category:"workspace",message:"Public capability has no matching navigation tab: "+id});
  for(const tab of tabs) if(!publicIds.includes(tab)) findings.push({id:"navigation-unregistered:"+tab,severity:"high",category:"workspace",message:"Navigation tab is not registered as a public capability: "+tab});
  for(const capability of registry.capabilities) {
    const id=String(capability.id||"unknown");
    if(seen.has(id)) findings.push({id:"duplicate:"+id,severity:"blocker",category:"integrity",message:"Duplicate capability identifier: "+id});
    seen.add(id);
    if(!VALID_STATUS.has(capability.status)) findings.push({id:"status:"+id,severity:"blocker",category:"integrity",message:"Invalid capability status: "+id});
    if(typeof capability.publicWorkspace!=="boolean") findings.push({id:"visibility:"+id,severity:"high",category:"integrity",message:"Capability visibility is not explicit: "+id});
    for(const field of ["implementation","evidence"]) {
      if(!Array.isArray(capability[field])||capability[field].length===0) {
        findings.push({id:field+":"+id,severity:"high",category:"evidence",message:"Missing "+field+" references for capability: "+id});
        continue;
      }
      for(const relative of capability[field]) {
        if(!safePath(relative)||!fs.existsSync(path.join(root,relative))) findings.push({id:"missing-file:"+id+":"+relative,severity:"high",category:"integrity",message:"Referenced "+field+" file does not exist: "+relative});
      }
    }
    if(capability.status==="implemented"&&Array.isArray(capability.evidence)&&!capability.evidence.some(file=>safePath(file)&&fs.existsSync(path.join(root,file))&&/(^tests\\/|^scripts\\/)/.test(file)))
      findings.push({id:"no-executable-evidence:"+id,severity:"high",category:"verification",message:"Implemented capability has no executable test evidence: "+id});
  }
  const internalResearch=registry.capabilities.find(item=>item.id==="research");
  if(!internalResearch||internalResearch.publicWorkspace!==false||tabs.includes("research"))
    findings.push({id:"research-visibility-policy",severity:"blocker",category:"policy",message:"Research workspace must remain internal and absent from public navigation."});
  const blockers=findings.filter(item=>item.severity==="blocker").length;
  const high=findings.filter(item=>item.severity==="high").length;
  return {schemaVersion:1,generatedAt:new Date().toISOString(),status:blockers?"blocked":high?"needs-attention":"pass",
    summary:{capabilities:registry.capabilities.length,publicWorkspaces:publicIds.length,findings:findings.length,blockers,high},
    findings};
}

export function buildImprovementQueue(audit) {
  if(!audit||!Array.isArray(audit.findings)) throw new TypeError("A capability audit result is required");
  const priority={blocker:0,high:1,medium:2,low:3};
  return audit.findings.slice().sort((a,b)=>(priority[a.severity]??9)-(priority[b.severity]??9)||a.id.localeCompare(b.id))
    .map((finding,index)=>({workItemId:"EV-"+String(index+1).padStart(4,"0"),findingId:finding.id,
      priority:finding.severity,category:finding.category,description:finding.message,
      remediation:"Create a reviewed change, add an executable regression test, and pass the complete CI/browser audit before release.",
      automaticExecution:"disabled",approvalRequired:true,status:"open"}));
}
