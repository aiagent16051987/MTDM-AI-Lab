const finite=(x,n)=>{if(typeof x!=="number"||!Number.isFinite(x))throw new TypeError(n+" must be finite");return x};
function gaussian(A,b){const n=b.length,m=A.map((r,i)=>[...r,b[i]]);for(let k=0;k<n;k++){let p=k;for(let i=k+1;i<n;i++)if(Math.abs(m[i][k])>Math.abs(m[p][k]))p=i;if(Math.abs(m[p][k])<1e-14)throw new Error("singular circuit matrix");[m[k],m[p]]=[m[p],m[k]];const d=m[k][k];for(let j=k;j<=n;j++)m[k][j]/=d;for(let i=0;i<n;i++)if(i!==k){const f=m[i][k];for(let j=k;j<=n;j++)m[i][j]-=f*m[k][j]}}return m.map(r=>r[n])}
export function solveDCNetwork({nodes,resistors,sources=[],diodes=[],ground=0,maxIterations=100,tolerance=1e-9}){
 if(!Number.isInteger(nodes)||nodes<2||nodes>64||!Array.isArray(resistors)||!Array.isArray(sources)||!Array.isArray(diodes))throw new TypeError("invalid circuit definition");
 const validNode=n=>Number.isInteger(n)&&n>=0&&n<nodes,unknown=Array.from({length:nodes},(_,i)=>i).filter(i=>i!==ground),idx=new Map(unknown.map((n,i)=>[n,i]));
 if(!validNode(ground))throw new RangeError("invalid ground node");
 if(!Number.isInteger(maxIterations)||maxIterations<1||maxIterations>10000||!Number.isFinite(tolerance)||tolerance<=0||tolerance>1e-3)throw new RangeError("invalid solver iteration limit or tolerance");
 const src=sources.map(s=>{if(!validNode(s.p)||!validNode(s.n)||s.p===s.n)throw new RangeError("invalid voltage source nodes");finite(s.voltage,"source voltage");return s});
 const res=resistors.map(r=>{if(!validNode(r.p)||!validNode(r.n)||r.p===r.n||!Number.isFinite(r.ohms)||r.ohms<=0)throw new RangeError("invalid resistor");return r});
 const ds=diodes.map(d=>{if(!validNode(d.p)||!validNode(d.n)||d.p===d.n||!Number.isFinite(d.is)||d.is<=0||!Number.isFinite(d.nvt)||d.nvt<=0)throw new RangeError("invalid diode model");return d});
 const size=unknown.length+src.length;let voltages=new Array(nodes).fill(0),iterations=0;
 // A forward-junction seed avoids the near-zero derivative singularity of an initially unbiased Shockley diode.
 for(const d of ds) if(Math.abs(voltages[d.p]-voltages[d.n])<1e-12) voltages[d.p]=voltages[d.n]+0.7;
 for(;iterations<maxIterations;iterations++){
  const A=Array.from({length:size},()=>Array(size).fill(0)),b=Array(size).fill(0);
  const stampG=(p,n,g)=>{if(idx.has(p))A[idx.get(p)][idx.get(p)]+=g;if(idx.has(n))A[idx.get(n)][idx.get(n)]+=g;if(idx.has(p)&&idx.has(n)){A[idx.get(p)][idx.get(n)]-=g;A[idx.get(n)][idx.get(p)]-=g}};
  for(const r of res){const g=1/r.ohms;stampG(r.p,r.n,g)}
  for(const d of ds){const v=voltages[d.p]-voltages[d.n],ev=Math.max(-40,Math.min(40,v/d.nvt)),current=d.is*Math.expm1(ev),g=Math.max(d.is*Math.exp(ev)/d.nvt,1e-12),equiv=current-g*v;stampG(d.p,d.n,g);if(idx.has(d.p))b[idx.get(d.p)]-=equiv;if(idx.has(d.n))b[idx.get(d.n)]+=equiv}
  src.forEach((s,j)=>{const k=unknown.length+j;if(idx.has(s.p)){A[idx.get(s.p)][k]+=1;A[k][idx.get(s.p)]+=1}if(idx.has(s.n)){A[idx.get(s.n)][k]-=1;A[k][idx.get(s.n)]-=1}b[k]=s.voltage});
  const solution=gaussian(A,b),next=new Array(nodes).fill(0);unknown.forEach((node,i)=>next[node]=solution[i]);
  const updated=next;
  const error=Math.max(...updated.map((v,i)=>Math.abs(v-voltages[i])));voltages=updated;if(error<tolerance)break;
 }
 if(iterations===maxIterations)throw new Error("nonlinear operating point did not converge");
 const resistorCurrents=res.map(r=>({p:r.p,n:r.n,current:(voltages[r.p]-voltages[r.n])/r.ohms}));
 const diodeCurrents=ds.map(d=>({p:d.p,n:d.n,current:d.is*Math.expm1(Math.max(-40,Math.min(40,(voltages[d.p]-voltages[d.n])/d.nvt)))}));
 return {voltages,resistorCurrents,diodeCurrents,iterations:iterations+1,converged:true,method:"Newton-Raphson modified nodal analysis"};
}
export function simulateRCTransient({voltage,resistance,capacitance,duration,step,initialVoltage=0}){
 for(const [n,v] of Object.entries({voltage,resistance,capacitance,duration,step,initialVoltage}))finite(v,n);
 if(resistance<=0||capacitance<=0||duration<=0||step<=0||step>duration)throw new RangeError("invalid RC transient parameters");
 const rc=resistance*capacitance,points=[];for(let t=0;t<=duration+step*1e-9;t+=step){const v=voltage+(initialVoltage-voltage)*Math.exp(-t/rc);points.push({time:t,voltage:v,current:(voltage-v)/resistance})}
 return {timeConstant:rc,points,method:"closed-form ideal first-order RC response"};
}
