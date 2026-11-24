import fs from "node:fs";
import registry from "../knowledge-registry.json" with { type: "json" };

const limit=16;
const timeoutMs=8000;
const targets=registry.sources.slice(0,limit);
const report={generatedAt:new Date().toISOString(),checked:0,results:[]};
for(const source of targets){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  let status="error",httpStatus=null,finalUrl=source.url,lastModified=null,etag=null,error=null;
  try{
    let response=await fetch(source.url,{method:"HEAD",redirect:"follow",signal:controller.signal,headers:{"user-agent":"MTDM-AI-Lab-SourceAudit/1.0 (+https://github.com/aiagent16051987/MTDM-AI-Lab)"}});
    if(response.status===405||response.status===501){
      await response.body?.cancel();
      response=await fetch(source.url,{method:"GET",redirect:"follow",signal:controller.signal,headers:{"range":"bytes=0-0","user-agent":"MTDM-AI-Lab-SourceAudit/1.0 (+https://github.com/aiagent16051987/MTDM-AI-Lab)"}});
    }
    httpStatus=response.status;finalUrl=response.url||source.url;
    lastModified=response.headers.get("last-modified");etag=response.headers.get("etag");
    status=response.ok?"reachable":response.status===401||response.status===403?"restricted":"http_error";
    await response.body?.cancel();
  }catch(e){error=e.name==="AbortError"?"timeout":String(e).slice(0,180)}
  finally{clearTimeout(timer)}
  report.results.push({id:source.id,title:source.title,url:source.url,status,httpStatus,finalUrl,lastModified,etag,error});
  report.checked++;
  await new Promise(resolve=>setTimeout(resolve,350));
}
fs.mkdirSync("artifacts",{recursive:true});
fs.writeFileSync("artifacts/source-audit.json",JSON.stringify(report,null,2)+"\n");
const failed=report.results.filter(x=>x.status!=="reachable");
console.log(JSON.stringify({generatedAt:report.generatedAt,checked:report.checked,reachable:report.checked-failed.length,nonReachable:failed.map(x=>({id:x.id,status:x.status,httpStatus:x.httpStatus,error:x.error}))},null,2));
