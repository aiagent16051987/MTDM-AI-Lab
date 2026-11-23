// MTDM AI Lab — bounded, browser-only advanced research demonstrations.
export const COMPLEX_GATES = {
  H: [[ [Math.SQRT1_2,0], [Math.SQRT1_2,0] ], [ [Math.SQRT1_2,0], [-Math.SQRT1_2,0] ]],
  X: [[ [0,0], [1,0] ], [ [1,0], [0,0] ]],
  Z: [[ [1,0], [0,0] ], [ [0,0], [-1,0] ]],
  S: [[ [1,0], [0,0] ], [ [0,0], [0,1] ]],
  T: [[ [1,0], [0,0] ], [ [0,0], [Math.SQRT1_2,Math.SQRT1_2] ]]
};
const add=(a,b)=>[a[0]+b[0],a[1]+b[1]];
const mul=(a,b)=>[a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]];
const mag2=a=>a[0]*a[0]+a[1]*a[1];
export function normalizeState(state) {
  if (!Array.isArray(state)||state.length!==4) throw new TypeError("A two-qubit state must contain four amplitudes.");
  const n=Math.sqrt(state.reduce((s,a)=>s+mag2(a),0));
  if (!Number.isFinite(n)||n<1e-12) throw new RangeError("State norm must be finite and non-zero.");
  return state.map(a=>[a[0]/n,a[1]/n]);
}
export function applySingleQubitGate(state, gateName, qubit=0) {
  if (![0,1].includes(qubit)||!COMPLEX_GATES[gateName]) throw new RangeError("Unsupported gate or qubit index.");
  const input=normalizeState(state), m=COMPLEX_GATES[gateName], out=input.map(a=>[...a]);
  const pairs=qubit===0?[[0,2],[1,3]]:[[0,1],[2,3]];
  for(const [i,j] of pairs){
    out[i]=add(mul(m[0][0],input[i]),mul(m[0][1],input[j]));
    out[j]=add(mul(m[1][0],input[i]),mul(m[1][1],input[j]));
  }
  return normalizeState(out);
}
export function applyCNOT(state) {
  const s=normalizeState(state);
  return [s[0],s[1],s[3],s[2]];
}
export function measurementProbabilities(state) {
  const s=normalizeState(state);
  return s.map(mag2);
}
export function measureTwoQubit(state, random=Math.random) {
  const s=normalizeState(state), p=measurementProbabilities(s), r=Math.max(0,Math.min(0.999999999,Number(random())));
  let cumulative=0, result=3;
  for(let i=0;i<4;i++){cumulative+=p[i];if(r<cumulative){result=i;break;}}
  const collapsed=s.map((a,i)=>i===result?[1,0]:[0,0]);
  return {result, state:collapsed};
}
export function reducedBlochVector(state, qubit=0) {
  if (![0,1].includes(qubit)) throw new RangeError("Qubit index must be 0 or 1.");
  const s=normalizeState(state), pairs=qubit===0?[[0,2],[1,3]]:[[0,1],[2,3]];
  let p0=0,p1=0,re=0,im=0;
  for(const [i,j] of pairs){
    p0+=mag2(s[i]);p1+=mag2(s[j]);
    re+=s[i][0]*s[j][0]+s[i][1]*s[j][1];
    im+=s[i][1]*s[j][0]-s[i][0]*s[j][1];
  }
  return {x:2*re,y:2*im,z:p0-p1};
}

// Dimensionless leaky-integrate-and-fire teaching model. No biological inference.
export function simulateLIF({steps=500,dt=0.01,tau=0.1,threshold=1,reset=0,refractory=3,current=0.8}={}) {
  if(!Number.isInteger(steps)||steps<1||steps>5000) throw new RangeError("steps must be an integer from 1 to 5000.");
  if(!Number.isFinite(dt)||dt<0.001||dt>0.05) throw new RangeError("dt must be between 0.001 and 0.05.");
  if(!Number.isFinite(tau)||tau<0.01||tau>2) throw new RangeError("tau must be between 0.01 and 2.");
  if(!Number.isFinite(threshold)||threshold<0.1||threshold>2) throw new RangeError("threshold must be between 0.1 and 2.");
  if(!Number.isFinite(reset)||reset< -0.5||reset>=threshold) throw new RangeError("reset must be >= -0.5 and below threshold.");
  if(!Number.isInteger(refractory)||refractory<0||refractory>100) throw new RangeError("refractory must be from 0 to 100 steps.");
  if(!Number.isFinite(current)||current<0||current>3) throw new RangeError("current must be between 0 and 3.");
  let v=0,hold=0;const voltage=[],spikes=[];
  for(let i=0;i<steps;i++){
    if(hold>0){hold--;v=reset;}
    else {v+=dt*((-v+current)/tau);if(v>=threshold){spikes.push(i);v=reset;hold=refractory;}}
    voltage.push(v);
  }
  return {voltage,spikes,steps,dt};
}

function drawBloch(canvas, vector) {
  if(!canvas)return;
  const ctx=canvas.getContext("2d"), d=Math.min(window.devicePixelRatio||1,2);
  const w=Math.max(240,canvas.clientWidth),h=Math.max(220,canvas.clientHeight);
  canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);ctx.setTransform(d,0,0,d,0,0);
  ctx.clearRect(0,0,w,h);ctx.fillStyle="#091321";ctx.fillRect(0,0,w,h);
  const cx=w/2,cy=h/2,r=Math.min(w*.31,h*.36);
  ctx.strokeStyle="#486078";ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle="#31465e";ctx.setLineDash([4,5]);ctx.beginPath();ctx.ellipse(cx,cy,r,r*.35,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
  const axes=[[1,0,0,"X"],[0,1,0,"Y"],[0,0,1,"Z"]];
  axes.forEach(([x,y,z,label])=>{const px=cx+r*(x-y*.35),py=cy-r*(z+y*.2);ctx.strokeStyle="#53677e";ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(px,py);ctx.stroke();ctx.fillStyle="#9fb1c7";ctx.font="11px sans-serif";ctx.fillText(label,px+(x?7:-12),py+(z?-5:14));});
  const px=cx+r*(vector.x-vector.y*.35),py=cy-r*(vector.z+vector.y*.2);
  ctx.strokeStyle="#5eead4";ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(px,py);ctx.stroke();
  ctx.fillStyle="#5eead4";ctx.beginPath();ctx.arc(px,py,5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#cbd5e1";ctx.font="11px ui-monospace,monospace";ctx.fillText("Reduced state of qubit 0",12,h-12);
}
function drawLIF(canvas,result,threshold) {
  if(!canvas)return;
  const ctx=canvas.getContext("2d"),d=Math.min(window.devicePixelRatio||1,2);
  const w=Math.max(260,canvas.clientWidth),h=Math.max(180,canvas.clientHeight);
  canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);ctx.setTransform(d,0,0,d,0,0);
  ctx.fillStyle="#091321";ctx.fillRect(0,0,w,h);
  const pad={l:36,r:12,t:15,b:25},pw=w-pad.l-pad.r,ph=h-pad.t-pad.b;
  ctx.strokeStyle="#263b52";ctx.lineWidth=1;
  for(let k=0;k<=4;k++){const y=pad.t+k*ph/4;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();}
  const min=-.2,max=Math.max(1.2,threshold*1.15),yOf=v=>pad.t+(max-v)/(max-min)*ph;
  ctx.strokeStyle="#fbbf24";ctx.setLineDash([5,4]);ctx.beginPath();ctx.moveTo(pad.l,yOf(threshold));ctx.lineTo(w-pad.r,yOf(threshold));ctx.stroke();ctx.setLineDash([]);
  ctx.strokeStyle="#5eead4";ctx.lineWidth=1.8;ctx.beginPath();
  result.voltage.forEach((v,i)=>{const x=pad.l+i/(result.voltage.length-1||1)*pw,y=yOf(v);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke();
  ctx.fillStyle="#fbbf24";result.spikes.forEach(i=>{const x=pad.l+i/(result.voltage.length-1||1)*pw;ctx.beginPath();ctx.arc(x,yOf(threshold),3,0,Math.PI*2);ctx.fill();});
  ctx.fillStyle="#9aadc2";ctx.font="10px sans-serif";ctx.fillText("Membrane voltage (normalized)",pad.l,11);ctx.fillText("Time →",w-48,h-7);
}

if (typeof document !== "undefined") (() => {
  const $=id=>document.getElementById(id);
  const canvas=$("quantumBlochCanvas");
  if(canvas){
    const zero=()=>[[1,0],[0,0],[0,0],[0,0]];
    let state=zero();
    const render=()=>{
      const p=measurementProbabilities(state),v=reducedBlochVector(state,0);
      $("twoQubitState").textContent=state.map((a,i)=>"("+a[0].toFixed(3)+(a[1]<0?" − ":" + ")+Math.abs(a[1]).toFixed(3)+"i)|"+["00","01","10","11"][i]+"⟩").join("  ");
      $("twoQubitProbabilities").textContent=p.map((x,i)=>"P("+["00","01","10","11"][i]+") "+(x*100).toFixed(1)+"%").join(" · ");
      $("quantumBlochReadout").textContent="Qubit 0 reduced Bloch vector: ("+[v.x,v.y,v.z].map(x=>x.toFixed(3)).join(", ")+")";
      drawBloch(canvas,v);
    };
    document.querySelectorAll("[data-qgate]").forEach(btn=>btn.addEventListener("click",()=>{
      const [gate,q]=btn.dataset.qgate.split(":");state=applySingleQubitGate(state,gate,Number(q));render();
      $("quantum2Log").textContent=gate+" gate applied to qubit "+q+".";
    }));
    $("qCnot").addEventListener("click",()=>{state=applyCNOT(state);render();$("quantum2Log").textContent="CNOT applied: control qubit 0, target qubit 1.";});
    $("qBell").addEventListener("click",()=>{state=applyCNOT(applySingleQubitGate(zero(),"H",0));render();$("quantum2Log").textContent="Bell state prepared: (|00⟩ + |11⟩)/√2. The reduced state of either qubit is mixed.";});
    $("qReset").addEventListener("click",()=>{state=zero();render();$("quantum2Log").textContent="Two-qubit state reset to |00⟩.";});
    $("qMeasure").addEventListener("click",()=>{const m=measureTwoQubit(state);state=m.state;render();$("quantum2Log").textContent="Measured |"+["00","01","10","11"][m.result]+"⟩; state collapsed to that basis state.";});
    window.addEventListener("resize",render);render();
  }
  const lifCanvas=$("lifCanvas");
  if(lifCanvas){
    const run=()=>{
      const result=simulateLIF({steps:500,dt:.01,tau:Number($("lifTau").value),threshold:Number($("lifThreshold").value),current:Number($("lifCurrent").value),reset:0,refractory:4});
      drawLIF(lifCanvas,result,Number($("lifThreshold").value));
      $("lifSpikeCount").textContent=String(result.spikes.length);
      $("lifStatus").textContent="SIMULATED · DETERMINISTIC";
      $("lifLog").textContent="500 time steps · dt = 0.01 normalized units\nSpikes: "+result.spikes.length+"\nFirst spike step: "+(result.spikes[0]??"none")+
        "\nFinal membrane voltage: "+result.voltage.at(-1).toFixed(3)+"\nRefractory period: 4 steps\n\nAbstract LIF model; not a biological neuron or medical model.";
    };
    ["lifTau","lifThreshold","lifCurrent"].forEach(id=>$(id).addEventListener("input",()=>$(id+"Value").textContent=Number($(id).value).toFixed(2)));
    $("lifRun").addEventListener("click",run);
    $("lifReset").addEventListener("click",()=>{$("lifTau").value="0.10";$("lifThreshold").value="1.00";$("lifCurrent").value="0.80";["lifTau","lifThreshold","lifCurrent"].forEach(id=>$(id+"Value").textContent=Number($(id).value).toFixed(2));run();});
    run();
  }
})();
