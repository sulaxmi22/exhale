# Exhale 🟠

**We make the call you've been dreading.**

<img width="1512" height="827" alt="image" src="https://github.com/user-attachments/assets/01e962a5-acb6-4167-bbb9-94fe97a32301" />


A voice AI agent that takes the bureaucratic phone calls everyone avoids —
disputing a medical bill, canceling a subscription that won't let you, fighting
a charge, chasing an insurance claim. You describe the problem and snap a photo
of the document; Exhale reads it, plans the call, and places it for you.

Built for the **Midsummer Multimodal AI Hackathon** (June 19, 2026). Hits all
three sponsor tracks with one demo:

- **Vapi** — outbound voice call that navigates the phone tree and talks to a human
- **Nebius** — multimodal LLM reads the bill/letter (OCR + reasoning) and writes the call script
- **Insforge** — backend that stores the case, transcript, and outcome

---

## Run it RIGHT NOW with no keys (mock mode)

You don't need any API keys to see the full flow. If a key is missing, that
service is automatically mocked: Nebius returns a sample bill analysis, Vapi
does NOT dial anyone (returns a fake call), and the call "completes" after ~6s
with a sample transcript. Insforge falls back to in-memory storage.

```bash
cd Exhale
npm install        # already done
npm start          # then open http://localhost:3000
```

Type anything, hit **Make the call**, and watch it go: analyzing → calling →
resolved, with a transcript. This is how you rehearse the demo before the event.

**At the event:** `cp .env.example .env`, paste in the real keys, restart. Each
service flips from mock to real automatically the moment its key is present —
no code changes. Fill them in one at a time (Nebius first, then Vapi) so you can
test each independently.

---

## How it works

```
  Browser (photo + problem)
        │  POST /api/cases
        ▼
  server.js ──► Nebius (analyzeCase)      reads doc → JSON {issue, facts, phone, strategy, script}
        │
        ├──► Insforge (createCase)        persists the case
        │
        └──► Vapi (placeCall)             dials DEMO_TARGET_NUMBER, runs the tailored assistant
                   │
                   ▼  call ends
        Vapi webhook ──► server.js ──► Insforge (updateCase: transcript + summary)
                   ▲
  Browser polls /api/cases/:id ──────────► shows "Resolved" + transcript
```

---

## Setup (≈10 min)

```bash
cd exhale
npm install
cp .env.example .env      # fill in keys (see below)
```

Get keys:
- **Nebius** → https://studio.nebius.ai ($100 credit). Put key in `NEBIUS_API_KEY`. Pick a vision model from their list and set `NEBIUS_VISION_MODEL`.
- **Vapi** → https://dashboard.vapi.ai ($50 credit). Get an API key + buy/import a phone number, then set `VAPI_API_KEY` and `VAPI_PHONE_NUMBER_ID`.
- **Insforge** → https://insforge.dev ($25 credit). Set `INSFORGE_BASE_URL` + `INSFORGE_API_KEY`. **Or leave blank to run in-memory** while you get the call flow working.

Expose your webhook so Vapi can reach you:
```bash
npx ngrok http 3000
# copy the https URL into VAPI_WEBHOOK_URL as  https://xxxx.ngrok-free.app/api/vapi/webhook
```

Run:
```bash
npm start          # http://localhost:3000
```

---

## Insforge `cases` table

| column        | type   |
|---------------|--------|
| id            | text (pk) |
| problem       | text   |
| analysis      | json   |
| status        | text   | (analyzing → calling → in_progress → resolved) |
| vapi_call_id  | text   |
| transcript    | text   |
| summary       | text   |
| ended_reason  | text   |
| created_at    | timestamp |

---
