import crypto from "node:crypto";
import {createNanoLattice,integrateNanoStep,calculateNanoObservables,calculateLennardJonesForces} from "../nano-core.mjs";
import {createHypothesisRecord,createExperimentRecord,createResultRecord,assertResearchReferences} from "./records.mjs";
const hash=v=>"sha256:"+crypto.createHash("sha256").update(JSON.stringify(v)).digest("hex");
const finite=(v,n,min,max)=>{if(typeof v!=="number"||!Number.isFinite(v)||v<min||v>max)throw new RangeError(n+" must be finite and between "+min+" and "+max);return v};
export function runNanoInvariantValidation(input={}){
 const count=input.count??16,seed=input.seed??20261125,steps=input.steps??100,dt=finite(input.dt??0.0005,"dt",1e-6,0.001);
 if(!Number.isInteger(count)||count<2||count>36)throw new RangeError("count must be an integer from 2 to 36");
 if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw new RangeError("seed must be an unsigned 32-bit integer");
 if(!Number.isInteger(steps)||steps<1||steps>1000)throw new RangeError("steps must be an integer from 1 to 1000");
 const createdAt=input.createdAt??"2026-11-25T16:00:00Z",model={epsilon:1,sigma:1,cutoff:2.5};
 const hypothesis=createHypothesisRecord({schemaVersion:1,recordType:"hypothesis",id:"hypothesis:nano-momentum-invariant-v1",
  title:"Pairwise Lennard-Jones forces preserve total internal momentum",
  statement:"For a closed particle set with pairwise central Lennard-Jones forces and no wall collisions, internal forces sum to zero and the total momentum remains constant up to numerical integration error.",
  domains:["classical-molecular-dynamics"],supportingEvidenceIds:[],opposingEvidenceIds:[],
  assumptions:["Two-dimensional classical point particles.","Pair forces are central and evaluated pairwise once.","No reflecting-wall collisions occur during this validation window.","Reduced Lennard-Jones units; no calibrated physical mapping."],
  alternatives:["Momentum drift beyond tolerance indicates asymmetric force accumulation or integration error.","A wall collision introduces an external impulse and invalidates the closed-system invariant."],
  predictions:["The vector sum of pair forces is zero within floating-point tolerance.","Total momentum remains constant within the configured numeric tolerance when no boundary is reached."],
  falsificationCriteria:["Initial total force magnitude exceeds 1e-10.","Final momentum drift exceeds 1e-5 reduced units."],
  validationPlan:["Create a reproducible seeded lattice.","Check the sum of pair forces independently.","Integrate with bounded velocity-Verlet steps in a wide box.","Compare initial and final total momentum and retain the exact input digest."],
  uncertainty:"This tests invariants of a small educational 2D model, not material-specific molecular dynamics or thermodynamics.",status:"unvalidated"});
 const experiment=createExperimentRecord({schemaVersion:1,recordType:"experiment",id:"experiment:nano-momentum-invariant-v1",hypothesisId:hypothesis.id,
  moduleId:"nano.lennard-jones-2d",moduleVersion:"1.0.0",
  parameters:{count:{value:count,unit:"particles"},seed:{value:seed,unit:"uint32"},steps:{value:steps,unit:"steps"},dt:{value:dt,unit:"reduced-time"}},
  assumptions:hypothesis.assumptions,safetyClass:"low-risk-software",createdAt});
 let particles=createNanoLattice({count,columns:Math.min(6,count),seed,velocityScale:0.08});
 const initial=calculateNanoObservables(particles,model),forces=calculateLennardJonesForces(particles,model);
 const forceResidual=Math.hypot(forces.reduce((s,f)=>s+f.fx,0),forces.reduce((s,f)=>s+f.fy,0));
 for(let i=0;i<steps;i++)particles=integrateNanoStep(particles,dt,{...model,bounds:{min:-100,max:100}});
 const final=calculateNanoObservables(particles,model);
 const momentumDrift=Math.hypot(final.momentumX-initial.momentumX,final.momentumY-initial.momentumY);
 const passed=forceResidual<=1e-10&&momentumDrift<=1e-5;
 const result=createResultRecord({schemaVersion:1,recordType:"result",id:"result:nano-momentum-invariant-v1",experimentId:experiment.id,
  status:passed?"pass":"fail",startedAt:createdAt,finishedAt:createdAt,inputHash:hash({count,seed,steps,dt,model}),
  toolVersion:"nano-core@1.0.0",outputs:{forceResidual:{value:forceResidual,unit:"reduced-force"},initialMomentum:{x:initial.momentumX,y:initial.momentumY,unit:"reduced-momentum"},
   finalMomentum:{x:final.momentumX,y:final.momentumY,unit:"reduced-momentum"},momentumDrift:{value:momentumDrift,unit:"reduced-momentum"},initialEnergy:initial.totalEnergy,finalEnergy:final.totalEnergy,steps,dt},
  notes:passed?"Pair-force symmetry and momentum conservation passed for this seeded no-wall fixture.":"A numerical invariant exceeded its configured tolerance."});
 const records=[hypothesis,experiment,result];assertResearchReferences(records);
 return {hypothesis,experiment,result,records};
}
