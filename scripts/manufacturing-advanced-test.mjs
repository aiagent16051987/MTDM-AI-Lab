import assert from "node:assert/strict";
import {sliceRectangularPrism,estimateLumpedThermalStep} from "../manufacturing-advanced.mjs";
const sliced=sliceRectangularPrism({x:20,y:20,z:10,layerHeight:.2,nozzle:.4,wallCount:2,infill:20});
assert.equal(sliced.layers,50);assert.ok(sliced.estimatedExtrudedVolumeMm3>0);assert.ok(sliced.estimatedExtrudedVolumeMm3<sliced.nominalBoundingVolumeMm3);
const heat=estimateLumpedThermalStep({temperature:20,ambient:20,power:10,resistance:2,capacitance:5,dt:5});
assert.ok(heat.temperature>20&&heat.temperature<40);assert.ok(Math.abs(heat.equilibriumTemperature-40)<1e-12);
assert.throws(()=>sliceRectangularPrism({x:0,y:20,z:10,layerHeight:.2}),RangeError);
assert.throws(()=>estimateLumpedThermalStep({temperature:20,ambient:20,power:10,resistance:0,capacitance:5,dt:1}),RangeError);
console.log("Manufacturing advanced tests passed: layer schedule, extrusion volume approximation, lumped thermal transient and invalid process rejection.");
