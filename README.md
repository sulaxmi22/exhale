# Exhale 🏔️

**We make the call you've been dreading.**

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

## ▶️ Run it RIGHT NOW with no keys (mock mode)

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
cd sherpa
npm install
cp .env.example .env      # fill in keys (see below)
```

Get keys at the event:
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

## ⚠️ The one rule for the demo

Set `DEMO_TARGET_NUMBER` to **your own test line or a teammate playing "the
billing department."** Do NOT cold-call a real insurer on stage — real phone
trees are unpredictable and will sink your demo. A controlled, repeatable call
is not a weakness; a crash is. Record a backup video too.

---

## Build order for the 5 hours (do them top to bottom)

1. **(45m) Vapi first.** Hardcode an outbound call to your own phone. If you hear
   the agent talk, the project works. Everything else is plumbing.
2. **(45m) Nebius.** Feed it 2–3 real bill photos; confirm clean JSON out.
3. **(30m) Insforge.** Make the `cases` table; or stay in-memory for now.
4. **(60m) Glue.** Wire `server.js`; test the full POST /api/cases path.
5. **(45m) Frontend.** It's already here — just style/tweak.
6. **(60m) Rehearse.** Run the demo 5×, fix the rough edges, record backup.

If behind: drop autonomous calling and demo **"Exhale coaches you live"** instead
— same story, no IVR risk. Keep the photo→Nebius→script spine no matter what.

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

## 3-minute demo script

**(0:00) The hook — make them feel it.**
> "Raise your hand if you've got a phone call you've been avoiding. A bill to
> dispute, a subscription you can't cancel. Yeah. Everyone. We all leave money
> and hours on the table because the call is just... dreadful. Meet Exhale."

**(0:30) Show the problem.**
> Hold up a real medical bill. "I got charged $340 my insurance should've
> covered." Snap the photo into Exhale, type one line, hit **Make the call**.

**(0:50) The magic — narrate while it works.**
> "Exhale just read the bill with Nebius — it pulled the amount, the billing
> code, the denial reason — and wrote its own game plan." (Point at the on-screen
> issue + strategy + opening line.)

**(1:15) The live call. The showstopper.**
> Put the call on speaker. The agent dials your controlled line, navigates the
> "press 1 for billing" menu, and advocates: "Hi, I'm calling about claim
> #..., charge of $340 that should've been covered under..." Let them HEAR it.

**(2:15) The payoff.**
> Call ends → screen flips to **Resolved** with the transcript and outcome,
> stored in Insforge. "Exhale got it flagged for resubmission while I drank my
> coffee."

**(2:40) The business close.**
> "Medical-billing advocates already charge 25% of what they save you. Exhale
> does it for a flat fee, instantly, for every kind of dreaded call. One agent,
> a multi-billion-dollar admin-avoidance problem." Land on the dollar figure.

**Responsible-AI line (say it, judges love it):**
> "Exhale always tells the other party it's an AI assistant calling on the
> customer's behalf, and hands off to a human for anything sensitive."
