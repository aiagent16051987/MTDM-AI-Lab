# MTDM AI Lab — Critical Gap Analysis & Engineering Roadmap

**Review date:** 25 November 2026  
**Status:** Architecture assessment and prioritized implementation plan  
**Scope:** MTDM AI Lab Studio, MARIE, global knowledge architecture, research workspaces, security, governance and release process.

## 1. Executive assessment

MTDM AI Lab is an early-stage engineering prototype, not yet an integrated autonomous research or invention platform. It is not merely a toy: the repository contains working browser-based engineering/simulation modules, automated checks, deployment workflow and an initial bounded research-metadata engine. However, the current implementation is materially below the stated long-term vision.

The central risk is vision-to-capability overreach: descriptions of autonomous research, invention, global knowledge, self-evolution or intelligent engineering can be mistaken for implemented capabilities. The project must label every capability as implemented, experimental, planned or prohibited until evidence supports a stronger status.

**Strategic decision:** stop expanding the number of disconnected showcase modules. Build a coherent, testable engineering pipeline in which research inputs become traceable claims, claims become hypotheses, hypotheses become executable validation plans, and validated results can become reviewed engineering changes.

## 2. Product identity and non-negotiable constraints

MTDM AI Lab is intended to become a modular future-technology research and invention ecosystem—not just a collection of educational simulations.

- Core research and reasoning must not depend on a mandatory external LLM or paid inference service.
- Optional model providers may assist, but must be user-authorized, replaceable and clearly disclosed.
- Knowledge acquisition and processing are internal capabilities. Do not restore a separate public Knowledge Hub tab.
- Prefer official APIs, open metadata and permitted public sources. Respect source terms, copyright, licences, robots directives, rate limits and attribution.
- Do not promise exhaustive global coverage, permanent freshness, automatic scientific truth or unlimited free compute.
- Never send private user projects, prompts, recordings, credentials or files to external providers by default.
- No secrets in browser code or public repository. No arbitrary execution of retrieved content or generated code.
- No autonomous merging, production deployment, safety-policy changes or permission escalation.
- Every material claim and generated proposal must retain provenance, uncertainty, validation status and human-review state.
- Physical, medical, biological, industrial and safety-critical applications require specialist review and independent validation.
- Open-source licensing does not transfer third-party rights or grant rights to project trademarks.

## 3. Current implementation — evidence-based status

| Area | Current status | Honest assessment |
|---|---|---|
| Browser engineering workspaces | Implemented in several domains | Useful prototype modules; not a unified engineering environment. |
| Electronics/SPICE | Bounded simulations and tests implemented | Not a full EDA suite, hardware measurement or certification tool. |
| IoT | Synthetic telemetry and MQTT/WebSocket demonstration | Not a secure production IoT backend. |
| AI | TensorFlow.js synthetic-data classifier | Not a general AI agent or validated fault-detection system. |
| Robotics | 2D differential-drive and path-planning model | Not full physics, ROS stack or real robot controller. |
| Quantum/nano/emerging topics | Educational or reduced-order models | Not research-grade validated scientific simulators. |
| Additive manufacturing | Interactive exploration and estimates | Not a production slicer, CAD kernel or machine controller. |
| MARIE | Read-only metadata collection, provenance, deduplication, deterministic hypothesis templates and reports | Initial research foundation; does not read and reason over full research content or prove inventions. |
| Global knowledge | Architecture and policy documented | No exhaustive global collection or always-current knowledge base implemented. |
| Model routing | Architectural concept only | No verified general provider router or autonomous specialist-agent system. |
| Self-improvement | Human-reviewed workflow described | No autonomous code modification, merging or deployment—and none should be added without strong gates. |
| Governance/licensing | MIT documentation being aligned on feature branch | Rights-holder identity, third-party inventory and legal review remain necessary. |

## 4. Critical gaps to close

### G0 — Truthful capability and evidence registry
**Problem:** documentation and product vision can imply capabilities that are not implemented.

**Required:** one machine-readable capability registry containing capability ID, description, status (implemented, experimental, planned, prohibited), evidence/test links, known limitations, owner and last verification date.

**Acceptance:** README and module descriptions must not claim a capability beyond its registry status. CI fails on malformed or unreferenced implemented claims.

### G1 — Research ingestion beyond metadata
**Problem:** MARIE currently collects selected release and bibliographic metadata. It does not process underlying technical evidence sufficiently to support strong research synthesis.

**Required:** staged source adapters; source allowlist; content-type and licence checks; bounded retrieval of permitted open documents; extraction of structured claims, methods, datasets, results and limitations; source-level citations; deduplication and conflict tracking. Start with open metadata and openly licensed/explicitly permitted documents. Never bypass paywalls or access controls.

**Acceptance:** every extracted claim points to a source location or stable citation; unsupported claims are rejected or marked unverified; copyrighted full text is not republished.

### G2 — Evidence and knowledge model
**Problem:** raw metadata and heuristic hypotheses are not a durable knowledge system.

**Required:** a versioned schema for sources, claims, evidence, methods, datasets, assumptions, contradictions, hypotheses, experiments, results and review decisions. Track publication date, retrieval time, source version, licence status, confidence rationale and freshness state.

**Acceptance:** records are reproducible, traceable, exportable and distinguish fact from inference, simulation output and speculation.

### G3 — Research reasoning and hypothesis quality
**Problem:** deterministic templates can suggest connections but cannot establish novelty, causality or scientific validity.

**Required:** domain-specific reasoning stages: question decomposition, evidence retrieval, claim comparison, contradiction detection, hypothesis generation, alternative explanations, measurable predictions, falsification criteria and validation-plan generation. LLMs remain optional assistants, never the source of truth.

**Acceptance:** each hypothesis includes supporting and opposing evidence, assumptions, uncertainty, predicted observations, disproof conditions and a reproducible test plan.

### G4 — Executable validation bridge
**Problem:** research outputs are not yet systematically converted into reproducible simulations or engineering experiments.

**Required:** typed interfaces between research records and existing simulators; safe parameter schemas; deterministic test fixtures; unit-aware calculations; benchmark/reference cases; result provenance; comparison against expected ranges. Begin with low-risk software-only domains such as circuit calculations, simple robotics kinematics and synthetic IoT.

**Acceptance:** a hypothesis can be linked to a versioned experiment, input parameters, tool version, run output and pass/fail/inconclusive decision. No generated code runs outside a restricted test environment.

### G5 — Modular domain engineering
**Problem:** workspaces are separate demonstrations rather than interoperable specialist modules.

**Required:** common module contract: capability declaration, input/output schema, units, assumptions, limitations, tests, provenance, safety class and version. Domain modules should expose validated functions rather than duplicate UI-only logic.

**Acceptance:** at least two domains can exchange a typed, provenance-preserving research/experiment record without bespoke hidden coupling.

### G6 — Freshness and source governance
**Problem:** weekly metadata checks do not make all knowledge current.

**Required:** source-specific review intervals, conditional requests/caching, update detection, stale/conflict flags, source health, quota budgets and manual refresh. Source registry changes require review.

**Acceptance:** reports show last checked, source update date where available, stale state, errors and API-budget use. No false claim of permanent currency.

### G7 — Controlled evolution and software supply chain
**Problem:** a future self-improvement system could introduce unsafe or unreviewed changes.

**Required:** isolated branches/sandboxes, least-privilege CI, dependency pinning and audit, secret scanning, static checks, unit/integration/e2e tests, signed/versioned releases where practical, human approval and tested rollback. Generated patches are proposals only.

**Acceptance:** no workflow can merge or deploy a generated change without explicit authorized human approval; every release can be traced to source commit and validation evidence.

### G8 — Security, privacy and legal readiness
**Problem:** policy statements alone do not prove implementation or legal compliance.

**Required:** threat model, data-flow inventory, dependency/license inventory, security reporting process, privacy review, source-term review, attribution checks, rights-holder confirmation and jurisdiction-specific legal advice before commercial reliance.

**Acceptance:** no secrets in repository; no undisclosed outbound transfer; permissions are least-privilege; third-party materials have documented provenance and licence compatibility; release gate records review evidence.

### G9 — Product usability and operational reliability
**Problem:** many separate modules can feel like a demo gallery without a coherent user journey.

**Required:** one clear workflow: define problem → gather evidence → formulate hypothesis → choose experiment → run validation → review result → export/share reproducible report. Provide accessible navigation, error states, progress, local export and understandable limitations.

**Acceptance:** a new user can complete one end-to-end supported workflow without undocumented steps; browser tests cover it on desktop and mobile.

## 5. Prioritized implementation sequence

### Phase A — Establish truth and foundations
1. Add this gap analysis as the authoritative roadmap.
2. Add a capability/evidence registry and link it from README.
3. Define versioned schemas for source, claim, hypothesis, experiment and result.
4. Add architecture decision records for storage, adapters, execution boundaries and provenance.
5. Add CI checks for schema validity, licence notices, secrets and capability claims.

**Exit gate:** project scope and current implementation are auditable; no misleading capability claims.

### Phase B — Make MARIE a credible research engine
1. Keep existing metadata adapters bounded and read-only.
2. Add permitted open-document adapters only after licence and host-policy checks.
3. Extract structured claims with citations and uncertainty labels.
4. Detect duplicates, source conflicts and stale records.
5. Generate falsifiable hypotheses with alternative explanations and validation plans.

**Exit gate:** a reviewer can trace each conclusion to permitted source evidence and reproduce the report.

### Phase C — Connect research to engineering
1. Define common typed module contracts and units.
2. Connect MARIE hypotheses to selected deterministic simulators.
3. Record experiment inputs, code/module versions, outputs and validation outcomes.
4. Add regression benchmarks and exportable experiment reports.

**Exit gate:** at least one complete research-to-simulation-to-evidence workflow works end-to-end.

### Phase D — Controlled intelligence and evolution
1. Add optional user-configured model adapters only where they materially improve a task.
2. Add specialty routing based on declared capability and measured health—not marketing labels.
3. Let agents draft evidence-backed patches in isolated branches.
4. Require tests, security checks, human review, approval and rollback.

**Exit gate:** optional AI assistance is replaceable and transparent; no autonomous production mutation.

### Phase E — Scale responsibly
Expand source coverage and domain modules only after measuring source quality, API budgets, test reliability, user value and maintenance cost. Do not scale collection before the evidence model and freshness controls work.

## 6. Immediate engineering priorities

The next implementation should not be another showcase tab. Work in this order:

1. Capability registry: make implemented versus planned functionality machine-verifiable.
2. Research data schema: establish provenance-preserving records shared across modules.
3. MARIE evidence pipeline: move from metadata-only records toward permitted, citation-linked claims.
4. Experiment interface: connect one MARIE hypothesis to one existing deterministic simulator.
5. End-to-end acceptance test: prove the complete path with fixtures and reproducible output.
6. Governance CI: verify licensing, dependencies, secrets, safety boundaries and human approval gates.

Do not start broad autonomous web crawling, unrestricted agents, arbitrary code execution, automatic commits, or production self-modification.

## 7. Go/no-go scorecard

Judge the project by working evidence, not feature count.

- Research traceability: can every important claim be traced to a permitted source?
- Scientific discipline: are uncertainty, counter-evidence and falsification explicit?
- Reproducibility: can another person rerun an experiment and compare results?
- Integration: can research outputs enter engineering tools through stable schemas?
- Safety/security: are permissions, data flows and execution boundaries enforced in code?
- Maintainability: do CI, dependency controls and rollback protect the project?
- User value: can someone complete a meaningful workflow and obtain a useful artifact?

A release is not an invention-platform milestone merely because it adds a new simulation or an AI label. It must pass a measurable end-to-end acceptance test.

## 8. Honest project verdict

**Current maturity:** early-stage prototype with a useful set of domain demonstrations and a promising bounded research-engine foundation.

**Not yet achieved:** autonomous scientific research, comprehensive global knowledge, validated invention generation, general-purpose agentic engineering, production-grade self-evolution or research-grade simulation fidelity.

**Strategic opportunity:** the project can become differentiated if it prioritizes the evidence-to-experiment-to-validated-engineering loop, model independence, transparent provenance and safe human-governed evolution. These are substantial engineering capabilities, not cosmetic features.

**Rule for future work:** implement, test, document and verify one complete capability before expanding scope. If a feature cannot demonstrate evidence, reproducibility and a safe boundary, it remains experimental or planned—not complete.
