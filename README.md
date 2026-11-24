# MTDM AI Lab Studio

**A free, browser-based engineering and research sandbox** for electronics, IoT, AI, robotics, quantum concepts, molecular dynamics, emerging technologies, and additive manufacturing.

- **Live app:** https://aiagent16051987.github.io/MTDM-AI-Lab/
- **Source:** https://github.com/aiagent16051987/MTDM-AI-Lab
- **Hosting:** GitHub Pages (static site)

The workspace is designed for learners and builders from beginner to advanced level. Simulations are educational models; each module's assumptions and limits matter.

## Workspaces

| Workspace | What you can explore | Important limits |
|---|---|---|
| Electronics | SPICE netlists, DC operating point/sweep, transient and AC analysis; guided voltage-divider, RC and RLC experiments; CSV export; visual R/C/L/voltage-source netlist builder | The visual builder is not a full schematic CAD editor. Simulation is not a hardware measurement or safety certification. |
| IoT | Synthetic sensor streams and MQTT over WebSocket | Public broker traffic is not private. Do not send credentials, secrets or personal data. |
| AI | TensorFlow.js classifier trained on synthetic sensor examples | Demonstration only; not a validated fault detector or safety-critical controller. |
| Robotics | 2D differential-drive kinematics, manual wheel controls, idealized range rays, obstacle course and A* route planning | Not full rigid-body physics, wheel-slip simulation, ROS integration or a safety-rated controller. |
| Quantum | Ideal single-qubit gates and measurement; two-qubit state-vector gates, CNOT, Bell-state preparation, measurement and reduced Bloch-vector projection; abstract leaky-integrate-and-fire neuron model | No noisy hardware model, density-matrix simulator, scalable quantum computer or biological neuron model. |
| Nano | Simplified 2D classical Lennard-Jones molecular-dynamics teaching model | Not quantum chemistry, validated materials science or a biological nanorobot model. |
| Research Hub | Local 2D swarm/Boids prototype and a roadmap of emerging-technology topics | The roadmap is not a claim that every listed technology has a working simulator. See [research safety policy](./RESEARCH_SAFETY.md). |
| 3D Printing & Additive Manufacturing | Process/material exploration, interactive 3D preview and illustrative volume, mass, time and cost estimates | Not a CAD kernel, production slicer, machine controller, certified process model or supplier quotation. |

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

The test suite checks selected reference cases and integration wiring. After deployment, a separate Playwright/Chromium job exercises all eight workspace tabs, keyboard navigation, SPICE execution, local IoT telemetry, synthetic AI training/inference, quantum gate and Bell-state paths, nano dynamics, swarm controls, the additive-manufacturing estimator, mobile tab access and uncaught browser exceptions. Failure screenshots, traces and the HTML report are uploaded as workflow artifacts. **A passing browser run covers only these tested paths and does not certify scientific accuracy, physical safety, production readiness, accessibility conformance or every external service.**

Check the current workflow status and download the browser-audit evidence from [GitHub Actions](https://github.com/aiagent16051987/MTDM-AI-Lab/actions). To run the browser suite locally, install dependencies and Chromium with `npx playwright install chromium`, then use `npm run test:e2e`. Set `MTDM_BASE_URL` to the deployed site URL when testing GitHub Pages.

## Global knowledge and continuous intelligence

The planned knowledge layer is specified in [GLOBAL_KNOWLEDGE_ARCHITECTURE.md](./GLOBAL_KNOWLEDGE_ARCHITECTURE.md). It defines permitted public-source research, provenance, freshness monitoring, model-provider routing, GitHub free-resource budgets, privacy boundaries and human-reviewed self-improvement. These are architecture requirements, not claims that automated global collection or autonomous updates are already live.

## Runtime, privacy and security

- The site is statically hosted; no MTDM-operated application server or database is required for the core experience.
- Browser computations use the visitor's device. Some libraries are loaded from public CDNs, so those features need internet access.
- The project does not intentionally upload user projects to an MTDM server. MQTT connections and other third-party services have their own data-handling behavior; review the service before use.
- Keep credentials, secrets, personal data and sensitive research data out of public brokers and untrusted inputs.
- Treat external links, third-party packages and any future integrations as dependencies that need review.

## Scientific and responsible-use scope

Use these tools for learning, prototyping and bounded simulations—not as substitutes for specialist engineering tools, medical advice, biological protocols, industrial control systems or safety reviews. Do not connect an educational model directly to safety-critical hardware.

For project-wide safety, privacy, security, scientific-integrity and release principles, read [RESEARCH_SAFETY.md](./RESEARCH_SAFETY.md). Applicable laws and specialist requirements must be reviewed before real-world use; this project documentation is not legal advice.

## License

No repository-wide open-source license is currently declared. Unless a license is added, do not assume the project source is available for unrestricted reuse. Third-party components retain their own licenses; see their respective project documentation.
