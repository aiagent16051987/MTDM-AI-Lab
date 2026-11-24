const $ = (id) => document.getElementById(id);
const log = (id, value) => { const el = $(id); if (el) el.textContent = value; };

// ---------------- Robotics: differential-drive navigation ----------------
import { planGridPath, stepDiffDrive, wrapAngle } from "./robotics-core.js";
(() => {
  const canvas=$("robotCanvas"); if(!canvas)return;
  const ctx=canvas.getContext("2d");
  const W=12,H=8,CELL=.25,R=.22,WHEEL_R=.12,WHEEL_BASE=.72;
  const obstacles=[
    {x:-1.6,y:-1.05,w:1.8,h:2.5},
    {x:1.8,y:1.35,w:2.5,h:.9},
    {x:-4.25,y:2.0,w:1.2,h:1.1},
    {x:3.9,y:-2.25,w:1.0,h:1.1}
  ];
  const state={x:-5.0,y:-3.0,theta:0,trail:[],running:false,last:0,left:2,right:3,mode:"manual",goal:{x:4.8,y:3.0},path:[],waypoint:0,scale:1,ox:0,oy:0};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const blocked=(x,y)=>obstacles.some(o=>x>=o.x-R&&x<=o.x+o.w+R&&y>=o.y-R&&y<=o.y+o.h+R);
  const worldToCanvas=(x,y)=>({x:state.ox+(x+W/2)*state.scale,y:state.oy+(H/2-y)*state.scale});
  const canvasToWorld=(px,py)=>({x:(px-state.ox)/state.scale-W/2,y:H/2-(py-state.oy)/state.scale});
  const plan=()=>{
    state.path=planGridPath({start:{x:state.x,y:state.y},goal:state.goal,cols:Math.round(W/CELL),rows:Math.round(H/CELL),cellSize:CELL,originX:-W/2,originY:-H/2,obstacles,robotRadius:R});
    state.waypoint=1;
    if(!state.path){log("robotRouteInfo","Route: no collision-free path found");return false}
    log("robotRouteInfo","Route: "+(state.path.length-1)+" grid steps · A*");
    return true;
  };
  const rayDistance=(angle,max=2.6)=>{
    for(let d=.05;d<=max;d+=.05){const x=state.x+Math.cos(angle)*d,y=state.y+Math.sin(angle)*d;if(Math.abs(x)>W/2||Math.abs(y)>H/2||blocked(x,y))return d}
    return max;
  };
  const draw=()=>{
    const cw=canvas.clientWidth||700,ch=canvas.clientHeight||390,dpr=window.devicePixelRatio||1;
    canvas.width=Math.round(cw*dpr);canvas.height=Math.round(ch*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,cw,ch);
    state.scale=Math.min(cw/W,ch/H);state.ox=(cw-W*state.scale)/2;state.oy=(ch-H*state.scale)/2;
    const p=(x,y)=>worldToCanvas(x,y);
    ctx.fillStyle="#081321";ctx.fillRect(0,0,cw,ch);
    ctx.fillStyle="#0b1727";ctx.fillRect(state.ox,state.oy,W*state.scale,H*state.scale);
    ctx.strokeStyle="#203149";ctx.lineWidth=1;
    for(let x=-W/2;x<=W/2+.001;x+=.5){const a=p(x,-H/2),b=p(x,H/2);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}
    for(let y=-H/2;y<=H/2+.001;y+=.5){const a=p(-W/2,y),b=p(W/2,y);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}
    ctx.strokeStyle="#45617c";ctx.strokeRect(state.ox,state.oy,W*state.scale,H*state.scale);
    for(const o of obstacles){const q=p(o.x,o.y+o.h);ctx.fillStyle="#33465d";ctx.strokeStyle="#71859b";ctx.lineWidth=1.5;ctx.fillRect(q.x,q.y,o.w*state.scale,o.h*state.scale);ctx.strokeRect(q.x,q.y,o.w*state.scale,o.h*state.scale)}
    if(state.path.length>1){ctx.beginPath();ctx.strokeStyle="#6d9eff";ctx.lineWidth=2.5;state.path.forEach((pt,i)=>{const q=p(pt.x,pt.y);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)});ctx.stroke()}
    if(state.trail.length>1){ctx.beginPath();ctx.strokeStyle="#5eead4";ctx.lineWidth=1.6;state.trail.forEach((pt,i)=>{const q=p(pt.x,pt.y);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)});ctx.stroke()}
    const g=p(state.goal.x,state.goal.y);ctx.strokeStyle="#fbbf24";ctx.lineWidth=2;ctx.beginPath();ctx.arc(g.x,g.y,9,0,Math.PI*2);ctx.moveTo(g.x-13,g.y);ctx.lineTo(g.x+13,g.y);ctx.moveTo(g.x,g.y-13);ctx.lineTo(g.x,g.y+13);ctx.stroke();
    const ranges=[rayDistance(state.theta),rayDistance(state.theta+.65),rayDistance(state.theta-.65)];
    ctx.strokeStyle="#fbbf24";ctx.lineWidth=1.5;
    for(let i=0;i<3;i++){const ang=state.theta+[0,.65,-.65][i],end=p(state.x+Math.cos(ang)*ranges[i],state.y+Math.sin(ang)*ranges[i]),start=p(state.x,state.y);ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.lineTo(end.x,end.y);ctx.stroke()}
    const r=p(state.x,state.y);ctx.save();ctx.translate(r.x,r.y);ctx.rotate(-state.theta);
    ctx.fillStyle="#2563eb";ctx.strokeStyle="#b6f4ff";ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(-14,-10,28,20,5);ctx.fill();ctx.stroke();
    ctx.fillStyle="#fbbf24";ctx.beginPath();ctx.moveTo(12,0);ctx.lineTo(4,5);ctx.lineTo(4,-5);ctx.closePath();ctx.fill();
    ctx.fillStyle="#d9e6f2";ctx.fillRect(-9,-13,7,4);ctx.fillRect(2,-13,7,4);ctx.restore();
    $("robotPose").textContent="x "+state.x.toFixed(2)+" m · y "+state.y.toFixed(2)+" m · θ "+(state.theta*180/Math.PI).toFixed(1)+"°";
    $("robotSensors").textContent="Range · front "+ranges[0].toFixed(2)+" m · left "+ranges[1].toFixed(2)+" m · right "+ranges[2].toFixed(2)+" m";
  };
  const step=now=>{
    if(!state.running)return;
    const dt=clamp((now-state.last)/1000,0,.04);state.last=now;
    let left=state.left,right=state.right;
    if(state.mode==="auto"){
      while(state.waypoint<state.path.length-1&&Math.hypot(state.path[state.waypoint].x-state.x,state.path[state.waypoint].y-state.y)<.24)state.waypoint++;
      const target=state.path[state.waypoint]||state.goal,dx=target.x-state.x,dy=target.y-state.y,dist=Math.hypot(dx,dy);
      if(state.waypoint>=state.path.length-1&&dist<.22){state.running=false;log("robotStatus","GOAL REACHED");return}
      const desired=Math.atan2(dy,dx),err=wrapAngle(desired-state.theta);
      const v=clamp(dist*.75,0,.55)*Math.max(0,Math.cos(err));
      const omega=clamp(err*2.8,-1.5,1.5);
      left=(v-omega*WHEEL_BASE/2)/WHEEL_R;right=(v+omega*WHEEL_BASE/2)/WHEEL_R;
    }
    const next=stepDiffDrive(state,left,right,WHEEL_R,WHEEL_BASE,dt);
    if(blocked(next.x,next.y)||Math.abs(next.x)>W/2-R||Math.abs(next.y)>H/2-R){state.running=false;log("robotStatus","COLLISION / BOUNDARY STOP");draw();return}
    Object.assign(state,next);state.trail.push({x:state.x,y:state.y});if(state.trail.length>2500)state.trail.shift();
    draw();requestAnimationFrame(step);
  };
  $("leftWheel").addEventListener("input",e=>{state.left=Number(e.target.value);$("leftWheelValue").textContent=state.left.toFixed(2)});
  $("rightWheel").addEventListener("input",e=>{state.right=Number(e.target.value);$("rightWheelValue").textContent=state.right.toFixed(2)});
  $("robotStart").onclick=()=>{state.mode="manual";log("robotStatus","MANUAL DRIVE · kinematic model");if(state.running)return;state.running=true;state.last=performance.now();requestAnimationFrame(step)};
  $("robotAuto").onclick=()=>{if(blocked(state.goal.x,state.goal.y)){log("robotStatus","GOAL INSIDE OBSTACLE");return}if(!plan()){log("robotStatus","NO ROUTE");return}state.mode="auto";log("robotStatus","AUTO NAVIGATION · A*");if(state.running)return;state.running=true;state.last=performance.now();requestAnimationFrame(step)};
  $("robotStop").onclick=()=>{state.running=false;log("robotStatus","PAUSED")};
  $("robotReset").onclick=()=>{state.running=false;Object.assign(state,{x:-5,y:-3,theta:0,trail:[],mode:"manual",path:[],waypoint:0,goal:{x:4.8,y:3}});draw();log("robotStatus","RESET · start pose")};
  const setGoal=(event)=>{
    const rect=canvas.getBoundingClientRect(),world=canvasToWorld(event.clientX-rect.left,event.clientY-rect.top);
    state.goal={x:clamp(world.x,-W/2+R,W/2-R),y:clamp(world.y,-H/2+R,H/2-R)};state.path=[];if(state.mode==="auto"){state.running=false;state.mode="manual";log("robotStatus","GOAL UPDATED · re-plan route")}log("robotRouteInfo","Goal selected · click Plan & auto-drive");draw();
  };
  canvas.addEventListener("click",setGoal);
  canvas.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();state.goal={x:4.8,y:3};draw()}});
  window.addEventListener("resize",draw);draw();
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
