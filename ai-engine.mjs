const finite=(v,n)=>{if(typeof v!=="number"||!Number.isFinite(v))throw new TypeError(n+" must be finite");return v};
const sigmoid=z=>z>=0?1/(1+Math.exp(-z)):Math.exp(z)/(1+Math.exp(z));
export function trainLogisticRegression({features,labels,learningRate=0.1,epochs=500,l2=0.001,patience=40}){
 if(!Array.isArray(features)||features.length<8||!Array.isArray(labels)||labels.length!==features.length)throw new TypeError("at least eight feature rows and matching labels are required");
 const cols=features[0]?.length;if(!Number.isInteger(cols)||cols<1||cols>128||features.some(r=>!Array.isArray(r)||r.length!==cols||r.some(v=>typeof v!=="number"||!Number.isFinite(v))))throw new TypeError("features must be a finite rectangular matrix");
 if(labels.some(y=>y!==0&&y!==1)||new Set(labels).size!==2)throw new RangeError("binary labels must contain both classes");
 finite(learningRate,"learningRate");finite(l2,"l2");if(learningRate<=0||learningRate>1||l2<0||l2>10||!Number.isInteger(epochs)||epochs<1||epochs>10000||!Number.isInteger(patience)||patience<1)throw new RangeError("invalid training hyperparameters");
 const order=features.map((_,i)=>i).sort((a,b)=>((a*2654435761)>>>0)-((b*2654435761)>>>0));
 const train=order.slice(0,Math.floor(order.length*.8)),test=order.slice(Math.floor(order.length*.8));
 const means=Array.from({length:cols},(_,j)=>train.reduce((s,i)=>s+features[i][j],0)/train.length),scales=means.map((m,j)=>Math.sqrt(train.reduce((s,i)=>s+(features[i][j]-m)**2,0)/train.length)||1);
 const x=features.map(r=>[1,...r.map((v,j)=>(v-means[j])/scales[j])]),w=new Array(cols+1).fill(0);let best=Infinity,bestW=[...w],stale=0,completed=0;
 for(let epoch=0;epoch<epochs;epoch++){const grad=new Array(w.length).fill(0);let loss=0;for(const i of train){const p=sigmoid(w.reduce((s,v,j)=>s+v*x[i][j],0)),y=labels[i];loss+=-(y*Math.log(Math.max(p,1e-15))+(1-y)*Math.log(Math.max(1-p,1e-15)));for(let j=0;j<w.length;j++)grad[j]+=(p-y)*x[i][j]}loss/=train.length;for(let j=0;j<w.length;j++){grad[j]=grad[j]/train.length+(j?l2*w[j]:0);w[j]-=learningRate*grad[j]}completed=epoch+1;if(loss<best-1e-8){best=loss;bestW=[...w];stale=0}else if(++stale>=patience)break}
 const predict=row=>sigmoid(bestW.reduce((s,v,j)=>s+v*(j?((finite(row[j-1],"feature")-means[j-1])/scales[j-1]):1),0));
 const probs=test.map(i=>predict(features[i])),preds=probs.map(p=>p>=.5?1:0),truth=test.map(i=>labels[i]);
 let tp=0,tn=0,fp=0,fn=0;preds.forEach((p,i)=>{if(p===1&&truth[i]===1)tp++;else if(p===0&&truth[i]===0)tn++;else if(p===1)fp++;else fn++});
 const accuracy=(tp+tn)/test.length,precision=tp+fp?tp/(tp+fp):0,recall=tp+fn?tp/(tp+fn):0,f1=precision+recall?2*precision*recall/(precision+recall):0;
 return {weights:bestW,means,scales,epochsCompleted:completed,trainCount:train.length,testCount:test.length,metrics:{accuracy,precision,recall,f1,confusionMatrix:{tn,fp,fn,tp}},predict,modelType:"binary logistic regression",threshold:0.5,trainingNote:"Deterministic index-based holdout; this is a small educational baseline, not a production ML pipeline."};
}
export function predictLogistic(model,features){if(!model||typeof model.predict!=="function"||!Array.isArray(features))throw new TypeError("trained model and feature rows are required");return features.map(row=>({probability:model.predict(row),label:model.predict(row)>=model.threshold?1:0}))}
