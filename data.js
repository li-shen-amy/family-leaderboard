"use strict";
/* ============================================================
   data.js — persistence, date helpers, default state.
   ALL data lives in browser localStorage under ONE namespaced key.
   Dates are stored as local "YYYY-MM-DD" strings; weeks start Monday.
   Times (bedtime) are "HH:MM" 24h strings, comparable lexicographically.
   ============================================================ */

const LS_KEY = "familyLeaderboard.v1";

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
    freezes: { kid: null, dad: null },   // {week, tokens, used:[dateStr]}
    parentUnlocked: false,       // session-only; always reset on load
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return defaultState();
    const s = JSON.parse(raw);
    if (!s || s.version !== 1 || !Array.isArray(s.entries)) return defaultState();
    // Backfill anything missing so old saves never crash new code.
    const d = defaultState();
    const merged = Object.assign(d, s);
    merged.parentUnlocked = false;
    for (const p of merged.profiles) {
      if (!merged.earnedBadges[p.id]) merged.earnedBadges[p.id] = {};
      if (!("photo" in p)) p.photo = null;      // backfill for older saves
      if (p.id === "dad" && p.name === "Dad") p.name = "Parent"; // renamed default
    }
    return merged;
  } catch (e) {
    console.warn("Could not load saved data, starting fresh.", e);
    return defaultState();
  }
}

function saveState() {
  try {
    // Never persist the unlocked flag.
    const copy = Object.assign({}, S, { parentUnlocked: false });
    localStorage.setItem(LS_KEY, JSON.stringify(copy));
  } catch (e) {
    console.warn("Could not save data (storage full or blocked?).", e);
  }
}

/* ---------- lookups ---------- */
function getProfile(pid) { return S.profiles.find(p => p.id === pid); }
function getActivity(aid) { return S.activities.find(a => a.id === aid); }
function profileName(pid) { const p = getProfile(pid); return p ? p.name : pid; }
