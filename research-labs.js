const $ = id => document.getElementById(id);

// Local-only, bounded 2D Boids model. No network, sensors or hardware control.
(() => {
  const canvas = $("swarmCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const sim = { agents: [], running: false, raf: 0, last: 0, w: 1, h: 1 };
  const maxSpeed = 1.8, perception = 58, separationRadius = 22;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const val = id => Number($(id).value);
  const makeAgent = () => {
    const a = Math.random() * Math.PI * 2, s = .5 + Math.random() * .8;
    return { x: Math.random()*sim.w, y: Math.random()*sim.h, vx:Math.cos(a)*s, vy:Math.sin(a)*s };
  };
  function resize() {
    const r=canvas.getBoundingClientRect(), d=Math.min(devicePixelRatio||1,2);
    sim.w=Math.max(1,r.width); sim.h=Math.max(1,r.height);
    canvas.width=Math.round(sim.w*d); canvas.height=Math.round(sim.h*d);
    ctx.setTransform(d,0,0,d,0,0); draw();
  }
  function reset() {
    sim.agents=Array.from({length:val("swarmCount")},makeAgent);
    $("swarmAgents").textContent=String(sim.agents.length); draw();
  }
  function steer(x,y,vx,vy) {
    const m=Math.hypot(x,y); if(m<1e-8)return [0,0];
    return [x/m*maxSpeed-vx,y/m*maxSpeed-vy];
  }
  function update(dt) {
    const old=sim.agents.map(a=>({...a}));
    const cw=val("swarmCohesion"), aw=val("swarmAlignment"), sw=val("swarmSeparation");
    sim.agents=old.map((a,i)=>{
      let cx=0,cy=0,vx=0,vy=0,sx=0,sy=0,n=0;
      for(let j=0;j<old.length;j++){
        if(i===j)continue;
        const b=old[j],dx=b.x-a.x,dy=b.y-a.y,d2=dx*dx+dy*dy;
        if(d2<perception*perception){
          n++;cx+=b.x;cy+=b.y;vx+=b.vx;vy+=b.vy;
          if(d2<separationRadius*separationRadius&&d2>.01){sx-=dx/d2;sy-=dy/d2;}
        }
      }
      let ax=0,ay=0;
      if(n){
        const c=steer(cx/n-a.x,cy/n-a.y,a.vx,a.vy), al=steer(vx/n,vy/n,a.vx,a.vy), sp=steer(sx,sy,a.vx,a.vy);
        ax=c[0]*cw*.018+al[0]*aw*.035+sp[0]*sw*.09;
        ay=c[1]*cw*.018+al[1]*aw*.035+sp[1]*sw*.09;
      }
      let nx=a.vx+ax*dt*60,ny=a.vy+ay*dt*60,m=Math.hypot(nx,ny);
      if(m>maxSpeed){nx=nx/m*maxSpeed;ny=ny/m*maxSpeed;}
      if(m<.45){nx=nx/(m||1)*.45;ny=ny/(m||1)*.45;}
      return {x:(a.x+nx*dt*60+sim.w)%sim.w,y:(a.y+ny*dt*60+sim.h)%sim.h,vx:nx,vy:ny};
    });
  }
  function draw(){
    ctx.clearRect(0,0,sim.w,sim.h);ctx.fillStyle="#091321";ctx.fillRect(0,0,sim.w,sim.h);
    ctx.strokeStyle="rgba(94,234,212,.07)";
    for(let x=20;x<sim.w;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,sim.h);ctx.stroke();}
    for(let y=20;y<sim.h;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(sim.w,y);ctx.stroke();}
    sim.agents.forEach(a=>{ctx.save();ctx.translate(a.x,a.y);ctx.rotate(Math.atan2(a.vy,a.vx));ctx.beginPath();ctx.moveTo(8,0);ctx.lineTo(-5,-4);ctx.lineTo(-3,0);ctx.lineTo(-5,4);ctx.closePath();ctx.fillStyle="#5eead4";ctx.fill();ctx.restore();});
  }
  function loop(now){
    if(!sim.running)return;
    const dt=clamp((now-sim.last)/1000,.001,.04);sim.last=now;update(dt);draw();sim.raf=requestAnimationFrame(loop);
  }
  $("swarmStart").addEventListener("click",()=>{if(sim.running)return;sim.running=true;sim.last=performance.now();$("swarmStatus").textContent="RUNNING · LOCAL";sim.raf=requestAnimationFrame(loop);});
  $("swarmPause").addEventListener("click",()=>{sim.running=false;cancelAnimationFrame(sim.raf);$("swarmStatus").textContent="PAUSED";});
  $("swarmReset").addEventListener("click",()=>{sim.running=false;cancelAnimationFrame(sim.raf);reset();$("swarmStatus").textContent="RESET";});
  ["swarmCount","swarmCohesion","swarmAlignment","swarmSeparation"].forEach(id=>$(id).addEventListener("input",()=>{
    $(id+"Value").textContent=Number($(id).value).toFixed(id==="swarmCount"?0:1);
    if(id==="swarmCount")reset();
  }));
  window.addEventListener("resize",resize);resize();reset();
})();
