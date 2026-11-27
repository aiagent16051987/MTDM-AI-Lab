const finite=(v,n)=>{if(typeof v!=="number"||!Number.isFinite(v))throw new TypeError(n+" must be finite");return v};
export function sliceRectangularPrism({x,y,z,layerHeight,nozzle=0.4,wallCount=2,infill=20}){
 for(const [n,v] of Object.entries({x,y,z,layerHeight,nozzle,infill}))finite(v,n);
 if(x<=0||y<=0||z<=0||layerHeight<=0||layerHeight>z||nozzle<=0||!Number.isInteger(wallCount)||wallCount<1||wallCount>10||infill<0||infill>100)throw new RangeError("invalid geometry or slicing settings");
 const layers=Math.ceil(z/layerHeight),wallWidth=nozzle*wallCount,innerX=Math.max(0,x-2*wallWidth),innerY=Math.max(0,y-2*wallWidth),infillArea=innerX*innerY*infill/100;
 const layerData=Array.from({length:layers},(_,i)=>{const h=Math.min(layerHeight,z-i*layerHeight),perimeter=2*(x+y)*wallCount,solidArea=wallWidth*(2*x+2*y-4*wallWidth),area=Math.min(x*y,solidArea+infillArea);return {index:i,zBottom:i*layerHeight,zTop:i*layerHeight+h,height:h,perimeterMm:perimeter,estimatedExtrusionAreaMm2:area}});
 const volume=layerData.reduce((s,l)=>s+l.estimatedExtrusionAreaMm2*l.height,0);
 return {layers:layerData.length,layerData,estimatedExtrudedVolumeMm3:volume,nominalBoundingVolumeMm3:x*y*z,materialUtilization:volume/(x*y*z),method:"axis-aligned rectangular-prism planning approximation",limitations:["No mesh slicing, polygon offsets, support generation, infill path clipping, retraction, acceleration or thermal coupling."]};
}
export function estimateLumpedThermalStep({temperature,ambient,power,resistance,capacitance,dt}){
 for(const [n,v] of Object.entries({temperature,ambient,power,resistance,capacitance,dt}))finite(v,n);
 if(resistance<=0||capacitance<=0||dt<=0)throw new RangeError("thermal resistance, capacitance and dt must be positive");
 const equilibrium=ambient+power*resistance,tau=resistance*capacitance,next=equilibrium+(temperature-equilibrium)*Math.exp(-dt/tau);
 return {temperature:next,equilibriumTemperature:equilibrium,timeConstant:tau,heatFlowWatts:(equilibrium-next)/resistance,method:"first-order lumped RC thermal analogy",limitations:["Single-node model; no spatial gradients, phase change, convection correlation or temperature-dependent properties."]};
}
