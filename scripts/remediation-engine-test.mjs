import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { applyRemediationRecipes } from "../evolution-engine/remediation-engine.mjs";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "mtdm-remediation-"));
try {
  fs.mkdirSync(path.join(root, "scripts"), { recursive: true });
  fs.writeFileSync(path.join(root, "scripts", "fixture.mjs"), "const value = 1;\n");
  const findings = [{ id: "known-regression" }];
  const catalog = { schemaVersion: 1, maxAppliedRecipes: 1, recipes: [{
    id: "fixture-safe-repair", enabled: true, findingId: "known-regression",
    file: "scripts/fixture.mjs", before: "const value = 1;", after: "const value = 2;"
  }] };
  const transaction = applyRemediationRecipes({ root, findings, catalog });
  assert.equal(transaction.applied.length, 1);
  assert.match(fs.readFileSync(path.join(root, "scripts", "fixture.mjs"), "utf8"), /value = 2/);
  transaction.rollback();
  assert.match(fs.readFileSync(path.join(root, "scripts", "fixture.mjs"), "utf8"), /value = 1/);

  assert.throws(() => applyRemediationRecipes({ root, findings, catalog: {
    schemaVersion: 1, maxAppliedRecipes: 1, recipes: [{ ...catalog.recipes[0], file: "../outside.mjs" }]
  }}), /allowlist/);
  assert.throws(() => applyRemediationRecipes({ root, findings, catalog: {
    schemaVersion: 1, maxAppliedRecipes: 1, recipes: [{ ...catalog.recipes[0], before: "not present" }]
  }}), /precondition failed/);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
console.log("PASS — allowlisted exact-match remediation, precondition enforcement and rollback.");
