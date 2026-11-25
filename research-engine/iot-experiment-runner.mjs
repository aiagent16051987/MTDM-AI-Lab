import crypto from "node:crypto";
import {createHypothesisRecord,createExperimentRecord,createResultRecord,assertResearchReferences} from "./records.mjs";
const hash=v=>"sha256:"+crypto.createHash("sha256").update(JSON.stringify(v)).digest("hex");
export function runTelemetrySchemaValidation(input={}){
 const sample=input.sample??{voltage:5.1,current:1.2,temperature:31.5,timestamp:"2026-11-25T16:00:00Z"};
 const limits={voltage:[-100,1000],current:[0,1000],temperature:[-100,1000]};
 for(const key of Object.keys(limits)){const v=sample[key],[min,max]=limits[key];if(typeof v!=="number"||!Number.isFinite(v)||v<min||v>max)throw new RangeError(key+" must be a finite JSON number between "+min+" and "+max)}
 if(typeof sample.timestamp!=="string"||!Number.isFinite(Date.parse(sample.timestamp)))throw new TypeError("timestamp must be a valid date/time string");
 const normalized={voltage:sample.voltage,current:sample.current,temperature:sample.temperature,timestamp:new Date(sample.timestamp).toISOString()};
 const createdAt=input.createdAt??"2026-11-25T16:00:00Z";
 const hypothesis=createHypothesisRecord({schemaVersion:1,recordType:"hypothesis",id:"hypothesis:iot-telemetry-schema-v1",
  title:"Telemetry schema rejects invalid numeric sensor readings and canonicalizes timestamps",
  statement:"A telemetry message containing finite numeric voltage, current and temperature values within configured demonstration bounds and a parseable timestamp is normalized deterministically; invalid types, ranges or timestamps are rejected.",
  domains:["iot-telemetry"],supportingEvidenceIds:[],opposingEvidenceIds:[],
  assumptions:["Bounds are generic software demonstration limits, not hardware sensor ratings.","Input is a JSON object from a local synthetic fixture, not an authenticated physical device.","Timestamp canonicalization uses UTC ISO output."],
  alternatives:["A string or boolean masquerading as a number must be rejected.","Out-of-range readings must be rejected rather than clamped.","An invalid timestamp must be rejected."],
  predictions:["Valid fixed fixture normalizes to an ISO UTC timestamp.","Invalid numeric types, out-of-range readings and invalid timestamps are rejected."],
  falsificationCriteria:["A valid fixture changes numeric readings or fails timestamp normalization.","An invalid fixture is accepted."],
  validationPlan:["Validate all three numeric channels against fixed bounds.","Parse and canonicalize the timestamp.","Reject invalid payload fixtures and retain a digest of the accepted normalized sample."],
  uncertainty:"This is a schema and software validation fixture, not sensor calibration, device authentication or a production IoT backend.",status:"unvalidated"});
 const experiment=createExperimentRecord({schemaVersion:1,recordType:"experiment",id:"experiment:iot-telemetry-schema-v1",hypothesisId:hypothesis.id,
  moduleId:"iot.telemetry-schema",moduleVersion:"1.0.0",
  parameters:{voltage:{value:normalized.voltage,unit:"V"},current:{value:normalized.current,unit:"A"},temperature:{value:normalized.temperature,unit:"degC"}},
  assumptions:hypothesis.assumptions,safetyClass:"low-risk-software",createdAt});
 const result=createResultRecord({schemaVersion:1,recordType:"result",id:"result:iot-telemetry-schema-v1",experimentId:experiment.id,
  status:"pass",startedAt:createdAt,finishedAt:createdAt,inputHash:hash(normalized),toolVersion:"iot-telemetry-validator@1.0.0",
  outputs:{normalized,sourceClass:"synthetic-test-fixture",limits:{voltage_V:limits.voltage,current_A:limits.current,temperature_C:limits.temperature}},
  notes:"Validates software schema and canonicalization only; does not attest to physical sensor origin or calibration."});
 const records=[hypothesis,experiment,result];assertResearchReferences(records);
 return {hypothesis,experiment,result,records};
}
