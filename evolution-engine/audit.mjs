import fs from "node:fs";
import path from "node:path";

const VALID_STATUS = new Set(["implemented", "experimental", "planned", "prohibited"]);
const SEVERITY_ORDER = { blocker: 0, high: 1, medium: 2, low: 3 };

function resolveRepositoryFile(root, relative) {
  if (typeof relative !== "string" || !relative.trim() || path.isAbsolute(relative)) return null;
  const segments = relative.split(/[\\\\/]/);
  if (segments.some(segment => !segment || segment === "." || segment === "..")) return null;
  const rootReal = fs.realpathSync(root);
  const candidate = path.resolve(rootReal, relative);
  if (candidate !== rootReal && !candidate.startsWith(rootReal + path.sep)) return null;
  try {
    const actual = fs.realpathSync(candidate);
    if (actual !== rootReal && !actual.startsWith(rootReal + path.sep)) return null;
    if (!fs.statSync(actual).isFile()) return null;
    return actual;
  } catch {
    return null;
  }
}

function addFinding(findings, id, severity, category, message) {
  findings.push({ id, severity, category, message });
}

export function auditCapabilities({ root = process.cwd(), registryPath = "capabilities.json", htmlPath = "index.html", e2ePath = "tests/e2e/workspaces.spec.js" } = {}) {
  const findings = [];
  let registry;
  let html;
  let e2e;
  try {
    registry = JSON.parse(fs.readFileSync(path.join(root, registryPath), "utf8"));
    html = fs.readFileSync(path.join(root, htmlPath), "utf8");
    e2e = fs.readFileSync(path.join(root, e2ePath), "utf8");
  } catch (error) {
    addFinding(findings, "assessment-input-unavailable", "blocker", "integrity", "A required assessment input is missing or unreadable: " + error.message);
    return { schemaVersion: 1, generatedAt: new Date().toISOString(), status: "blocked", summary: { capabilities: 0, publicWorkspaces: 0, findings: findings.length, blockers: 1, high: 0 }, findings };
  }

  if (!registry || registry.schemaVersion !== 1 || !Array.isArray(registry.capabilities)) {
    addFinding(findings, "registry-invalid", "blocker", "integrity", "Capability registry schema is invalid.");
    return { schemaVersion: 1, generatedAt: new Date().toISOString(), status: "blocked", summary: { capabilities: 0, publicWorkspaces: 0, findings: findings.length, blockers: 1, high: 0 }, findings };
  }

  const tabs = [...html.matchAll(/data-tab=["']([^"']+)["']/g)].map(match => match[1]);
  const tabCounts = new Map();
  for (const tab of tabs) tabCounts.set(tab, (tabCounts.get(tab) || 0) + 1);
  for (const [tab, count] of tabCounts) {
    if (count !== 1) addFinding(findings, "duplicate-navigation:" + tab, "blocker", "workspace", "Navigation tab identifier occurs " + count + " times: " + tab);
  }

  const seen = new Set();
  const publicIds = registry.capabilities.filter(item => item && item.publicWorkspace === true).map(item => item.id);
  for (const id of publicIds) {
    if (!tabs.includes(id)) addFinding(findings, "navigation-missing:" + id, "high", "workspace", "Public capability has no matching navigation tab: " + id);
    if (!e2e.includes('["' + id + '"')) addFinding(findings, "e2e-coverage-missing:" + id, "high", "verification", "Public workspace is not listed in the browser navigation audit: " + id);
  }
  for (const tab of tabs) {
    if (!publicIds.includes(tab)) addFinding(findings, "navigation-unregistered:" + tab, "high", "workspace", "Navigation tab is not registered as a public capability: " + tab);
  }

  for (const capability of registry.capabilities) {
    if (!capability || typeof capability !== "object" || Array.isArray(capability)) {
      addFinding(findings, "capability-record-invalid", "blocker", "integrity", "Capability record must be an object.");
      continue;
    }
    const id = typeof capability.id === "string" && capability.id.trim() ? capability.id : "unknown";
    if (seen.has(id)) addFinding(findings, "duplicate:" + id, "blocker", "integrity", "Duplicate capability identifier: " + id);
    seen.add(id);
    if (!/^[a-z][a-z0-9-]*$/.test(id)) addFinding(findings, "id-invalid:" + id, "blocker", "integrity", "Capability identifier must be a stable lowercase slug: " + id);
    if (!VALID_STATUS.has(capability.status)) addFinding(findings, "status:" + id, "blocker", "integrity", "Invalid capability status: " + id);
    if (typeof capability.publicWorkspace !== "boolean") addFinding(findings, "visibility:" + id, "blocker", "integrity", "Capability visibility must be explicit: " + id);

    for (const field of ["implementation", "evidence"]) {
      const references = capability[field];
      if (!Array.isArray(references) || references.length === 0) {
        addFinding(findings, field + ":" + id, "high", "evidence", "Missing " + field + " references for capability: " + id);
        continue;
      }
      for (const relative of references) {
        if (!resolveRepositoryFile(root, relative)) addFinding(findings, "invalid-file:" + id + ":" + String(relative), "high", "integrity", "Referenced " + field + " path is missing, not a regular file, or escapes the repository: " + String(relative));
      }
    }

    if (capability.status === "implemented" && Array.isArray(capability.evidence) &&
        !capability.evidence.some(file => /^(tests|scripts)\\//.test(file) && resolveRepositoryFile(root, file))) {
      addFinding(findings, "no-executable-evidence:" + id, "high", "verification", "Implemented capability has no existing executable test evidence: " + id);
    }
  }

  const researchRecords = registry.capabilities.filter(item => item && item.id === "research");
  if (researchRecords.length !== 1 || researchRecords[0].publicWorkspace !== false || tabs.includes("research")) {
    addFinding(findings, "research-visibility-policy", "blocker", "policy", "Research workspace must exist exactly once, remain internal and stay absent from public navigation.");
  }

  const blockers = findings.filter(item => item.severity === "blocker").length;
  const high = findings.filter(item => item.severity === "high").length;
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status: blockers ? "blocked" : high ? "needs-attention" : "pass",
    summary: { capabilities: registry.capabilities.length, publicWorkspaces: publicIds.length, findings: findings.length, blockers, high },
    findings: findings.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9) || a.id.localeCompare(b.id))
  };
}

export function buildImprovementQueue(audit) {
  if (!audit || !Array.isArray(audit.findings)) throw new TypeError("A capability audit result is required");
  return audit.findings.slice().sort((a, b) =>
    (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9) || a.id.localeCompare(b.id)
  ).map((finding, index) => ({
    workItemId: "EV-" + String(index + 1).padStart(4, "0"),
    findingId: finding.id,
    priority: finding.severity,
    category: finding.category,
    description: finding.message,
    remediation: "Create a reviewed change, add an executable regression test, and pass the complete CI/browser audit before release.",
    automaticExecution: "disabled",
    approvalRequired: true,
    status: "open"
  }));
}
