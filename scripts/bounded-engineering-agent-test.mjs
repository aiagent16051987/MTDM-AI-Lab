import assert from "node:assert/strict";
import { runBoundedEngineeringAgent } from "../evolution-engine/bounded-engineering-agent.mjs";

const files = new Map([["scripts/example.mjs", "const answer = 1;\n"]]);
const readFile = file => files.get(file);
const writeFile = (file, value) => files.set(file, value);
const task = { taskId: "ai:optimizer", domain: "ai", target: "Add a bounded optimizer" };

const adapter = {
  id: "test-ai-specialist",
  supports: candidate => candidate.domain === "ai",
  propose: () => ({ patches: [{ file: "scripts/example.mjs", before: "const answer = 1;", after: "const answer = 2;" }] })
};

let result = runBoundedEngineeringAgent({
  tasks: [task], adapters: [adapter], readFile, writeFile,
  validate: () => ({ passed: true, evidence: { test: "finite-difference", result: "passed" } }),
  diagnose: () => ({ retryable: false })
});
assert.equal(result.results[0].status, "candidate-validated-pending-human-review");
assert.equal(files.get("scripts/example.mjs"), "const answer = 2;\n");
assert.equal(result.safety.automaticMerge, false);

files.set("scripts/example.mjs", "const answer = 1;\n");
let attempts = 0;
result = runBoundedEngineeringAgent({
  tasks: [task], adapters: [{ ...adapter, propose: () => { attempts += 1; return adapter.propose(); } }],
  readFile, writeFile,
  validate: () => ({ passed: false, code: "benchmark-mismatch" }),
  diagnose: () => ({ retryable: true, rootCause: "expected vector mismatch" }),
  limits: { maxAttempts: 2 }
});
assert.equal(attempts, 2);
assert.equal(result.results[0].status, "blocked-validation-failed");
assert.equal(files.get("scripts/example.mjs"), "const answer = 1;\n");

result = runBoundedEngineeringAgent({
  tasks: [task], adapters: [], readFile, writeFile,
  validate: () => ({ passed: true }), diagnose: () => ({ retryable: false })
});
assert.equal(result.results[0].status, "blocked-no-trusted-specialist-adapter");

assert.throws(() => runBoundedEngineeringAgent({
  tasks: [task], adapters: [{ ...adapter, propose: () => ({ patches: [{ file: "../package.json", before: "a", after: "b" }] }) }],
  readFile, writeFile, validate: () => ({ passed: true }), diagnose: () => ({ retryable: false })
}), /outside the source allowlist/);
assert.throws(() => runBoundedEngineeringAgent({
  tasks: [task], adapters: [adapter], readFile, writeFile,
  validate: () => ({ passed: true }), diagnose: () => ({ retryable: false }),
  limits: { maxAttempts: 4 }
}), /hard safety limits/);
assert.throws(() => runBoundedEngineeringAgent({
  tasks: [task], adapters: [{ ...adapter, propose: () => ({ patches: [{ file: "scripts/example.mjs", before: "missing", after: "new" }] }) }],
  readFile, writeFile, validate: () => ({ passed: true }), diagnose: () => ({ retryable: false })
}), /precondition failed/);

console.log("PASS — bounded adapter execution, patch allowlist, retries, rollback, budgets and human-review gate.");
