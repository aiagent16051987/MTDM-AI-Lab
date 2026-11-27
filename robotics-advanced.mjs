const finite=(v,n)=>{if(typeof v!=="number"||!Number.isFinite(v))throw new TypeError(n+" must be finite");return v};
export function createPID({kp,ki=0,kd=0,min=-Infinity,max=Infinity,integralMin=-1e6,integralMax=1e6}){
 for(const [n,v] of Object.entries({kp,ki,kd}))finite(v,n);
 if(!(min<max)||!(integralMin<=integralMax))throw new RangeError("invalid PID limits");
 let integral=0,previous=null;
 return {reset(){integral=0;previous=null},update(setpoint,measurement,dt){
  finite(setpoint,"setpoint");finite(measurement,"measurement");finite(dt,"dt");if(dt<=0)throw new RangeError("dt must be positive");
  const error=setpoint-measurement,derivative=previous===null?0:(error-previous)/dt;
  const candidate=Math.max(integralMin,Math.min(integralMax,integral+error*dt));
  const raw=kp*error+ki*candidate+kd*derivative,output=Math.max(min,Math.min(max,raw));
  if(output===raw||Math.sign(error)!==Math.sign(raw-output))integral=candidate;
  previous=error;return {output,error,integral,derivative,saturated:output!==raw};
 }};
}
export function dcMotorStep(state,input,{resistance=2,inductance=0.01,torqueConstant=0.05,backEmfConstant=0.05,inertia=0.002,viscous=0.0002,loadTorque=0,dt=0.001}={}){
 for(const [n,v] of Object.entries({current:state?.current,omega:state?.omega,voltage:input,resistance,inductance,torqueConstant,backEmfConstant,inertia,viscous,loadTorque,dt}))finite(v,n);
 if(resistance<=0||inductance<=0||inertia<=0||dt<=0||viscous<0)throw new RangeError("invalid motor physical parameters");
 const di=(input-resistance*state.current-backEmfConstant*state.omega)/inductance;
 const current=state.current+di*dt,torque=torqueConstant*current;
 const domega=(torque-viscous*state.omega-loadTorque)/inertia,omega=state.omega+domega*dt;
 if(!Number.isFinite(current)||!Number.isFinite(omega))throw new RangeError("motor integration diverged");
 return {current,omega,angularAcceleration:domega,electromagneticTorque:torque,backEmf:backEmfConstant*state.omega,electricalPower:input*current};
}
export function integrateRigidBody2D(state,wrench,{mass,inertia,dt}){
 for(const [n,v] of Object.entries({x:state?.x,y:state?.y,theta:state?.theta,vx:state?.vx,vy:state?.vy,omega:state?.omega,fx:wrench?.fx,fy:wrench?.fy,torque:wrench?.torque,mass,inertia,dt}))finite(v,n);
 if(mass<=0||inertia<=0||dt<=0)throw new RangeError("mass, inertia and dt must be positive");
 const ax=wrench.fx/mass,ay=wrench.fy/mass,alpha=wrench.torque/inertia;
 const vx=state.vx+ax*dt,vy=state.vy+ay*dt,omega=state.omega+alpha*dt;
 return {x:state.x+state.vx*dt+0.5*ax*dt*dt,y:state.y+state.vy*dt+0.5*ay*dt*dt,theta:Math.atan2(Math.sin(state.theta+state.omega*dt+0.5*alpha*dt*dt),Math.cos(state.theta+state.omega*dt+0.5*alpha*dt*dt)),vx,vy,omega,ax,ay,alpha};
}
export function trapezoidalTrajectory({distance,maxVelocity,maxAcceleration,dt}){
 for(const [n,v] of Object.entries({distance,maxVelocity,maxAcceleration,dt}))finite(v,n);
 if(distance<0||maxVelocity<=0||maxAcceleration<=0||dt<=0)throw new RangeError("invalid trajectory constraints");
 const rampTime=maxVelocity/maxAcceleration,rampDistance=0.5*maxAcceleration*rampTime*rampTime;
 const triangular=2*rampDistance>distance,peak=triangular?Math.sqrt(distance*maxAcceleration):maxVelocity;
 const ta=peak/maxAcceleration,tc=triangular?0:(distance-2*rampDistance)/peak,total=2*ta+tc,points=[];
 for(let t=0;t<total;t+=dt){let p,v,a;if(t<ta){a=maxAcceleration;v=a*t;p=0.5*a*t*t}else if(t<ta+tc){a=0;v=peak;p=0.5*peak*ta+peak*(t-ta)}else{const q=total-t;a=-maxAcceleration;v=maxAcceleration*q;p=distance-0.5*maxAcceleration*q*q}points.push({time:t,position:p,velocity:v,acceleration:a})}
 points.push({time:total,position:distance,velocity:0,acceleration:0});
 return {profile:triangular?"triangular":"trapezoidal",duration:total,peakVelocity:peak,points};
}
