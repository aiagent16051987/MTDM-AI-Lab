import { test, expect } from "@playwright/test";

const workspaces = [
  ["electronics", /Electronics/i],
  ["iot", /IoT Lab/i],
  ["ai", /AI Lab/i],
  ["robotics", /Robotics/i],
  ["quantum", /Quantum/i],
  ["nano", /Nano Lab/i],
  ["research", /Research Hub/i],
  ["printing", /3D Printing/i],
  ["knowledge", /Knowledge Hub/i]
];

test("all nine workspaces navigate and expose exactly one active panel", async ({ page }) => {
  await page.goto("./");
  const tabs = page.getByRole("tab");
  await expect(tabs).toHaveCount(9);

  for (const [id, label] of workspaces) {
    await page.getByRole("tab", { name: label }).click();
    await expect(page.locator("#" + id)).toBeVisible();
    await expect(page.getByRole("tab", { name: label })).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("main .workspace:visible")).toHaveCount(1);
  }
});

test("workspace tabs support keyboard navigation", async ({ page }) => {
  await page.goto("./");
  const first = page.getByRole("tab", { name: /Electronics/i });
  await first.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: /IoT Lab/i })).toBeFocused();
  await expect(page.locator("#iot")).toBeVisible();
  await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name: /3D Printing/i })).toBeFocused();
  await expect(page.locator("#printing")).toBeVisible();
});

test("electronics guided circuit runs and produces exportable results", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("tab", { name: /Electronics/i }).click();
  await page.locator("#loadDivider").click();
  await page.locator("#runSim").click();
  await expect(page.locator("#simStatus")).toHaveText("COMPLETE", { timeout: 45_000 });
  await expect(page.locator("#exportCsv")).toBeEnabled();
  await expect(page.locator("#simLog")).toContainText("PASS");
});

test("IoT local synthetic stream starts, updates telemetry and stops", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("tab", { name: /IoT Lab/i }).click();
  await page.locator("#sensorStart").click();
  await expect(page.locator("#sensorStatus")).toHaveText("LOCAL STREAM");
  await expect(page.locator("#voltageValue")).not.toHaveText("—");
  await page.locator("#sensorStop").click();
  await expect(page.locator("#sensorStatus")).toHaveText("STOPPED");
});

test("AI model trains on its built-in synthetic teaching dataset", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("tab", { name: /AI Lab/i }).click();
  await expect.poll(async () => page.evaluate(() => Boolean(window.tf)), { timeout: 30_000 })
    .toBe(true);
  await page.locator("#aiEpochs").fill("5");
  await page.locator("#trainModel").click();
  await expect(page.locator("#aiStatus")).toHaveText("TRAINED", { timeout: 85_000 });
  await expect(page.locator("#classify")).toBeEnabled();
  await page.locator("#classify").click();
  await expect(page.locator("#prediction b")).not.toContainText("Awaiting");
});

test("3D printing estimator responds and reports a result", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("tab", { name: /3D Printing/i }).click();
  await expect(page.locator("#print3dStatus")).not.toHaveText("LOADING 3D", { timeout: 30_000 });
  await page.locator("#printEstimate").click();
  await expect(page.locator("#printEstimateStatus")).not.toHaveText("NOT CALCULATED");
  await expect(page.locator("#printVolume")).not.toHaveText("—");
  await expect(page.locator("#printEstimateLog")).not.toBeEmpty();
});

test("mobile viewport keeps all workspace tabs reachable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  const nav = page.locator(".tabs");
  await expect(nav).toBeVisible();
  await page.getByRole("tab", { name: /3D Printing/i }).click();
  await expect(page.locator("#printing")).toBeVisible();
});


test("Knowledge Hub searches curated sources and exposes provider candidates without credentials", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("tab", { name: /Knowledge Hub/i }).click();
  await expect(page.locator("#knowledgeCount")).toContainText("SOURCES");
  await expect(page.locator("#knowledgeResults .knowledge-card")).not.toHaveCount(0);
  await page.locator("#knowledgeSearch").fill("quantum");
  await expect(page.locator("#knowledgeResults .knowledge-card")).toHaveCount(2);
  await expect(page.locator("#knowledgeResults")).toContainText("IBM Quantum Learning");
  await expect(page.locator("#providerResults .provider-card")).toHaveCount(6);
  await expect(page.locator("#providerResults")).toContainText("NOT CONNECTED");
});

test("navigation does not produce uncaught JavaScript exceptions", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.goto("./");
  for (const [id] of workspaces) {
    await page.locator('[data-tab="' + id + '"]').click();
    await expect(page.locator("#" + id)).toBeVisible();
  }
  expect(pageErrors, "uncaught browser exceptions").toEqual([]);
});

test("single-qubit gates and two-qubit Bell-state path respond", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("tab", { name: /Quantum/i }).click();
  await page.locator('[data-gate="H"]').click();
  await expect(page.locator("#quantumP0")).toContainText("50");
  await page.locator("#quantumReset").click();
  await page.locator("#quantumMeasure").click();
  await expect(page.locator("#quantumLog")).not.toBeEmpty();

  await page.getByRole("tab", { name: /Research Hub/i }).click();
  await page.locator("#qBell").click();
  await expect(page.locator("#twoQubitState")).not.toBeEmpty();
  await expect(page.locator("#twoQubitProbabilities")).toContainText("50.0%");
});

test("nano dynamics and swarm prototype start and stop", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("tab", { name: /Nano Lab/i }).click();
  await page.locator("#nanoStart").click();
  await expect(page.locator("#nanoStatus")).not.toHaveText("READY");
  await page.locator("#nanoStop").click();

  await page.getByRole("tab", { name: /Research Hub/i }).click();
  await page.locator("#swarmCount").fill("40");
  await expect(page.locator("#swarmCountValue")).toHaveText("40");
  await page.locator("#swarmStart").click();
  await expect(page.locator("#swarmStatus")).not.toHaveText("READY");
  await page.locator("#swarmPause").click();
});
