import fs from "node:fs";
import path from "node:path";
import {auditCapabilities,buildImprovementQueue} from "../evolution-engine/audit.mjs";

const audit=auditCapabilities({root:process.cwd()});
const queue=buildImprovementQueue(audit);
const output={schemaVersion:1,runId:process.env.GITHUB_RUN_ID||null,commit:process.env.GITHUB_SHA||null,
  generatedAt:audit.generatedAt,audit,improvementQueue:queue,
  executionPolicy:{codeGeneration:false,repositoryWrites:false,automaticMerge:false,productionDeployment:false,
    approvalRequiredForEveryChange:true}};
fs.mkdirSync("artifacts/self-assessment",{recursive:true});
fs.writeFileSync(path.join("artifacts/self-assessment","assessment.json"),JSON.stringify(output,null,2)+"\n");
console.log(JSON.stringify({status:audit.status,summary:audit.summary,queued:queue.length},null,2));
if(audit.status==="blocked")process.exitCode=1;
