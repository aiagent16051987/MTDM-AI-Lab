const ALLOWED_SOURCE_TYPES = new Set(["datasheet", "standard", "peer-reviewed", "textbook", "reference-implementation", "experimental-dataset", "official-documentation"]);
const ALLOWED_CHECKS = new Set(["independent-analytic-cross-check", "reference-implementation", "experimental-data", "standards-conformance"]);

function validDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

export function evaluateEngineeringEvidence(candidate) {
  const blockers = [];
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return { status: "blocked", releaseEligible: false, blockers: ["candidate-must-be-an-object"] };
  }
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
    }
  }
  if (typeof candidate.governingEquations !== "string" || candidate.governingEquations.trim().length < 8) blockers.push("missing-governing-equations");
  if (!candidate.parameterUnits || typeof candidate.parameterUnits !== "object" || Array.isArray(candidate.parameterUnits)) {
    blockers.push("missing-parameter-units");
  } else {
    for (const parameter of candidate.parameters || []) {
      if (typeof candidate.parameterUnits[parameter.name] !== "string" || !candidate.parameterUnits[parameter.name].trim()) blockers.push("missing-unit:" + parameter.name);
    }
  }
  if (!candidate.domainOfValidity || typeof candidate.domainOfValidity !== "object" ||
      typeof candidate.domainOfValidity.description !== "string" || !candidate.domainOfValidity.description.trim() ||
      !candidate.domainOfValidity.bounds || typeof candidate.domainOfValidity.bounds !== "object") {
    blockers.push("missing-domain-of-validity-and-bounds");
  }
  if (!candidate.uncertainty || typeof candidate.uncertainty.method !== "string" ||
      typeof candidate.uncertainty.description !== "string" || !candidate.uncertainty.description.trim()) {
    blockers.push("missing-uncertainty-analysis");
  }
  if (!Array.isArray(candidate.independentChecks) || candidate.independentChecks.length === 0) {
    blockers.push("missing-independent-validation");
  } else {
    for (const check of candidate.independentChecks) {
      if (!check || !ALLOWED_CHECKS.has(check.method) || check.result !== "passed" ||
          typeof check.evidenceSourceId !== "string" || !check.evidenceSourceId ||
          !Number.isFinite(check.tolerance) || check.tolerance < 0) blockers.push("invalid-independent-validation-record");
      else if (!candidate.evidenceSources?.some(source => source.id === check.evidenceSourceId)) blockers.push("independent-check-source-not-found");
    }
  }
  if (!Array.isArray(candidate.verification) || candidate.verification.length < 2 ||
      candidate.verification.some(vector => !vector || typeof vector.input !== "object" ||
        !vector.expected || typeof vector.expected !== "object")) blockers.push("insufficient-numerical-verification-vectors");
  if (!Array.isArray(candidate.limitations) || candidate.limitations.length === 0 ||
      candidate.limitations.some(item => typeof item !== "string" || !item.trim())) blockers.push("missing-explicit-limitations");
  if (!/^[a-f0-9]{64}$/.test(candidate.sourceTemplateSha256 || "")) blockers.push("missing-or-invalid-provenance-hash");
  if (candidate.intendedUse !== "educational-only" || candidate.hardwareControl !== false) blockers.push("unsafe-or-undeclared-intended-use");
  return {
    status: blockers.length ? "blocked" : "evidence-complete-pending-human-approval",
    releaseEligible: blockers.length === 0 && candidate.enabled === true,
    blockers: [...new Set(blockers)],
    evidenceSourceCount: candidate.evidenceSources?.length || 0,
    independentCheckCount: candidate.independentChecks?.length || 0
  };
}
