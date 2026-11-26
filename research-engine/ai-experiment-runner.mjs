import {createHypothesisRecord,createExperimentRecord,createResultRecord,assertResearchReferences} from "./records.mjs";
const hash=async v=>{const bytes=new TextEncoder().encode(JSON.stringify(v));const digest=await globalThis.crypto.subtle.digest("SHA-256",bytes);return "sha256:"+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");};
export async function runClassificationMetricsValidation(input={}){
 const actual=input.actual??[0,0,1,1,2,2],predicted=input.predicted??[0,1,1,1,2,0],classes=input.classes??3;
 if(!Number.isInteger(classes)||classes<2||classes>20)throw new RangeError("classes must be an integer from 2 to 20");
 if(!Array.isArray(actual)||!Array.isArray(predicted)||actual.length<1||actual.length>10000||actual.length!==predicted.length)throw new TypeError("actual and predicted must be equal non-empty bounded arrays");
 if(actual.some(v=>!Number.isInteger(v)||v<0||v>=classes)||predicted.some(v=>!Number.isInteger(v)||v<0||v>=classes))throw new RangeError("class labels must be integer indices within the configured class count");
 const matrix=Array.from({length:classes},()=>Array(classes).fill(0));actual.forEach((v,i)=>matrix[v][predicted[i]]++);
 const perClass=matrix.map((row,i)=>{const tp=row[i],fp=matrix.reduce((s,r,j)=>s+(j===i?0:r[i]),0),fn=row.reduce((s,v,j)=>s+(j===i?0:v),0);
  const precision=tp+fp?tp/(tp+fp):0,recall=tp+fn?tp/(tp+fn):0,f1=precision+recall?2*precision*recall/(precision+recall):0;return {precision,recall,f1}});
 const macro=key=>perClass.reduce((s,x)=>s+x[key],0)/classes;
 const metrics={accuracy:actual.filter((v,i)=>v===predicted[i]).length/actual.length,macroPrecision:macro("precision"),macroRecall:macro("recall"),macroF1:macro("f1"),confusionMatrix:matrix,sampleCount:actual.length};
 const createdAt=input.createdAt??"2026-11-25T16:00:00Z";
 const hypothesis=createHypothesisRecord({schemaVersion:1,recordType:"hypothesis",id:"hypothesis:ai-classification-metrics-v1",
  title:"Confusion-matrix-derived classification metrics are deterministic and internally consistent",
  statement:"For a fixed multiclass label fixture, the confusion matrix and accuracy, macro precision, macro recall and macro F1 computed from it are deterministic and bounded between zero and one.",
  domains:["machine-learning-evaluation"],supportingEvidenceIds:[],opposingEvidenceIds:[],
  assumptions:["Labels are discrete class indices in a fixed closed class set.","Metrics are computed on the supplied holdout predictions only.","No model training or generalization claim is inferred from this arithmetic fixture."],
  alternatives:["Mismatched or invalid labels must be rejected.","Macro averaging must weight each declared class equally, including classes with zero predicted positives."],
  predictions:["Confusion-matrix total equals sample count.","Accuracy and macro metrics lie in [0,1].","Identical labels produce identical metric records and input hashes."],
  falsificationCriteria:["Confusion matrix total differs from sample count.","Any metric is non-finite or outside [0,1].","Repeated identical input produces different outputs."],
  validationPlan:["Validate label arrays and class range.","Build the confusion matrix.","Compute per-class precision, recall and F1 with zero-denominator handling.","Calculate macro averages and retain the input digest."],
  uncertainty:"This validates metric arithmetic on a synthetic label fixture only; it does not validate a trained model, dataset representativeness or real-world predictive performance.",status:"unvalidated"});
 const experiment=createExperimentRecord({schemaVersion:1,recordType:"experiment",id:"experiment:ai-classification-metrics-v1",hypothesisId:hypothesis.id,
  moduleId:"ai.classification-metrics",moduleVersion:"1.0.0",
  parameters:{sampleCount:{value:actual.length,unit:"samples"},classCount:{value:classes,unit:"classes"}},
  assumptions:hypothesis.assumptions,safetyClass:"low-risk-software",createdAt});
 const result=createResultRecord({schemaVersion:1,recordType:"result",id:"result:ai-classification-metrics-v1",experimentId:experiment.id,
  status:"pass",startedAt:createdAt,finishedAt:createdAt,inputHash:await hash({actual,predicted,classes}),toolVersion:"classification-metrics@1.0.0",
  outputs:metrics,notes:"Metric arithmetic validation only; supplied labels are not evidence of real-world model performance."});
 const records=[hypothesis,experiment,result];assertResearchReferences(records);
 return {hypothesis,experiment,result,records,metrics};
}
