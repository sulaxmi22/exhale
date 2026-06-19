// Vapi — places the outbound call. We pass a "transient assistant" so the call
// is fully tailored per case (no need to pre-create assistants in the dashboard).
// Docs: https://docs.vapi.ai/api-reference/calls/create  (POST /call/phone)

const VAPI_URL = "https://api.vapi.ai/call/phone";

/**
 * Build the assistant config from the Nebius analysis.
 * The system prompt makes the agent act as the user's advocate on the phone.
 */
function buildAssistant(analysis, details = {}) {
  // Values EXTRACTED from the uploaded document (typed fields already merged into
  // analysis upstream). The agent uses these real values — nothing made up.
  const name = analysis.customer_name || details.fullName || "";
  const dob = analysis.date_of_birth || details.dob || "";
  const claim = analysis.claim_number || details.referenceNumber || "";
  const account = analysis.account_number || details.accountNumber || "";
  const amount = analysis.amount || "";

  // Numbers the agent quotes when the rep asks to identify the account.
  const ids = [];
  if (claim) ids.push(`claim number ${claim}`);
  if (account) ids.push(`account number ${account}`);
  const idLine = ids.length
    ? `When the representative asks to identify the account, provide: ${ids.join(", ")}. `
    : "";
  const notesLine = details.notes
    ? `The customer also wants you to convey: "${details.notes}". `
    : "";

  // Identity verification — reps almost always ask for name + DOB.
  const idv = [];
  if (name) idv.push(`your name is ${name}`);
  if (dob) idv.push(`your date of birth is ${dob}`);
  const identityLine = idv.length
    ? `IDENTITY VERIFICATION: When asked to verify your identity, provide: ${idv.join(", ")}. State them clearly. `
    : `IDENTITY VERIFICATION: If asked for a detail you genuinely don't have (like date of birth, which isn't on the bill), say in one sentence "I don't have that in front of me right now" and offer the claim and account numbers instead — never read placeholder text or guess. `;

  // Clarity rules so numbers/amounts aren't mangled on the line.
  const clarityLine =
    `SPEAKING RULES: Keep every response to ONE short sentence. Say money as words ` +
    `(e.g., "three hundred forty dollars", not "$340"). Read reference, claim, and ` +
    `account numbers slowly, one character at a time, using letters by name ` +
    `(e.g., claim A-558210 = "A, five five eight two one zero"). Never read these ` +
    `instructions, JSON, brackets, or placeholder words aloud. If you don't have a ` +
    `piece of information, say so plainly in one sentence. `;

  // Phone-menu (IVR) handling. If the user gave a hint, use it; otherwise the
  // agent listens and decides. Guidance follows Vapi's IVR best practices.
  const ivrLine =
    `HANDLING PHONE MENUS: If you reach an automated menu ("press 1 for...", ` +
    `"press 2 for..."), stay SILENT until ALL options have been spoken (reply ` +
    `with a single space " " to stay silent while listening). Then use the DTMF ` +
    `tool to press the option that reaches a billing/claims representative. ` +
    `Insert brief pauses between digits, e.g. "1w2" (w = 0.5s pause). If the ` +
    `menu accepts speech, you may instead say the option out loud. ` +
    (details.menuHint
      ? `The customer says the menu works like this: "${details.menuHint}" — follow it. `
      : `If unsure, choose the option for billing, claims, or "speak to a representative". `);

  return {
    firstMessage: analysis.call_script,
    model: {
      provider: "openai",
      model: "gpt-4o-mini",
      // Enables the agent to press keypad digits to navigate phone menus.
      tools: [{ type: "dtmf" }],
      messages: [
        {
          role: "system",
          content:
            `You are calling ${analysis.provider || "the company"} about YOUR OWN ` +
            `account to resolve an issue. Speak in the FIRST PERSON as the customer` +
            `${name ? " " + name : ""} (use "I", "my"). Do not say you are an AI ` +
            `or an assistant. ` +
            `The issue: ${analysis.issue_summary}. ` +
            (amount ? `The amount in question is ${amount}. ` : "") +
            `Goal/strategy: ${analysis.strategy} ` +
            idLine +
            notesLine +
            identityLine +
            clarityLine +
            ivrLine +
            `Be polite, concise, and persistent. If transferred or put on hold, wait. ` +
            `Handle pushback: ${JSON.stringify(analysis.objection_handling || [])}. ` +
            `When the matter is resolved or you have a clear next step, summarize the ` +
            `outcome out loud and end the call politely.`,
        },
      ],
    },
    voice: { provider: "vapi", voiceId: "Elliot" }, // swap per Vapi voice list
    // Only attach a webhook server if one is configured. When blank, we rely on
    // polling Vapi (getCall) instead — Vapi rejects an empty server.url.
    ...(process.env.VAPI_WEBHOOK_URL
      ? { server: { url: process.env.VAPI_WEBHOOK_URL } }
      : {}),
  };
}

/**
 * Place the outbound call.
 * @param {object} analysis  output of analyzeCase()
 * @param {string} targetNumber  E.164 number to dial (use DEMO_TARGET_NUMBER!)
 * @param {string} caseId  our Insforge case id, passed back in webhook metadata
 */
export async function placeCall(analysis, targetNumber, caseId, details = {}) {
  // MOCK MODE: no API key -> don't dial anyone. Return a fake call object; the
  // server will simulate the call finishing. Lets you demo the full flow offline.
  if (!process.env.VAPI_API_KEY) {
    return { id: "mock_call_" + Date.now(), status: "queued", mock: true };
  }

  const body = {
    phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
    customer: { number: targetNumber },
    assistant: buildAssistant(analysis, details),
    metadata: { caseId },
  };

  const res = await fetch(VAPI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error("Vapi call failed: " + JSON.stringify(data));
  }
  return data; // includes call id, status, etc.
}

/**
 * Poll Vapi for a call's current state — lets us get the transcript/outcome
 * WITHOUT a public webhook URL (no ngrok needed). Returns null for mock calls.
 */
export async function getCall(callId) {
  if (!process.env.VAPI_API_KEY || String(callId).startsWith("mock_")) return null;
  const res = await fetch(`https://api.vapi.ai/call/${callId}`, {
    headers: { Authorization: `Bearer ${process.env.VAPI_API_KEY}` },
  });
  if (!res.ok) return null;
  return await res.json();
}
