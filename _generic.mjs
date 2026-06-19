import "dotenv/config";
import { analyzeCase } from "./lib/nebius.js";
const a = await analyzeCase("Planet Fitness keeps charging me $24.99 a month even though I cancelled in March. I want it stopped and refunded. My member number is PF-88231.", null, {});
console.log("category :", a.category);
console.log("provider :", a.provider);
console.log("who_to_call:", a.who_to_call);
console.log("account/ref:", a.account_number || a.claim_number);
console.log("amount   :", a.amount);
console.log("call_script:", a.call_script);
