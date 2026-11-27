const DOMAIN_ALIASES = { manufacturing: "printing" };

function validSlug(value) {
  return typeof value === "string" && /^[a-z][a-z0-9-]{0,63}$/.test(value);
}

export function buildDomainWorkPlan({ domains, capabilities, discovery, audit }) {
  if (!Array.isArray(domains) || !domains.length || domains.some(domain => !validSlug(domain)) ||
      new Set(domains).size !== domains.length || !Array.isArray(capabilities) ||
      !discovery || !Array.isArray(discovery.proposals) || !audit || !Array.isArray(audit.findings)) {
    throw new TypeError("Invalid domain work-plan inputs");
  }
  const proposalsByDomain = new Map();
  for (const proposal of discovery.proposals) {
    if (validSlug(proposal?.domain)) proposalsByDomain.set(proposal.domain, (proposalsByDomain.get(proposal.domain) || 0) + 1);
  }
  const workItems = domains.map(domain => {
    const capabilityId = DOMAIN_ALIASES[domain] || domain;
    const capability = capabilities.find(item => item?.id === capabilityId);
    const implementation = Array.isArray(capability?.implementation) ? capability.implementation : [];
    const evidence = Array.isArray(capability?.evidence) ? capability.evidence : [];
    const executableEvidence = evidence.filter(file => /^(tests|scripts)\//.test(file));
    const candidates = proposalsByDomain.get(domain) || 0;
    let priority = 30, action, reason;
    if (!capability) { priority = 100; action = "register-domain-capability"; reason = "No capability record maps to this domain."; }
    else if (!implementation.length || !evidence.length) { priority = 90; action = "complete-implementation-and-evidence-map"; reason = "Implementation or evidence references are incomplete."; }
    else if (!executableEvidence.length) { priority = 85; action = "add-executable-domain-regression-tests"; reason = "Evidence references do not include executable tests."; }
    else if (capability.status !== "implemented") { priority = 70; action = "raise-domain-model-fidelity-and-benchmarks"; reason = "The registered capability is experimental or planned; improve it through validated domain work."; }
    else { priority = 45; action = "expand-independent-domain-benchmarks"; reason = "Baseline implementation and test references exist; broaden independent validation."; }
    if (candidates === 0) { priority += 10; reason += " No deterministic discovery template currently covers this domain."; }
    if (audit.findings.some(item => item.severity === "blocker")) priority += 5;
    return { domain, capabilityId: capability?.id || null, capabilityStatus: capability?.status || "unregistered",
      implementationReferences: implementation.length, evidenceReferences: evidence.length,
      executableTestReferences: executableEvidence.length, deterministicCandidates: candidates,
      priority: Math.min(priority, 100), action, reason, automaticExecution: "proposal-only", approvalRequired: true };
  }).sort((a, b) => b.priority - a.priority || a.domain.localeCompare(b.domain));
  return { schemaVersion: 1, status: "prioritized-domain-work", domainCount: domains.length,
    domainsWithCapability: workItems.filter(item => item.capabilityId).length,
    domainsWithExecutableEvidence: workItems.filter(item => item.executableTestReferences > 0).length,
    domainsWithDiscoveryTemplates: workItems.filter(item => item.deterministicCandidates > 0).length,
    untemplatedDomains: workItems.filter(item => item.deterministicCandidates === 0).map(item => item.domain),
    workItems };
}
