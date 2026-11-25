const finite=(value,name,min,max)=>{
  if(typeof value!=="number"||!Number.isFinite(value)||value<min||value>max)
    throw new RangeError(name+" must be finite and between "+min+" and "+max);
  return value;
};
const validateModel=({epsilon=1,sigma=1,cutoff=2.5,minDistance=0.2}={})=>({
  epsilon:finite(epsilon,"epsilon",1e-8,1e4),
  sigma:finite(sigma,"sigma",1e-4,1e3),
  cutoff:finite(cutoff,"cutoff",0.5,20),
  minDistance:finite(minDistance,"minimum pair distance",1e-4,1e3)
});
const validateParticles=particles=>{
  if(!Array.isArray(particles)||particles.length<1||particles.length>200)
    throw new RangeError("particles must contain between 1 and 200 entries");
  for(const [i,p] of particles.entries()){
    if(!p||![p.x,p.y,p.vx,p.vy].every(Number.isFinite))
      throw new TypeError("particle "+i+" must have finite position and velocity");
  }
};
export function lennardJonesPair(distance,model={}){
  const m=validateModel(model);
  finite(distance,"distance",m.minDistance,1e6);
  const sr2=(m.sigma*m.sigma)/(distance*distance),sr6=sr2*sr2*sr2,sr12=sr6*sr6;
  const cutoffSr2=(m.sigma*m.sigma)/(m.cutoff*m.cutoff),cutoffSr6=cutoffSr2**3;
  const cutoffPotential=4*m.epsilon*(cutoffSr6*cutoffSr6-cutoffSr6);
  return {
    potential:4*m.epsilon*(sr12-sr6)-cutoffPotential,
    forceMagnitude:24*m.epsilon/distance*(2*sr12-sr6)
  };
}
export function calculateLennardJonesForces(particles,model={}){
  validateParticles(particles);
  const m=validateModel(model),forces=particles.map(()=>({fx:0,fy:0}));
  for(let i=0;i<particles.length;i++)for(let j=i+1;j<particles.length;j++){
    const dx=particles[j].x-particles[i].x,dy=particles[j].y-particles[i].y,r2=dx*dx+dy*dy;
    if(r2<m.minDistance*m.minDistance)throw new RangeError("particle separation is below the collision guard");
    if(r2>m.cutoff*m.cutoff)continue;
    const distance=Math.sqrt(r2),pair=lennardJonesPair(distance,m);
    const fx=pair.forceMagnitude*dx/distance,fy=pair.forceMagnitude*dy/distance;
    forces[i].fx-=fx;forces[i].fy-=fy;forces[j].fx+=fx;forces[j].fy+=fy;
  }
  return forces;
}
export function calculateNanoObservables(particles,model={}){
  validateParticles(particles);
  const m=validateModel(model);
  let kineticEnergy=0,potentialEnergy=0,momentumX=0,momentumY=0;
  for(const p of particles){
    kineticEnergy+=0.5*(p.vx*p.vx+p.vy*p.vy);
    momentumX+=p.vx;momentumY+=p.vy;
  }
  for(let i=0;i<particles.length;i++)for(let j=i+1;j<particles.length;j++){
    const distance=Math.hypot(particles[j].x-particles[i].x,particles[j].y-particles[i].y);
    if(distance<m.minDistance)throw new RangeError("particle separation is below the collision guard");
    if(distance<=m.cutoff)potentialEnergy+=lennardJonesPair(distance,m).potential;
  }
  return {kineticEnergy,potentialEnergy,totalEnergy:kineticEnergy+potentialEnergy,
    temperature2D:kineticEnergy/particles.length,momentumX,momentumY,particleCount:particles.length};
}
export function createNanoLattice({count=36,columns=6,spacing=1.35,seed=20261125,velocityScale=0.25}={}){
  if(!Number.isInteger(count)||count<1||count>100)throw new RangeError("count must be an integer from 1 to 100");
  if(!Number.isInteger(columns)||columns<1||columns>10)throw new RangeError("columns must be an integer from 1 to 10");
  finite(spacing,"spacing",0.5,3);finite(velocityScale,"velocityScale",0,2);
  if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw new RangeError("seed must be an unsigned 32-bit integer");
  const rows=Math.ceil(count/columns);
  if(columns*spacing>9||rows*spacing>9)throw new RangeError("lattice does not fit inside the 10-unit box");
  let state=seed>>>0;
  const random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296};
  const particles=[];
  for(let i=0;i<count;i++)particles.push({x:(i%columns+0.5)*spacing+0.5,y:(Math.floor(i/columns)+0.5)*spacing+0.5,
    vx:(random()-0.5)*velocityScale,vy:(random()-0.5)*velocityScale,fx:0,fy:0});
  const meanX=particles.reduce((sum,p)=>sum+p.vx,0)/count,meanY=particles.reduce((sum,p)=>sum+p.vy,0)/count;
  particles.forEach(p=>{p.vx-=meanX;p.vy-=meanY});
  const forces=calculateLennardJonesForces(particles);
  return particles.map((p,i)=>({...p,...forces[i]}));
}
export function integrateNanoStep(particles,dt=0.0015,{bounds={min:0.2,max:9.8},...model}={}){
  validateParticles(particles);finite(dt,"dt",1e-6,0.01);
  if(!bounds||!Number.isFinite(bounds.min)||!Number.isFinite(bounds.max)||bounds.min>=bounds.max)
    throw new RangeError("bounds must define finite min and max values");
  const oldForces=calculateLennardJonesForces(particles,model);
  const moved=particles.map((p,i)=>{
    let vx=p.vx+0.5*oldForces[i].fx*dt,vy=p.vy+0.5*oldForces[i].fy*dt;
    let x=p.x+vx*dt,y=p.y+vy*dt;
    if(x<bounds.min){x=bounds.min;vx=Math.abs(vx)}
    else if(x>bounds.max){x=bounds.max;vx=-Math.abs(vx)}
    if(y<bounds.min){y=bounds.min;vy=Math.abs(vy)}
    else if(y>bounds.max){y=bounds.max;vy=-Math.abs(vy)}
    return {x,y,vx,vy,fx:0,fy:0};
  });
  const newForces=calculateLennardJonesForces(moved,model);
  return moved.map((p,i)=>{
    const next={...p,vx:p.vx+0.5*newForces[i].fx*dt,vy:p.vy+0.5*newForces[i].fy*dt,...newForces[i]};
    if(![next.x,next.y,next.vx,next.vy,next.fx,next.fy].every(Number.isFinite))
      throw new RangeError("molecular dynamics state became non-finite");
    return next;
  });
}
