import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { evaluateHeartbeat, recordHeartbeat } from "../evolution-engine/maintenance-heartbeat.mjs";

const hour = 60 * 60 * 1000;
const t0 = "2026-11-26T10:00:00.000Z";
const within = evaluateHeartbeat({ lastAttemptAt: t0 }, { attemptedAt: "2026-11-26T11:20:00.000Z" });
assert.equal(within.status, "within-expected-window");
const missed = evaluateHeartbeat({ lastAttemptAt: t0 }, { attemptedAt: "2026-11-26T12:00:00.000Z" });
assert.equal(missed.status, "missed-or-delayed-run-detected");
assert.equal(missed.gapMs, 2 * hour);
assert.equal(evaluateHeartbeat({}, { attemptedAt: t0 }).status, "initialized");
assert.throws(() => evaluateHeartbeat({}, { attemptedAt: "not-a-date" }), /current-attempt-time-invalid/);

const root = fs.mkdtempSync(path.join(os.tmpdir(), "mtdm-heartbeat-"));
try {
  const statePath = path.join(root, "state", "heartbeat.json");
  const reportPath = path.join(root, "artifacts", "heartbeat.json");
  const first = recordHeartbeat({ statePath, reportPath, success: true, runId: "101", event: "schedule", attemptedAt: t0 });
  assert.equal(first.outcome, "success");
  const second = recordHeartbeat({ statePath, reportPath, success: false, runId: "102", event: "schedule", attemptedAt: "2026-11-26T11:00:00.000Z" });
  assert.equal(second.outcome, "failure");
  assert.equal(second.lastSuccessRunId, "101");
  const persisted = JSON.parse(fs.readFileSync(statePath, "utf8"));
  assert.equal(persisted.lastAttemptConclusion, "failure");
  assert.equal(persisted.lastSuccessAt, t0);
  assert.ok(fs.existsSync(reportPath));
  console.log("PASS maintenance heartbeat: initialization, hourly window, gap detection, failure persistence and last-success preservation");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
