const $ = (id) => document.getElementById(id);
const log = (id, value) => { const el = $(id); if (el) el.textContent = value; };

// ---------------- Robotics: differential-drive kinematics ----------------
(() => {
  const canvas = $("robotCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const state = { x: 0, y: 0, theta: 0, trail: [], running: false, last: 0, left: 2, right: 3 };
  const wheelBase = 0.72;
  const scale = 92;
  const draw = () => {
    const w = canvas.width = canvas.clientWidth * devicePixelRatio;
    const h = canvas.height = canvas.clientHeight * devicePixelRatio;
    ctx.clearRect(0,0,w,h);
    ctx.save(); ctx.translate(w/2,h/2); ctx.scale(devicePixelRatio,-devicePixelRatio);
    ctx.strokeStyle = "#26384e"; ctx.lineWidth = 1;
    for(let x=-10;x<=10;x++){ctx.beginPath();ctx.moveTo(x*scale,-h/2);ctx.lineTo(x*scale,h/2);ctx.stroke()}
    for(let y=-7;y<=7;y++){ctx.beginPath();ctx.moveTo(-w/2,y*scale);ctx.lineTo(w/2,y*scale);ctx.stroke()}
    if(state.trail.length>1){ctx.strokeStyle="#5eead4";ctx.lineWidth=2;ctx.beginPath();state.trail.forEach((p,i)=>{const x=p.x*scale,y=p.y*scale;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke()}
    const x=state.x*scale,y=state.y*scale;
    ctx.translate(x,y);ctx.rotate(-state.theta);
    ctx.fillStyle="#2563eb";ctx.strokeStyle="#a5f3fc";ctx.lineWidth=2;
    ctx.beginPath();ctx.roundRect(-24,-17,48,34,8);ctx.fill();ctx.stroke();
    ctx.fillStyle="#fbbf24";ctx.beginPath();ctx.moveTo(18,0);ctx.lineTo(7,7);ctx.lineTo(7,-7);ctx.closePath();ctx.fill();
    ctx.fillStyle="#e2e8f0";ctx.fillRect(-17,-22,12,5);ctx.fillRect(5,-22,12,5);
    ctx.restore();
    $("robotPose").textContent="x "+state.x.toFixed(2)+" m · y "+state.y.toFixed(2)+" m · θ "+(state.theta*180/Math.PI).toFixed(1)+"°";
  };
  const step = (now) => {
    if(!state.running) return;
    const dt = Math.min((now-state.last)/1000,0.04); state.last=now;
    const vl=state.left*0.12, vr=state.right*0.12;
    const v=(vl+vr)/2, omega=(vr-vl)/wheelBase;
    state.x += v*Math.cos(state.theta)*dt;
    state.y += v*Math.sin(state.theta)*dt;
    state.theta += omega*dt;
    state.trail.push({x:state.x,y:state.y}); if(state.trail.length>1500) state.trail.shift();
    draw(); requestAnimationFrame(step);
  };
  $("leftWheel").addEventListener("input",e=>{state.left=Number(e.target.value);$("leftWheelValue").textContent=state.left.toFixed(1)});
  $("rightWheel").addEventListener("input",e=>{state.right=Number(e.target.value);$("rightWheelValue").textContent=state.right.toFixed(1)});
  $("robotStart").onclick=()=>{if(state.running)return;state.running=true;state.last=performance.now();requestAnimationFrame(step);log("robotStatus","RUNNING · kinematic model")};
  $("robotStop").onclick=()=>{state.running=false;log("robotStatus","PAUSED")};
  $("robotReset").onclick=()=>{state.running=false;state.x=0;state.y=0;state.theta=0;state.trail=[];draw();log("robotStatus","RESET · initial pose")};
  window.addEventListener("resize",draw); draw();
})();

// ---------------- Quantum: one-qubit state-vector simulator ----------------
(() => {
  const out = $("quantumState");
  if (!out) return;
  let a=[1,0], b=[0,0]; // complex amplitudes alpha and beta
  const c=(r,i=0)=>[r,i];
  const add=(x,y)=>[x[0]+y[0],x[1]+y[1]];
  const mul=(x,y)=>[x[0]*y[0]-x[1]*y[1],x[0]*y[1]+x[1]*y[0]];
  const norm=()=>{const n=Math.sqrt(a[0]**2+a[1]**2+b[0]**2+b[1]**2)||1;a=a.map(x=>x/n);b=b.map(x=>x/n)};
  const fmt=z=>(z[0].toFixed(3)+(z[1]<0?" − ":" + ")+Math.abs(z[1]).toFixed(3)+"i");
  const render=()=>{
    const p0=a[0]**2+a[1]**2,p1=b[0]**2+b[1]**2;
    $("quantumState").textContent="|ψ⟩ = ("+fmt(a)+") |0⟩ + ("+fmt(b)+") |1⟩";
    $("quantumP0").textContent=(p0*100).toFixed(2)+"%";
    $("quantumP1").textContent=(p1*100).toFixed(2)+"%";
    const x=2*(a[0]*b[0]+a[1]*b[1]), y=2*(a[0]*b[1]-a[1]*b[0]), z=p0-p1;
    $("blochVector").textContent="Bloch vector: ("+x.toFixed(3)+", "+y.toFixed(3)+", "+z.toFixed(3)+")";
  };
  const apply=(m)=>{const na=add(mul(m[0][0],a),mul(m[0][1],b));const nb=add(mul(m[1][0],a),mul(m[1][1],b));a=na;b=nb;norm();render()};
  const s=Math.SQRT1_2;
  const gates={
    H:[[c(s),c(s)],[c(s),c(-s)]],
    X:[[c(0),c(1)],[c(1),c(0)]],
    Y:[[c(0),c(0,-1)],[c(0,1),c(0)]],
    Z:[[c(1),c(0)],[c(0),c(-1)]],
    S:[[c(1),c(0)],[c(0),c(0,1)]],
    T:[[c(1),c(0)],[c(0),c(Math.SQRT1_2,Math.SQRT1_2)]]
  };
  document.querySelectorAll("[data-gate]").forEach(btn=>btn.onclick=()=>apply(gates[btn.dataset.gate]));
  $("quantumReset").onclick=()=>{a=[1,0];b=[0,0];render();log("quantumLog","State reset to |0⟩.")};
  $("quantumMeasure").onclick=()=>{
    const p1=b[0]**2+b[1]**2, result=Math.random()<p1?1:0;
    a=result===0?[1,0]:[0,0];b=result===1?[1,0]:[0,0];render();
    log("quantumLog","Measurement result: |"+result+"⟩. State collapsed to measured basis state.");
  };
  $("quantumBell").onclick=()=>{a=[s,0];b=[0,s];render();log("quantumLog","Prepared one-qubit equal superposition. This is not an entangled Bell pair; a two-qubit CNOT workspace is a later milestone.")};
  render();
})();

// ---------------- Nano: educational 2D Lennard-Jones molecular dynamics ----------------
(() => {
  const canvas=$("nanoCanvas"); if(!canvas)return;
  const ctx=canvas.getContext("2d");
  let particles=[],running=false,last=0;
  const N=36, dt=0.0015, epsilon=1, sigma=1, cutoff=2.5;
  const init=()=>{
    particles=[];
    const side=6;
    for(let i=0;i<N;i++){const x=(i%side+0.5)*1.35+0.5,y=(Math.floor(i/side)+0.5)*1.35+0.5;particles.push({x,y,vx:(Math.random()-.5)*.25,vy:(Math.random()-.5)*.25,fx:0,fy:0})}
    forces(); draw();
  };
  const forces=()=>{
    particles.forEach(p=>{p.fx=0;p.fy=0});
    for(let i=0;i<N;i++)for(let j=i+1;j<N;j++){
      const p=particles[i],q=particles[j],dx=q.x-p.x,dy=q.y-p.y,r2=dx*dx+dy*dy;
      if(r2<0.04||r2>cutoff*cutoff)continue;
      const sr2=sigma*sigma/r2,sr6=sr2*sr2*sr2;
      const f=24*epsilon*sr6*(2*sr6-1)/r2;
      const fx=f*dx,fy=f*dy;p.fx-=fx;p.fy-=fy;q.fx+=fx;q.fy+=fy;
    }
  };
  const integrate=()=>{
    particles.forEach(p=>{p.vx+=.5*p.fx*dt;p.vy+=.5*p.fy*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
      if(p.x<0.2||p.x>9.8){p.vx*=-1;p.x=Math.max(.2,Math.min(9.8,p.x))}
      if(p.y<0.2||p.y>9.8){p.vy*=-1;p.y=Math.max(.2,Math.min(9.8,p.y))}
    });
    forces();particles.forEach(p=>{p.vx+=.5*p.fx*dt;p.vy+=.5*p.fy*dt});
  };
  const draw=()=>{
    const w=canvas.width=canvas.clientWidth*devicePixelRatio,h=canvas.height=canvas.clientHeight*devicePixelRatio;
    ctx.clearRect(0,0,w,h);ctx.fillStyle="#091321";ctx.fillRect(0,0,w,h);
    const sc=Math.min(w,h)/10;
    particles.forEach(p=>{ctx.beginPath();ctx.arc(p.x*sc,p.y*sc,Math.max(2,sc*.075),0,Math.PI*2);ctx.fillStyle="#5eead4";ctx.fill()});
    $("nanoCount").textContent=particles.length+" particles · reduced Lennard-Jones units";
  };
  const frame=now=>{if(!running)return;const elapsed=Math.min((now-last)/1000,.04);last=now;const steps=Math.max(1,Math.min(25,Math.ceil(elapsed/(dt*8))));for(let i=0;i<steps;i++)integrate();draw();requestAnimationFrame(frame)};
  $("nanoStart").onclick=()=>{if(running)return;running=true;last=performance.now();requestAnimationFrame(frame);log("nanoStatus","RUNNING · 2D toy molecular-dynamics model")};
  $("nanoStop").onclick=()=>{running=false;log("nanoStatus","PAUSED")};
  $("nanoReset").onclick=()=>{running=false;init();log("nanoStatus","RESET · initial particle lattice")};
  init();
})();
