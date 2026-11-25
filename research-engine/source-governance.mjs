const DOCUMENT_HOSTS=new Set(["raw.githubusercontent.com"]);
const MIME_TYPES=new Set(["text/plain","text/markdown","application/json"]);
const MAX_BYTES=256*1024;
const MAX_TIMEOUT_MS=10000;
const clean=(value,max)=>typeof value==="string"&&value.trim()&&value.length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)?value.trim():null;

export function evaluateSourceFreshness(source,now=new Date().toISOString()) {
  const reviewAfter=source?.freshness?.reviewAfter;
  if(!reviewAfter)return "unknown";
  const checked=Date.parse(source.freshness.lastCheckedAt||source.retrievedAt||"");
  const deadline=Date.parse(reviewAfter),current=Date.parse(now);
  if(!Number.isFinite(checked)||!Number.isFinite(deadline)||!Number.isFinite(current))throw new TypeError("Invalid source freshness timestamp");
  return current>=deadline?"stale":"fresh";
}

export async function fetchPermittedOpenDocument(source,{fetchImpl=fetch,timeoutMs=8000}={}) {
  if(!source||typeof source!=="object")throw new TypeError("An explicit source record is required");
  if(source.status!=="permitted"||source.license?.status!=="open-verified"||
     !clean(source.license.name,120)||!source.license.termsUrl)
    throw new Error("Document retrieval requires an explicitly permitted source and verified open licence");
  let url;try{url=new URL(source.url)}catch{throw new TypeError("Invalid document URL")}
  if(url.protocol!=="https:"||!DOCUMENT_HOSTS.has(url.hostname))throw new Error("Document host is not in the reviewed allowlist");
  if(url.username||url.password)throw new Error("Credentials in source URLs are prohibited");
  const terms=new URL(source.license.termsUrl);
  if(terms.protocol!=="https:")throw new Error("Licence terms URL must use HTTPS");
  if(!Number.isInteger(timeoutMs)||timeoutMs<500||timeoutMs>MAX_TIMEOUT_MS)throw new RangeError("Timeout outside permitted bounds");
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetchImpl(url.href,{method:"GET",redirect:"error",signal:controller.signal,
      headers:{"accept":"text/plain, text/markdown, application/json","user-agent":"MTDM-AI-Lab-MARIE/1.0"}});
    if(!response.ok)throw new Error("Document request failed with HTTP "+response.status);
    const type=(response.headers.get("content-type")||"").split(";")[0].trim().toLowerCase();
    if(!MIME_TYPES.has(type))throw new Error("Document content type is not permitted: "+(type||"missing"));
    const declared=Number(response.headers.get("content-length")||0);
    if(declared>MAX_BYTES)throw new Error("Document exceeds the 256 KiB retrieval limit");
    if(!response.body)throw new Error("Document response has no readable body");
    const reader=response.body.getReader(),chunks=[];let total=0;
    try{
      while(true){
        const {done,value}=await reader.read();if(done)break;
        total+=value.byteLength;
        if(total>MAX_BYTES){await reader.cancel();throw new Error("Document exceeds the 256 KiB retrieval limit")}
        chunks.push(value);
      }
    }finally{reader.releaseLock()}
    const bytes=new Uint8Array(total);let offset=0;
    for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
    const text=new TextDecoder("utf-8",{fatal:true}).decode(bytes);
    if(!text.trim())throw new Error("Document is empty");
    return {sourceId:source.id,url:url.href,license:{name:source.license.name,termsUrl:source.license.termsUrl},
      contentType:type,byteLength:total,sha256:(await import("node:crypto")).createHash("sha256").update(bytes).digest("hex"),
      retrievedAt:new Date().toISOString(),text,republishAllowed:false};
  }catch(error){
    if(error.name==="AbortError")throw new Error("Document retrieval timed out");
    throw error;
  }finally{clearTimeout(timer)}
}
