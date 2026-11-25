import assert from "node:assert/strict";
import { calculatePartGeometry, calculatePrintEstimate } from "../printing-core.mjs";

const base = {
  shape:"cube",x:40,y:40,z:30,layerHeight:0.2,infill:20,speed:50,
  pricePerKg:22,powerKw:0.12,electricityRate:0.15,
  process:"fdm",processModel:{rate:18,factor:1.22,setup:8},materialDensity:1.24
};

const cube=calculatePartGeometry(base);
assert.equal(cube.volumeCm3,48);
const cylinder=calculatePartGeometry({...base,shape:"cylinder"});
assert.ok(Math.abs(cylinder.volumeCm3-Math.PI*20*20*30/1000)<1e-10);
const bracket=calculatePartGeometry({...base,shape:"bracket"});
assert.ok(bracket.volumeCm3>0&&bracket.volumeCm3<cube.volumeCm3);
assert.throws(()=>calculatePartGeometry({...base,x:0}),/X must be/);
assert.throws(()=>calculatePartGeometry({...base,shape:"sphere"}),/Unsupported geometry/);
assert.throws(()=>calculatePrintEstimate({...base,layerHeight:0}),/Layer height must be/);
assert.throws(()=>calculatePrintEstimate({...base,speed:501}),/Machine speed must be/);
assert.throws(()=>calculatePrintEstimate({...base,materialDensity:0}),/Material density/);
assert.throws(()=>calculatePrintEstimate({...base,processModel:{rate:0,factor:1,setup:0}}),/valid process model/);

const fdmLow=calculatePrintEstimate(base);
const fdmHigh=calculatePrintEstimate({...base,speed:100});
assert.ok(fdmLow.materialGrams>0&&fdmLow.durationHours>0);
assert.ok(fdmHigh.durationHours<fdmLow.durationHours,"higher FDM volumetric flow should reduce estimated duration before the machine-rate cap");
assert.ok(Math.abs(fdmLow.materialCost-fdmLow.materialKg*22)<1e-10);
assert.ok(Math.abs(fdmLow.energyCost-fdmLow.energyKwh*0.15)<1e-10);

const sla=calculatePrintEstimate({...base,process:"sla",speed:501,infill:101,processModel:{rate:12,factor:1.15,setup:18},materialDensity:1.1});
assert.equal(sla.materialFraction,1,"infill must not silently reduce vat photopolymer material");
assert.equal(sla.infillApplied,false);
assert.ok(sla.durationHours>0);

const fdmZeroInfill=calculatePrintEstimate({...base,infill:0});
assert.ok(fdmZeroInfill.materialGrams>0,"shell allowance keeps a non-zero material estimate at zero infill");
console.log("Printing core tests passed: geometry, input bounds, material accounting, process-specific infill and volumetric flow.");
