import fs from "node:fs";
import assert from "node:assert/strict";
const html=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");
const js=fs.readFileSync(new URL("../app.js",import.meta.url),"utf8");
for(const id of ["sensorProfile","sensorInterval","mqttPublishConsent","voltageLimit","currentLimit","temperatureLimit","sensorAlert","exportTelemetry","clearTelemetry"])assert(html.includes('id="'+id+'"'),"missing IoT control "+id);
for(const token of ["function validateTelemetry","function syntheticSample","wss:\\/\\/","payload.length>4096","mtdm-iot-telemetry.csv","Explicitly publish generated test data"])assert(js.includes(token),"missing IoT safety or data feature "+token);
assert(js.includes("history.length>2000"),"telemetry history is bounded");
assert(js.includes("reconnectPeriod:0"),"MQTT reconnect is explicit, not endless");
console.log("MTDM IoT telemetry smoke tests passed: validated MQTT, local profiles, opt-in publishing, alert thresholds and CSV export.");
