import crypto from "node:crypto";
import {calculatePrintEstimate} from "../printing-core.mjs";
import {createHypothesisRecord,createExperimentRecord,createResultRecord,assertResearchReferences} from "./records.mjs";
const hash=v=>"sha256:"+crypto.createHash("sha256").update(JSON.stringify(v)).digest("hex");
export function runPrintingEstimateValidation(input={}){
 const values={shape:input.shape??"cube",x:input.x??40,y:input.y??30,z:input.z??20,process:input.process??"fdm",
  layerHeight:input.layerHeight??0.2,infill:input.infill??20,speed:input.speed??50,pricePerKg:input.pricePerKg??20,
  powerKw:input.powerKw??0.12,electricityRate:input.electricityRate??0.2,materialDensity:input.materialDensity??1.24,
  processModel:input.processModel??{rate:12,factor:1,setup:5}};
 const createdAt=input.createdAt??"2026-11-25T16:00:00Z";
 const estimate=calculatePrintEstimate(values);
 const hypothesis=createHypothesisRecord({schemaVersion:1,recordType:"hypothesis",id:"hypothesis:printing-estimate-determinism-v1",
  title:"Fixed additive-manufacturing estimator inputs produce reproducible bounded outputs",
  statement:"For a fixed supported idealized geometry, process model and bounded user inputs, the deterministic planning estimator returns finite positive geometry, material and duration outputs.",
  domains:["additive-manufacturing"],supportingEvidenceIds:[],opposingEvidenceIds:[],
  assumptions:["Geometry is a supported idealized cube, cylinder or L-bracket envelope.","Process rates and factors are user-supplied planning assumptions, not validated machine specifications.","Material, time and cost outputs are estimates only."],
  alternatives:["Invalid geometry or process inputs must be rejected rather than coerced into a plausible estimate.","A non-deterministic result for identical inputs indicates an implementation defect."],
  predictions:["Geometry volume, material mass and duration are finite and positive.","Identical inputs produce identical result hashes and outputs."],
  falsificationCriteria:["Any required numeric output is non-finite or non-positive.","Identical normalized inputs produce different output values."],
  validationPlan:["Validate the supported geometry and process inputs.","Run the deterministic estimator.","Check dimensional outputs and positivity.","Retain assumptions, units, model parameters and an input digest."],
  uncertainty:"No imported CAD mesh, slicer, machine calibration, process validation, production quotation or structural release is provided.",status:"unvalidated"});
 const parameters={x:{value:values.x,unit:"mm"},y:{value:values.y,unit:"mm"},z:{value:values.z,unit:"mm"},
  layerHeight:{value:values.layerHeight,unit:"mm"},infill:{value:values.infill,unit:"percent"},speed:{value:values.speed,unit:"mm/s"},
  density:{value:values.materialDensity,unit:"g/cm3"},pricePerKg:{value:values.pricePerKg,unit:"user-currency/kg"}};
 const experiment=createExperimentRecord({schemaVersion:1,recordType:"experiment",id:"experiment:printing-estimate-determinism-v1",
  hypothesisId:hypothesis.id,moduleId:"printing.dimension-estimator",moduleVersion:"1.0.0",parameters,
  assumptions:hypothesis.assumptions,safetyClass:"low-risk-software",createdAt});
 const numeric=[estimate.volumeCm3,estimate.materialKg,estimate.durationHours,estimate.energyKwh,estimate.totalCost];
 if(numeric.some(v=>!Number.isFinite(v)||v<=0))throw new Error("Estimator output violated finite positive output invariant");
 const payload={values,estimate};
 const result=createResultRecord({schemaVersion:1,recordType:"result",id:"result:printing-estimate-determinism-v1",experimentId:experiment.id,
  status:"pass",startedAt:createdAt,finishedAt:createdAt,inputHash:hash(payload),toolVersion:"printing-core@1.0.0",
  outputs:{shape:values.shape,process:values.process,volume:{value:estimate.volumeCm3,unit:"cm3"},
   material:{value:estimate.materialKg,unit:"kg"},duration:{value:estimate.durationHours,unit:"hours"},
   energy:{value:estimate.energyKwh,unit:"kWh"},cost:{value:estimate.totalCost,unit:"user-currency"},
   rateExplanation:estimate.rateExplanation,assumptions:hypothesis.assumptions},
  notes:"Deterministic software estimator validation only; user-supplied process assumptions are not machine specifications."});
 const records=[hypothesis,experiment,result];assertResearchReferences(records);
 return {hypothesis,experiment,result,records,estimate};
}
