import fs from "node:fs";
import path from "node:path";

const ALLOWED_PREFIXES = ["scripts/", "evolution-engine/", "research-engine/"];
const ALLOWED_ROOT_FILES = new Set([
  "app.js", "advanced-labs.js", "robotics-core.js", "nano-core.mjs",
  "printing-core.mjs", "printing-lab.js", "research-labs.js",
  "research-next.js", "visual-circuit.js", "navigation.js"
]);
const PROTECTED = /^(\.github\/|package(?:-lock)?\.json$|capabilities\.json$|evolution-engine\/release-policy\.json$)/;

function resolveTarget(root, relative) {
  if (typeof relative !== "string" || !relative || relative.includes("\\") ||
      path.isAbsolute(relative) || relative.split("/").some(part => !part || part === "." || part === "..") ||
      PROTECTED.test(relative) || !(ALLOWED_ROOT_FILES.has(relative) || ALLOWED_PREFIXES.some(prefix => relative.startsWith(prefix)))) {
    throw new Error("Remediation target is outside the permitted source allowlist: " + String(relative));
  }
  const rootReal = fs.realpathSync(root);
  const candidate = path.resolve(rootReal, relative);
  if (!candidate.startsWith(rootReal + path.sep)) throw new Error("Remediation target escapes repository");
  const actual = fs.realpathSync(candidate);
  if (!actual.startsWith(rootReal + path.sep) || !fs.statSync(actual).isFile()) {
    throw new Error("Remediation target is not a repository file");
  }
  return actual;
}

export function applyRemediationRecipes({ root = process.cwd(), findings = [], catalog }) {
  if (!catalog || catalog.schemaVersion !== 1 || !Array.isArray(catalog.recipes)) {
    throw new TypeError("Invalid remediation catalog schema");
  }
  const enabled = catalog.recipes.filter(recipe => recipe && recipe.enabled === true);
  const max = Number.isInteger(catalog.maxAppliedRecipes) ? catalog.maxAppliedRecipes : 1;
  if (max < 1 || max > 3) throw new Error("maxAppliedRecipes must be between 1 and 3");

  const applied = [];
  const originals = new Map();
  for (const recipe of enabled) {
    if (applied.length >= max) break;
    if (typeof recipe.id !== "string" || typeof recipe.findingId !== "string" ||
        typeof recipe.file !== "string" || typeof recipe.before !== "string" ||
        typeof recipe.after !== "string" || !recipe.before || recipe.before === recipe.after) {
      throw new Error("Malformed remediation recipe");
    }
    if (!findings.some(finding => finding.id === recipe.findingId)) continue;

    const target = resolveTarget(root, recipe.file);
    const current = fs.readFileSync(target, "utf8");
    const occurrences = current.split(recipe.before).length - 1;
    if (occurrences !== 1) {
      throw new Error("Recipe " + recipe.id + " precondition failed: expected exactly one source match, found " + occurrences);
    }
    if (!originals.has(target)) originals.set(target, current);
    fs.writeFileSync(target, current.replace(recipe.before, recipe.after), "utf8");
    applied.push({ id: recipe.id, findingId: recipe.findingId, file: recipe.file });
  }
  return {
    applied,
    changedFiles: [...originals.keys()].map(file => path.relative(fs.realpathSync(root), file)),
    rollback: () => {
      for (const [file, original] of originals) fs.writeFileSync(file, original, "utf8");
    }
  };
}
