const $=id=>document.getElementById(id);
document.querySelectorAll(".tab").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll(".tab,.workspace").forEach(x=>x.classList.remove("active"));btn.classList.add("active");$(btn.dataset.tab).classList.add("active")}));
const rcExample=`* RC low-pass: 5V pulse into 1k + 1uF
V1 in 0 PULSE(0 5 0 1n 1n 500u 1m)
R1 in out 1k
C1 out 0 1u
.tran 10u 5m
.end`;
const dividerExample=`* 12V divider: expected V(out) = 4V
V1 in 0 DC 12
R1 in out 20k
R2 out 0 10k
.op
.end`;
$("loadExample").onclick=()=>{$("netlist").value=rcExample};
$("loadDivider").onclick=()=>{$("netlist").value=dividerExample};
function parseNetlist(src){
 const lines=src.split(/\r?\n/).map(s=>s.trim()).filter(s=>s&&!s.startsWith("*")&&!s.startsWith(";"));
 const resistors=[],caps=[],sources=[];let tran=null,op=false;
 for(const line of lines){const p=line.split(/\s+/),kind=p[0].toUpperCase();
 if(kind===".TRAN"){tran={step:eng(p[1]),stop:eng(p[2])};continue}
 if(kind===".OP"){op=true;continue}
 if(kind.startsWith("R")&&p.length>=4)resistors.push({name:p[0],a:p[1],b:p[2],v:eng(p[3])});
 else if(kind.startsWith("C")&&p.length>=4)caps.push({name:p[0],a:p[1],b:p[2],v:eng(p[3])});
 else if(kind.startsWith("V")&&p.length>=4){let val=0;if(p[3].toUpperCase()==="DC")val=eng(p[4]);else if(p[3].toUpperCase().startsWith("PULSE")){const m=line.match(/PULSE\s*\(([^)]+)\)/i);if(m)val=eng(m[1].trim().split(/\s+/)[1])}else val=eng(p[3]);sources.push({name:p[0],a:p[1],b:p[2],v:val,pulse:/PULSE/i.test(line)})}
 else if(![".END",".ENDC"].includes(kind))throw Error("Unsupported statement: "+line);
 }
 if(!resistors.length||!sources.length)throw Error("Add at least one independent voltage source and one resistor.");
 if(resistors.some(r=>!(r.v>0))||caps.some(c=>!(c.v>0)))throw Error("R and C values must be positive.");
 if(caps.length>1)throw Error("This educational solver currently supports one capacitor.");
 if(sources.length>1)throw Error("This educational solver currently supports one independent voltage source.");
 return {resistors,caps,sources,tran,op};
}
function eng(s){if(s==null)throw Error("Missing numeric value");const m=String(s).match(/^([-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?)(meg|[tgkmunpf])?$/i);if(!m)throw Error("Invalid value: "+s);const scale={meg:1e6,t:1e12,g:1e9,k:1e3,m:1e-3,u:1e-6,n:1e-9,p:1e-12,f:1e-15,"":1};return Number(m[1])*scale[(m[2]||"").toLowerCase()]}
function solveCircuit(c,probe){
 const nodes=[...new Set([...c.resistors.flatMap(r=>[r.a,r.b]),...c.sources.flatMap(s=>[s.a,s.b]),...c.caps.flatMap(x=>[x.a,x.b])].filter(n=>n!=="0"))];
 const source=c.sources[0];if(source.a!=="0"&&source.b!=="0")throw Error("Voltage source must be connected between node 0 and one named node in this version.");
 const srcNode=source.a==="0"?source.b:source.a,vs=source.a==="0"?-source.v:source.v;
 if(c.caps.length){const cap=c.caps[0];const capNode=cap.a==="0"?cap.b:cap.b==="0"?cap.a:null;if(!capNode)throw Error("Capacitor must connect from a named node to ground.");if(capNode!==probe)throw Error("Probe the capacitor node: "+capNode)}
 if(!nodes.includes(probe)&&probe!=="0")throw Error("Probe node not found: "+probe);
 // Solve resistor-only node voltages using nodal conductance matrix with one ideal source node fixed.
 const unknown=nodes.filter(n=>n!==srcNode),idx=Object.fromEntries(unknown.map((n,i)=>[n,i]));
 const A=unknown.map(()=>unknown.map(()=>0)),z=unknown.map(()=>0);
 for(const r of c.resistors){const g=1/r.v;for(const [n,sign] of [[r.a,1],[r.b,1]]){if(n==="0"||n===srcNode)continue;const i=idx[n];A[i][i]+=g;z[i]+=g*(r.a===srcNode||r.b===srcNode?vs:0);const other=n===r.a?r.b:r.a;if(other!=="0"&&other!==srcNode)A[i][idx[other]]-=g}}
 const v=gauss(A,z),volt={"0":0,[srcNode]:vs};unknown.forEach((n,i)=>volt[n]=v[i]);
 if(c.caps.length){const cap=c.caps[0],node=cap.a==="0"?cap.b:cap.a;let rth=0;const direct=c.resistors.filter(r=>(r.a===node&&r.b===srcNode)||(r.b===node&&r.a===srcNode));if(direct.length===1)rth=direct[0].v;else{const toGround=c.resistors.filter(r=>(r.a===node&&r.b==="0")||(r.b===node&&r.a==="0"));if(toGround.length===1)rth=toGround[0].v;else throw Error("Transient solver needs a single resistor directly from probe node to source or ground.");}
 const tau=rth*cap.v;return {volt,transient:{node,tau,vs,step:c.tran?.step||tau/50,stop:c.tran?.stop||5*tau}}}
 return {volt};
}
function gauss(A,b){const n=b.length;if(!n)return[];for(let i=0;i<n;i++){let p=i;for(let j=i+1;j<n;j++)if(Math.abs(A[j][i])>Math.abs(A[p][i]))p=j;if(Math.abs(A[p][i])<1e-15)throw Error("Singular circuit matrix: check floating nodes.");[A[i],A[p]]=[A[p],A[i]];[b[i],b[p]]=[b[p],b[i]];const d=A[i][i];for(let k=i;k<n;k++)A[i][k]/=d;b[i]/=d;for(let j=0;j<n;j++)if(j!==i){const f=A[j][i];for(let k=i;k<n;k++)A[j][k]-=f*A[i][k];b[j]-=f*b[i]}}return b}
function plot(canvas,series){const ctx=canvas.getContext("2d"),w=canvas.width=canvas.clientWidth*devicePixelRatio,h=canvas.height=canvas.clientHeight*devicePixelRatio;ctx.clearRect(0,0,w,h);ctx.strokeStyle="#23364c";ctx.lineWidth=1;for(let i=0;i<=4;i++){let y=10+i*(h-30)/4;ctx.beginPath();ctx.moveTo(35,y);ctx.lineTo(w-8,y);ctx.stroke()}const maxX=Math.max(...series.map(p=>p.x)),minY=Math.min(0,...series.map(p=>p.y)),maxY=Math.max(1e-9,...series.map(p=>p.y)),span=maxY-minY||1;ctx.strokeStyle="#5eead4";ctx.lineWidth=2*devicePixelRatio;ctx.beginPath();series.forEach((p,i)=>{const x=35+p.x/maxX*(w-48),y=10+(maxY-p.y)/span*(h-30);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke();ctx.fillStyle="#91a3bb";ctx.font=10*devicePixelRatio+"px sans-serif";ctx.fillText(maxY.toPrecision(3)+" V",4,14);ctx.fillText(minY.toPrecision(3)+" V",4,h-8)}
$("runSim").onclick=()=>{const log=$("simLog"),status=$("simStatus");status.textContent="RUNNING";try{const c=parseNetlist($("netlist").value),probe=$("probeNode").value.trim(),res=solveCircuit(c,probe);let points=[],analysis="DC operating point";if(res.transient){const t=res.transient;if(!(t.step>0&&t.stop>0)||t.stop/t.step>20000)throw Error("Transient step/stop invalid or exceeds 20,000 points.");for(let x=0;x<=t.stop;x+=t.step)points.push({x,y:t.vs*(1-Math.exp(-x/t.tau))});analysis="Transient RC";$("chartEmpty").style.display="none";plot($("waveChart"),points);log.textContent="PASS · Educational RC transient solver\nNode: "+probe+"\nTime constant: "+t.tau.toPrecision(5)+" s\nFinal value: "+points.at(-1).y.toFixed(4)+" V\nSamples: "+points.length+"\n\nSupported: ideal voltage source, resistors, one grounded capacitor, .tran, .op.\nNot a full SPICE engine: no diodes, transistors, dependent sources, AC sweep or nonlinear convergence."}else{const value=res.volt[probe];if(value===undefined)throw Error("Unknown probe node "+probe);points=[{x:0,y:value},{x:1,y:value}];$("chartEmpty").style.display="none";plot($("waveChart"),points);log.textContent="PASS · DC nodal solution\nV("+probe+") = "+value.toFixed(6)+" V\n\nSupported: resistor network with one ideal voltage source.\nNot a full SPICE engine."}
 $("metrics").children[1].querySelector("b").textContent=analysis;$("probeMetric").textContent=probe;status.textContent="COMPLETE"}catch(e){status.textContent="ERROR";log.textContent="SIMULATION ERROR\n"+e.message+"\n\nCheck node names, units and supported circuit topology."}};
const mqttLog=s=>{$("mqttLog").textContent=(new Date().toLocaleTimeString()+"  "+s+"\n"+$("mqttLog").textContent).slice(0,3000)};
let client=null,sensorTimer=null,history=[];
function updateSensor(d){$("voltageValue").textContent=Number(d.voltage).toFixed(2);$("currentValue").textContent=Number(d.current).toFixed(2);$("tempValue").textContent=Number(d.temperature).toFixed(1);history.push({x:history.length,y:Number(d.temperature)});if(history.length>50)history.shift();plot($("sensorChart"),history)}
$("mqttConnect").onclick=()=>{try{client=mqtt.connect($("brokerUrl").value,{connectTimeout:8000,clean:true,clientId:"mtdm_lab_"+Math.random().toString(16).slice(2)});client.on("connect",()=>{client.subscribe($("mqttTopic").value,e=>{if(e)mqttLog("Subscribe error: "+e.message);else{$("mqttStatus").textContent="CONNECTED";$("mqttDisconnect").disabled=false;mqttLog("Connected and subscribed.")}})});client.on("message",(topic,payload)=>{try{const d=JSON.parse(payload.toString());if(["voltage","current","temperature"].every(k=>Number.isFinite(Number(d[k]))))updateSensor(d);mqttLog(topic+" "+payload.toString())}catch{mqttLog("Non-JSON message received on "+topic)}});client.on("error",e=>mqttLog("MQTT error: "+e.message));client.on("close",()=>{$("mqttStatus").textContent="OFFLINE"})}catch(e){mqttLog(e.message)}};
$("mqttDisconnect").onclick=()=>{client?.end(true);client=null;$("mqttStatus").textContent="OFFLINE";$("mqttDisconnect").disabled=true};
$("sensorStart").onclick=()=>{if(sensorTimer)return;sensorTimer=setInterval(()=>{const d={voltage:5+(Math.random()-.5)*.12,current:1.1+Math.random()*.25,temperature:29+Math.random()*9};updateSensor(d);$("sensorStatus").textContent="LOCAL STREAM";if(client?.connected)client.publish($("mqttTopic").value,JSON.stringify(d))},1000);$("sensorStart").disabled=true;$("sensorStop").disabled=false};
$("sensorStop").onclick=()=>{clearInterval(sensorTimer);sensorTimer=null;$("sensorStart").disabled=false;$("sensorStop").disabled=true;$("sensorStatus").textContent="STOPPED"};
let model=null;
$("trainModel").onclick=async()=>{const status=$("aiStatus"),log=$("aiLog");$("trainModel").disabled=true;status.textContent="TRAINING";try{if(!window.tf)throw Error("TensorFlow.js CDN did not load. Check internet connection.");await tf.ready();const xs=[],ys=[];for(let i=0;i<1200;i++){const v=Math.random()*15,a=Math.random()*5,t=20+Math.random()*100;let cls=(t>85||a>4.2||v>13)?2:(t>60||a>3||v>9)?1:0;xs.push([v/15,a/5,t/120]);ys.push(cls)}const x=tf.tensor2d(xs),y=tf.oneHot(tf.tensor1d(ys,"int32"),3);model?.dispose();model=tf.sequential();model.add(tf.layers.dense({inputShape:[3],units:12,activation:"relu"}));model.add(tf.layers.dense({units:8,activation:"relu"}));model.add(tf.layers.dense({units:3,activation:"softmax"}));model.compile({optimizer:tf.train.adam(.01),loss:"categoricalCrossentropy",metrics:["accuracy"]});await model.fit(x,y,{epochs:18,batchSize:32,callbacks:{onEpochEnd:(e,l)=>{$("trainProgress").style.width=((e+1)/18*100)+"%";log.textContent="Epoch "+(e+1)+"/18 · loss "+l.loss.toFixed(4)+" · accuracy "+(l.acc??l.accuracy??0).toFixed(3)}}});x.dispose();y.dispose();status.textContent="TRAINED";$("classify").disabled=false;log.textContent+="\nTraining complete. Synthetic training data only."}catch(e){status.textContent="ERROR";log.textContent=e.message}finally{$("trainModel").disabled=false}};
$("classify").onclick=()=>{if(!model)return;const v=Number($("aiVoltage").value),a=Number($("aiCurrent").value),t=Number($("aiTemp").value);if(![v,a,t].every(Number.isFinite)||v<0||v>30||a<0||a>10||t< -20||t>150){$("prediction").querySelector("b").textContent="Invalid input";return}const input=tf.tensor2d([[v/15,a/5,t/120]]),out=model.predict(input);const scores=Array.from(out.dataSync()),names=["NORMAL","WARNING","CRITICAL"],best=scores.indexOf(Math.max(...scores));$("prediction").querySelector("b").textContent=names[best]+" · "+(scores[best]*100).toFixed(1)+"%";$("prediction").querySelector("p").textContent="Class probabilities: "+scores.map((x,i)=>names[i]+" "+(x*100).toFixed(1)+"%").join(" | ");input.dispose();out.dispose()};
