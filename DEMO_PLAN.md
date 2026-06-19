# Exhale — Hackathon Build & Demo Plan

**Use case (narrowed):** Dispute a confusing **medical bill** in one supervised tap.
**Status:** Basic call flow works (Nebius + Vapi + in-memory). Don't break BAU.

---

## Timeline (build ends 3:00, demos 3:30)
- **Now → 12:15** — Lock the controlled "billing department" line (highest risk).
- **12:15 → 1:30** — UI narrow to medical-bill + pre-call consent toggles.
- **1:30 → 2:15** — (Stretch) staged approval card; polish result screen.
- **2:15** — FEATURE FREEZE.
- **2:15 → 2:45** — Rehearse the demo 5x. Record a backup video.
- **2:45 → 3:00** — Buffer. Breathe.

---

## Priority 1: Controlled rep line (do this FIRST)
The demo's biggest risk is the call partner, not our code.

- **Best:** a 2nd Vapi assistant that PLAYS the billing rep on another number.
  Script: greet → "press 1 for billing" → ask account/claim # → ask the issue →
  "Claim flagged for coding review, reference RPC-99421, payment deadline paused 30 days."
- **Fallback:** a teammate answers the demo number and reads the same script.
- Write the rep script ON PAPER so every run is identical. Have the fallback ready
  even if the bot rep works.

---

## Supervised autonomy (the lovable differentiator)
Live mid-call pause/approve is the HIGHEST-RISK piece. Safer versions that keep
the "you stay in control" story:

- **Pre-call consent (recommended):** user ticks which details Exhale may share
  (DOB, account #, SSN-last-4). Agent shares only ticked items; for the rest it
  says "I'll confirm that with the account holder." Near-zero risk.
- **Staged approval card (stretch):** a "Share date of birth?" card appears in the
  UI during the call; user taps Approve. Looks like the dream version.

Build pre-call consent for real; add the staged card only if time remains.

---

## Division of labor
- **A — Call reliability:** build/brief the rep line, run 5+ end-to-end calls, tune
  DTMF/menu handling + the closing summary.
- **B — UI + framing:** narrow to medical-bill flow, add consent toggles, polish the
  result screen (transcript, reference #, next steps), add hero image.
- **C — Pitch + ops:** write/time the 3-min script, prep the fake $340 bill image,
  record a backup video.

---

## Demo script (3 min)
1. Hook: "Everyone has a call they're avoiding."
2. Show the $340 bill → photograph it → "This should've gone through insurance."
3. Narrate Nebius reading + planning.
4. Consent moment: "I'm letting Exhale share my claim number, but not my DOB."
5. Call on speaker: hear it navigate the menu + talk to the rep.
6. Result screen: claim flagged for review, reference number, deadline paused.
7. Close: "Exhale turns the most dreaded part of bureaucracy — reading the
   confusing notice and making the call — into one supervised tap."

---

## Pitch language (locked)
- USE: "The magic is combining messy-document understanding with the phone call
  people avoid."
- AVOID: "Nobody's combined..."
- USE: "flagged for review, reference number generated."
- AVOID: "$340 reversed" (unless the rep line actually reverses it).

---

## Prize-track mapping
- **Best Workflow Agent:** reads doc → identifies outcome → plans call → navigates
  menu → talks to rep → returns result.
- **Best Agent People Love:** the dreaded call + the supervised-control moment.
- **Best Overall:** demo has a clear beginning (bill) → middle (call) → end (resolution).
