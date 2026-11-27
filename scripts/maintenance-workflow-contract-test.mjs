import fs from "node:fs";
import assert from "node:assert/strict";

const workflow = fs.readFileSync(new URL("../.github/workflows/autonomous-maintenance.yml", import.meta.url), "utf8");
assert.ok(workflow.includes("Ensure generated simulation staging directory exists"));
assert.ok(workflow.includes("mkdir -p generated-simulations"));
assert.ok(workflow.includes("test -f generated-simulations/.gitkeep"));
assert.ok(workflow.includes("generated-simulations/"));
assert.ok(workflow.includes("Create review-only pull request"));
console.log("PASS — maintenance staging path is created and verified before review PR staging.");
