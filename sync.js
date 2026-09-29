"use strict";
/* ============================================================
   sync.js — optional cross-device cloud sync.
   Backend: any Supabase project (free tier). Sign in with an
   email + password (Supabase Auth, see auth.js); your row is keyed
   by your user id and protected by row-level security, so only
   you can read/write it. The payload is encrypted in the browser
   with your login password BEFORE upload (AES-GCM), so the server
   only ever sees ciphertext.

   One-time table setup (Supabase SQL editor). If you already made
   family_sync for the old code-based sync, run the MIGRATION block;
   otherwise run the FRESH block:

   -- MIGRATION (old table exists) --
   alter table family_sync drop constraint if exists family_sync_pkey;
   alter table family_sync add column if not exists user_id uuid
     unique references auth.users(id);
   drop policy if exists "open sync" on family_sync;
   create policy "own row" on family_sync for all
     using (auth.uid() = user_id) with check (auth.uid() = user_id);

   -- FRESH (no old table) --
   create table family_sync (
     user_id uuid primary key references auth.users(id),
     payload jsonb not null,
     updated_at timestamptz default now()
   );
   alter table family_sync enable row level security;
   create policy "own row" on family_sync for all
     using (auth.uid() = user_id) with check (auth.uid() = user_id);
   ============================================================ */

/* ---------- base64 helpers ---------- */
function bufToB64(buf) {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function b64ToBuf(b64) {
  const s = atob(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes.buffer;
}

/* ---------- end-to-end encryption (AES-GCM, key from login password) ---------- */
async function deriveKey(code, saltBuf) {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey("raw", enc.encode(code), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBuf, iterations: 120000, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
async function encryptState(code, obj) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(code, salt);
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv },
    key, new TextEncoder().encode(JSON.stringify(obj)));
  return { v: 1, salt: bufToB64(salt), iv: bufToB64(iv), data: bufToB64(data) };
}
async function decryptState(code, env) {
  if (!env || env.v !== 1 || !env.salt || !env.iv || !env.data) throw new Error("bad envelope");
  const key = await deriveKey(code, b64ToBuf(env.salt));
  const raw = await crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(b64ToBuf(env.iv)) },
    key, b64ToBuf(env.data));
  return JSON.parse(new TextDecoder().decode(raw));
}

/* ---------- Supabase REST (authenticated: the user's own JWT) ---------- */
function sbBase() { return String(S.cloud.url || "").replace(/\/+$/, ""); }
function sbHeaders(session) {
  const k = S.cloud.key;
  return {
    apikey: k,
    Authorization: "Bearer " + session.accessToken,
    "Content-Type": "application/json",
  };
}
function cloudConfigured() {
  return !!(
    S.cloud && S.cloud.provider === "supabase" &&
    S.cloud.url && S.cloud.key &&
    typeof loggedIn === "function" && loggedIn() &&
    typeof getSessionPassword === "function" && getSessionPassword()
  );
}
async function sbRead() {
  const session = await ensureSession();
  const res = await fetch(
    `${sbBase()}/rest/v1/family_sync?user_id=eq.${session.userId}&select=payload,updated_at`,
    { headers: sbHeaders(session) });
  if (!res.ok) throw new Error(`sync read failed (HTTP ${res.status})`);
  const rows = await res.json();
  return rows[0] || null;
}
async function sbWrite(envelope) {
  const session = await ensureSession();
  const res = await fetch(`${sbBase()}/rest/v1/family_sync?on_conflict=user_id`, {
    method: "POST",
    headers: Object.assign({ Prefer: "resolution=merge-duplicates" }, sbHeaders(session)),
    body: JSON.stringify({ user_id: session.userId, payload: envelope }),
  });
  if (!res.ok) throw new Error(`sync write failed (HTTP ${res.status})`);
}

/* ---------- merge: union entries, newer side wins on conflicts ---------- */
function unionPrefer(arrL, arrR, idFn, preferR) {
  const m = new Map();
  for (const x of (preferR ? arrR : arrL)) m.set(idFn(x), x);
  for (const x of (preferR ? arrL : arrR)) if (!m.has(idFn(x))) m.set(idFn(x), x);
  return [...m.values()];
}
function mergeStates(local, remote) {
  const L = local || {}, R = remote || {};
  const preferR = (R.updatedAt || 0) > (L.updatedAt || 0);
  const d = (typeof defaultState === "function") ? defaultState() : {};
  const merged = Object.assign({}, d, L);

  const ebyId = new Map();
  for (const e of (L.entries || []).concat(R.entries || [])) if (e && e.id) ebyId.set(e.id, e);
  merged.entries = [...ebyId.values()];
  merged.activities = unionPrefer(L.activities || [], R.activities || [], a => a.id, preferR);
  merged.profiles = unionPrefer(L.profiles || [], R.profiles || [], p => p.id, preferR);
  merged.customBadges = unionPrefer(L.customBadges || [], R.customBadges || [], b => b.id, preferR);

  merged.earnedBadges = {};
  for (const pid of new Set([...Object.keys(L.earnedBadges || {}), ...Object.keys(R.earnedBadges || {})])) {
    const m2 = Object.assign({}, (R.earnedBadges || {})[pid], (L.earnedBadges || {})[pid]);
    for (const bid of new Set([...Object.keys((L.earnedBadges || {})[pid] || {}), ...Object.keys((R.earnedBadges || {})[pid] || {})])) {
      const dates = [((L.earnedBadges || {})[pid] || {})[bid], ((R.earnedBadges || {})[pid] || {})[bid]].filter(Boolean).sort();
      if (dates.length) m2[bid] = dates[0]; // keep earliest earn date
    }
    merged.earnedBadges[pid] = m2;
  }
  merged.freezes = Object.assign({}, R.freezes, L.freezes);
  if (preferR) merged.freezes = Object.assign({}, L.freezes, R.freezes);
  if (preferR && R.pinHash) merged.pinHash = R.pinHash;
  if (!merged.pinHash && (L.pinHash || R.pinHash)) merged.pinHash = L.pinHash || R.pinHash;

  merged.cloud = L.cloud || d.cloud;   // never take remote cloud settings
  merged.activeProfileId = L.activeProfileId;
  merged.activeTab = L.activeTab;
  merged.parentUnlocked = false;
  merged.version = 1;
  return merged;
}

/* ---------- push / pull ---------- */
let syncBusy = false;
let autoPushT = null;

function cloudStatusText() {
  if (!cloudConfigured()) return "Not set up — the app works fully offline without it.";
  if (S.cloud.lastError) return "⚠️ " + S.cloud.lastError;
  if (S.cloud.lastSyncAt) {
    const d = new Date(S.cloud.lastSyncAt);
    return "✓ Synced " + d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
      " " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  return "Ready — push to upload this device's data.";
}
function updateCloudUI() {
  const el = document.getElementById("cloudStatus");
  if (el) el.textContent = cloudStatusText();
}

async function pushCloud(silent) {
  if (!cloudConfigured()) { if (!silent) toast("Log in to enable cloud sync (Parent → Cloud Sync)."); return; }
  if (syncBusy) return;
  syncBusy = true;
  try {
    let base = S;
    let row = null;
    try { row = await sbRead(); } catch (e) { /* first push: no row yet */ }
    if (row && row.payload) {
      let remote;
      try { remote = await decryptState(getSessionPassword(), row.payload); }
      catch (e) { throw new Error("Couldn't decrypt cloud data — wrong password? Log in again on this device."); }
      base = mergeStates(S, remote);
    }
    const copy = Object.assign({}, base, { parentUnlocked: false });
    const env = await encryptState(getSessionPassword(), copy);
    await sbWrite(env);
    S = base;
    S.updatedAt = Date.now();
    S.cloud.lastSyncAt = S.updatedAt;
    S.cloud.lastError = null;
    saveState({ touch: false });
    render();
    updateCloudUI();
    if (!silent) toast("Synced to cloud ✓");
  } catch (e) {
    S.cloud.lastError = String((e && e.message) || e);
    saveState({ touch: false });
    updateCloudUI();
    if (!silent) toast("Sync failed: " + S.cloud.lastError);
  } finally {
    syncBusy = false;
  }
}

async function pullCloud(silent) {
  if (!cloudConfigured()) { if (!silent) toast("Log in to enable cloud sync (Parent → Cloud Sync)."); return; }
  if (syncBusy) return;
  syncBusy = true;
  try {
    const row = await sbRead();
    if (!row || !row.payload) { if (!silent) toast("Nothing in the cloud for this account yet — push from your other device first."); return; }
    let remote;
    try { remote = await decryptState(getSessionPassword(), row.payload); }
    catch (e) { throw new Error("Couldn't decrypt cloud data — wrong password? Log in again on this device."); }
    S = mergeStates(S, remote);
    S.cloud.lastSyncAt = Date.now();
    S.cloud.lastError = null;
    saveState();
    render();
    updateCloudUI();
    if (!silent) toast("Pulled latest from cloud ✓");
  } catch (e) {
    S.cloud.lastError = String((e && e.message) || e);
    saveState({ touch: false });
    updateCloudUI();
    if (!silent) toast("Pull failed: " + S.cloud.lastError);
  } finally {
    syncBusy = false;
  }
}

/* Debounced auto-push after local changes. Only fires when there are
   changes newer than the last sync, so it can't loop forever. */
function scheduleAutoPush() {
  if (typeof S === "undefined" || !S.cloud || !S.cloud.auto || !cloudConfigured() || syncBusy) return;
  if ((S.updatedAt || 0) <= (S.cloud.lastSyncAt || 0)) return;
  clearTimeout(autoPushT);
  autoPushT = setTimeout(() => { pushCloud(true); }, 8000);
}
