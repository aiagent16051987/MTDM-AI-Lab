const ALLOWED_SOURCE_TYPES = new Set(["datasheet", "standard", "peer-reviewed", "textbook", "reference-implementation", "experimental-dataset", "official-documentation"]);
const ALLOWED_CHECKS = new Set(["independent-analytic-cross-check", "reference-implementation", "experimental-data", "standards-conformance"]);
const OPS = new Set(["add", "sub", "mul", "div", "sqrt", "pow", "abs", "min", "max"]);

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function evaluateAst(node, input, depth = 0) {
  if (depth > 32) throw new Error("expression-depth-exceeded");
  if (typeof node === "number" && Number.isFinite(node)) return node;
  if (!node || typeof node !== "object" || Array.isArray(node)) throw new Error("invalid-expression-node");
  if (Object.hasOwn(node, "param")) {
    if (typeof node.param !== "string" || !Object.hasOwn(input, node.param)) throw new Error("unknown-expression-parameter");
    return input[node.param];
  }
  if (!OPS.has(node.op) || !Array.isArray(node.args)) throw new Error("unsupported-expression-operation");
  const args = node.args.map(value => evaluateAst(value, input, depth + 1));
  if ((["sqrt", "abs"].includes(node.op) && args.length !== 1) ||
      (!["sqrt", "abs", "min", "max"].includes(node.op) && args.length !== 2) ||
      (["min", "max"].includes(node.op) && (args.length < 1 || args.length > 16))) throw new Error("invalid-expression-arity");
  switch (node.op) {
    case "add": return args[0] + args[1];
    case "sub": return args[0] - args[1];
    case "mul": return args[0] * args[1];
    case "div": return args[0] / args[1];
    case "sqrt": return Math.sqrt(args[0]);
    case "pow": return Math.pow(args[0], args[1]);
    case "abs": return Math.abs(args[0]);
    case "min": return Math.min(...args);
    case "max": return Math.max(...args);
    default: throw new Error("unsupported-expression-operation");
  }
}

export function evaluateEngineeringEvidence(candidate) {
  const blockers = [];
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return { status: "blocked", releaseEligible: false, blockers: ["candidate-must-be-an-object"] };
  }
  if (!Array.isArray(candidate.parameters) || !candidate.parameters.length ||
      !Array.isArray(candidate.outputs) || !candidate.outputs.length) blockers.push("missing-model-parameters-or-outputs");
  const parameters = Array.isArray(candidate.parameters) ? candidate.parameters : [];
  const outputs = Array.isArray(candidate.outputs) ? candidate.outputs : [];
  const parameterNames = new Set(parameters.map(parameter => parameter?.name).filter(name => typeof name === "string"));
  const outputNames = new Set(outputs.map(output => output?.name).filter(name => typeof name === "string"));

  if (!Array.isArray(candidate.evidenceSources) || candidate.evidenceSources.length === 0) {
    blockers.push("missing-primary-or-authoritative-evidence-sources");
  } else {
    const ids = new Set();
    for (const source of candidate.evidenceSources) {
      if (!source || typeof source !== "object" || !/^[a-z][a-z0-9-]{1,63}$/.test(source.id || "") || ids.has(source.id)) {
        blockers.push("invalid-or-duplicate-evidence-source-id");
        continue;
      }
      ids.add(source.id);
      if (!ALLOWED_SOURCE_TYPES.has(source.type)) blockers.push("unsupported-evidence-source-type:" + source.id);
      if (typeof source.title !== "string" || source.title.trim().length < 4) blockers.push("missing-evidence-title:" + source.id);
      if (typeof source.publisher !== "string" || !source.publisher.trim()) blockers.push("missing-evidence-publisher:" + source.id);
      try {
        const url = new URL(source.url);
        if (url.protocol !== "https:") blockers.push("evidence-url-must-use-https:" + source.id);
      } catch { blockers.push("invalid-evidence-url:" + source.id); }
      if (!validDate(source.accessedAt)) blockers.push("invalid-evidence-access-date:" + source.id);
      if (!/^[a-f0-9]{64}$/.test(source.documentSha256 || "")) blockers.push("missing-evidence-document-hash:" + source.id);
    }
  }

  if (typeof candidate.governingEquations !== "string" || candidate.governingEquations.trim().length < 8) blockers.push("missing-governing-equations");
  if (!candidate.parameterUnits || typeof candidate.parameterUnits !== "object" || Array.isArray(candidate.parameterUnits)) {
    blockers.push("missing-parameter-units");
  } else {
    for (const parameter of parameters) {
      if (typeof candidate.parameterUnits[parameter.name] !== "string" || !candidate.parameterUnits[parameter.name].trim()) blockers.push("missing-unit:" + parameter.name);
    }
  }
  const bounds = candidate.domainOfValidity?.bounds;
  if (!candidate.domainOfValidity || typeof candidate.domainOfValidity.description !== "string" ||
      !candidate.domainOfValidity.description.trim() || !bounds || typeof bounds !== "object") {
    blockers.push("missing-domain-of-validity-and-bounds");
  } else {
    for (const parameter of parameters) {
      const range = bounds[parameter.name];
      if (!Array.isArray(range) || range.length !== 2 || range[0] !== parameter.min || range[1] !== parameter.max) {
        blockers.push("validity-bounds-do-not-match-parameter:" + parameter.name);
      }
    }
  }
  if (!candidate.uncertainty || typeof candidate.uncertainty.method !== "string" ||
      typeof candidate.uncertainty.description !== "string" || !candidate.uncertainty.description.trim()) {
    blockers.push("missing-uncertainty-analysis");
  }

  if (!Array.isArray(candidate.independentChecks) || candidate.independentChecks.length === 0) {
    blockers.push("missing-independent-validation");
  } else {
    const methods = new Set();
    for (const check of candidate.independentChecks) {
      if (!check || !ALLOWED_CHECKS.has(check.method) || check.result !== "passed" ||
          typeof check.evidenceSourceId !== "string" || !check.evidenceSourceId ||
          !Number.isFinite(check.tolerance) || check.tolerance < 0) blockers.push("invalid-independent-validation-record");
      else if (!candidate.evidenceSources?.some(source => source.id === check.evidenceSourceId)) blockers.push("independent-check-source-not-found");
      else methods.add(check.method);
    }
    if (methods.size < 1) blockers.push("no-valid-independent-validation-method");
  }

  let replayedVectors = 0;
  if (!Array.isArray(candidate.verification) || candidate.verification.length < 2) {
    blockers.push("insufficient-numerical-verification-vectors");
  } else {
    for (const [index, vector] of candidate.verification.entries()) {
      if (!vector || !vector.input || typeof vector.input !== "object" || Array.isArray(vector.input) ||
          !vector.expected || typeof vector.expected !== "object" || Array.isArray(vector.expected)) {
        blockers.push("invalid-verification-vector:" + index);
        continue;
      }
      const input = Object.fromEntries(parameters.map(parameter => [parameter.name, vector.input[parameter.name] ?? parameter.default]));
      if (Object.keys(vector.input).some(name => !parameterNames.has(name))) {
        blockers.push("unknown-verification-input:" + index);
        continue;
      }
      if (parameters.some(parameter => !Number.isFinite(input[parameter.name]) || input[parameter.name] < parameter.min || input[parameter.name] > parameter.max)) {
        blockers.push("verification-input-outside-bounds:" + index);
        continue;
      }
      if (Object.keys(vector.expected).length !== outputs.length || outputs.some(output => !Object.hasOwn(vector.expected, output.name))) {
        blockers.push("verification-output-set-incomplete:" + index);
        continue;
      }
      const tolerance = vector.tolerance ?? 1e-9;
      if (!Number.isFinite(tolerance) || tolerance <= 0 || tolerance > 0.01) {
        blockers.push("invalid-verification-tolerance:" + index);
        continue;
      }
      try {
        for (const output of outputs) {
          const actual = evaluateAst(output.expression, input);
          const expected = vector.expected[output.name];
          if (!Number.isFinite(actual) || !Number.isFinite(expected) ||
              Math.abs(actual - expected) > tolerance * Math.max(1, Math.abs(expected))) {
            blockers.push("numerical-replay-mismatch:" + index + ":" + output.name);
          }
        }
        replayedVectors += 1;
      } catch {
        blockers.push("numerical-replay-failed:" + index);
      }
    }
  }

  if (!Array.isArray(candidate.limitations) || candidate.limitations.length === 0 ||
      candidate.limitations.some(item => typeof item !== "string" || !item.trim())) blockers.push("missing-explicit-limitations");
  if (!/^[a-f0-9]{64}$/.test(candidate.sourceTemplateSha256 || "")) blockers.push("missing-or-invalid-provenance-hash");
  if (candidate.intendedUse !== "educational-only" || candidate.hardwareControl !== false) blockers.push("unsafe-or-undeclared-intended-use");
  const uniqueBlockers = [...new Set(blockers)];
  return {
    status: uniqueBlockers.length ? "blocked" : "evidence-complete-pending-human-approval",
    releaseEligible: uniqueBlockers.length === 0 && candidate.enabled === true,
    blockers: uniqueBlockers,
    evidenceSourceCount: candidate.evidenceSources?.length || 0,
    independentCheckCount: candidate.independentChecks?.length || 0,
    replayedVectors
  };
}
