"use strict";
/* ============================================================
   data.js — persistence, date helpers, default state.
   ALL data lives in browser localStorage under ONE namespaced key.
   Dates are stored as local "YYYY-MM-DD" strings; weeks start Monday.
   Times (bedtime) are "HH:MM" 24h strings, comparable lexicographically.
   ============================================================ */

const LS_KEY = "familyLeaderboard.v1";
const LS_BACKUP_KEY = "familyLeaderboard.v1.backup";
const LS_META_KEY = "familyLeaderboard.v1.meta";

/* ---------- tiny utils ---------- */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
/* NOT a security hash — just a kid-gate so little fingers don't
   wander into the parent screen. */
function hashPin(pin) {
  let h = 7;
  for (const ch of String(pin)) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return "p" + (h >>> 0).toString(36);
}

/* ---------- date helpers (all LOCAL time) ---------- */
function fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function parseDate(s) {
  const [y, m, d] = String(s).split("-").map(Number);
  return new Date(y, m - 1, d);
}
function addDays(dateStr, n) {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + n);
  return fmtDate(d);
}
function todayStr() { return fmtDate(new Date()); }
/* Monday of the week containing dateStr — the canonical week key. */
function mondayOf(dateStr) {
  const d = parseDate(dateStr);
  const dow = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  d.setDate(d.getDate() - dow);
  return fmtDate(d);
}
function prettyDate(dateStr) {
  return parseDate(dateStr).toLocaleDateString(undefined,
    { weekday: "short", month: "short", day: "numeric" });
}
function weekRangeLabel(mondayStr) {
  const a = parseDate(mondayStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const b = parseDate(addDays(mondayStr, 6)).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${a} – ${b}`;
}
/* "20:30" -> "8:30 PM" */
function prettyTime(hhmm) {
  if (!hhmm) return "—";
  let [h, m] = String(hhmm).split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${ap}`;
}

/* ---------- default activities ---------- */
function defaultActivities() {
  return [
    { id: "piano", name: "Piano", unit: "minutes", xpPerUnit: 1, xpNote: "1 XP per minute",
      timer: true, profiles: ["kid", "dad"], custom: false, icon: "piano", color: "#7c5cff" },
    { id: "guitar", name: "Guitar", unit: "minutes", xpPerUnit: 1, xpNote: "1 XP per minute",
      timer: true, profiles: ["kid", "dad"], custom: false, icon: "guitar", color: "#ff6b9d" },
    { id: "reading", name: "Reading", unit: "minutes", xpPerUnit: 1, xpNote: "1 XP per minute",
      timer: true, profiles: ["kid", "dad"], custom: false, icon: "book", color: "#ff8c42" },
    { id: "sport", name: "Sports", unit: "minutes", xpPerUnit: 1, xpNote: "1 XP per minute",
      timer: true, profiles: ["kid", "dad"], custom: false, icon: "dumbbell", color: "#00b8a9" },
    { id: "homework", name: "Homework", unit: "sessions", xpPerUnit: 15, xpNote: "15 XP per 25-min session",
      quick: 1, profiles: ["kid"], custom: false, icon: "book", color: "#3aa7ff" },
    { id: "chores", name: "Chores", unit: "count", xpPerUnit: 10, xpNote: "10 XP per chore",
      quick: 1, profiles: ["kid", "dad"], custom: false, icon: "sparkles", color: "#2fbf71" },
    { id: "bedtime", name: "Bedtime", unit: "time", xpPerUnit: 0, xpNote: "10–20 XP, earlier = more",
      profiles: ["kid", "dad"], custom: false, icon: "moon", color: "#5f43d6" },
    { id: "veggies", name: "Healthy Eating", unit: "servings", xpPerUnit: 5, xpNote: "5 XP per serving",
      quick: 1, capPerDay: 5, profiles: ["kid", "dad"], custom: false, icon: "apple", color: "#ff9f43" },
  ];
}

/* ---------- state ---------- */
function defaultState() {
  return {
    version: 1,
    pinHash: null,               // set on first visit to Parent tab
    profiles: [
      { id: "kid", name: "Kid", photo: null },
      { id: "dad", name: "Parent", photo: null },
    ],
    activeProfileId: "kid",
    activeTab: "log",
    activities: defaultActivities(),
    entries: [],                 // {id, profileId, activityId, date, value, xp, ts}
    earnedBadges: { kid: {}, dad: {} },  // badgeId -> dateStr earned
    customBadges: [],            // user badges {id,name,emoji,desc,hint,custom:true,rule:{activityId,target,period}}
    freezes: { kid: null, dad: null },   // {week, tokens, used:[dateStr]}
    cloud: {                    // optional cross-device sync (Supabase, encrypted)
      provider: null,           // null | "supabase"
      url: "", key: "", code: "",
      auto: false,
      lastSyncAt: null,
      lastError: null,
    },
    updatedAt: 0,                // ms epoch of last local change (for sync merge)
    parentUnlocked: false,       // session-only; always reset on load
  };
}

function readStateRaw(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const s = JSON.parse(raw);
    // Backup wraps the state: {savedAt, state}
    const state = (s && s.state && s.savedAt) ? s.state : s;
    if (!state || state.version !== 1 || !Array.isArray(state.entries)) return null;
    return state;
  } catch (e) { return null; }
}

function loadState() {
  // Primary first, backup second — so a cleared/evicted primary key
  // can still be recovered.
  let s = readStateRaw(LS_KEY);
  let recovered = false;
  if (!s) { s = readStateRaw(LS_BACKUP_KEY); recovered = !!s; }
  if (!s) return defaultState();
  // Backfill anything missing so old saves never crash new code.
  const d = defaultState();
  const merged = Object.assign(d, s);
  merged.parentUnlocked = false;
  for (const p of merged.profiles) {
    if (!merged.earnedBadges[p.id]) merged.earnedBadges[p.id] = {};
    if (!("photo" in p)) p.photo = null;      // backfill for older saves
    if (p.id === "dad" && p.name === "Dad") p.name = "Parent"; // renamed default
  }
  // Backfill the Reading/Sports activities for saves created before they existed.
  for (const actId of ["reading", "sport"]) {
    if (!merged.activities.some(a => a.id === actId)) {
      const def = defaultActivities().find(a => a.id === actId);
      if (def) merged.activities.push(def);
    }
  }
  if (!Array.isArray(merged.customBadges)) merged.customBadges = [];
  if (!merged.cloud) merged.cloud = defaultState().cloud;
  if (typeof merged.updatedAt !== "number") merged.updatedAt = 0;
  if (recovered) {
    // Re-seed the primary key from the backup so the next load is fast.
    try {
      const copy = Object.assign({}, merged, { parentUnlocked: false });
      localStorage.setItem(LS_KEY, JSON.stringify(copy));
    } catch (e) { /* ignore */ }
  }
  return merged;
}

function saveState(opts) {
  try {
    // Stamp local changes (skipped for internal sync writes).
    if (!opts || opts.touch !== false) S.updatedAt = Date.now();
    // Never persist the unlocked flag.
    const copy = Object.assign({}, S, { parentUnlocked: false });
    const json = JSON.stringify(copy);
    localStorage.setItem(LS_KEY, json);
    // Second copy under a different key + a small meta record, so if the
    // browser ever evicts one key we can recover from the other.
    try {
      localStorage.setItem(LS_BACKUP_KEY, JSON.stringify({ savedAt: Date.now(), state: copy }));
      localStorage.setItem(LS_META_KEY, JSON.stringify({ lastSavedAt: Date.now() }));
    } catch (e) { /* backup is best-effort */ }
    if (typeof window !== "undefined" && window.dispatchEvent) {
      window.dispatchEvent(new Event("fl-saved"));
    }
  } catch (e) {
    console.warn("Could not save data (storage full or blocked?).", e);
  }
}

/* When was data last saved on this device (ms epoch), or null. */
function lastSavedAt() {
  try {
    const raw = localStorage.getItem(LS_META_KEY);
    if (!raw) return null;
    const m = JSON.parse(raw);
    return (m && m.lastSavedAt) || null;
  } catch (e) { return null; }
}

/* Quick check that localStorage actually persists here. */
function storageOK() {
  try {
    const k = "__fl_probe__";
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    return true;
  } catch (e) { return false; }
}

/* ---------- lookups ---------- */
function getProfile(pid) { return S.profiles.find(p => p.id === pid); }
function getActivity(aid) { return S.activities.find(a => a.id === aid); }
function profileName(pid) { const p = getProfile(pid); return p ? p.name : pid; }
