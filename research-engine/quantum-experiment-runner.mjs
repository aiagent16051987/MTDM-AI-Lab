import {createHypothesisRecord,createExperimentRecord,createResultRecord,assertResearchReferences} from "./records.mjs";

const GATES=new Set(["H","X","Y","Z","S","T"]);
const matrices={
 H:[[[Math.SQRT1_2,0],[Math.SQRT1_2,0]],[[Math.SQRT1_2,0],[-Math.SQRT1_2,0]]],
 X:[[[0,0],[1,0]],[[1,0],[0,0]]],
 Y:[[[0,0],[0,-1]],[[0,1],[0,0]]],
 Z:[[[1,0],[0,0]],[[0,0],[-1,0]]],
 S:[[[1,0],[0,0]],[[0,0],[0,1]]],
 T:[[[1,0],[0,0]],[[0,0],[Math.SQRT1_2,Math.SQRT1_2]]]
};
const finite=(v,name,min,max)=>{if(typeof v!=="number"||!Number.isFinite(v)||v<min||v>max)throw new RangeError(name+" must be finite and between "+min+" and "+max);return v};
const mul=(a,b)=>[a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]];
const add=(a,b)=>[a[0]+b[0],a[1]+b[1]];
const apply=(gate,state)=>{
 const m=matrices[gate],alpha=add(mul(m[0][0],state[0]),mul(m[0][1],state[1]));
 const beta=add(mul(m[1][0],state[0]),mul(m[1][1],state[1]));
 return [alpha,beta];
};
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==="object"?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const hash=async v=>{const bytes=new TextEncoder().encode(JSON.stringify(canonical(v)));const digest=await globalThis.crypto.subtle.digest("SHA-256",bytes);return "sha256:"+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");};

export async function runQuantumUnitaryValidation(input={}){
 const gates=input.gates??["H","H"];
 if(!Array.isArray(gates)||gates.length<1||gates.length>64||gates.some(g=>!GATES.has(g)))
  throw new TypeError("gates must be a sequence of 1 to 64 supported single-qubit unitary gates");
 const initial=input.initial??"0";
 if(initial!=="0"&&initial!=="1")throw new TypeError("initial must be basis state 0 or 1");
 const tolerance=finite(input.tolerance??1e-10,"tolerance",1e-14,1e-4);
 const createdAt=input.createdAt??"2026-11-25T16:00:00Z";
 let state=initial==="0"?[[1,0],[0,0]]:[[0,0],[1,0]];
 for(const gate of gates)state=apply(gate,state);
 const p0=state[0][0]**2+state[0][1]**2,p1=state[1][0]**2+state[1][1]**2;
 const norm=p0+p1;
 const bloch={x:2*(state[0][0]*state[1][0]+state[0][1]*state[1][1]),
  y:2*(state[0][0]*state[1][1]-state[0][1]*state[1][0]),z:p0-p1};
 const blochNorm=Math.hypot(bloch.x,bloch.y,bloch.z);
 const passed=Math.abs(norm-1)<=tolerance&&Math.abs(blochNorm-1)<=tolerance;
 const parameters={initialBasis:{value:initial==="0"?0:1,unit:"basis-state-index"},gateCount:{value:gates.length,unit:"gates"},tolerance:{value:tolerance,unit:"dimensionless"}};
 const hypothesis=createHypothesisRecord({schemaVersion:1,recordType:"hypothesis",id:"hypothesis:quantum-unitary-norm-v1",
  title:"Single-qubit unitary evolution preserves state normalization",
  statement:"Any finite sequence of supported ideal single-qubit unitary gates preserves the state-vector norm and therefore the sum of computational-basis measurement probabilities.",
  domains:["quantum-information"],supportingEvidenceIds:[],opposingEvidenceIds:[],
  assumptions:["The simulator applies ideal unitary matrices exactly up to floating-point arithmetic.","Only the allowlisted H, X, Y, Z, S and T single-qubit gates are applied.","No measurement, noise channel or open-system evolution occurs during the gate sequence."],
  alternatives:["A norm deviation beyond tolerance indicates a matrix convention, implementation or numerical defect.","A non-unitary operation would require a different model and must not be silently treated as a gate."],
  predictions:["The final probability sum P(0)+P(1) equals one within tolerance.","The pure-state Bloch-vector norm equals one within tolerance."],
  falsificationCriteria:["The final state norm differs from one by more than tolerance.","The Bloch-vector norm differs from one by more than tolerance."],
  validationPlan:["Apply the allowlisted unitary matrices to a normalized basis state.","Calculate probabilities and Bloch-vector norm independently from the final amplitudes.","Compare both invariants against the configured tolerance and retain the input digest."],
  uncertainty:"High external validity limitation: this validates the software's ideal one-qubit state-vector arithmetic only, not physical quantum hardware.",
  status:"unvalidated"});
 const experiment=createExperimentRecord({schemaVersion:1,recordType:"experiment",id:"experiment:quantum-unitary-norm-v1",
  hypothesisId:hypothesis.id,moduleId:"quantum.single-qubit-unitary",moduleVersion:"1.0.0",
  parameters,assumptions:hypothesis.assumptions,safetyClass:"low-risk-software",createdAt});
 const payload={moduleId:experiment.moduleId,moduleVersion:experiment.moduleVersion,initial,gates,tolerance};
 const result=createResultRecord({schemaVersion:1,recordType:"result",id:"result:quantum-unitary-norm-v1",
  experimentId:experiment.id,status:passed?"pass":"fail",startedAt:createdAt,finishedAt:createdAt,inputHash:await hash(payload),
  toolVersion:"quantum-experiment-runner@1.0.0",
  outputs:{gates:[...gates],finalState:{alpha:state[0],beta:state[1]},probabilities:{p0,p1,sum:norm},blochVector:bloch,blochNorm,tolerance,unit:{amplitude:"dimensionless",probability:"dimensionless"}},
  notes:passed?"Ideal unitary state normalization and pure-state Bloch invariants matched tolerance.":"A state invariant exceeded the configured tolerance."});
 const records=[hypothesis,experiment,result];assertResearchReferences(records);
 return {hypothesis,experiment,result,records};
}
