import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { compileModelSpec } from "../evolution-engine/model-codegen.mjs";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "mtdm-codegen-"));
try {
  const output = path.join(root, "generated");
  const spec = {
    schemaVersion: 1, enabled: true, id: "dc-motor-steady-state",
    title: "DC motor steady-state model",
    description: "Ideal armature steady-state educational model with bounded inputs.",
    parameters: [
      { name: "voltage", min: 0, max: 48, default: 12 },
      { name: "resistance", min: 0.1, max: 100, default: 2 },
      { name: "torqueConstant", min: 0.001, max: 10, default: 0.1 },
      { name: "backEmfConstant", min: 0.001, max: 10, default: 0.1 },
      { name: "loadTorque", min: 0, max: 100, default: 0.2 }
    ],
    outputs: [
      { name: "armatureCurrent", unit: "A", expression: { op: "div", args: [{ param: "loadTorque" }, { param: "torqueConstant" }] } },
      { name: "angularSpeed", unit: "rad/s", expression: { op: "div", args: [{ op: "sub", args: [{ param: "voltage" }, { op: "mul", args: [{ param: "resistance" }, { op: "div", args: [{ param: "loadTorque" }, { param: "torqueConstant" }] }] }] }, { param: "backEmfConstant" }] } }
    ]
  };
  const generated = compileModelSpec({ spec, outputDirectory: output });
  const test = spawnSync(process.execPath, [generated.testPath], { encoding: "utf8" });
  assert.equal(test.status, 0, test.stdout + test.stderr);
  const imported = await import("file://" + generated.modelPath);
  const values = imported.calculate();
  assert.equal(values.armatureCurrent, 2);
  assert.equal(values.angularSpeed, 80);
  assert.throws(() => imported.calculate({ voltage: 49 }), RangeError);

  const malicious = structuredClone(spec);
  malicious.id = "unsafe-model";
  malicious.outputs[0].expression = { op: "raw", args: ["process.exit(1)"] };
  assert.throws(() => compileModelSpec({ spec: malicious, outputDirectory: output }), /Unsupported expression/);
  const unknown = structuredClone(spec);
  unknown.id = "unknown-param";
  unknown.outputs[0].expression = { param: "secret" };
  assert.throws(() => compileModelSpec({ spec: unknown, outputDirectory: output }), /Unknown parameter/);
  const duplicate = structuredClone(spec);
  duplicate.id = "duplicate-param";
  duplicate.parameters[1].name = "voltage";
  assert.throws(() => compileModelSpec({ spec: duplicate, outputDirectory: output }), /Duplicate/);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
console.log("PASS — declarative model compiler, generated executable module, generated tests and unsafe-AST rejection.");
