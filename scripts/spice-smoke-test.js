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
const acResult = ac.ac;
console.log("AC_RESULT_SHAPE", Object.keys(acResult ?? {}), Object.getOwnPropertyNames(Object.getPrototypeOf(acResult ?? {})));
const acVoltage = Array.from(acResult.voltage("out"));
const magnitude = acVoltage.map(sample => sample.magnitude);
assert(magnitude.length === acResult.frequencies.length && magnitude.every(Number.isFinite), "RC AC sweep: returned voltage magnitudes for every frequency");
assert(magnitude[0] > magnitude.at(-1), "RC AC sweep: low-frequency gain exceeds high-frequency gain");
assert(acResult?.frequencies?.length > 10, "RC AC sweep: returned frequency points");


const zero=await simulate(`
V1 src 0 DC 3.3
R1 src out 1k
R2 out 0 2k
.op
.end
`);
const zeroOut=zero.dc?.voltage("out");
assert(Number.isFinite(zeroOut)&&Math.abs(zeroOut-2.2)<1e-5,`DC 3.3 V divider: expected 2.2 V, got ${zeroOut}`);

const source=await simulate(`
V1 in 0 DC 5
R1 in out 1k
.op
.end
`);
assert(Math.abs(source.dc.voltage("out")-5)<1e-5,"DC source-resistor node: ideal source holds 5 V");

process.stdout.write("MTDM AI Lab SPICE smoke tests passed:\n- " + checks.join("\n- ") + "\n");
