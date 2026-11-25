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
 const blob=new Blob([rows.join("\n")],{type:"text/csv;charset=utf-8"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="mtdm-circuit-results.csv";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
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
  // GitHub Pages is a browser-only runtime: keep .step execution on the main thread
  // instead of allowing the package to fall back to Node worker_threads.
  const result=await simulate(netlist,{stepWorkers:false});
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
const mqttLog=s=>{$("mqttLog").textContent=(new Date().toLocaleTimeString()+"  "+s+"\n"+$("mqttLog").textContent).slice(0,5000)};
let client=null,sensorTimer=null,history=[],sampleIndex=0;
const sensorLimits={voltage:[-100,1000],current:[0,1000],temperature:[-100,1000]};
function validateTelemetry(d){
 if(!d||typeof d!=="object"||Array.isArray(d))throw Error("Message must be a JSON object.");
 for(const k of ["voltage","current","temperature"]){
  const n=Number(d[k]),[lo,hi]=sensorLimits[k];
  if(d[k]===null||d[k]===""||!Number.isFinite(n)||n<lo||n>hi)throw Error("Invalid "+k+" value; accepted range "+lo+" to "+hi+".");
 }
 return {voltage:Number(d.voltage),current:Number(d.current),temperature:Number(d.temperature),timestamp:d.timestamp?String(d.timestamp):new Date().toISOString()};
}
function alertTelemetry(d){
 const alerts=[];
 for(const [key,id,label] of [["voltage","voltageLimit","Voltage"],["current","currentLimit","Current"],["temperature","temperatureLimit","Temperature"]]){
  const limit=Number($(id).value);
  if(Number.isFinite(limit)&&d[key]>limit)alerts.push(label+" high: "+d[key].toFixed(2)+" > "+limit);
 }
 $("sensorAlert").textContent=alerts.length?"ALERT · "+alerts.join(" | "):"No threshold alerts.";
 $("sensorAlert").classList.toggle("is-alert",alerts.length>0);
}
function updateSensor(raw,source="local"){
 const d=validateTelemetry(raw);
 $("voltageValue").textContent=d.voltage.toFixed(2);$("currentValue").textContent=d.current.toFixed(2);$("tempValue").textContent=d.temperature.toFixed(1);
 history.push({timestamp:d.timestamp,source,voltage:d.voltage,current:d.current,temperature:d.temperature});
 if(history.length>2000)history.shift();
 const points=history.slice(-100).map((p,i)=>({x:i,y:p.temperature}));
 if(points.length>1)plot($("sensorChart"),points);
 $("sensorStatus").textContent=source==="mqtt"?"MQTT DATA":"LOCAL STREAM";
 $("exportTelemetry").disabled=false;alertTelemetry(d);
}
function connectMqtt(){
 const url=$("brokerUrl").value.trim(),topic=$("mqttTopic").value.trim();
 if(!/^wss:\/\//i.test(url))throw Error("Use a secure WSS:// broker URL.");
 if(url.length>500||topic.length<1||topic.length>200||/[\u0000-\u001f]/.test(topic))throw Error("Broker URL or topic is invalid.");
 if(!window.mqtt?.connect)throw Error("MQTT client library did not load. Check internet connection.");
 if(client)client.end(true);
 $("mqttStatus").textContent="CONNECTING";
 client=mqtt.connect(url,{connectTimeout:8000,clean:true,reconnectPeriod:0,clientId:"mtdm_lab_"+Math.random().toString(16).slice(2)});
 client.on("connect",()=>client.subscribe(topic,{qos:0},e=>{
  if(e){mqttLog("Subscribe error: "+e.message);return}
  $("mqttStatus").textContent="CONNECTED";$("mqttDisconnect").disabled=false;mqttLog("Connected securely and subscribed to "+topic);
 }));
 client.on("message",(receivedTopic,payload)=>{
  if(payload.length>4096){mqttLog("Rejected oversized MQTT payload.");return}
  try{const d=JSON.parse(payload.toString());updateSensor(d,"mqtt");mqttLog("Accepted "+receivedTopic+" · "+payload.toString().slice(0,300))}
  catch(e){mqttLog("Rejected MQTT message: "+e.message)}
 });
 client.on("error",e=>{mqttLog("MQTT error: "+e.message);$("mqttStatus").textContent="ERROR"});
 client.on("close",()=>{$("mqttStatus").textContent="OFFLINE";$("mqttDisconnect").disabled=true});
}
$("mqttConnect").onclick=()=>{try{connectMqtt()}catch(e){$("mqttStatus").textContent="ERROR";mqttLog(e.message)}};
$("mqttDisconnect").onclick=()=>{client?.end(true);client=null;$("mqttStatus").textContent="OFFLINE";$("mqttDisconnect").disabled=true};
function syntheticSample(){
 const t=sampleIndex++*.1,profile=$("sensorProfile").value;
 let d={voltage:5+Math.sin(t)*.035+(Math.random()-.5)*.04,current:1.1+Math.sin(t*.7)*.08+(Math.random()-.5)*.08,temperature:30+Math.sin(t*.25)*1.5+(Math.random()-.5)*.5};
 if(profile==="step"&&sampleIndex>12){d.voltage+=1.1;d.current+=.65;d.temperature+=9}
 if(profile==="drift"){d.temperature+=Math.min(35,t*.45);d.current+=Math.min(.5,t*.008)}
 if(profile==="fault"&&Math.floor(sampleIndex/8)%3===1){d.voltage+=1.4;d.current+=1.2;d.temperature+=18}
 return {...d,timestamp:new Date().toISOString()};
}
function sensorTick(){
 const d=syntheticSample();
 try{updateSensor(d,"local")}catch(e){mqttLog("Local sample rejected: "+e.message);return}
 if(client?.connected&&$("mqttPublishConsent").checked){
  try{client.publish($("mqttTopic").value,JSON.stringify(d),{qos:0,retain:false},e=>{if(e)mqttLog("Publish failed: "+e.message)})}
  catch(e){mqttLog("Publish error: "+e.message)}
 }
}
function stopSensorStream(){
 if(sensorTimer){clearInterval(sensorTimer);sensorTimer=null}
 $("sensorStart").disabled=false;$("sensorStop").disabled=true;
}
$("sensorStart").onclick=()=>{
 if(sensorTimer)return;
 sensorTick();sensorTimer=setInterval(sensorTick,Number($("sensorInterval").value));
 $("sensorStart").disabled=true;$("sensorStop").disabled=false;
};
$("sensorStop").onclick=()=>{stopSensorStream();$("sensorStatus").textContent="STOPPED"};
$("sensorInterval").addEventListener("change",()=>{
 if(sensorTimer){clearInterval(sensorTimer);sensorTimer=setInterval(sensorTick,Number($("sensorInterval").value))}
});
window.addEventListener("pagehide",()=>{
 stopSensorStream();
 if(client){client.end(true);client=null}
},{once:true});
["voltageLimit","currentLimit","temperatureLimit"].forEach(id=>$(id).addEventListener("change",()=>{if(history.length)alertTelemetry(history.at(-1))}));
$("exportTelemetry").onclick=()=>{
 if(!history.length)return;
 const cols=["timestamp","source","voltage_V","current_A","temperature_C"];
 const rows=[cols.join(","),...history.map(p=>[p.timestamp,p.source,p.voltage,p.current,p.temperature].map(v=>'"'+String(v).replaceAll('"','""')+'"').join(","))];
 const blob=new Blob([rows.join("\n")],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="mtdm-iot-telemetry.csv";a.click();URL.revokeObjectURL(url);
};
$("clearTelemetry").onclick=()=>{history=[];sampleIndex=0;$("voltageValue").textContent="—";$("currentValue").textContent="—";$("tempValue").textContent="—";$("sensorStatus").textContent="NO DATA";$("sensorAlert").textContent="No threshold alerts.";$("sensorAlert").classList.remove("is-alert");$("exportTelemetry").disabled=true;$("mqttLog").textContent="Telemetry history cleared.";const c=$("sensorChart").getContext("2d");c.clearRect(0,0,$("sensorChart").width,$("sensorChart").height)};
let model=null;
function seededRandom(seed){let state=seed>>>0;return()=>{state=(1664525*state+1013904223)>>>0;return state/4294967296}}
function makeSensorDataset(){
 const rand=seededRandom(20261123),features=[],labels=[];
 const ranges=[[[3.5,7.5],[.3,2.3],[20,52]],[[7.2,11.8],[2,3.9],[48,84]],[[11.5,15],[3.5,5],[78,120]]];
 for(let cls=0;cls<3;cls++)for(let i=0;i<600;i++){
  const r=ranges[cls],v=r[0][0]+rand()*(r[0][1]-r[0][0]),c=r[1][0]+rand()*(r[1][1]-r[1][0]),t=r[2][0]+rand()*(r[2][1]-r[2][0]);
  features.push([v/15,c/5,t/120]);labels.push(cls);
 }
 const trainX=[],trainY=[],testX=[],testY=[];
 for(let cls=0;cls<3;cls++){
  const indices=Array.from({length:600},(_,i)=>cls*600+i);
  for(let i=indices.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[indices[i],indices[j]]=[indices[j],indices[i]]}
  indices.forEach((idx,i)=>{(i<480?trainX:testX).push(features[idx]);(i<480?trainY:testY).push(labels[idx])});
 }
 return {trainX,trainY,testX,testY};
}
function scoreClassifier(actual,predicted){
 const matrix=Array.from({length:3},()=>[0,0,0]);
 actual.forEach((a,i)=>matrix[a][predicted[i]]++);
 const perClass=matrix.map((row,i)=>{
  const tp=row[i],fp=matrix.reduce((n,r,j)=>n+(j!==i?r[i]:0),0),fn=row.reduce((n,v,j)=>n+(j!==i?v:0),0);
  const precision=tp+fp?tp/(tp+fp):0,recall=tp+fn?tp/(tp+fn):0,f1=precision+recall?2*precision*recall/(precision+recall):0;
  return {precision,recall,f1};
 });
 const avg=k=>perClass.reduce((n,x)=>n+x[k],0)/3;
 return {matrix,accuracy:actual.filter((a,i)=>a===predicted[i]).length/actual.length,precision:avg("precision"),recall:avg("recall"),f1:avg("f1")};
}
$("trainModel").onclick=async()=>{
 const status=$("aiStatus"),log=$("aiLog"),button=$("trainModel");button.disabled=true;status.textContent="PREPARING";$("classify").disabled=true;
 let tx,ty,test,pred;
 try{
  if(!window.tf)throw Error("TensorFlow.js CDN did not load. Check internet connection.");
  const epochs=Number($("aiEpochs").value);if(!Number.isInteger(epochs)||epochs<5||epochs>60)throw Error("Epochs must be an integer from 5 to 60.");
  await tf.ready();const data=makeSensorDataset();
  $("aiSampleCount").textContent="1,800";$("aiTrainCount").textContent=data.trainX.length.toLocaleString();$("aiTestCount").textContent=data.testX.length.toLocaleString();
  tx=tf.tensor2d(data.trainX);ty=tf.oneHot(tf.tensor1d(data.trainY,"int32"),3);test=tf.tensor2d(data.testX);
  model?.dispose();model=tf.sequential();
  model.add(tf.layers.dense({inputShape:[3],units:16,activation:"relu"}));model.add(tf.layers.dense({units:12,activation:"relu"}));model.add(tf.layers.dense({units:3,activation:"softmax"}));
  model.compile({optimizer:tf.train.adam(.008),loss:"categoricalCrossentropy",metrics:["accuracy"]});
  status.textContent="TRAINING";log.textContent="Dataset ready: 1,440 train / 360 holdout. Training...";
  await model.fit(tx,ty,{epochs,batchSize:32,shuffle:true,callbacks:{onEpochEnd:(e,l)=>{$("trainProgress").style.width=((e+1)/epochs*100)+"%";log.textContent="Epoch "+(e+1)+"/"+epochs+" · loss "+l.loss.toFixed(4)+" · training accuracy "+(l.acc??l.accuracy??0).toFixed(3)}}});
  pred=model.predict(test);const probs=Array.from(pred.dataSync()),predicted=[];
  for(let i=0;i<data.testY.length;i++){const row=probs.slice(i*3,i*3+3);predicted.push(row.indexOf(Math.max(...row)))}
  const m=scoreClassifier(data.testY,predicted);
  $("aiAccuracy").textContent=(m.accuracy*100).toFixed(1)+"%";$("aiPrecision").textContent=(m.precision*100).toFixed(1)+"%";$("aiRecall").textContent=(m.recall*100).toFixed(1)+"%";$("aiF1").textContent=m.f1.toFixed(3);
  $("aiConfusion").innerHTML="<table><thead><tr><th>Actual ↓ / Predicted →</th><th>Normal</th><th>Warning</th><th>Critical</th></tr></thead><tbody>"+m.matrix.map((row,i)=>"<tr><th>"+["Normal","Warning","Critical"][i]+"</th>"+row.map(n=>"<td>"+n+"</td>").join("")+"</tr>").join("")+"</tbody></table>";
  $("aiEvalStatus").textContent="HOLDOUT COMPLETE";status.textContent="TRAINED";
  log.textContent+="\n\nHoldout test: "+data.testY.length+" samples\nAccuracy: "+(m.accuracy*100).toFixed(1)+"% · Macro F1: "+m.f1.toFixed(3)+"\nDataset seed: 20261123 · Synthetic labels only.";
  $("classify").disabled=false;
 }catch(e){status.textContent="ERROR";$("aiEvalStatus").textContent="NOT EVALUATED";log.textContent=e.message}
 finally{tx?.dispose();ty?.dispose();test?.dispose();pred?.dispose();button.disabled=false}
};
$("classify").onclick=()=>{
 if(!model)return;
 const v=Number($("aiVoltage").value),c=Number($("aiCurrent").value),t=Number($("aiTemp").value);
 if(![v,c,t].every(Number.isFinite)||v<0||v>30||c<0||c>10||t< -20||t>150){$("prediction").querySelector("b").textContent="Invalid input";return}
 const input=tf.tensor2d([[v/15,c/5,t/120]]),out=model.predict(input),scores=Array.from(out.dataSync()),names=["NORMAL","WARNING","CRITICAL"],best=scores.indexOf(Math.max(...scores));
 $("prediction").querySelector("b").textContent=names[best]+" · "+(scores[best]*100).toFixed(1)+"%";
 $("prediction").querySelector("p").textContent="Class probabilities: "+scores.map((n,i)=>names[i]+" "+(n*100).toFixed(1)+"%").join(" | ")+" · Not calibrated.";
 input.dispose();out.dispose();
};
