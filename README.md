# MTDM AI Lab Studio

**A free, browser-based engineering and research sandbox** for electronics, IoT, AI, robotics, quantum concepts, molecular dynamics, emerging technologies, and additive manufacturing.

- **Live app:** https://aiagent16051987.github.io/MTDM-AI-Lab/
- **Source:** https://github.com/aiagent16051987/MTDM-AI-Lab
- **Hosting:** GitHub Pages (static site)

The workspace is designed for learners and builders from beginner to advanced level. Simulations are educational models; each module's assumptions and limits matter.

## Public workspaces

| Workspace | What you can explore | Important limits |
|---|---|---|
| Electronics | SPICE netlists, DC operating point/sweep, transient and AC analysis; guided voltage-divider, RC and RLC experiments; CSV export; visual R/C/L/voltage-source netlist builder | The visual builder is not a full schematic CAD editor. Simulation is not a hardware measurement or safety certification. |
| IoT | Synthetic sensor streams and MQTT over WebSocket | Public broker traffic is not private. Do not send credentials, secrets or personal data. |
| AI | TensorFlow.js classifier trained on synthetic sensor examples | Demonstration only; not a validated fault detector or safety-critical controller. |
| Robotics | 2D differential-drive kinematics, manual wheel controls, idealized range rays, obstacle course and A* route planning | Not full rigid-body physics, wheel-slip simulation, ROS integration or a safety-rated controller. |
| Quantum | Ideal single-qubit gates and measurement; two-qubit state-vector gates, CNOT, Bell-state preparation, measurement and reduced Bloch-vector projection; abstract leaky-integrate-and-fire neuron model | No noisy hardware model, density-matrix simulator, scalable quantum computer or biological neuron model. |
| Nano | Simplified 2D classical Lennard-Jones molecular-dynamics teaching model | Not quantum chemistry, validated materials science or a biological nanorobot model. |
| 3D Printing & Additive Manufacturing | Process/material exploration, interactive 3D preview and illustrative volume, mass, time and cost estimates | Not a CAD kernel, production slicer, machine controller, certified process model or supplier quotation. |

**Research Hub:** retained internally for background research and existing simulations; it is not a public navigation tab. MARIE research processing remains an internal capability.

### Additive manufacturing scope

The learning workspace covers material extrusion (FDM/FFF and pellet), vat photopolymerization (SLA/DLP/MSLA), polymer and metal powder-bed fusion (SLS/MJF/LPBF/EB-PBF), binder jetting, material jetting, directed-energy deposition, wire-arc additive manufacturing, sheet lamination, construction extrusion, research-only bioprinting and hybrid additive manufacturing.

The process selector and estimates are simplified planning aids. Actual printability, support strategy, tolerances, material behavior, machine settings, safety requirements and cost depend on the specific printer, material, geometry and supplier.

## Run locally

Requirements: a current Node.js LTS release and npm.

```bash
git clone https://github.com/aiagent16051987/MTDM-AI-Lab.git
cd MTDM-AI-Lab
npm install
npm run dev
```

Vite prints a local development URL in the terminal. To create and preview a production build:

```bash
npm test
npm run build
npm run preview
```

## Automated checks and deployment

Pushes to `main` run the GitHub Actions Pages workflow. It installs dependencies, runs the repository's smoke/regression checks, builds the static site and deploys the build output to GitHub Pages.

The test suite checks selected reference cases, capability registry integrity, research record validation, provenance links and deterministic electronics/robotics experiment bridges. Before deployment, a Playwright/Chromium job exercises all seven public workspace tabs, keyboard navigation, SPICE execution, local IoT telemetry, synthetic AI training/inference, quantum gate and Bell-state paths, nano dynamics, swarm controls, the additive-manufacturing estimator, mobile tab access and uncaught browser exceptions. Failure screenshots, traces and the HTML report are uploaded as workflow artifacts. **A passing browser run covers only these tested paths and does not certify scientific accuracy, physical safety, production readiness, accessibility conformance or every external service.**

Check the current workflow status and download the browser-audit evidence from [GitHub Actions](https://github.com/aiagent16051987/MTDM-AI-Lab/actions). To run the browser suite locally, build the production site first, install Chromium with `npx playwright install chromium`, then run `npm run test:e2e`; Playwright starts a local preview automatically. To test an already deployed site instead, set `MTDM_BASE_URL` to its URL; the local preview server is then skipped.

## Continuous improvement

Research and improvement capabilities are maintained as internal engineering functions, not as a separate public workspace. The machine-readable [capability registry](./capabilities.json) records implementation status, evidence and limitations. Any future automated research or AI integrations must follow the project's privacy, source-attribution, security and human-review requirements.

The internal research data model is versioned in [research-engine/schema-v1.json](./research-engine/schema-v1.json): sources, claims, evidence, methods, datasets, contradictions, hypotheses, experiments, results and review decisions. MARIE stores source metadata with retrieval/freshness provenance and unvalidated hypothesis seeds, then runs deterministic robotics and SPICE reference experiments. Its metadata monitor does **not** perform comprehensive full-text literature extraction, prove novelty or establish scientific truth. Open-document retrieval is separately gated by explicit permission, a reviewed host allowlist, declared licence and strict size/type limits.

## Runtime, privacy and security

- The site is statically hosted; no MTDM-operated application server or database is required for the core experience.
- Browser computations use the visitor's device. Some libraries are loaded from public CDNs, so those features need internet access.
- The project does not intentionally upload user projects to an MTDM server. MQTT connections and other third-party services have their own data-handling behavior; review the service before use.
- Keep credentials, secrets, personal data and sensitive research data out of public brokers and untrusted inputs.
- Treat external links, third-party packages and any future integrations as dependencies that need review.

## Scientific and responsible-use scope

Use these tools for learning, prototyping and bounded simulations—not as substitutes for specialist engineering tools, medical advice, biological protocols, industrial control systems or safety reviews. Do not connect an educational model directly to safety-critical hardware.

For project-wide safety, privacy, security, scientific-integrity and release principles, read [RESEARCH_SAFETY.md](./RESEARCH_SAFETY.md). Applicable laws and specialist requirements must be reviewed before real-world use; this project documentation is not legal advice.

## Open-source licence and attribution

MTDM AI Lab is free and open-source software released under the [MIT License](./LICENSE). You may use, copy, modify, merge, publish, distribute, sublicense and sell copies of the software, subject to the licence's conditions.

**Original project:** MTDM AI Lab  
**Original project maintainer:** [@aiagent16051987](https://github.com/aiagent16051987)

Please retain the MIT copyright and permission notice in copies or substantial portions of the Software. Contributions remain subject to the MIT License when incorporated and distributed with this project. Contributors retain their copyright in their original contributions.

The MIT License does not grant rights to MTDM AI Lab trademarks, logos, third-party materials, or any patent rights not expressly covered by a separate grant. Third-party dependencies, assets, datasets and models retain their own licences and terms.

The software is provided "AS IS", without warranty, to the maximum extent permitted by applicable law. Users are responsible for evaluating, modifying, deploying and using their own copies and for complying with applicable laws. This disclaimer does not remove liabilities that cannot legally be excluded.

See [LICENSE](./LICENSE) and [CONTRIBUTING.md](./CONTRIBUTING.md).