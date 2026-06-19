# Exhale 🟠

<img width="1512" height="862" alt="image" src="https://github.com/user-attachments/assets/5dd2d485-7b77-443d-9726-e01f679cfe2a" />


**We make the call you've been dreading.**

> Snap a photo of a confusing bill. Say what's wrong. Exhale reads the document,
> plans the call, dials the company, navigates the phone menu, talks to the rep
> **as you**, and hands back the outcome — with the transcript saved.

<!-- SCREENSHOT: app home / a completed "Resolved" run -->
<!-- ![Exhale app](docs/app.png) -->

A voice-AI agent for the bureaucratic phone calls everyone avoids — disputing a
medical bill, canceling a subscription that won't let you leave, fighting a
wrong charge, contesting a parking ticket, or getting a fee waived. The product
is the **handoff**: from *understanding a messy document* to *taking real-world
action on the phone*, in one tap.

Built for the **Midsummer Multimodal AI Hackathon** (June 19, 2026). It uses all
three sponsor platforms, each doing real, load-bearing work in a single flow.

---

## The 30-second pitch

| | |
|---|---|
| **Problem** | Everyone has a dreaded call they put off for weeks — not because it's hard, because it's dreadful. 1 in 5 bills has an error almost nobody disputes. |
| **Insight** | AI calling isn't new. Document readers aren't new. The magic is combining *messy-document understanding* with *the phone call people avoid*. |
| **Proof it's real** | Upload any document and the agent extracts **that document's** real name, account, claim number, and amount — and speaks them on the call. Different every time. Nothing is hardcoded. |

---

## How the three platforms work together

```
  Browser (photo of a document + one line about the problem)
        │  POST /api/cases
        ▼
  server.js
        │
        ├──►  NEBIUS   reads the document (vision OCR + reasoning) and returns a
        │              structured plan: who to call, the real account/claim/amount,
        │              a strategy, and a first-person call script.     [lib/nebius.js]
        │
        ├──►  INSFORGE persists the case (best-effort; never blocks the call).
        │                                                              [lib/insforge.js]
        │
        └──►  VAPI     places the outbound call with a per-call "transient assistant".
                       It navigates the phone menu (DTMF), speaks AS the customer,
                       and resolves the issue.                          [lib/vapi.js]
                          │
                          ▼  call ends
  Browser polls GET /api/cases/:id ──► server polls VAPI for the transcript + outcome
                          │              (no public webhook / tunnel required)
                          ▼
                       INSFORGE updated with transcript + summary ──► UI shows "Resolved"
```
<img width="557" height="167" alt="image" src="https://github.com/user-attachments/assets/8c4857b5-5574-4f68-89c0-99118663adee" />

---

## 🟢 Nebius — the eyes and the brain

**What it is:** Nebius Token Factory, an OpenAI-compatible inference gateway for open models.
**What it does in Exhale:** reads the uploaded document and turns it into an actionable plan.

We send **one** multimodal request (the photo + the user's sentence) to the
vision model `Qwen/Qwen2.5-VL-72B-Instruct` and get back a single structured
JSON object that contains *everything* the rest of the pipeline needs:

```jsonc
{
  "customer_name": "...",      // read off the document
  "account_number": "...",     // read off the document
  "claim_number": "...",       // read off the document
  "amount": "$340.00",         // read off the document
  "provider": "...",           // who issued it
  "who_to_call": "...",        // which department
  "phone_number": "...",       // best number on the doc
  "strategy": "...",           // what outcome to push for
  "call_script": "...",        // first-person opening, spoken AS the customer
  "objection_handling": ["..."]
}
```

**How we used it efficiently:**
- **One call does four jobs** — OCR, field extraction, reasoning about the right
  outcome, and writing the call script — instead of chaining multiple requests.
  Lower latency, fewer tokens, less cost.
- **Forced JSON** via `response_format: { type: "json_object" }` so the output
  drops straight into the call pipeline with no fragile parsing.
- **Low temperature (0.2)** for repeatable, faithful extraction.
- **Generic by design** — the same prompt reads a medical bill, a gym invoice, a
  card statement, a parking ticket, or a bank fee. No per-document logic.

> Code: [`lib/nebius.js`](lib/nebius.js)

<!-- SCREENSHOT: Nebius dashboard — model usage / token consumption proving real calls -->
<!-- ![Nebius usage](docs/nebius.png) -->

---

## 🔵 Vapi — the voice

**What it is:** Vapi, a platform for building and running real-time voice agents over the phone.
**What it does in Exhale:** makes the actual outbound call and holds the conversation.

We build a **transient assistant per call** (`POST /call/phone`) — the entire
agent (system prompt, opening line, tools) is generated on the fly from the
Nebius plan, so every call is tailored to that specific document with **zero**
manual dashboard setup.

**How we used it efficiently:**
- **Transient assistant** — fully tailored agents at request time, no pre-saved
  assistants to maintain.
- **DTMF tool enabled** — the agent presses keypad digits to navigate "press 1
  for billing" phone menus, following Vapi's IVR best practices (waits for all
  options, paces digits).
- **Speaks in the first person as the customer**, using the identity Nebius read
  from the document — so reps engage naturally instead of refusing a third party.
- **No tunnel needed** — instead of requiring a public webhook (ngrok), the
  server **polls Vapi** (`GET /call/{id}`) for the transcript and outcome. One
  less moving part to fail on stage.

> Code: [`lib/vapi.js`](lib/vapi.js)

<img width="1512" height="907" alt="image" src="https://github.com/user-attachments/assets/a853bf5a-38b7-423b-ba02-96e9ceacdeca" />



---

## 🟣 Insforge — the memory

**What it is:** Insforge, an agent-native Postgres backend (PostgREST-style REST API).
**What it does in Exhale:** stores every case — the problem, the extracted facts, the call transcript, and the outcome.

We created a `cases` table via the Insforge API and write to it through the
PostgREST records endpoint (`/api/database/records/cases`).

**How we used it efficiently:**
- **Best-effort writes that never block the demo** — Insforge is written to in
  the background; if a write ever fails, the app logs a warning and keeps running
  on an in-memory copy. The call flow can never be taken down by the backend.
- **PostgREST conventions** — array inserts with `Prefer: return=representation`,
  filtered updates via `?ref=eq.<id>`.
- **Clean correlation** — Insforge auto-manages `id`, `created_at`, `updated_at`;
  we add a `ref` column to tie each row back to the in-flight case.

> Code: [`lib/insforge.js`](lib/insforge.js)

### `cases` table

| column         | type        | notes                                            |
|----------------|-------------|--------------------------------------------------|
| `id`           | uuid        | auto (Insforge)                                  |
| `ref`          | text        | our case id, used to correlate                   |
| `problem`      | text        | the user's one-line description                  |
| `details`      | json        | typed/extracted identifiers                      |
| `analysis`     | json        | the full Nebius plan                             |
| `status`       | text        | analyzing → calling → in_progress → resolved     |
| `vapi_call_id` | text        | the Vapi call reference                          |
| `transcript`   | text        | full call transcript                             |
| `summary`      | text        | outcome summary                                  |
| `ended_reason` | text        | how the call ended                               |
| `created_at`   | timestamp   | auto (Insforge)                                  |
| `updated_at`   | timestamp   | auto (Insforge)                                  |

<img width="1512" height="909" alt="image" src="https://github.com/user-attachments/assets/f5a1a12a-6fe9-4eba-89eb-47c78cb40923" />

---

## Use cases (any document, any company)

The engine is generic — these are all live with the same code:

1. **Dispute a medical bill** — out-of-network / coding errors, reprocessed.
2. **Cancel a subscription** — the gym or service that forces you to phone in.
3. **Dispute a card charge** — quote the transaction, request a reversal.
4. **Fight a parking ticket** — reference the citation, contest or extend.
5. **Waive a late / overdraft fee** — ask for the one-time courtesy waiver.

Sample documents for each live in [`samples/`](samples/).

---

## Run it

```bash
npm install
cp .env.example .env     # add your keys (below)
npm start                # http://localhost:3000
```

On startup the server prints which mode each service is in, so you always know
it's using real APIs:

```
Exhale running on http://localhost:3000
  Nebius:   REAL (reads uploaded image)
  Vapi:     REAL (places calls)
  Insforge: ON
```

### Keys (`.env`)

| Variable | Where | Purpose |
|---|---|---|
| `NEBIUS_API_KEY` | studio.nebius.ai | document reading + planning |
| `NEBIUS_VISION_MODEL` | — | `Qwen/Qwen2.5-VL-72B-Instruct` |
| `VAPI_API_KEY` | dashboard.vapi.ai (Private key) | places calls |
| `VAPI_PHONE_NUMBER_ID` | Vapi → Phone Numbers | the number's UUID |
| `INSFORGE_BASE_URL` / `INSFORGE_API_KEY` | insforge.dev | case storage (optional — falls back to in-memory) |
| `DEMO_TARGET_NUMBER` | — | the number to dial during demos |

> No webhook/ngrok required — the server polls Vapi for results.
> **Mock mode:** with no keys set, every service is safely mocked so you can run
> the full flow offline for rehearsal.

### Optional: public demo safeguards

Set `PUBLIC_DEMO=1` to lock every call to `DEMO_TARGET_NUMBER` and rate-limit per
IP — safe to expose at a booth without anyone draining your call credits.

---

## Project structure

```
Exhale/
├── server.js          # Express API: orchestrates Nebius → Insforge → Vapi; polls for results
├── lib/
│   ├── nebius.js      # multimodal document reading + plan/script generation
│   ├── vapi.js        # transient assistant, outbound call, DTMF, result polling
│   └── insforge.js    # best-effort case persistence (PostgREST)
├── public/index.html  # single-page UI (upload, status, transcript)
├── samples/           # realistic sample documents for each use case
└── .env.example
```

---

*Built in one day for the Midsummer Multimodal AI Hackathon. Sample documents are
synthetic — no real personal data.*
