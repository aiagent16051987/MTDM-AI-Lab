import path from "node:path";

const DEFAULT_ALLOWED_PREFIXES = ["evolution-engine/", "research-engine/", "scripts/"];
const PROTECTED = /^(\.github\/|package(?:-lock)?\.json$|capabilities\.json$|evolution-engine\/release-policy\.json$)/;
const ID = /^[a-z][a-z0-9-]{0,63}$/;

function validateLimits(limits) {
  const values = ["maxTasks", "maxAttempts", "maxFiles", "maxPatchBytes"];
  for (const key of values) {
    if (!Number.isInteger(limits[key]) || limits[key] < 1) throw new TypeError("Invalid agent budget: " + key);
  }
  if (limits.maxAttempts > 3 || limits.maxTasks > 5 || limits.maxFiles > 3 || limits.maxPatchBytes > 65536) {
    throw new RangeError("Engineering agent budget exceeds hard safety limits");
  }
}

function validatePath(file, prefixes, root = ".") {
  if (typeof file !== "string" || !file || file.includes("\\") || path.isAbsolute(file) ||
      file.split("/").some(part => !part || part === "." || part === "..") || PROTECTED.test(file) ||
      !prefixes.some(prefix => file.startsWith(prefix))) {
    throw new Error("Agent patch target is outside the source allowlist: " + String(file));
  }
  const resolved = path.resolve(root, file);
  if (!resolved.startsWith(path.resolve(root) + path.sep)) throw new Error("Agent patch path escapes workspace");
  return file;
}

function validatePatch(patch, prefixes, limits, root) {
  if (!patch || typeof patch !== "object") throw new TypeError("Agent returned an invalid patch");
  const file = validatePath(patch.file, prefixes, root);
  if (typeof patch.before !== "string" || !patch.before ||
      typeof patch.after !== "string" || patch.after === patch.before) {
    throw new TypeError("Agent patch must contain distinct, non-empty before/after text");
  }
  if (Buffer.byteLength(patch.after, "utf8") > limits.maxPatchBytes) {
    throw new RangeError("Agent patch exceeds the per-file byte budget");
  }
  return { file, before: patch.before, after: patch.after };
}

function applyPatch(patch, readFile, writeFile) {
  const current = readFile(patch.file);
  const count = current.split(patch.before).length - 1;
  if (count !== 1) throw new Error("Patch precondition failed for " + patch.file + ": expected one exact match, found " + count);
  writeFile(patch.file, current.replace(patch.before, patch.after));
  return current;
}

export function runBoundedEngineeringAgent({
  tasks, adapters, readFile, writeFile, validate, diagnose,
  root = ".", limits = {}, allowedPrefixes = DEFAULT_ALLOWED_PREFIXES, startIndex = 0
}) {
  const budget = { maxTasks: 1, maxAttempts: 2, maxFiles: 1, maxPatchBytes: 12000, ...limits };
  validateLimits(budget);
  if (!Array.isArray(tasks) || !Array.isArray(adapters) ||
      typeof readFile !== "function" || typeof writeFile !== "function" ||
      typeof validate !== "function" || typeof diagnose !== "function") {
    throw new TypeError("Engineering agent requires tasks, trusted adapters and validation callbacks");
  }
  if (!Number.isInteger(startIndex) || startIndex < 0) throw new TypeError("startIndex must be a non-negative integer");
  const registry = new Map();
  for (const adapter of adapters) {
    if (!adapter || !ID.test(adapter.id || "") || typeof adapter.supports !== "function" ||
        typeof adapter.propose !== "function" || registry.has(adapter.id)) {
      throw new TypeError("Invalid or duplicate trusted engineering adapter");
    }
    registry.set(adapter.id, adapter);
  }

  const results = [];
  const selectedCount = Math.min(tasks.length, budget.maxTasks);
  const selectedTasks = Array.from({ length: selectedCount }, (_, index) => tasks[(startIndex + index) % tasks.length]);
  for (const task of selectedTasks) {
    const adapter = [...registry.values()].find(item => item.supports(task));
    if (!adapter) {
      results.push({ taskId: task?.taskId || null, status: "blocked-no-trusted-specialist-adapter", attempts: 0, changedFiles: [] });
      continue;
    }
    let completed = false;
    let lastFailure = null;
    for (let attempt = 1; attempt <= budget.maxAttempts; attempt += 1) {
      const proposal = adapter.propose({ task, attempt, lastFailure });
      if (!proposal || !Array.isArray(proposal.patches) || !proposal.patches.length ||
          proposal.patches.length > budget.maxFiles) {
        results.push({ taskId: task.taskId, status: "blocked-invalid-or-over-budget-proposal", attempts: attempt, changedFiles: [] });
        completed = true;
        break;
      }
      const patches = proposal.patches.map(item => validatePatch(item, allowedPrefixes, budget, root));
      if (new Set(patches.map(item => item.file)).size !== patches.length) {
        throw new Error("Agent proposal contains duplicate target files");
      }
      const originals = new Map();
      try {
        for (const patch of patches) {
          originals.set(patch.file, applyPatch(patch, readFile, writeFile));
        }
        const validation = validate({ task, attempt, proposal, changedFiles: [...originals.keys()] });
        if (validation?.passed !== true) {
          const failure = { code: String(validation?.code || "validation-failed"), summary: String(validation?.summary || "Validation did not pass") };
          for (const [file, source] of originals) writeFile(file, source);
          const diagnosis = diagnose({ task, failure, attempt });
          lastFailure = { ...failure, diagnosis };
          if (attempt === budget.maxAttempts || diagnosis?.retryable !== true) {
            results.push({ taskId: task.taskId, status: "blocked-validation-failed", attempts: attempt, changedFiles: [], failure, diagnosis });
            completed = true;
            break;
          }
          continue;
        }
        results.push({
          taskId: task.taskId, status: "candidate-validated-pending-human-review",
          attempts: attempt, changedFiles: [...originals.keys()],
          validationEvidence: validation.evidence || null,
          approvalRequired: true, automaticMerge: false, automaticRelease: false
        });
        completed = true;
        break;
      } catch (error) {
        for (const [file, source] of originals) writeFile(file, source);
        throw error;
      }
    }
    if (!completed) results.push({ taskId: task.taskId, status: "blocked-attempt-budget-exhausted", attempts: budget.maxAttempts, changedFiles: [] });
  }
  return {
    schemaVersion: 1,
    mode: "trusted-adapter-bounded-execution",
    requestedTasks: tasks.length,
    processedTasks: results.length,
    deferredTasks: Math.max(0, tasks.length - results.length),
    nextIndex: tasks.length ? (startIndex + selectedCount) % tasks.length : 0,
    results,
    safety: { arbitrarySourceExecution: false, generatedShellCommands: false, dependencyChanges: false,
      workflowChanges: false, hardwareControl: false, automaticMerge: false, automaticRelease: false,
      rollbackOnValidationFailure: true, humanReviewRequired: true },
    limitation: "Only statically registered trusted specialist adapters can propose patches. This runtime is not a general-purpose reasoning model and does not invent unregistered engineering implementations."
  };
}
