import "dotenv/config";
import { createCase, updateCase, getCase } from "./lib/insforge.js";
const k = await createCase({ problem: "charged $340", details:{referenceNumber:"CLM-9"}, analysis:{issue_summary:"insurance should cover"}, status:"calling" });
console.log("created ref:", k.id);
await updateCase(k.id, { status:"resolved", summary:"flagged for review", transcript:"Exhale: ...\nRep: flagged.", ended_reason:"complete" });
const g = await getCase(k.id);
console.log("memory status:", g.status);
console.log("REF_FOR_CHECK=" + k.id);
