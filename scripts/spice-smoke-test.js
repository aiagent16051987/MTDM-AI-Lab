import { simulate } from "@spice-ts/core";

const checks = [];
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
  checks.push(message);
};

const dc = await simulate(`
V1 in 0 DC 12
R1 in out 20k
R2 out 0 10k
.op
.end
`);
const vout = dc.dc?.voltage("out");
assert(Number.isFinite(vout) && Math.abs(vout - 4) < 1e-5, `DC divider: expected 4 V, got ${vout}`);

const transient = await simulate(`
V1 in 0 PULSE(0 5 0 1n 1n 500u 1m)
R1 in out 1k
C1 out 0 1u
.tran 10u 5m
.end
`);
const times = transient.transient?.time;
const volts = transient.transient?.voltage("out");
assert(times?.length > 10 && volts?.length === times.length, "RC transient: returned matching time and voltage samples");
assert(Number.isFinite(volts.at(-1)), "RC transient: final output voltage is finite");

const ac = await simulate(`
V1 in 0 AC 1
R1 in out 1k
C1 out 0 1u
.ac dec 10 1 100k
.end
`);
const frequencies = ac.ac?.frequencies;
const acResult = ac.ac;
console.log("AC_RESULT_SHAPE", Object.keys(acResult ?? {}), Object.getOwnPropertyNames(Object.getPrototypeOf(acResult ?? {})));
console.log("AC_MAGNITUDE_TYPE", typeof acResult?.magnitude, "AC_VOLTAGE_TYPE", typeof acResult?.voltage);
const magnitude = typeof acResult?.magnitude === "function" ? acResult.magnitude("out") : acResult?.magnitude?.out;

console.log("AC_FREQUENCIES", frequencies?.length, "MAGNITUDE", magnitude?.length, "SAMPLE", magnitude?.[0]);

process.stdout.write("MTDM AI Lab SPICE smoke tests passed:\n- " + checks.join("\n- ") + "\n");
