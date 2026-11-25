# Research-to-Experiment Integration Status

Updated: 2026-11-25

## Purpose

This document records the verified software integration boundary between MTDM AI Lab workspaces and the internal MARIE research-record pipeline. Research remains internal; no public Research Hub navigation tab is added.

## Implemented bridges

| Workspace | Deterministic experiment | Independent check / invariant | Evidence |
|---|---|---|---|
| Electronics | Bounded ideal DC divider through SPICE | Analytical divider equation | `research-engine/spice-experiment-runner.mjs` |
| Robotics | Differential-drive straight-line kinematics | Analytical displacement and zero heading | `research-engine/experiment-runner.mjs` |
| Quantum | Allowlisted single-qubit H/X/Y/Z/S/T gate sequences | State normalization, probability sum and pure-state Bloch norm | `research-engine/quantum-experiment-runner.mjs` |
| Nano | Seeded 2D Lennard-Jones fixture | Pair-force symmetry and momentum conservation | `research-engine/nano-experiment-runner.mjs` |
| Additive manufacturing | Dimension-based estimator fixture | Bounded positive geometry, material and duration outputs | `research-engine/printing-experiment-runner.mjs` |
| IoT | Synthetic telemetry fixture | Strict numeric/range validation and UTC timestamp normalization | `research-engine/iot-experiment-runner.mjs` |
| AI | Supplied classification-label fixture | Confusion matrix, accuracy and macro precision/recall/F1 arithmetic | `research-engine/ai-experiment-runner.mjs` |

Each bridge emits a typed hypothesis, experiment and result record, checks references, records explicit units and stores a SHA-256 input digest. The bridges use fixed test fixtures and bounded software inputs; they do not turn software output into scientific proof.

## Shared record contract

- Versioned records: source, claim, evidence, method, dataset, contradiction, hypothesis, experiment, result and review.
- Cross-record references are validated before an experiment result is returned.
- Results require an experiment reference, explicit status, timestamps, tool version and SHA-256 input digest.
- Structured outputs are restricted to bounded JSON-safe values.
- Source and evidence provenance is not inferred from an experiment result.

## Current boundaries and remaining gaps

1. IoT remains a local synthetic telemetry demonstration with optional user-consented MQTT publishing. The new bridge validates synthetic telemetry schema only; it has no authenticated device ingestion or hardware-in-the-loop research bridge.
2. Browser AI evaluation uses a synthetic seeded dataset and local holdout metrics. The new bridge checks confusion-matrix metric arithmetic on a supplied label fixture; it is not a real-world validated model benchmark or evidence of predictive performance.
3. Quantum validation is ideal single-qubit unitary arithmetic only; it does not cover entanglement, density matrices, noise, decoherence or hardware.
4. Nano validation is a small 2D reduced-unit classical model; it is not material-specific molecular dynamics, quantum chemistry, biological simulation or nanorobotics.
5. Printing validation records idealized dimension-based estimates; it does not validate CAD meshes, slicing, G-code, machine behaviour or supplier quotes.
6. Robotics validates ideal planar kinematics, not motor dynamics, wheel slip, physical sensors or safety-rated motion.
7. SPICE validation is a bounded ideal circuit subset, not a complete EDA tool or hardware certification.

## Safety and governance

- No retrieved/generated code is automatically executed by the browser or promoted into production.
- No external model provider is required by these deterministic bridges.
- No private user project data is sent to a remote provider by these bridges.
- Physical, medical, biological, industrial and safety-critical use requires qualified specialist review and independent validation.
- Test fixtures and model assumptions must remain visible; a PASS means only that the stated software invariant passed.

## Next engineering priorities

1. Add synthetic AI evaluation as a deterministic, provenance-linked research experiment with a fixed dataset and explicit split/metric definitions.
2. Add a schema-validated IoT telemetry fixture bridge that distinguishes synthetic samples from authenticated device measurements.
3. Expand independent numerical reference tests and convergence/sensitivity analysis where the domain model supports them.
4. Keep all new bridges behind the shared record contract and capability audit.
