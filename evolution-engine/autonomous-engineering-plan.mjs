const VALID_ID = /^[a-z][a-z0-9-]{0,63}$/;

function validateObjective(objective) {
  if (!objective || objective.schemaVersion !== 1 || !Array.isArray(objective.domains) ||
      objective.domains.length !== 5 || !Array.isArray(objective.crossCuttingGates) ||
      !objective.safety || objective.safety.automaticMerge !== false ||
      objective.safety.automaticProductionRelease !== false ||
      objective.safety.hardwareControl !== false) {
    throw new TypeError("Invalid autonomous engineering objective or unsafe policy");
  }
  const ids = new Set();
  for (const domain of objective.domains) {
    if (!VALID_ID.test(domain?.id || "") || !VALID_ID.test(domain?.capabilityId || "") ||
        ids.has(domain.id) || !Array.isArray(domain.workstreams) || !domain.workstreams.length) {
      throw new TypeError("Invalid or duplicate objective domain");
    }
    ids.add(domain.id);
    const workstreamIds = new Set();
    for (const stream of domain.workstreams) {
      if (!VALID_ID.test(stream?.id || "") || workstreamIds.has(stream.id) ||
          typeof stream.target !== "string" || !stream.target.trim() ||
          !Array.isArray(stream.acceptance) || stream.acceptance.length < 2 ||
          stream.acceptance.some(item => typeof item !== "string" || !item.trim())) {
        throw new TypeError("Invalid objective workstream: " + domain.id);
      }
      workstreamIds.add(stream.id);
    }
  }
  return true;
}

export function buildAutonomousEngineeringPlan({ objective, capabilities, audit }) {
  validateObjective(objective);
  if (!Array.isArray(capabilities) || !audit || !Array.isArray(audit.findings)) {
    throw new TypeError("Capabilities and audit findings are required");
  }
  const tasks = [];
  for (const domain of objective.domains) {
    const capability = capabilities.find(item => item?.id === domain.capabilityId);
    const relatedFindings = audit.findings.filter(item =>
      item.category === "verification" || item.category === "evidence" || item.category === "integrity");
    for (const stream of domain.workstreams) {
      const implemented = capability?.status === "implemented";
      tasks.push({
        taskId: domain.id + ":" + stream.id,
        domain: domain.id,
        capabilityId: domain.capabilityId,
        workstream: stream.id,
        target: stream.target,
        acceptanceCriteria: [...stream.acceptance],
        capabilityStatus: capability?.status || "unregistered",
        status: implemented ? "requires-benchmark-gap-assessment" : "not-yet-implemented-or-not-verified",
        priority: implemented ? "high" : "critical",
        executionMode: "requires-capable-engineering-agent",
        implementationAuthorized: false,
        evidenceGates: [...objective.crossCuttingGates],
        approvalRequired: true
      });
    }
  }
  return {
    schemaVersion: 1,
    objectiveId: objective.id,
    status: "engineering-objective-planned-agent-capability-gap-open",
    domainCount: objective.domains.length,
    workstreamCount: tasks.length,
    queuedTasks: tasks.length,
    completedTasks: 0,
    tasks,
    crossCuttingGates: [...objective.crossCuttingGates],
    relatedAuditFindings: relatedFindings.length,
    limitation: "This planner creates explicit engineering work and acceptance contracts. It does not itself synthesize arbitrary engineering source code; that requires a separately validated engineering-agent execution layer."
  };
}
