import crypto from "node:crypto";
import {stepDiffDrive} from "../robotics-core.js";
import {createHypothesisRecord,createExperimentRecord,createResultRecord,assertResearchReferences} from "./records.mjs";

const finite=(n,name,min,max)=>{if(typeof n!=="number"||!Number.isFinite(n)||n<min||n>max)throw new RangeError(name+" must be finite and between "+min+" and "+max);return n};
const stable=value=>JSON.stringify(value,Object.keys(value).sort());
const hash=value=>"sha256:"+crypto.createHash("sha256").update(stable(value)).digest("hex");

export function runStraightDriveValidation(input={}) {
  const leftAngular=finite(input.leftAngular??2,"leftAngular",-8,8);
  const rightAngular=finite(input.rightAngular??2,"rightAngular",-8,8);
  const wheelRadius=finite(input.wheelRadius??0.1,"wheelRadius",0.01,0.5);
  const wheelBase=finite(input.wheelBase??0.5,"wheelBase",0.05,2);
  const duration=finite(input.duration??1,"duration",0.01,10);
  const tolerance=finite(input.tolerance??1e-9,"tolerance",1e-12,1e-3);
  const createdAt=input.createdAt??"2026-11-25T16:00:00Z";
  const parameters={leftAngular:{value:leftAngular,unit:"rad/s"},rightAngular:{value:rightAngular,unit:"rad/s"},
    wheelRadius:{value:wheelRadius,unit:"m"},wheelBase:{value:wheelBase,unit:"m"},duration:{value:duration,unit:"s"},tolerance:{value:tolerance,unit:"m"}};
  const hypothesis=createHypothesisRecord({schemaVersion:1,recordType:"hypothesis",id:"hypothesis:diff-drive-straight-line-v1",
    title:"Differential-drive straight-line displacement invariant",
    statement:"When both wheels have equal angular velocity, ideal differential-drive kinematics produce zero heading change and straight-line displacement equal to wheel angular velocity multiplied by wheel radius and elapsed time.",
    domains:["robotics"],supportingEvidenceIds:[],opposingEvidenceIds:[],
    assumptions:["Both wheels have equal angular velocity.","Wheel radius and wheelbase are constant.","No slip, backlash, motor dynamics or external forces are modelled.","The ideal planar differential-drive kinematic model applies."],
    alternatives:["A heading change indicates unequal wheel speeds or a sign/convention defect.","A displacement mismatch indicates numerical integration or parameter-unit error."],
    predictions:["Final x displacement equals leftAngular × wheelRadius × duration for zero initial heading.","Final y displacement is zero within tolerance.","Final heading remains zero within tolerance."],
    falsificationCriteria:["Absolute x error exceeds the configured metre tolerance.","Absolute y displacement exceeds the configured metre tolerance.","Absolute heading change exceeds the configured radian tolerance."],
    validationPlan:["Run the deterministic differential-drive integrator with equal wheel speeds.","Calculate the analytical displacement independently.","Compare x, y and heading against the stated tolerances.","Retain parameters, model version, input hash and result."],
    uncertainty:"High external validity uncertainty: this tests a mathematical invariant of an ideal software model, not a physical robot.",status:"unvalidated"});
  const experiment=createExperimentRecord({schemaVersion:1,recordType:"experiment",id:"experiment:diff-drive-straight-line-v1",
    hypothesisId:hypothesis.id,moduleId:"robotics.diff-drive",moduleVersion:"1.0.0",parameters,
    assumptions:hypothesis.assumptions,safetyClass:"low-risk-software",createdAt});
  const initial={x:0,y:0,theta:0};
  const actual=stepDiffDrive(initial,leftAngular,rightAngular,wheelRadius,wheelBase,duration);
  const expectedX=((leftAngular+rightAngular)/2)*wheelRadius*duration;
  const errors={x:Math.abs(actual.x-expectedX),y:Math.abs(actual.y),theta:Math.abs(actual.theta)};
  const passed=errors.x<=tolerance&&errors.y<=tolerance&&errors.theta<=tolerance;
  const payload={moduleId:experiment.moduleId,moduleVersion:experiment.moduleVersion,parameters,initial};
  const result=createResultRecord({schemaVersion:1,recordType:"result",id:"result:diff-drive-straight-line-v1",
    experimentId:experiment.id,status:passed?"pass":"fail",startedAt:createdAt,finishedAt:createdAt,inputHash:hash(payload),
    toolVersion:"robotics-core@1.0.0",outputs:{actual,expected:{x:expectedX,y:0,theta:0},absoluteError:errors,tolerance,unit:{position:"m",angle:"rad"}},notes:passed?"Ideal-model invariant matched within configured tolerance.":"Ideal-model invariant exceeded configured tolerance."});
  const records=[hypothesis,experiment,result];
  assertResearchReferences(records);
  return {hypothesis,experiment,result,records};
}
