import "dotenv/config";
import { analyzeCase } from "./lib/nebius.js";
try {
  const a = await analyzeCase("I was charged $340 for a doctor visit my insurance should have covered. Dispute it.", null, { referenceNumber: "CLM-9981" });
  console.log("issue:", a.issue_summary);
  console.log("who_to_call:", a.who_to_call);
  console.log("call_script:", (a.call_script||"").slice(0,90));
  console.log("ref kept:", JSON.stringify(a.key_facts));
  console.log(a.issue_summary && a.call_script ? "ANALYZE OK ✓ (real Nebius, valid JSON)" : "FAIL: missing fields");
} catch (e) { console.log("ANALYZE ERROR:", e.message.slice(0,300)); }
