# MTDM AI Lab Studio — Research Safety & Responsible Use Policy

**Applies to:** Every current and future workspace.  
**Purpose:** Enable productive education, engineering, scientific literacy and responsible experimentation.

## Core engineering principles
1. **Simulation first:** educational models do not directly actuate physical, medical, industrial or biological systems.
2. **Human oversight:** any future hardware integration requires explicit user action, informed permission, physical safeguards and independent emergency-stop controls.
3. **Privacy by default:** do not transmit user experiments, sensor streams, files or identifiers to MTDM-operated services. External transfers must be explicit, documented and revocable.
4. **Least privilege:** request camera, microphone, location, USB, network or device permissions only when a disclosed feature requires them.
5. **Scientific integrity:** document assumptions, units, limitations, validation status and references. Never present an educational approximation as medical advice, validated research, engineering certification or safety approval.
6. **Open-source compliance:** review dependency license, version, provenance and security advisories; preserve required notices and attribution.

## Disallowed project directions
Do not implement features intended for weaponization, harmful autonomous targeting, malware, credential theft, unauthorized access, covert surveillance, pathogen engineering, harmful biological designs, unsafe medical intervention or non-consensual collection of sensitive brain, biometric or health data.

## Topic-specific boundaries
- **Swarm robotics:** coordination and navigation education; no harmful autonomous deployment workflows.
- **Nanorobotics / bloodstream:** hypothetical visualization only; no claims of real medical capability, injection or treatment.
- **CRISPR / DNA:** sequence literacy and non-operational visualization; no wet-lab protocols or harmful organism design.
- **Quantum:** circuits, algorithms and sensing education; no unauthorized attack workflows.
- **Fusion plasma:** reduced-order educational models; never connect to or control a real reactor.
- **Molecular machines:** theoretical bounded models; no harmful synthesis applications.
- **Neuromorphic computing/chips:** learning, architecture and performance models; no harmful autonomous targeting.
- **Organoid intelligence:** published-data and conceptual analysis only; no tissue experimentation instructions.
- **Synthetic biology:** abstract non-operational circuits; no pathogen or harmful biological engineering.
- **Metamaterials:** educational mechanical, optical and electromagnetic models; assess end-use risk for specialized capabilities.
- **BCI / quantum sensing:** synthetic or consented data only; no diagnosis, treatment or covert brain-data collection.

## Security baseline
- Validate and bound all inputs; avoid unsafe HTML injection and dynamic code execution.
- Pin dependencies where practical; review licenses, advisories and supply-chain provenance.
- Never embed secrets or API keys in client-side code.
- Do not persist sensitive data in browser storage by default.
- Keep network features opt-in, disclose destinations and minimize transmitted data.
- Add automated tests for calculations, validation and safety boundaries.
- Provide a security issue-reporting route and remediate defects promptly.

## Release gate
Every module requires a written purpose/scope, model assumptions and units, safe bounded defaults, at least one deterministic smoke/reference test, a limitations statement, dependency/license review and proportionate privacy/security review.

## Legal and ethical note
This is an internal engineering standard, not legal advice or a guarantee of compliance in every jurisdiction. Public release and real-world use require review of applicable laws, institutional ethics requirements, data-protection obligations, export controls and sector-specific standards by qualified professionals.

**Project rule:** If a feature cannot meet these boundaries, do not ship it; redesign it as a safe educational or analytical alternative.
