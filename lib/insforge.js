// Insforge — case persistence (PostgREST-style records API).
//
// DEMO-SAFE: in-memory is always the source of truth for the UI, so the app
// NEVER breaks even if Insforge is down/misconfigured. When Insforge is set we
// ALSO write to it best-effort (errors logged, never thrown) — so your data
// lands in Insforge for the prize-track demo, and the call flow can't crash.
//
// Table `cases` (created via POST /api/database/tables). Insforge auto-adds
// id (uuid), created_at, updated_at. We correlate via our own `ref` column.
//   ref, problem, details(json), analysis(json), status,
//   vapi_call_id, transcript, summary, ended_reason

const mem = new Map();
const base = (process.env.INSFORGE_BASE_URL || "").replace(/\/$/, "");
const ENABLED = !!process.env.INSFORGE_BASE_URL;
const RECORDS = `${base}/api/database/records/cases`;
const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${process.env.INSFORGE_API_KEY}`,
};

// Only these columns exist remotely — filter so a stray key can't 400 the write.
const COLUMNS = ["problem", "details", "analysis", "status", "vapi_call_id", "transcript", "summary", "ended_reason"];
function pick(obj) {
  const out = {};
  for (const k of COLUMNS) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}

async function tryRemote(label, fn) {
  if (!ENABLED) return;
  try {
    const res = await fn();
    if (!res.ok) console.warn(`[insforge] ${label} -> ${res.status}: ${await res.text()} (using in-memory)`);
  } catch (e) {
    console.warn(`[insforge] ${label} failed: ${e.message} (using in-memory)`);
  }
}

export async function createCase(record) {
  const id = "case_" + Date.now();
  const row = { id, status: "analyzing", created_at: new Date().toISOString(), ...record };
  mem.set(id, row);
  await tryRemote("createCase", () =>
    fetch(RECORDS, {
      method: "POST",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify([{ ref: id, ...pick(row) }]), // body MUST be an array
    })
  );
  return row;
}

export async function updateCase(id, patch) {
  const row = { ...(mem.get(id) || { id }), ...patch };
  mem.set(id, row);
  await tryRemote("updateCase", () =>
    fetch(`${RECORDS}?ref=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(pick(patch)),
    })
  );
  return row;
}

export async function getCase(id) {
  // Read from memory so UI polling is reliable regardless of Insforge.
  return mem.get(id) || null;
}
