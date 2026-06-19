import { analyzeCase } from "./lib/nebius.js";
const a = await analyzeCase("charged", null, { referenceNumber:"REF-777", accountNumber:"ACC-12", billNumber:"BILL-9", notes:"DOB March 3" });
console.log("ref ->", a.key_facts.account_or_ref);
console.log("account ->", a.key_facts.account);
console.log("bill ->", a.key_facts.bill);
console.log("notes ->", a.key_facts.user_notes);
console.log((a.key_facts.account_or_ref==="REF-777" && a.key_facts.account==="ACC-12" && a.key_facts.bill==="BILL-9" && a.key_facts.user_notes==="DOB March 3") ? "DETAILS FLOW OK ✓" : "FAIL");
