import assert from "node:assert/strict";
import {trainLogisticRegression,predictLogistic} from "../ai-engine.mjs";
const features=[],labels=[];for(let i=0;i<100;i++){const x=(i%10)-4.5,y=Math.floor(i/10)-4.5;features.push([x,y]);labels.push(x+y>0?1:0)}
const model=trainLogisticRegression({features,labels,learningRate:.2,epochs:2000,l2:.001});
assert.ok(model.metrics.accuracy>.85);assert.equal(model.trainCount+model.testCount,100);assert.ok(model.weights.every(Number.isFinite));
const preds=predictLogistic(model,[[4,4],[-4,-4]]);assert.equal(preds[0].label,1);assert.equal(preds[1].label,0);
assert.throws(()=>trainLogisticRegression({features:[[1],[2]],labels:[0,1]}),/at least eight/);
assert.throws(()=>trainLogisticRegression({features:[[1],[2],[3],[4],[5],[6],[7],[8]],labels:[0,0,0,0,0,0,0,0]}),/both classes/);
console.log("AI engine tests passed: deterministic logistic-regression training, holdout metrics, inference and invalid-dataset rejection.");
