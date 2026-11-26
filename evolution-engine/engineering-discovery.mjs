import crypto from "node:crypto";

const templates = [
  {
    id: "led-series-resistor-design",
    domain: "electronics",
    title: "LED series resistor design",
    objective: "Estimate resistor value, resistor dissipation and LED current from a DC supply.",
    parameters: [
      { name: "supplyVoltage", min: 5, max: 48, default: 12 },
      { name: "ledForwardVoltage", min: 0.5, max: 4.5, default: 2 },
      { name: "targetCurrent", min: 0.001, max: 0.1, default: 0.02 }
    ],
    outputs: [
      { name: "resistance", unit: "ohm", expression: { op: "div", args: [{ op: "sub", args: [{ param: "supplyVoltage" }, { param: "ledForwardVoltage" }] }, { param: "targetCurrent" }] } },
      { name: "resistorPower", unit: "W", expression: { op: "mul", args: [{ op: "sub", args: [{ param: "supplyVoltage" }, { param: "ledForwardVoltage" }] }, { param: "targetCurrent" }] } }
    ],
    verification: [
      { input: {}, expected: { resistance: 500, resistorPower: 0.2 } },
      { input: { supplyVoltage: 5, ledForwardVoltage: 2, targetCurrent: 0.01 }, expected: { resistance: 300, resistorPower: 0.03 } }
    ],
    limitations: [
      "Assumes a constant LED forward voltage and ideal DC supply; LED forward voltage varies with current, temperature and device bin.",
      "Does not select a standard resistor series or apply resistor derating and tolerance.",
      "Educational pre-design estimate only; verify the actual LED datasheet, thermal conditions and component ratings."
    ]
  },
  {
    id: "battery-runtime-estimator",
    domain: "electronics",
    title: "Battery runtime estimator",
    objective: "Estimate ideal operating time from usable battery capacity and average load current.",
    parameters: [
      { name: "capacity", min: 10, max: 50000, default: 2000 },
      { name: "usableFraction", min: 0.1, max: 1, default: 0.8 },
      { name: "loadCurrent", min: 0.001, max: 20, default: 0.2 }
    ],
    outputs: [
      { name: "usableCapacity", unit: "mAh", expression: { op: "mul", args: [{ param: "capacity" }, { param: "usableFraction" }] } },
      { name: "runtime", unit: "h", expression: { op: "div", args: [{ op: "mul", args: [{ param: "capacity" }, { param: "usableFraction" }] }, { op: "mul", args: [{ param: "loadCurrent" }, 1000] }] } }
    ],
    verification: [
      { input: {}, expected: { usableCapacity: 1600, runtime: 8 } },
      { input: { capacity: 3000, usableFraction: 0.7, loadCurrent: 0.3 }, expected: { usableCapacity: 2100, runtime: 7 } }
    ],
    limitations: [
      "Assumes constant average load current and nominal capacity; ignores Peukert effects, voltage cutoff, temperature, ageing and discharge-rate dependence.",
      "Usable fraction must be selected from battery chemistry and the intended operating voltage window.",
      "Not a battery-management, protection or safety calculation."
    ]
  },
  {
    id: "series-parallel-resistor-network",
    domain: "electronics",
    title: "Two-branch resistor network equivalent",
    objective: "Calculate equivalent resistance, source current and total power for a series resistor feeding a parallel pair.",
    parameters: [
      { name: "seriesResistance", min: 0.1, max: 100000, default: 100 },
      { name: "branchA", min: 0.1, max: 100000, default: 1000 },
      { name: "branchB", min: 0.1, max: 100000, default: 1000 },
      { name: "supplyVoltage", min: 0, max: 1000, default: 12 }
    ],
    outputs: [
      { name: "parallelResistance", unit: "ohm", expression: { op: "div", args: [{ op: "mul", args: [{ param: "branchA" }, { param: "branchB" }] }, { op: "add", args: [{ param: "branchA" }, { param: "branchB" }] }] } },
      { name: "equivalentResistance", unit: "ohm", expression: { op: "add", args: [{ param: "seriesResistance" }, { op: "div", args: [{ op: "mul", args: [{ param: "branchA" }, { param: "branchB" }] }, { op: "add", args: [{ param: "branchA" }, { param: "branchB" }] }] }] } },
      { name: "sourceCurrent", unit: "A", expression: { op: "div", args: [{ param: "supplyVoltage" }, { op: "add", args: [{ param: "seriesResistance" }, { op: "div", args: [{ op: "mul", args: [{ param: "branchA" }, { param: "branchB" }] }, { op: "add", args: [{ param: "branchA" }, { param: "branchB" }] }] }] }] } }
    ],
    verification: [
      { input: {}, expected: { parallelResistance: 500, equivalentResistance: 600, sourceCurrent: 0.02 } },
      { input: { seriesResistance: 0.1, branchA: 100, branchB: 100, supplyVoltage: 10 }, expected: { parallelResistance: 50, equivalentResistance: 50.1, sourceCurrent: 10 / 50.1 }, tolerance: 1e-8 }
    ],
    limitations: [
      "Assumes ideal resistors and an ideal DC source; ignores tolerances, temperature coefficients, wiring and source impedance.",
      "Power and individual branch currents are not yet calculated in this candidate.",
      "Educational circuit-analysis model only; verify component ratings and circuit operating conditions independently."
    ]
  }
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function validateCandidate(candidate) {
  if (!candidate || !/^[a-z][a-z0-9-]{0,62}$/.test(candidate.id)) throw new Error("Invalid candidate identifier");
  if (!Array.isArray(candidate.parameters) || !candidate.parameters.length || !Array.isArray(candidate.outputs) || !candidate.outputs.length) {
    throw new Error("Candidate must declare bounded parameters and outputs");
  }
  const names = new Set();
  for (const parameter of candidate.parameters) {
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(parameter.name) || names.has(parameter.name)) throw new Error("Invalid or duplicate parameter");
    names.add(parameter.name);
    if (![parameter.min, parameter.max, parameter.default].every(Number.isFinite) ||
        parameter.min > parameter.default || parameter.default > parameter.max) throw new Error("Invalid parameter bounds");
  }
  for (const output of candidate.outputs) {
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(output.name) || names.has(output.name) ||
        typeof output.unit !== "string" || !output.unit) throw new Error("Invalid or duplicate output");
    names.add(output.name);
    validateAst(output.expression, new Set(candidate.parameters.map(p => p.name)));
  }
  if (!candidate.verification?.length || candidate.verification.length > 100) throw new Error("Numerical verification vectors are required");
  return true;
}

function validateAst(node, params, depth = 0) {
  if (depth > 32) throw new Error("AST depth exceeded");
  if (typeof node === "number" && Number.isFinite(node)) return;
  if (!node || typeof node !== "object" || Array.isArray(node)) throw new Error("Invalid expression node");
  if (Object.hasOwn(node, "param")) {
    if (!params.has(node.param)) throw new Error("Unknown parameter reference: " + node.param);
    return;
  }
  const arity = { add: [2, 16], sub: [2, 2], mul: [2, 16], div: [2, 2] }[node.op];
  if (!arity || !Array.isArray(node.args) || node.args.length < arity[0] || node.args.length > arity[1]) throw new Error("Unsupported AST operation or arity");
  node.args.forEach(child => validateAst(child, params, depth + 1));
}

function evaluate(node, input) {
  if (typeof node === "number") return node;
  if (Object.hasOwn(node, "param")) return input[node.param];
  const values = node.args.map(child => evaluate(child, input));
  switch (node.op) {
    case "add": return values.reduce((a, b) => a + b, 0);
    case "sub": return values[0] - values[1];
    case "mul": return values.reduce((a, b) => a * b, 1);
    case "div": return values[0] / values[1];
    default: throw new Error("Unsupported operation");
  }
}

function verify(candidate) {
  for (const [index, vector] of candidate.verification.entries()) {
    const input = Object.fromEntries(candidate.parameters.map(p => [p.name, p.default]));
    Object.assign(input, vector.input);
    for (const p of candidate.parameters) if (!Number.isFinite(input[p.name]) || input[p.name] < p.min || input[p.name] > p.max) {
      throw new Error("Verification input out of bounds at vector " + index);
    }
    for (const output of candidate.outputs) {
      const actual = evaluate(output.expression, input);
      const expected = vector.expected[output.name];
      const tolerance = vector.tolerance ?? 1e-9;
      if (!Number.isFinite(actual) || !Number.isFinite(expected) || Math.abs(actual - expected) > tolerance) {
        throw new Error("Numerical verification failed: " + candidate.id + "/" + output.name + " vector " + index + " actual=" + actual + " expected=" + expected);
      }
    }
  }
}

export function discoverEngineeringFeatures({ existingIds = [], domains = ["electronics"], maxCandidates = 10 } = {}) {
  if (!Array.isArray(existingIds) || !Array.isArray(domains) || !Number.isInteger(maxCandidates) || maxCandidates < 1 || maxCandidates > 25) {
    throw new TypeError("Invalid discovery request");
  }
  const existing = new Set(existingIds);
  const selected = templates.filter(item => domains.includes(item.domain) && !existing.has(item.id)).slice(0, maxCandidates);
  const proposals = selected.map(template => {
    const candidate = {
      schemaVersion: 1,
      enabled: false,
      id: template.id,
      title: template.title,
      description: template.objective,
      domain: template.domain,
      reviewStatus: "proposed-not-reviewed",
      parameters: clone(template.parameters),
      outputs: clone(template.outputs),
      verification: clone(template.verification),
      intendedUse: "educational-only",
      hardwareControl: false,
      limitations: clone(template.limitations),
      generatedBy: "mtdm-deterministic-engineering-discovery",
      sourceTemplateSha256: crypto.createHash("sha256").update(JSON.stringify(template)).digest("hex"),
      approvalRequired: true
    };
    validateCandidate(candidate);
    verify(candidate);
    return candidate;
  });
  return {
    schemaVersion: 1,
    engine: "deterministic-engineering-discovery",
    status: proposals.length ? "proposals-ready-for-review" : "no-new-candidates",
    generatedAt: new Date().toISOString(),
    summary: { requestedDomains: domains, proposals: proposals.length, autoEnabled: 0 },
    proposals
  };
}

export function validateEngineeringProposal(candidate) {
  validateCandidate(candidate);
  verify(candidate);
  if (candidate.enabled !== false || candidate.hardwareControl !== false ||
      candidate.intendedUse !== "educational-only" || candidate.reviewStatus !== "proposed-not-reviewed" ||
      candidate.approvalRequired !== true) throw new Error("Discovery proposals must remain disabled and review-gated");
  return true;
}
