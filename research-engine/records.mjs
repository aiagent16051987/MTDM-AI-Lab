const TYPES = new Set(["source","claim","evidence","hypothesis","experiment","result","review"]);
const STATUSES = {
  source: new Set(["permitted","metadata-only","restricted","stale","unavailable"]),
  claim: new Set(["unverified","supported","contested","rejected"]),
  hypothesis: new Set(["unvalidated","testing","supported","refuted","inconclusive"]),
  result: new Set(["pass","fail","inconclusive","error"]),
  review: new Set(["approved","rejected","needs-revision"])
};
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const cleanText = (value, field, max=2000) => {
  if (typeof value !== "string" || !value.trim() || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value))
    throw new TypeError(field + " must be a non-empty bounded text value");
  return value.trim();
};
const id = (value, field="id") => {
  const v=cleanText(value,field,128);
  if(!ID.test(v)) throw new TypeError(field + " has invalid identifier syntax");
  return v;
};
const date = (value, field) => {
  const v=cleanText(value,field,40);
  if(!ISO.test(v)||!Number.isFinite(Date.parse(v))) throw new TypeError(field + " must be an ISO-8601 UTC timestamp");
  return v;
};
const url = (value, field) => {
  const v=cleanText(value,field,2048);
  let parsed; try { parsed=new URL(v); } catch { throw new TypeError(field + " must be a valid URL"); }
  if(parsed.protocol!=="https:") throw new TypeError(field + " must use HTTPS");
  return parsed.href;
};
const list = (value, field, max=40) => {
  if(!Array.isArray(value)||value.length>max) throw new TypeError(field + " must be a bounded array");
  const result=value.map((v,i)=>cleanText(v,field+"["+i+"]",500));
  if(new Set(result).size!==result.length) throw new TypeError(field + " must not contain duplicates");
  return result;
};
const base = (type, input) => {
  if(!input||typeof input!=="object"||Array.isArray(input)) throw new TypeError(type+" record must be an object");
  if(input.schemaVersion!==1) throw new Error("Unsupported research record schema version");
  if(input.recordType!==type) throw new Error("Expected "+type+" record");
  return {schemaVersion:1,recordType:type,id:id(input.id)};
};
const enumValue=(value,allowed,field)=>{
  if(!allowed.has(value)) throw new TypeError(field+" has an unsupported value");
  return value;
};

export function createSourceRecord(input) {
  const b=base("source",input), license=input.license;
  if(!license||typeof license!=="object") throw new TypeError("source.license is required");
  const licenseStatus=enumValue(license.status,new Set(["open-verified","metadata-only","not-assessed","restricted"]),"license.status");
  const result={...b,title:cleanText(input.title,"source.title",300),url:url(input.url,"source.url"),
    publisher:cleanText(input.publisher,"source.publisher",200),sourceType:cleanText(input.sourceType,"source.sourceType",80),
    retrievedAt:date(input.retrievedAt,"source.retrievedAt"),
    publishedAt:input.publishedAt==null?null:date(input.publishedAt,"source.publishedAt"),
    sourceVersion:input.sourceVersion==null?null:cleanText(input.sourceVersion,"source.sourceVersion",120),
    license:{status:licenseStatus,name:license.name==null?null:cleanText(license.name,"license.name",120),
      termsUrl:license.termsUrl==null?null:url(license.termsUrl,"license.termsUrl")},
    freshness:{lastCheckedAt:date(input.freshness?.lastCheckedAt??input.retrievedAt,"freshness.lastCheckedAt"),
      reviewAfter:input.freshness?.reviewAfter==null?null:date(input.freshness.reviewAfter,"freshness.reviewAfter"),
      etag:input.freshness?.etag==null?null:cleanText(input.freshness.etag,"freshness.etag",300),
      lastModified:input.freshness?.lastModified==null?null:cleanText(input.freshness.lastModified,"freshness.lastModified",120)},
    status:enumValue(input.status??"metadata-only",STATUSES.source,"source.status")};
  if(result.license.status==="open-verified"&&(!result.license.name||!result.license.termsUrl))
    throw new Error("open-verified sources require a named licence and terms URL");
  return result;
}

export function createClaimRecord(input) {
  const b=base("claim",input), locator=input.locator, confidence=input.confidence;
  if(!locator||typeof locator!=="object"||!confidence||typeof confidence!=="object") throw new TypeError("claim locator and confidence are required");
  return {...b,statement:cleanText(input.statement,"claim.statement",1200),
    claimType:enumValue(input.claimType,new Set(["reported-fact","measurement","interpretation","inference"]),"claim.claimType"),
    sourceId:id(input.sourceId,"claim.sourceId"),
    locator:{url:url(locator.url,"claim.locator.url"),location:cleanText(locator.location,"claim.locator.location",240)},
    confidence:{level:enumValue(confidence.level,new Set(["low","medium","high"]),"confidence.level"),
      rationale:cleanText(confidence.rationale,"confidence.rationale",500)},
    status:enumValue(input.status??"unverified",STATUSES.claim,"claim.status")};
}

export function createEvidenceRecord(input) {
  const b=base("evidence",input), locator=input.locator;
  if(!locator||typeof locator!=="object") throw new TypeError("evidence.locator is required");
  return {...b,claimId:id(input.claimId,"evidence.claimId"),sourceId:id(input.sourceId,"evidence.sourceId"),
    relation:enumValue(input.relation,new Set(["supports","contradicts","qualifies"]),"evidence.relation"),
    locator:{url:url(locator.url,"evidence.locator.url"),location:cleanText(locator.location,"evidence.locator.location",240)},
    excerpt:cleanText(input.excerpt,"evidence.excerpt",500),
    collectedAt:date(input.collectedAt,"evidence.collectedAt")};
}

export function createHypothesisRecord(input) {
  const b=base("hypothesis",input);
  const predictions=list(input.predictions,"hypothesis.predictions",20);
  const falsificationCriteria=list(input.falsificationCriteria,"hypothesis.falsificationCriteria",20);
  const alternatives=list(input.alternatives,"hypothesis.alternatives",20);
  if(!predictions.length||!falsificationCriteria.length||!alternatives.length)
    throw new Error("A research hypothesis requires predictions, alternatives and falsification criteria");
  const domains=list(input.domains,"hypothesis.domains",8);
  if(!domains.length) throw new Error("A research hypothesis requires at least one domain");
  return {...b,title:cleanText(input.title,"hypothesis.title",300),
    statement:cleanText(input.statement,"hypothesis.statement",1200),domains,
    supportingEvidenceIds:list(input.supportingEvidenceIds??[],"supportingEvidenceIds"),
    opposingEvidenceIds:list(input.opposingEvidenceIds??[],"opposingEvidenceIds"),
    assumptions:list(input.assumptions,"hypothesis.assumptions",20),alternatives,predictions,falsificationCriteria,
    validationPlan:list(input.validationPlan,"hypothesis.validationPlan",20),
    uncertainty:cleanText(input.uncertainty,"hypothesis.uncertainty",500),
    status:enumValue(input.status??"unvalidated",STATUSES.hypothesis,"hypothesis.status")};
}

export function createExperimentRecord(input) {
  const b=base("experiment",input), params=input.parameters;
  if(!params||typeof params!=="object"||Array.isArray(params)||!Object.keys(params).length||Object.keys(params).length>40)
    throw new TypeError("experiment.parameters must be a non-empty bounded object");
  const parameters={};
  for(const [key,p] of Object.entries(params)){
    if(!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(key)||!p||typeof p!=="object"||
      typeof p.value!=="number"||!Number.isFinite(p.value)||typeof p.unit!=="string"||!p.unit.trim())
      throw new TypeError("Each experiment parameter requires a finite numeric value and explicit unit");
    parameters[key]={value:p.value,unit:cleanText(p.unit,"parameter unit",40)};
  }
  return {...b,hypothesisId:id(input.hypothesisId,"experiment.hypothesisId"),
    moduleId:id(input.moduleId,"experiment.moduleId"),moduleVersion:cleanText(input.moduleVersion,"experiment.moduleVersion",80),
    parameters,assumptions:list(input.assumptions??[],"experiment.assumptions",20),
    safetyClass:enumValue(input.safetyClass,new Set(["low-risk-software","supervised-lab","safety-critical-prohibited"]),"experiment.safetyClass"),
    createdAt:date(input.createdAt,"experiment.createdAt")};
}

export function createResultRecord(input) {
  const b=base("result",input), outputs=input.outputs;
  if(!outputs||typeof outputs!=="object"||Array.isArray(outputs)) throw new TypeError("result.outputs must be an object");
  return {...b,experimentId:id(input.experimentId,"result.experimentId"),
    status:enumValue(input.status,STATUSES.result,"result.status"),
    startedAt:date(input.startedAt,"result.startedAt"),finishedAt:date(input.finishedAt,"result.finishedAt"),
    inputHash:cleanText(input.inputHash,"result.inputHash",128),
    toolVersion:cleanText(input.toolVersion,"result.toolVersion",100),
    outputs,notes:cleanText(input.notes??"No additional notes","result.notes",1000)};
}

export function createReviewDecision(input) {
  const b=base("review",input);
  return {...b,targetId:id(input.targetId,"review.targetId"),
    decision:enumValue(input.decision,STATUSES.review,"review.decision"),
    reviewer:cleanText(input.reviewer,"review.reviewer",120),
    reviewedAt:date(input.reviewedAt,"review.reviewedAt"),
    rationale:cleanText(input.rationale,"review.rationale",1000)};
}

export function validateResearchRecord(input) {
  if(!input||!TYPES.has(input.recordType)) throw new TypeError("Unknown research record type");
  const factories={source:createSourceRecord,claim:createClaimRecord,evidence:createEvidenceRecord,
    hypothesis:createHypothesisRecord,experiment:createExperimentRecord,result:createResultRecord,review:createReviewDecision};
  return factories[input.recordType](input);
}

export function assertResearchReferences(records) {
  if(!Array.isArray(records)) throw new TypeError("records must be an array");
  const byId=new Map();
  for(const raw of records){const record=validateResearchRecord(raw);if(byId.has(record.id))throw new Error("Duplicate research record ID: "+record.id);byId.set(record.id,record);}
  for(const r of byId.values()){
    const requireType=(ref,type,field)=>{const found=byId.get(ref);if(!found||found.recordType!==type)throw new Error(r.id+" references missing or wrong-type "+field+": "+ref)};
    if(r.recordType==="claim")requireType(r.sourceId,"source","sourceId");
    if(r.recordType==="evidence"){requireType(r.sourceId,"source","sourceId");requireType(r.claimId,"claim","claimId");}
    if(r.recordType==="experiment")requireType(r.hypothesisId,"hypothesis","hypothesisId");
    if(r.recordType==="result")requireType(r.experimentId,"experiment","experimentId");
    if(r.recordType==="review"&&!byId.has(r.targetId))throw new Error(r.id+" references missing review target: "+r.targetId);
  }
  return true;
}

export const RESEARCH_RECORD_SCHEMA_VERSION=1;
