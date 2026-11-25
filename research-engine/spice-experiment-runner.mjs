import crypto from "node:crypto";
import {simulate} from "@spice-ts/core";
import {createHypothesisRecord,createExperimentRecord,createResultRecord,assertResearchReferences} from "./records.mjs";
const finite=(n,name,min,max)=>{if(typeof n!=="number"||!Number.isFinite(n)||n<min||n>max)throw new RangeError(name+" must be finite and between "+min+" and "+max);return n};
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==="object"?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const hash=value=>"sha256:"+crypto.createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
export async function runVoltageDividerValidation(input={}) {
 const voltage=finite(input.voltage??12,"voltage",0.01,60);
 const r1=finite(input.r1??20000,"r1",1,1e7),r2=finite(input.r2??10000,"r2",1,1e7);
 const tolerance=finite(input.tolerance??1e-5,"tolerance",1e-8,0.1);
 const createdAt=input.createdAt??"2026-11-25T16:00:00Z";
 const parameters={voltage:{value:voltage,unit:"V"},r1:{value:r1,unit:"ohm"},r2:{value:r2,unit:"ohm"},tolerance:{value:tolerance,unit:"V"}};
 const hypothesis=createHypothesisRecord({schemaVersion:1,recordType:"hypothesis",id:"hypothesis:spice-divider-v1",
  title:"Ideal resistive voltage-divider relation",
  statement:"For an ideal DC source and two series resistors, the unloaded output across R2 equals Vin × R2/(R1+R2).",
  domains:["electronics"],supportingEvidenceIds:[],opposingEvidenceIds:[],
  assumptions:["Ideal DC voltage source.","Ideal resistors with constant positive resistance.","No load is connected across the output.","Ground reference is node 0."],
  alternatives:["A non-zero load changes the divider ratio.","A wiring or node-reference error changes the measured output."],
  predictions:["SPICE DC operating-point V(out) equals the analytical divider equation within tolerance."],
  falsificationCriteria:["Absolute SPICE-to-analytical output difference exceeds tolerance."],
  validationPlan:["Validate positive bounded voltage and resistance inputs.","Generate a fixed SPICE netlist with no external include or control commands.","Run the deterministic DC operating-point solver.","Compare V(out) with the independent analytical equation.","Record model version, SI units, input hash and result."],
  uncertainty:"This verifies an ideal circuit model and solver fixture, not component tolerance, thermal behaviour or a physical circuit.",status:"unvalidated"});
 const experiment=createExperimentRecord({schemaVersion:1,recordType:"experiment",id:"experiment:spice-divider-v1",hypothesisId:hypothesis.id,
  moduleId:"electronics.spice-divider",moduleVersion:"spice-ts@0.4.0",parameters,assumptions:hypothesis.assumptions,
  safetyClass:"low-risk-software",createdAt});
 const spiceOhms=value=>value>=1e6?String(value/1e6)+"meg":value>=1e3?String(value/1e3)+"k":String(value);
 const netlist="V1 in 0 DC "+voltage+"\nR1 in out "+spiceOhms(r1)+"\nR2 out 0 "+spiceOhms(r2)+"\n.op\n.end";
 const output=await simulate(netlist);
 const actual=output.dc?.voltage("out");
 if(typeof actual!=="number"||!Number.isFinite(actual))throw new Error("SPICE solver did not return a finite DC output");
 const expected=voltage*r2/(r1+r2),error=Math.abs(actual-expected),passed=error<=tolerance;
 const result=createResultRecord({schemaVersion:1,recordType:"result",id:"result:spice-divider-v1",experimentId:experiment.id,
  status:passed?"pass":"fail",startedAt:createdAt,finishedAt:createdAt,inputHash:hash({netlist,parameters,moduleVersion:experiment.moduleVersion}),
  toolVersion:"@spice-ts/core@0.4.0",outputs:{actual:{value:actual,unit:"V"},expected:{value:expected,unit:"V"},absoluteError:{value:error,unit:"V"},tolerance:{value:tolerance,unit:"V"}},notes:passed?"SPICE DC result matched independent divider equation within tolerance.":"SPICE DC result exceeded the configured analytical tolerance."});
 const records=[hypothesis,experiment,result];assertResearchReferences(records);
 return {hypothesis,experiment,result,records,netlist};
}
