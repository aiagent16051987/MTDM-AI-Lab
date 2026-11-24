# MTDM AI Lab browser audit

This suite uses Playwright with real Chromium against the deployed GitHub Pages site.

## Local run

```bash
npm install
npm install --no-save @playwright/test
npx playwright install chromium
MTDM_BASE_URL=https://aiagent16051987.github.io/MTDM-AI-Lab/ npx playwright test
```

On Windows PowerShell:

```powershell
$env:MTDM_BASE_URL="https://aiagent16051987.github.io/MTDM-AI-Lab/"
npx playwright test
```

The suite checks tab navigation, keyboard operation, one-panel visibility, SPICE execution, local IoT telemetry, the synthetic AI training path, the additive-manufacturing estimator, mobile tab access and uncaught browser exceptions.

The tests intentionally do not publish MQTT data, connect to hardware, or treat educational model outputs as physical validation. A browser pass confirms only the tested UI paths in the tested browser/environment; it is not a scientific validation, accessibility certification, security audit or production safety approval.
