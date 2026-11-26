import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const IDENTIFIER = /^[A-Za-z][A-Za-z0-9_]*$/;
const OPS = new Set(["add", "sub", "mul", "div", "sqrt", "pow", "abs", "min", "max"]);
const RESERVED = new Set(["__proto__", "prototype", "constructor", "this", "globalThis", "process", "require", "import", "eval", "Function"]);

function assertIdentifier(value, label) {
  if (typeof value !== "string" || !IDENTIFIER.test(value) || RESERVED.has(value)) {
    throw new Error("Invalid " + label + ": " + String(value));
  }
}

function compileExpression(node, parameterNames, depth = 0) {
  if (depth > 32) throw new Error("Expression nesting exceeds 32 levels");
  if (typeof node === "number" && Number.isFinite(node)) return String(node);
  if (!node || typeof node !== "object" || Array.isArray(node)) throw new Error("Expression nodes must be finite numbers or AST objects");
  if (Object.hasOwn(node, "param")) {
    assertIdentifier(node.param, "parameter reference");
    if (!parameterNames.has(node.param)) throw new Error("Unknown parameter reference: " + node.param);
    return "input[" + JSON.stringify(node.param) + "]";
  }
  if (!OPS.has(node.op) || !Array.isArray(node.args)) throw new Error("Unsupported expression operation");
  const arity = ["sqrt", "abs"].includes(node.op) ? 1 : ["min", "max"].includes(node.op) ? [1, 16] : 2;
  if (Array.isArray(arity) ? node.args.length < arity[0] || node.args.length > arity[1] : node.args.length !== arity) {
    throw new Error("Invalid argument count for operation: " + node.op);
  }
  const args = node.args.map(arg => compileExpression(arg, parameterNames, depth + 1));
  switch (node.op) {
    case "add": return "(" + args.join(" + ") + ")";
    case "sub": return "(" + args[0] + " - " + args[1] + ")";
    case "mul": return "(" + args.join(" * ") + ")";
    case "div": return "(" + args[0] + " / " + args[1] + ")";
    case "sqrt": return "Math.sqrt(" + args[0] + ")";
    case "pow": return "Math.pow(" + args[0] + ", " + args[1] + ")";
    case "abs": return "Math.abs(" + args[0] + ")";
    case "min": return "Math.min(" + args.join(", ") + ")";
    case "max": return "Math.max(" + args.join(", ") + ")";
    default: throw new Error("Unsupported expression operation");
  }
}

function validateSpec(spec) {
  if (!spec || spec.schemaVersion !== 1 || spec.enabled !== true) throw new Error("Only enabled schema-v1 generation specs can compile");
  assertIdentifier(spec.id, "model id");
  if (!Array.isArray(spec.parameters) || !spec.parameters.length || spec.parameters.length > 32) throw new Error("A model needs 1–32 parameters");
  if (!Array.isArray(spec.outputs) || !spec.outputs.length || spec.outputs.length > 32) throw new Error("A model needs 1–32 outputs");
  const names = new Set();
  for (const parameter of spec.parameters) {
    assertIdentifier(parameter.name, "parameter name");
    if (names.has(parameter.name)) throw new Error("Duplicate model identifier: " + parameter.name);
    names.add(parameter.name);
    if (!Number.isFinite(parameter.min) || !Number.isFinite(parameter.max) || parameter.min > parameter.max ||
        !Number.isFinite(parameter.default) || parameter.default < parameter.min || parameter.default > parameter.max) {
      throw new Error("Invalid parameter bounds/default: " + parameter.name);
    }
  }
  for (const output of spec.outputs) {
    assertIdentifier(output.name, "output name");
    if (names.has(output.name)) throw new Error("Duplicate model identifier: " + output.name);
    names.add(output.name);
    if (typeof output.unit !== "string" || output.unit.length > 32) throw new Error("Every output requires a short unit label");
    compileExpression(output.expression, new Set(spec.parameters.map(item => item.name)));
  }
  if (!Array.isArray(spec.verification) || spec.verification.length < 1 || spec.verification.length > 100) {
    throw new Error("Every generated model requires 1–100 approved verification vectors");
  }
  const parameterMap = new Map(spec.parameters.map(item => [item.name, item]));
  const outputNames = new Set(spec.outputs.map(item => item.name));
  for (const [index, vector] of spec.verification.entries()) {
    if (!vector || typeof vector !== "object" || !vector.input || !vector.expected ||
        typeof vector.input !== "object" || typeof vector.expected !== "object") {
      throw new Error("Invalid verification vector at index " + index);
    }
    for (const [name, value] of Object.entries(vector.input)) {
      const parameter = parameterMap.get(name);
      if (!parameter || !Number.isFinite(value) || value < parameter.min || value > parameter.max) {
        throw new Error("Verification input outside approved bounds: " + name);
      }
    }
    for (const [name, value] of Object.entries(vector.expected)) {
      if (!outputNames.has(name) || !Number.isFinite(value)) throw new Error("Invalid expected verification output: " + name);
    }
    if (Object.keys(vector.expected).length !== spec.outputs.length) throw new Error("Each verification vector must specify every output");
    const tolerance = vector.tolerance ?? 1e-9;
    if (!Number.isFinite(tolerance) || tolerance <= 0 || tolerance > 0.01) throw new Error("Verification tolerance must be in (0, 0.01]");
  }
  return names;
}

function makeModelSource(spec, names) {
  const parameters = spec.parameters.map(parameter => JSON.stringify(parameter.name)).join(", ");
  const checks = spec.parameters.map(parameter =>
    "  if (!Number.isFinite(input[" + JSON.stringify(parameter.name) + "]) || input[" + JSON.stringify(parameter.name) + "] < " +
    parameter.min + " || input[" + JSON.stringify(parameter.name) + "] > " + parameter.max +
    ") throw new RangeError(" + JSON.stringify(parameter.name + " outside approved model bounds") + ");"
  ).join("\n");
  const calculations = spec.outputs.map(output =>
    "  const " + output.name + " = " + compileExpression(output.expression, new Set(spec.parameters.map(item => item.name))) + ";"
  ).join("\n");
  const finiteChecks = spec.outputs.map(output =>
    "  if (!Number.isFinite(" + output.name + ")) throw new RangeError(" + JSON.stringify("Non-finite output: " + output.name) + ");"
  ).join("\n");
  const result = spec.outputs.map(output => JSON.stringify(output.name) + ": " + output.name).join(", ");
  const defaults = spec.parameters.map(parameter => JSON.stringify(parameter.name) + ": " + parameter.default).join(", ");
  const sourceHash = crypto.createHash("sha256").update(JSON.stringify(spec)).digest("hex");
  return [
    "// Generated deterministically from an approved MTDM model specification.",
    "// Do not edit generated output directly; update the source specification and regenerate.",
    "export const modelMetadata = Object.freeze(" + JSON.stringify({ id: spec.id, title: spec.title, description: spec.description, sourceSpecSha256: sourceHash, outputs: spec.outputs.map(({name,unit})=>({name,unit})) }) + ");",
    "export const defaultInput = Object.freeze({" + defaults + "});",
    "export function calculate(input = defaultInput) {",
    "  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Model input must be an object');",
    "  const allowed = new Set([" + parameters + "]);",
    "  for (const key of Object.keys(input)) if (!allowed.has(key)) throw new TypeError('Unknown model input: ' + key);",
    "  input = { ...defaultInput, ...input };",
    checks,
    calculations,
    finiteChecks,
    "  return Object.freeze({" + result + "});",
    "}"
  ].join("\n") + "\n";
}

function makeTestSource(spec, outputPath) {
  const defaults = JSON.stringify(Object.fromEntries(spec.parameters.map(p => [p.name,p.default])));
  const outputChecks = spec.outputs.map(output =>
    "assert.ok(Number.isFinite(result[" + JSON.stringify(output.name) + "]));"
  ).join("\n");
  const boundary = spec.parameters[0];
  const vectors = spec.verification.map((vector, index) => {
    const input = JSON.stringify(vector.input);
    const expected = vector.expected;
    const tolerance = vector.tolerance ?? 1e-9;
    const checks = Object.entries(expected).map(([name, value]) =>
      "assert.ok(Math.abs(actual[" + JSON.stringify(name) + "] - " + value + ") <= " + tolerance +
      ", " + JSON.stringify("verification vector " + index + " output " + name + " mismatch") + ");"
    ).join("\n");
    return "const actual" + index + " = calculate(" + input + ");\n" +
      "const expected" + index + " = " + JSON.stringify(expected) + ";\n" +
      checks.replaceAll("actual[", "actual" + index + "[");
  }).join("\n");
  return [
    "import assert from 'node:assert/strict';",
    "import { calculate, defaultInput, modelMetadata } from " + JSON.stringify("./" + path.basename(outputPath)) + ";",
    "assert.equal(modelMetadata.id, " + JSON.stringify(spec.id) + ");",
    "assert.match(modelMetadata.sourceSpecSha256, /^[a-f0-9]{64}$/);",
    "assert.deepEqual(defaultInput, " + defaults + ");",
    "const result = calculate();",
    outputChecks,
    vectors,
    "assert.throws(() => calculate({ " + JSON.stringify(boundary.name) + ": " + (boundary.min - Math.max(1, Math.abs(boundary.min))) + " }), RangeError);",
    "assert.throws(() => calculate({ unexpected: 1 }), TypeError);",
    "console.log('PASS generated model: " + spec.id + "');"
  ].join("\n") + "\n";
}

export function compileModelSpec({ spec, outputDirectory }) {
  const names = validateSpec(spec);
  const root = path.resolve(outputDirectory);
  fs.mkdirSync(root, { recursive: true });
  const modelPath = path.join(root, spec.id + ".mjs");
  const testPath = path.join(root, spec.id + ".test.mjs");
  fs.writeFileSync(modelPath, makeModelSource(spec, names), { flag: "w" });
  fs.writeFileSync(testPath, makeTestSource(spec, modelPath), { flag: "w" });
  return { id: spec.id, modelPath, testPath };
}

export function compileEnabledSpecs({ specsDirectory, outputDirectory }) {
  const root = path.resolve(specsDirectory);
  if (!fs.existsSync(root)) return [];
  const files = fs.readdirSync(root).filter(name => name.endsWith(".json")).sort();
  const compiled = [];
  const ids = new Set();
  for (const file of files) {
    const spec = JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
    if (spec.enabled !== true) continue;
    if (ids.has(spec.id)) throw new Error("Duplicate enabled model id: " + spec.id);
    ids.add(spec.id);
    compiled.push(compileModelSpec({ spec, outputDirectory }));
  }
  return compiled;
}
