# MTDM AI Lab Studio

A static browser workspace for electronics, IoT and AI experiments, deployed on GitHub Pages.

## Workspaces

- **Electronics:** SPICE netlist editor powered by `@spice-ts/core`, with DC operating point, transient and AC small-signal analysis.
- **IoT:** local synthetic sensor stream and optional MQTT over WebSocket.
- **AI:** TensorFlow.js neural classifier trained on synthetic voltage/current/temperature examples.

## Deploy

Pushes to `main` run automated SPICE smoke tests, build the static site with Vite, and deploy `dist/` to GitHub Pages.

Live site: https://aiagent16051987.github.io/MTDM-AI-Lab/

## Circuit simulator

The circuit tab uses the MIT-licensed `@spice-ts/core` TypeScript SPICE engine. It parses SPICE netlists and supports DC operating point, DC sweep, transient and AC analysis, plus resistor, capacitor, inductor, independent sources, diode, BJT, MOSFET and controlled-source models. Advanced device models and convergence can still have simulator-specific limitations; check the engine documentation and validate important designs against independent tools and hardware measurements.

Engine documentation: https://github.com/spicets/spice-ts

The CI smoke tests check a 12 V resistor divider, an RC transient response and an RC AC frequency sweep. Passing these tests confirms only those reference cases, not production readiness or safety certification.

## IoT and AI limitations

The IoT tab uses a public MQTT broker by default. Public broker traffic is not private; do not send secrets, credentials or personal data.

The AI classifier uses synthetic data and is for demonstrating an ML workflow only. It is not a validated fault detector and must not control charger, battery, mains or other safety-critical protection functions.

## Runtime and privacy

No MTDM-owned backend or database is required. Circuit simulation runs in the browser. TensorFlow.js and MQTT.js are loaded from public CDNs, so their tabs require internet access. No user project is intentionally uploaded to an MTDM server.
