import crypto from "node:crypto";

const SQRT_HALF = Math.SQRT1_2;
const COMPLEX_ONE = [1, 0];
const COMPLEX_ZERO = [0, 0];

const finite = (value, name, min, max) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(name + " must be finite and between " + min + " and " + max);
  }
  return value;
};
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const multiply = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const scale = (a, factor) => [a[0] * factor, a[1] * factor];
const magnitudeSquared = a => a[0] * a[0] + a[1] * a[1];
const phase = angle => [Math.cos(angle), Math.sin(angle)];

function singleQubitMatrix(gate, angle) {
  const c = Math.cos(angle / 2), s = Math.sin(angle / 2);
  switch (gate) {
    case "H": return [[ [SQRT_HALF, 0], [SQRT_HALF, 0] ], [ [SQRT_HALF, 0], [-SQRT_HALF, 0] ]];
    case "X": return [[COMPLEX_ZERO, COMPLEX_ONE], [COMPLEX_ONE, COMPLEX_ZERO]];
    case "Y": return [[COMPLEX_ZERO, [0, -1]], [[0, 1], COMPLEX_ZERO]];
    case "Z": return [[COMPLEX_ONE, COMPLEX_ZERO], [COMPLEX_ZERO, [-1, 0]]];
    case "S": return [[COMPLEX_ONE, COMPLEX_ZERO], [COMPLEX_ZERO, [0, 1]]];
    case "T": return [[COMPLEX_ONE, COMPLEX_ZERO], [COMPLEX_ZERO, phase(Math.PI / 4)]];
    case "RX": return [[[c, 0], [0, -s]], [[0, -s], [c, 0]]];
    case "RY": return [[[c, 0], [-s, 0]], [[s, 0], [c, 0]]];
    case "RZ": return [[phase(-angle / 2), COMPLEX_ZERO], [COMPLEX_ZERO, phase(angle / 2)]];
    default: throw new TypeError("Unsupported single-qubit gate: " + gate);
  }
}

function applySingleQubit(state, qubits, target, matrix) {
  const bit = 1 << (qubits - 1 - target);
  const next = state.map(amplitude => [...amplitude]);
  for (let base = 0; base < state.length; base++) {
    if (base & bit) continue;
    const partner = base | bit;
    next[base] = add(multiply(matrix[0][0], state[base]), multiply(matrix[0][1], state[partner]));
    next[partner] = add(multiply(matrix[1][0], state[base]), multiply(matrix[1][1], state[partner]));
  }
  return next;
}

function applyControlledX(state, qubits, control, target) {
  const controlBit = 1 << (qubits - 1 - control);
  const targetBit = 1 << (qubits - 1 - target);
  const next = state.map(amplitude => [...amplitude]);
  for (let index = 0; index < state.length; index++) {
    if ((index & controlBit) && !(index & targetBit)) {
      const partner = index | targetBit;
      next[index] = [...state[partner]];
      next[partner] = [...state[index]];
    }
  }
  return next;
}

function applyControlledZ(state, qubits, control, target) {
  const controlBit = 1 << (qubits - 1 - control);
  const targetBit = 1 << (qubits - 1 - target);
  return state.map((amplitude, index) =>
    (index & controlBit) && (index & targetBit) ? scale(amplitude, -1) : [...amplitude]
  );
}

function applySwap(state, qubits, first, second) {
  const firstBit = 1 << (qubits - 1 - first);
  const secondBit = 1 << (qubits - 1 - second);
  const next = state.map(amplitude => [...amplitude]);
  for (let index = 0; index < state.length; index++) {
    const a = Boolean(index & firstBit), b = Boolean(index & secondBit);
    if (!a && b) {
      const partner = index ^ firstBit ^ secondBit;
      next[index] = [...state[partner]];
      next[partner] = [...state[index]];
    }
  }
  return next;
}

function normalizeInitial(input, qubits) {
  const dimension = 2 ** qubits;
  if (input.initialState !== undefined) {
    if (!Array.isArray(input.initialState) || input.initialState.length !== dimension) {
      throw new TypeError("initialState must contain exactly 2^qubits complex amplitudes");
    }
    const state = input.initialState.map((amplitude, index) => {
      if (!Array.isArray(amplitude) || amplitude.length !== 2 ||
          !amplitude.every(Number.isFinite)) throw new TypeError("initialState amplitude " + index + " must be [real, imaginary]");
      return [...amplitude];
    });
    const norm = state.reduce((sum, amplitude) => sum + magnitudeSquared(amplitude), 0);
    if (Math.abs(norm - 1) > 1e-10) throw new RangeError("initialState must be normalized to unit norm");
    return state;
  }
  const basis = input.initialBasis ?? 0;
  if (!Number.isInteger(basis) || basis < 0 || basis >= dimension) {
    throw new RangeError("initialBasis must be an integer in the computational basis range");
  }
  const state = Array.from({ length: dimension }, () => [0, 0]);
  state[basis] = [1, 0];
  return state;
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}

export function simulateQuantumCircuit(input = {}) {
  const qubits = input.qubits ?? 1;
  if (!Number.isInteger(qubits) || qubits < 1 || qubits > 8) {
    throw new RangeError("qubits must be an integer from 1 to 8");
  }
  const operations = input.operations ?? [{ gate: "H", target: 0 }];
  if (!Array.isArray(operations) || operations.length < 1 || operations.length > 512) {
    throw new RangeError("operations must contain between 1 and 512 gates");
  }
  let state = normalizeInitial(input, qubits);
  const supportedSingle = new Set(["H", "X", "Y", "Z", "S", "T", "RX", "RY", "RZ"]);
  const applied = [];

  for (const [index, operation] of operations.entries()) {
    if (!operation || typeof operation !== "object" || Array.isArray(operation) ||
        !["gate", "target", "control", "first", "second", "angle"].every(key =>
          key in operation ? ["gate", "target", "control", "first", "second", "angle"].includes(key) : true)) {
      throw new TypeError("Malformed gate operation at index " + index);
    }
    const gate = operation.gate;
    if (supportedSingle.has(gate)) {
      if (Object.keys(operation).some(key => !["gate", "target", "angle"].includes(key)) ||
          !Number.isInteger(operation.target) || operation.target < 0 || operation.target >= qubits) {
        throw new TypeError("Invalid single-qubit gate target or fields at index " + index);
      }
      const angle = gate === "RX" || gate === "RY" || gate === "RZ"
        ? finite(operation.angle, "rotation angle", -1e6, 1e6) : 0;
      if (["H", "X", "Y", "Z", "S", "T"].includes(gate) && operation.angle !== undefined) {
        throw new TypeError("Fixed gates do not accept an angle");
      }
      state = applySingleQubit(state, qubits, operation.target, singleQubitMatrix(gate, angle));
    } else if (gate === "CNOT" || gate === "CZ") {
      if (Object.keys(operation).some(key => !["gate", "control", "target"].includes(key)) ||
          !Number.isInteger(operation.control) || !Number.isInteger(operation.target) ||
          operation.control < 0 || operation.control >= qubits ||
          operation.target < 0 || operation.target >= qubits || operation.control === operation.target) {
        throw new TypeError("Invalid controlled-gate operands at index " + index);
      }
      state = gate === "CNOT"
        ? applyControlledX(state, qubits, operation.control, operation.target)
        : applyControlledZ(state, qubits, operation.control, operation.target);
    } else if (gate === "SWAP") {
      if (Object.keys(operation).some(key => !["gate", "first", "second"].includes(key)) ||
          !Number.isInteger(operation.first) || !Number.isInteger(operation.second) ||
          operation.first < 0 || operation.first >= qubits ||
          operation.second < 0 || operation.second >= qubits || operation.first === operation.second) {
        throw new TypeError("Invalid SWAP operands at index " + index);
      }
      state = applySwap(state, qubits, operation.first, operation.second);
    } else {
      throw new TypeError("Unsupported quantum gate at index " + index);
    }
    applied.push({ ...operation });
  }

  const probabilities = state.map(magnitudeSquared);
  const probabilitySum = probabilities.reduce((sum, value) => sum + value, 0);
  const normError = Math.abs(probabilitySum - 1);
  const tolerance = finite(input.tolerance ?? 1e-10, "tolerance", 1e-14, 1e-6);
  const result = {
    status: normError <= tolerance ? "pass" : "fail",
    qubits,
    operationCount: applied.length,
    operations: applied,
    stateVector: state,
    probabilities,
    probabilitySum,
    normError,
    tolerance,
    inputHash: "sha256:" + crypto.createHash("sha256").update(JSON.stringify(canonical({
      qubits, initialBasis: input.initialBasis ?? 0, initialState: input.initialState ?? null, operations: applied, tolerance
    }))).digest("hex")
  };
  if (qubits === 2) {
    const determinant = add(multiply(state[0], state[3]), scale(multiply(state[1], state[2]), -1));
    result.pureStateConcurrence = Math.min(1, 2 * Math.sqrt(magnitudeSquared(determinant)));
  }
  return result;
}

export function sampleQuantumMeasurements(simulation, { shots = 1024, seed = 20261127, measuredQubits } = {}) {
  if (!simulation || typeof simulation !== "object" || !Number.isInteger(simulation.qubits) ||
      simulation.qubits < 1 || simulation.qubits > 8 ||
      !Array.isArray(simulation.stateVector) || simulation.stateVector.length !== 2 ** simulation.qubits) {
    throw new TypeError("A valid state-vector simulation result is required");
  }
  if (!Number.isInteger(shots) || shots < 1 || shots > 1000000) {
    throw new RangeError("shots must be an integer from 1 to 1000000");
  }
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new RangeError("seed must be an unsigned 32-bit integer");
  }
  const qubits = measuredQubits ?? Array.from({ length: simulation.qubits }, (_, index) => index);
  if (!Array.isArray(qubits) || qubits.length < 1 || qubits.length > simulation.qubits ||
      qubits.some(q => !Number.isInteger(q) || q < 0 || q >= simulation.qubits) ||
      new Set(qubits).size !== qubits.length) {
    throw new RangeError("measuredQubits must contain unique valid qubit indices");
  }
  const state = simulation.stateVector.map((amplitude, index) => {
    if (!Array.isArray(amplitude) || amplitude.length !== 2 || !amplitude.every(Number.isFinite)) {
      throw new TypeError("Invalid complex amplitude at state index " + index);
    }
    return amplitude;
  });
  const norm = state.reduce((sum, amplitude) => sum + magnitudeSquared(amplitude), 0);
  if (!Number.isFinite(norm) || Math.abs(norm - 1) > 1e-8) {
    throw new RangeError("Measurement requires a normalized state vector");
  }

  const outcomes = new Map();
  for (let basis = 0; basis < state.length; basis++) {
    const bits = qubits.map(q => (basis >> (simulation.qubits - 1 - q)) & 1).join("");
    outcomes.set(bits, (outcomes.get(bits) ?? 0) + magnitudeSquared(state[basis]));
  }
  const ordered = [...outcomes.entries()].filter(([, probability]) => probability > 0).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const total = ordered.reduce((sum, [, probability]) => sum + probability, 0);
  if (!Number.isFinite(total) || total <= 0) throw new RangeError("Invalid measurement probability distribution");
  const distribution = ordered.map(([bits, probability]) => ({ bits, probability: probability / total }));
  let randomState = (seed >>> 0) || 0x6d2b79f5;
  const random = () => {
    randomState ^= randomState << 13;
    randomState ^= randomState >>> 17;
    randomState ^= randomState << 5;
    return (randomState >>> 0) / 4294967296;
  };
  const counts = Object.fromEntries(distribution.map(item => [item.bits, 0]));
  const cumulative = [];
  let running = 0;
  for (const item of distribution) {
    running += item.probability;
    cumulative.push(running);
  }
  for (let shot = 0; shot < shots; shot++) {
    const draw = random();
    let selected = cumulative.findIndex(boundary => draw < boundary);
    if (selected < 0) selected = cumulative.length - 1;
    counts[distribution[selected].bits]++;
  }
  const frequencies = Object.fromEntries(Object.entries(counts).map(([bits, count]) => [bits, count / shots]));
  const standardErrors = Object.fromEntries(distribution.map(item => [
    item.bits, Math.sqrt(item.probability * (1 - item.probability) / shots)
  ]));
  return {
    qubitsMeasured: [...qubits],
    shots,
    seed: seed >>> 0,
    counts,
    frequencies,
    theoreticalProbabilities: Object.fromEntries(distribution.map(item => [item.bits, item.probability])),
    standardErrors,
    inputHash: "sha256:" + crypto.createHash("sha256").update(JSON.stringify(canonical({
      qubits: simulation.qubits, stateVector: state, measuredQubits: qubits, shots, seed: seed >>> 0
    }))).digest("hex"),
    note: "Samples are pseudorandom classical draws from the supplied ideal state-vector probabilities; no physical measurement or hardware interaction occurs."
  };
}
