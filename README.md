# MTDM AI Lab Studio

A static, browser-based engineering workspace hosted with GitHub Pages.

## Workspaces

- **Electronics:** educational DC resistor-network solver and first-order RC transient demonstration.
- **IoT:** local synthetic sensor stream and optional MQTT over WebSocket.
- **AI:** TensorFlow.js neural classifier trained on synthetic voltage/current/temperature examples.

## Deploy

1. Open repository **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. The workflow deploys on pushes to `main`; check the **Actions** tab for status.
4. After a successful run, visit `https://aiagent16051987.github.io/MTDM-AI-Lab/`.

GitHub's official guide: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## Important scope and safety

The built-in circuit solver is an educational subset, **not a full SPICE implementation**. It currently supports simple resistor networks with one ideal independent voltage source and a first-order RC transient with one grounded capacitor. It does not support semiconductor models, nonlinear convergence, AC sweep, arbitrary controlled sources, or general multi-capacitor circuits. It must not be used to certify chargers, batteries, mains circuits, or safety-critical hardware.

The IoT tab uses a public MQTT broker by default. Public broker traffic is not private; do not send secrets or personal data.

The AI classifier uses synthetic data and is for demonstrating an ML workflow only. It is not a validated fault detector and must not control protection functions.

## Runtime

No MTDM-owned backend or database is required. The page loads TensorFlow.js and MQTT.js from public CDNs, so those tabs need internet access. The electronics demo runs locally in the browser.
