import "dotenv/config";
import express from "express";
import multer from "multer";
import { analyzeCase } from "./lib/nebius.js";
import { placeCall, getCall } from "./lib/vapi.js";
import { createCase, updateCase, getCase } from "./lib/insforge.js";

const app = express();
app.set("trust proxy", 1); // real client IP behind tunnels/proxies
app.use(express.json({ limit: "15mb" }));
app.use(express.static("public"));
const upload = multer({ storage: multer.memoryStorage() });

// --- Public-demo safeguards ---
// When PUBLIC_DEMO=1, EVERY call is forced to DEMO_TARGET_NUMBER (visitors can't
// dial arbitrary numbers) and each IP is throttled, so credits can't be drained.
const PUBLIC_DEMO = process.env.PUBLIC_DEMO === "1";
const THROTTLE_MS = 60 * 1000;      // 1 call per IP per minute
const MAX_PER_IP = 5;               // ...up to 5 total per IP
const ipLog = new Map();
function allowCall(ip) {
  const now = Date.now();
  const hits = (ipLog.get(ip) || []).filter((t) => now - t < 60 * 60 * 1000);
  if (hits.length >= MAX_PER_IP) return false;
  if (hits.length && now - hits[hits.length - 1] < THROTTLE_MS) return false;
  hits.push(now);
  ipLog.set(ip, hits);
  return true;
}

// 1) User submits a problem (+ optional document photo).
//    -> Nebius analyzes -> Insforge stores -> Vapi places the call.
app.post("/api/cases", upload.single("document"), async (req, res) => {
  try {
    if (PUBLIC_DEMO && !allowCall(req.ip)) {
      return res.status(429).json({ error: "You've reached the demo limit. Please try again in a minute." });
    }
    const problem = req.body.problem || "";
    // Identifiers + notes the user typed, so the agent can answer the rep.
    const details = {
      fullName: req.body.fullName || "",
      dob: req.body.dob || "",
      referenceNumber: req.body.referenceNumber || "",
      accountNumber: req.body.accountNumber || "",
      billNumber: req.body.billNumber || "",
      notes: req.body.notes || "",
      menuHint: req.body.menuHint || "",
    };
    let imageBase64 = null;
    if (req.file) {
      imageBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    }

    const analysis = await analyzeCase(problem, imageBase64, details);
    const kase = await createCase({ problem, details, analysis, status: "calling" });

    // Number to dial: what the user typed, else the safe demo number, else the
    // number found in the doc. Keep DEMO_TARGET_NUMBER set so a blank field is safe.
    // In public-demo mode, ALWAYS dial the safe demo number (ignore user input)
    // so visitors can't make the agent call arbitrary numbers.
    const target = PUBLIC_DEMO
      ? process.env.DEMO_TARGET_NUMBER
      : (req.body.targetNumber || "").trim() ||
        process.env.DEMO_TARGET_NUMBER ||
        analysis.phone_number;
    if (!target) throw new Error("No target number. Enter one or set DEMO_TARGET_NUMBER in .env");

    const call = await placeCall(analysis, target, kase.id, details);
    await updateCase(kase.id, { vapi_call_id: call.id, status: "in_progress" });

    // MOCK MODE: no Vapi key -> simulate the call finishing after a few seconds
    // so the UI flips to "resolved" with a transcript, no webhook/ngrok needed.
    if (call.mock) {
      setTimeout(() => {
        updateCase(kase.id, {
          status: "resolved",
          summary:
            "Agent reached billing, confirmed the $340 charge was a coding " +
            "error, and got claim A-558210 flagged for reprocessing in-network. " +
            "Expected reversal in 7-10 business days.",
          transcript:
            "Exhale: Hi, I'm calling about claim A-558210, a $340 charge from a " +
            "May 14th visit that should've been covered in-network.\n" +
            "Agent: Let me pull that up... yes, I see it processed out-of-network.\n" +
            "Exhale: The provider was in-network on that date. Can you reprocess it?\n" +
            "Agent: You're right — I'll resubmit it. You should see the $340 " +
            "reversed within 7 to 10 business days.\n" +
            "Exhale: Thank you. Can I get a reference number for this?\n" +
            "Agent: Yes, it's RPC-99421.",
          ended_reason: "mock-complete",
        });
      }, 6000);
    }

    res.json({ caseId: kase.id, analysis, callId: call.id, mock: !!call.mock });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

// 2) Vapi posts call events here. We care about end-of-call-report.
app.post("/api/vapi/webhook", async (req, res) => {
  const msg = req.body?.message || {};
  const caseId = msg.call?.metadata?.caseId;
  if (msg.type === "end-of-call-report" && caseId) {
    await updateCase(caseId, {
      status: "resolved",
      transcript: msg.transcript || msg.artifact?.transcript || "",
      summary: msg.summary || msg.analysis?.summary || "",
      ended_reason: msg.endedReason || "",
    });
  }
  res.sendStatus(200);
});

// 3) Frontend polls case status. If not resolved yet and we have a real Vapi
//    call, ask Vapi directly for the result — no webhook/ngrok required.
app.get("/api/cases/:id", async (req, res) => {
  let kase = await getCase(req.params.id);
  if (!kase) return res.status(404).json({ error: "not found" });

  if (kase.status !== "resolved" && kase.vapi_call_id) {
    try {
      const call = await getCall(kase.vapi_call_id);
      if (call && (call.status === "ended" || call.endedAt)) {
        kase = await updateCase(kase.id, {
          status: "resolved",
          transcript: call.transcript || call.artifact?.transcript || "",
          summary: call.summary || call.analysis?.summary || "",
          ended_reason: call.endedReason || "",
        });
      }
    } catch (e) {
      console.warn("[vapi] poll failed:", e.message);
    }
  }
  res.json(kase);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  const nebius = process.env.NEBIUS_API_KEY ? "REAL (reads uploaded image)" : "⚠️ MOCK (image NOT read — set NEBIUS_API_KEY)";
  const vapi = process.env.VAPI_API_KEY ? "REAL (places calls)" : "MOCK (simulated calls)";
  const insforge = process.env.INSFORGE_BASE_URL ? "ON" : "off (in-memory)";
  console.log(`\nExhale running on http://localhost:${port}`);
  console.log(`  Nebius:   ${nebius}`);
  console.log(`  Vapi:     ${vapi}`);
  console.log(`  Insforge: ${insforge}\n`);
});
