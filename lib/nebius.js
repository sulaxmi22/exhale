// Nebius Token Factory — OpenAI-compatible client.
// Two jobs: (1) read the photographed bill/letter (multimodal), (2) decide the
// strategy + write the call script. Both happen in ONE call to save time/credits.
import OpenAI from "openai";

// "mock" placeholder keeps the constructor happy when running keyless; the mock
// branch in analyzeCase() returns before this client is ever actually called.
const client = new OpenAI({
  apiKey: process.env.NEBIUS_API_KEY || "mock",
  baseURL: process.env.NEBIUS_BASE_URL || "https://api.tokenfactory.nebius.com/v1/",
});

const SYSTEM = `You are Exhale, an assistant that helps people resolve dreaded
bureaucratic phone calls (medical bills, wrong charges, subscription
cancellations, insurance denials, parking tickets, etc).

You are given: (1) the user's description of their problem, and (2) optionally an
image of a relevant document. Read the document carefully via OCR and EXTRACT the
real values printed on it. Never invent or guess values — if something is not on
the document, return an empty string for it.

Return ONLY a JSON object with this exact shape:
{
  "issue_summary": "one sentence plain-English summary of the problem",
  "category": "medical_bill | subscription | charge_dispute | insurance | other",
  "customer_name": "the account holder / customer name exactly as printed, or empty",
  "date_of_birth": "DOB only if actually printed on the document, else empty",
  "account_number": "account/member/customer number exactly as printed, or empty",
  "claim_number": "claim, reference, invoice, ticket, or order number exactly as printed, or empty",
  "amount": "the disputed amount exactly as printed, e.g. $340.00, or empty",
  "provider": "the company/organization that issued the document, or empty",
  "who_to_call": "the org/department to call (billing, support, customer service, etc.)",
  "phone_number": "the best phone number found in the doc, or empty",
  "strategy": "2-3 sentences: what outcome to push for and why",
  "call_script": "a FIRST-PERSON opening spoken AS THE CUSTOMER / ACCOUNT HOLDER (use 'I' and 'my'), referencing the real reference number and amount from the document",
  "objection_handling": ["likely pushback -> how to respond", "..."]
}
NEVER use bracketed placeholders like [Your Name], [date], or [amount] in
call_script — if a value is unknown, simply leave it out and phrase the sentence
naturally without it. Do not include any text outside the JSON.`;

/**
 * @param {string} problemText  user's description of the dreaded task
 * @param {string|null} imageBase64  data URL (data:image/...;base64,...) or null
 */
export async function analyzeCase(problemText, imageBase64, details = {}) {
  // MOCK MODE: no API key -> return SAMPLE data so the app runs with zero keys.
  // This does NOT read the uploaded image. If you see this warning, your real
  // extraction is OFF — set NEBIUS_API_KEY in .env and restart.
  if (!process.env.NEBIUS_API_KEY) {
    console.warn("\n⚠️  [nebius] MOCK MODE — NEBIUS_API_KEY not set. Returning SAMPLE data; the uploaded image was NOT read. Fix .env and restart.\n");
    await new Promise((r) => setTimeout(r, 800)); // feel like it's "thinking"
    const result = {
      issue_summary:
        "A $340 office visit was processed out-of-network and should have been covered.",
      category: "medical_bill",
      customer_name: "Sulaxmi",
      date_of_birth: "",
      account_number: "ACC-4471",
      claim_number: "A-558210",
      amount: "$340.00",
      provider: "Bay Area Family Clinic",
      who_to_call: "Bay Area Family Clinic billing department",
      phone_number: "+18005550143",
      strategy:
        "This looks like a coding/processing error. Push to have the claim " +
        "reprocessed under the in-network benefit and the $340 reversed.",
      call_script:
        "Hi, I'm calling about my claim A-558210 — a three hundred forty dollar " +
        "charge from my May 14th visit that was processed out-of-network by " +
        "mistake. I'd like it reviewed and reprocessed under my insurance.",
      objection_handling: [
        "\"It was out of network\" -> ask them to confirm the provider's network status on the date of service.",
        "\"You need to appeal in writing\" -> ask for the exact appeal address and reference number first.",
      ],
      _mock: true,
    };
    // Optional typed overrides take precedence over what's read from the document.
    if (details.fullName) result.customer_name = details.fullName;
    if (details.dob) result.date_of_birth = details.dob;
    if (details.referenceNumber) result.claim_number = details.referenceNumber;
    if (details.accountNumber) result.account_number = details.accountNumber;
    return result;
  }

  // Real call: append any user-provided identifiers + notes to the prompt.
  let extra = "";
  if (details.referenceNumber) extra += `\nReference/claim number: ${details.referenceNumber}`;
  if (details.accountNumber) extra += `\nAccount number: ${details.accountNumber}`;
  if (details.billNumber) extra += `\nBill number: ${details.billNumber}`;
  if (details.notes) extra += `\nExtra info / what the customer wants said: ${details.notes}`;

  const content = [{ type: "text", text: `Problem: ${problemText}${extra}` }];
  if (imageBase64) {
    content.push({ type: "image_url", image_url: { url: imageBase64 } });
  }

  const res = await client.chat.completions.create({
    model: process.env.NEBIUS_VISION_MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content },
    ],
  });

  const raw = res.choices[0].message.content;
  let result;
  try {
    result = JSON.parse(raw);
  } catch {
    // Fallback if the model wraps JSON in prose.
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) result = JSON.parse(match[0]);
    else throw new Error("Nebius did not return parseable JSON:\n" + raw);
  }
  // Typed overrides win over what was read from the document (esp. DOB, which
  // isn't printed on most bills).
  if (details.fullName) result.customer_name = details.fullName;
  if (details.dob) result.date_of_birth = details.dob;
  if (details.referenceNumber) result.claim_number = details.referenceNumber;
  if (details.accountNumber) result.account_number = details.accountNumber;
  return result;
}
