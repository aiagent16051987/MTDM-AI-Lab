import {createSourceRecord,createHypothesisRecord,assertResearchReferences} from "./records.mjs";

const isoOrNull=value=>{
  if(!value)return null;
  const time=Date.parse(value);
  return Number.isFinite(time)?new Date(time).toISOString():null;
};
const addDays=(iso,days)=>new Date(Date.parse(iso)+days*86400000).toISOString();

export function buildMARIERecords(report,{sourceReviewDays=30}={}) {
  if(!report||!Array.isArray(report.records)||!Array.isArray(report.hypotheses))
    throw new TypeError("MARIE report must contain metadata records and hypothesis seeds");
  if(!Number.isInteger(sourceReviewDays)||sourceReviewDays<1||sourceReviewDays>365)
    throw new RangeError("sourceReviewDays must be between 1 and 365");
  const sources=report.records.map(item=>{
    const retrievedAt=isoOrNull(item.retrievedAt);
    if(!retrievedAt)throw new Error("MARIE metadata record has no valid retrieval timestamp");
    return createSourceRecord({schemaVersion:1,recordType:"source",id:"source:"+item.id,
      title:item.title,url:item.url,publisher:item.publisher,sourceType:item.sourceType,
      retrievedAt,publishedAt:isoOrNull(item.publishedAt),sourceVersion:null,
      license:{status:"metadata-only",name:null,termsUrl:null},
      freshness:{lastCheckedAt:retrievedAt,reviewAfter:addDays(retrievedAt,sourceReviewDays),etag:null,lastModified:null},
      status:"metadata-only"});
  });
  const hypotheses=report.hypotheses.map(item=>createHypothesisRecord({
    schemaVersion:1,recordType:"hypothesis",id:"hypothesis:"+item.id.toLowerCase(),
    title:item.title,statement:item.hypothesis,domains:item.domains,
    supportingEvidenceIds:[],opposingEvidenceIds:[],
    assumptions:item.assumptions,alternatives:item.alternatives,
    predictions:item.predictions,falsificationCriteria:item.falsificationCriteria,
    validationPlan:item.validationPlan,
    uncertainty:"High. This is an unvalidated cross-domain question seed generated from metadata tags, not a literature-supported claim.",
    status:"unvalidated"
  }));
  const records=[...sources,...hypotheses];
  assertResearchReferences(records);
  return {schemaVersion:1,generatedAt:report.generatedAt,sourceCount:sources.length,
    hypothesisSeedCount:hypotheses.length,records,
    limitations:["Metadata is not evidence of scientific truth.","No full-text claims or supporting evidence are inferred.","All hypothesis seeds require source-backed human review before experiment approval."]};
}
