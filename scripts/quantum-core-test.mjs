import assert from "node:assert/strict";
import { simulateQuantumCircuit, sampleQuantumMeasurements } from "../quantum-core.mjs";

const bell = simulateQuantumCircuit({
  qubits: 2,
  operations: [{ gate: "H", target: 0 }, { gate: "CNOT", control: 0, target: 1 }]
});
assert.equal(bell.status, "pass");
assert.deepEqual(bell.probabilities.map(value => Number(value.toFixed(12))), [0.5, 0, 0, 0.5]);
assert.ok(Math.abs(bell.pureStateConcurrence - 1) < 1e-12);
assert.ok(bell.normError < 1e-12);

const ghz = simulateQuantumCircuit({
  qubits: 3,
  operations: [
    { gate: "H", target: 0 },
    { gate: "CNOT", control: 0, target: 1 },
    { gate: "CNOT", control: 1, target: 2 }
  ]
});
assert.ok(Math.abs(ghz.probabilities[0] - 0.5) < 1e-12);
assert.ok(Math.abs(ghz.probabilities[7] - 0.5) < 1e-12);
assert.ok(ghz.probabilities.slice(1, 7).every(value => value < 1e-12));

const inverseRotations = simulateQuantumCircuit({
  qubits: 1,
  initialBasis: 0,
  operations: [{ gate: "RY", target: 0, angle: 0.73 }, { gate: "RY", target: 0, angle: -0.73 }]
});
assert.ok(Math.abs(inverseRotations.probabilities[0] - 1) < 1e-12);
assert.ok(inverseRotations.probabilities[1] < 1e-12);

const phase = simulateQuantumCircuit({
  qubits: 1,
  operations: [{ gate: "H", target: 0 }, { gate: "T", target: 0 }, { gate: "H", target: 0 }]
});
assert.ok(Math.abs(phase.probabilitySum - 1) < 1e-12);
assert.ok(Math.abs(phase.probabilities[0] - (1 + Math.SQRT1_2) / 2) < 1e-12);

const swap = simulateQuantumCircuit({
  qubits: 2, initialBasis: 1, operations: [{ gate: "SWAP", first: 0, second: 1 }]
});
assert.equal(swap.probabilities[2], 1);

const custom = simulateQuantumCircuit({
  qubits: 1, initialState: [[Math.SQRT1_2, 0], [0, Math.SQRT1_2]],
  operations: [{ gate: "Z", target: 0 }]
});
assert.ok(Math.abs(custom.probabilities[0] - 0.5) < 1e-12);
assert.ok(Math.abs(custom.probabilities[1] - 0.5) < 1e-12);

assert.throws(() => simulateQuantumCircuit({ qubits: 9 }), /1 to 8/);
assert.throws(() => simulateQuantumCircuit({ qubits: 2, operations: [{ gate: "CNOT", control: 1, target: 1 }] }), /Invalid controlled-gate/);
assert.throws(() => simulateQuantumCircuit({ qubits: 1, operations: [{ gate: "H", target: 1 }] }), /Invalid single-qubit gate/);
assert.throws(() => simulateQuantumCircuit({ qubits: 1, operations: [{ gate: "RX", target: 0 }] }), /rotation angle/);
assert.throws(() => simulateQuantumCircuit({ qubits: 1, operations: [{ gate: "H", target: 0, injected: "bad" }] }), /Invalid single-qubit/);
assert.throws(() => simulateQuantumCircuit({ qubits: 1, initialState: [[1, 0], [1, 0]] }), /normalized/);
assert.throws(() => simulateQuantumCircuit({ qubits: 1, operations: [{ gate: "MEASURE", target: 0 }] }), /Unsupported quantum gate/);
assert.throws(() => simulateQuantumCircuit({ qubits: 1, operations: [{ gate: "H", target: 0 }], tolerance: 0.1 }), /tolerance/);

const repeated = simulateQuantumCircuit({ qubits: 2, operations: [{ gate: "H", target: 0 }, { gate: "CNOT", control: 0, target: 1 }] });
assert.equal(repeated.inputHash, bell.inputHash);


const bellSamples = sampleQuantumMeasurements(bell, { shots: 20000, seed: 12345 });
assert.equal(Object.values(bellSamples.counts).reduce((a, b) => a + b, 0), 20000);
assert.equal(bellSamples.counts["01"] ?? 0, 0);
assert.equal(bellSamples.counts["10"] ?? 0, 0);
assert.ok(Math.abs(bellSamples.frequencies["00"] - 0.5) < 0.02);
assert.ok(Math.abs(bellSamples.frequencies["11"] - 0.5) < 0.02);
assert.deepEqual(
  sampleQuantumMeasurements(bell, { shots: 20000, seed: 12345 }).counts,
  bellSamples.counts
);
const firstOnly = sampleQuantumMeasurements(bell, { shots: 1000, seed: 7, measuredQubits: [0] });
assert.deepEqual(Object.keys(firstOnly.counts), ["0", "1"]);
assert.ok(Math.abs(firstOnly.frequencies["0"] - 0.5) < 0.06);
const reversedOrder = sampleQuantumMeasurements(ghz, { shots: 100, seed: 9, measuredQubits: [2, 0] });
assert.deepEqual(Object.keys(reversedOrder.counts), ["00", "11"]);
assert.throws(() => sampleQuantumMeasurements(bell, { shots: 0 }), /shots/);
assert.throws(() => sampleQuantumMeasurements(bell, { shots: 100, seed: -1 }), /seed/);
assert.throws(() => sampleQuantumMeasurements(bell, { shots: 100, measuredQubits: [0, 0] }), /measuredQubits/);
assert.throws(() => sampleQuantumMeasurements(bell, { shots: 100, measuredQubits: [2] }), /measuredQubits/);
assert.throws(() => sampleQuantumMeasurements({ ...bell, stateVector: [[1, 0], [1, 0], [0, 0], [0, 0]] }), /normalized/);

console.log("Quantum core tests passed: Bell/GHZ entanglement, complex amplitudes, gates, rotations, SWAP, normalization, deterministic provenance and invalid-input rejection.");
