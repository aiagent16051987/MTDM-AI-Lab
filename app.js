import { simulate } from "@spice-ts/core";
const $=id=>document.getElementById(id);
const examples={
 divider:{title:"Voltage divider · DC operating point",guide:"A 12 V source feeds two series resistors (20 kΩ and 10 kΩ). The output is measured across the lower resistor. Ideal theory: Vout = Vin × R2/(R1+R2) = 4 V.",netlist:`* Voltage divider: theoretical V(out) = 4 V
V1 in 0 DC 12
R1 in out 20k
R2 out 0 10k
.op
.end`,probe:"out"},
 rc:{title:"RC low-pass · transient response",guide:"A 5 V step passes through a 1 kΩ resistor into a 1 µF capacitor. Time constant τ = R×C = 1 ms. At one τ, the ideal capacitor reaches about 63.2% of its final value.",netlist:`* RC step response: R=1k, C=1u, tau=1ms
V1 in 0 PULSE(0 5 0 1n 1n 500u 1m)
R1 in out 1k
C1 out 0 1u
.tran 10u 5m
.end`,probe:"out"},
 ac:{title:"RC low-pass · frequency response",guide:"This passive low-pass filter passes low frequencies and attenuates high frequencies. For R=1 kΩ and C=1 µF, the theoretical cutoff is fc = 1/(2πRC) ≈ 159.2 Hz (−3 dB).",netlist:`* RC low-pass AC sweep
V1 in 0 AC 1
R1 in out 1k
C1 out 0 1u
.ac dec 20 1 100k
.end`,probe:"out"},
 rlc:{title:"Series RLC · damped transient",guide:"A 1 V step excites a series RLC network. R controls damping, L stores magnetic energy and C stores electric energy. This is a circuit transient model; resonance and damping depend on all three values.",netlist:`* Series RLC step response
V1 in 0 PULSE(0 1 0 1n 1n 5m 10m)
R1 in n1 100
L1 n1 out 10m
C1 out 0 1u
.tran 10u 20m
.end`,probe:"out"}
};
let lastSeries=null;
function loadExperiment(key){
 const item=examples[key];$("netlist").value=item.netlist;$("probeNode").value=item.probe;
 $("circuitGuide").textContent=item.title+" — "+item.guide;
 $("simLog").textContent="Experiment loaded. Review the circuit, then click Run simulation.";
 $("simStatus").textContent="READY";$("resultSummary").textContent="Ready to simulate.";
}
$("loadExample").onclick=()=>loadExperiment("rc");
$("loadDivider").onclick=()=>loadExperiment("divider");
$("loadAcExample").onclick=()=>loadExperiment("ac");
$("loadRlcExample").onclick=()=>loadExperiment("rlc");
$("exportCsv").onclick=()=>{
 if(!lastSeries?.length)return;
 const rows=["x,value",...lastSeries.map(p=>p.x+","+p.y)];
 const blob=new Blob([rows.join("\\n")],{type:"text/csv;charset=utf-8"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="mtdm-circuit-results.csv";a.click();URL.revokeObjectURL(url);
};
loadExperiment("rc");
function plot(canvas,series,logX=false){
 const ctx=canvas.getContext("2d"),w=canvas.width=canvas.clientWidth*devicePixelRatio,h=canvas.height=canvas.clientHeight*devicePixelRatio;
 ctx.clearRect(0,0,w,h);const ys=series.map(p=>p.y),xs=series.map(p=>p.x);
 const minY=Math.min(0,...ys),maxY=Math.max(1e-12,...ys),span=maxY-minY||1;
 const minX=logX?Math.log10(Math.max(1e-12,Math.min(...xs))):Math.min(0,...xs),maxX=logX?Math.log10(Math.max(...xs)):Math.max(1e-12,...xs),xspan=maxX-minX||1;
 ctx.strokeStyle="#23364c";ctx.lineWidth=1;for(let i=0;i<=4;i++){const y=12+i*(h-34)/4;ctx.beginPath();ctx.moveTo(42,y);ctx.lineTo(w-8,y);ctx.stroke()}
 ctx.strokeStyle="#5eead4";ctx.lineWidth=2*devicePixelRatio;ctx.beginPath();series.forEach((p,i)=>{const px=42+((logX?Math.log10(Math.max(1e-12,p.x)):p.x)-minX)/xspan*(w-52),py=12+(maxY-p.y)/span*(h-34);i?ctx.lineTo(px,py):ctx.moveTo(px,py)});ctx.stroke();
 ctx.fillStyle="#91a3bb";ctx.font=10*devicePixelRatio+"px sans-serif";ctx.fillText(maxY.toPrecision(3),3,15);ctx.fillText(minY.toPrecision(3),3,h-8);ctx.fillText(logX?"Frequency (Hz)":"Time / sweep",w-115,h-7);
}
$("runSim").onclick=async()=>{
 const log=$("simLog"),status=$("simStatus"),probe=$("probeNode").value.trim();
 status.textContent="RUNNING";$("runSim").disabled=true;
 try{
  const netlist=$("netlist").value.trim();if(!netlist)throw new Error("Netlist is empty.");
  const result=await simulate(netlist);
  let analysis="",points=[];
  if(result.transient){
   const times=Array.from(result.transient.time),values=Array.from(result.transient.voltage(probe));
   points=times.map((x,i)=>({x,y:values[i]}));analysis="Transient analysis";
   if(!points.length)throw new Error("Transient analysis returned no samples.");
   plot($("waveChart"),points);$("chartEmpty").style.display="none";
   log.textContent="PASS · spice-ts transient analysis\nProbe: V("+probe+")\nSamples: "+points.length+"\nStart: "+points[0].y.toFixed(5)+" V\nEnd: "+points.at(-1).y.toFixed(5)+" V\n\nEngine: @spice-ts/core · browser TypeScript solver";
  }else if(result.ac){
   const frequencies=Array.from(result.ac.frequencies),magnitudes=Array.from(result.ac.voltage(probe),sample=>sample.magnitude);
   points=frequencies.map((x,i)=>({x,y:magnitudes[i]}));analysis="AC frequency sweep";
   if(!points.length)throw new Error("AC analysis returned no samples.");
   plot($("waveChart"),points,true);$("chartEmpty").style.display="none";
   log.textContent="PASS · spice-ts AC analysis\nProbe: V("+probe+")\nFrequency points: "+points.length+"\nMagnitude range: "+Math.min(...magnitudes).toExponential(3)+" to "+Math.max(...magnitudes).toExponential(3)+" V\n\nEngine: @spice-ts/core · browser TypeScript solver";
  }else if(result.dc){
   const value=result.dc.voltage(probe);analysis="DC operating point";
   points=[{x:0,y:value},{x:1,y:value}];plot($("waveChart"),points);$("chartEmpty").style.display="none";
   log.textContent="PASS · spice-ts DC operating point\nV("+probe+") = "+Number(value).toFixed(6)+" V\n\nEngine: @spice-ts/core · browser TypeScript solver";
  }else throw new Error("No supported analysis result returned. Add .op, .tran or .ac directive.");
  lastSeries=points.slice();$("exportCsv").disabled=false;
  $("resultSummary").textContent=points.length+" samples · "+analysis;
  $("metrics").children[1].querySelector("b").textContent=analysis;$("probeMetric").textContent=probe;status.textContent="COMPLETE";
 }catch(e){status.textContent="ERROR";lastSeries=null;$("exportCsv").disabled=true;$("resultSummary").textContent="Simulation failed.";log.textContent="SIMULATION ERROR\n"+(e?.message||String(e))+"\n\nCheck SPICE syntax, node names and analysis directive."}
 finally{$("runSim").disabled=false}
};
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
