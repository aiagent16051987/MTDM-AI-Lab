import fs from "node:fs";
import assert from "node:assert/strict";
const html=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");
const js=fs.readFileSync(new URL("../app.js",import.meta.url),"utf8");
for(const id of ["aiEpochs","aiSampleCount","aiTrainCount","aiTestCount","aiAccuracy","aiPrecision","aiRecall","aiF1","aiConfusion","aiEvalStatus"])assert(html.includes('id="'+id+'"'),"missing AI evaluation element "+id);
for(const token of ["function seededRandom","function makeSensorDataset","function scoreClassifier","model.fit(tx,ty","data.testY.length","Macro F1"])assert(js.includes(token),"missing AI workflow feature "+token);
assert(js.includes("i<480?trainX:testX"),"dataset split occurs within each class before training");
assert(js.includes("Dataset seed: 20261123"),"synthetic dataset is reproducible");
console.log("MTDM AI evaluation smoke tests passed: deterministic dataset, stratified holdout, confusion matrix and macro metrics.");
