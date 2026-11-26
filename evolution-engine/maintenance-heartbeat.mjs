import fs from "node:fs";
import path from "node:path";

function parseTime(value) {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

export function evaluateHeartbeat(previous, current, { expectedIntervalMs = 60 * 60 * 1000, graceMs = 30 * 60 * 1000 } = {}) {
  const previousAttempt = parseTime(previous?.lastAttemptAt);
  const currentAttempt = parseTime(current?.attemptedAt);
  if (currentAttempt === null) throw new Error("current-attempt-time-invalid");
  const gapMs = previousAttempt === null ? null : Math.max(0, currentAttempt - previousAttempt);
  return {
    status: gapMs === null ? "initialized" : gapMs > expectedIntervalMs + graceMs ? "missed-or-delayed-run-detected" : "within-expected-window",
    previousAttemptAt: previous?.lastAttemptAt ?? null,
    gapMs,
    expectedIntervalMs,
    graceMs
  };
}

export function recordHeartbeat({ statePath, reportPath, success, runId = null, event = "unknown", attemptedAt = new Date().toISOString() }) {
  const previous = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, "utf8")) : {};
  const assessment = evaluateHeartbeat(previous, { attemptedAt });
  const state = {
    schemaVersion: 1,
    lastAttemptAt: attemptedAt,
    lastAttemptRunId: runId,
    lastAttemptEvent: event,
    lastAttemptConclusion: success ? "success" : "failure",
    lastSuccessAt: success ? attemptedAt : (previous.lastSuccessAt ?? null),
    lastSuccessRunId: success ? runId : (previous.lastSuccessRunId ?? null)
  };
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n");
  const report = {
    schemaVersion: 1,
    generatedAt: attemptedAt,
    runId,
    event,
    outcome: success ? "success" : "failure",
    scheduler: assessment,
    lastSuccessAt: state.lastSuccessAt,
    lastSuccessRunId: state.lastSuccessRunId,
    limitation: "This detects gaps only when a later workflow run starts; it cannot wake a skipped GitHub Actions schedule or guarantee continuous execution."
  };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const successArg = process.argv.find(value => value.startsWith("--success="));
  const success = successArg?.slice("--success=".length) === "true";
  const statePath = process.env.MTDM_HEARTBEAT_STATE || ".mtdm-maintenance-state/state.json";
  const reportPath = process.env.MTDM_HEARTBEAT_REPORT || "artifacts/autonomous-maintenance/heartbeat.json";
  const report = recordHeartbeat({
    statePath,
    reportPath,
    success,
    runId: process.env.GITHUB_RUN_ID || null,
    event: process.env.GITHUB_EVENT_NAME || "unknown"
  });
  console.log(JSON.stringify(report, null, 2));
}
