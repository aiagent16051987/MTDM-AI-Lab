export function wrapAngle(angle){
 if(!Number.isFinite(angle))throw new RangeError("angle must be finite");
 return Math.atan2(Math.sin(angle),Math.cos(angle));
}
export function stepDiffDrive(state,leftAngular,rightAngular,wheelRadius,wheelBase,dt){
 if(!state||![state.x,state.y,state.theta,leftAngular,rightAngular,wheelRadius,wheelBase,dt].every(Number.isFinite))
  throw new TypeError("pose, wheel speeds, dimensions and dt must be finite numbers");
 if(!(wheelRadius>0&&wheelBase>0&&dt>=0))throw new RangeError("wheel dimensions must be positive and dt non-negative");
 const vl=leftAngular*wheelRadius,vr=rightAngular*wheelRadius,v=(vl+vr)/2,omega=(vr-vl)/wheelBase;
 const thetaMid=state.theta+omega*dt/2;
 return {x:state.x+v*Math.cos(thetaMid)*dt,y:state.y+v*Math.sin(thetaMid)*dt,theta:wrapAngle(state.theta+omega*dt)};
}
export function planGridPath({start,goal,cols,rows,cellSize,originX,originY,obstacles=[],robotRadius=0}){
 if(!Number.isInteger(cols)||!Number.isInteger(rows)||cols<1||rows<1||cols*rows>250000||
    ![cellSize,originX,originY,robotRadius].every(Number.isFinite)||!(cellSize>0)||robotRadius<0)
  throw new RangeError("invalid grid dimensions, origin, cell size or robot radius");
 const validPoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
 if(!validPoint(start)||!validPoint(goal))throw new TypeError("start and goal must have finite x/y coordinates");
 if(!Array.isArray(obstacles)||obstacles.some(o=>!o||![o.x,o.y,o.w,o.h].every(Number.isFinite)||o.w<0||o.h<0))
  throw new TypeError("obstacles must be rectangles with finite coordinates and non-negative dimensions");
 const toCell=p=>({x:Math.floor((p.x-originX)/cellSize),y:Math.floor((p.y-originY)/cellSize)});
 const toWorld=p=>({x:originX+(p.x+.5)*cellSize,y:originY+(p.y+.5)*cellSize});
 const inside=p=>p.x>=0&&p.y>=0&&p.x<cols&&p.y<rows;
 const blocked=p=>!inside(p)||obstacles.some(o=>{const w=toWorld(p);return w.x>=o.x-robotRadius&&w.x<=o.x+o.w+robotRadius&&w.y>=o.y-robotRadius&&w.y<=o.y+o.h+robotRadius});
 const s=toCell(start),g=toCell(goal);if(blocked(s)||blocked(g))return null;
 if(s.x===g.x&&s.y===g.y)return start.x===goal.x&&start.y===goal.y?[{...start}]:[{...start},{...goal}];
 const key=p=>p.y*cols+p.x,heur=p=>Math.hypot(g.x-p.x,g.y-p.y);
 const open=[s],came=new Map(),gScore=new Map([[key(s),0]]),closed=new Set();
 const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
 while(open.length){
  open.sort((a,b)=>(gScore.get(key(a))+heur(a))-(gScore.get(key(b))+heur(b)));
  const cur=open.shift(),ck=key(cur);if(closed.has(ck))continue;
  if(cur.x===g.x&&cur.y===g.y){
   const path=[cur];let k=ck;while(came.has(k)){const prev=came.get(k);path.push(prev);k=key(prev)}
   path.reverse();path[0]={...start};path[path.length-1]={...goal};return path;
  }
  closed.add(ck);
  for(const [dx,dy] of dirs){
   const next={x:cur.x+dx,y:cur.y+dy},nk=key(next);
   if(blocked(next)||closed.has(nk))continue;
   if(dx&&dy&&(blocked({x:cur.x+dx,y:cur.y})||blocked({x:cur.x,y:cur.y+dy})))continue;
   const tentative=gScore.get(ck)+(dx&&dy?Math.SQRT2:1);
   if(tentative<(gScore.get(nk)??Infinity)){
    came.set(nk,cur);gScore.set(nk,tentative);
    if(!open.some(p=>key(p)===nk))open.push(next);
   }
  }
 }
 return null;
}
