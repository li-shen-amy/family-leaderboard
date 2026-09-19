"use strict";
/* ============================================================
   engine.js — game rules. Pure logic over the state in data.js.
   S is the global state object (created in ui.js via loadState()).
   ============================================================ */

/* ---------- XP & levels ---------- */
function bedtimeXP(t) {
  if (!t) return 0;
  if (t < "20:30") return 20;    // string compare works for "HH:MM"
  if (t <= "21:00") return 15;
  return 10;
}
/* XP for a single logged value of an activity. */
function entryXP(activity, value) {
  if (!activity) return 0;
  if (activity.unit === "time") {
    return activity.id === "bedtime" ? bedtimeXP(value) : (activity.xpPerUnit || 10);
  }
  return Math.round((activity.xpPerUnit || 0) * Number(value));
}
function profileXP(pid) {
  return S.entries.reduce((a, e) => a + (e.profileId === pid ? (e.xp || 0) : 0), 0);
}
/* Level curve: level n starts at 50*(n-1)^2 XP. L1:0, L2:50, L3:200, L4:450 … */
function levelFor(xp) { return Math.floor(Math.sqrt(Math.max(0, xp) / 50)) + 1; }
function xpBounds(lvl) { return [50 * (lvl - 1) * (lvl - 1), 50 * lvl * lvl]; }

/* ---------- entries ---------- */
function entriesFor(pid, aid, dateStr) {
  return S.entries.filter(e =>
    e.profileId === pid &&
    (!aid || e.activityId === aid) &&
    (!dateStr || e.date === dateStr));
}
/* Today's total for one activity. For "time" units returns earliest time. */
function todayTotal(pid, aid) {
  const act = getActivity(aid);
  const list = entriesFor(pid, aid, todayStr());
  if (act && act.unit === "time") {
    const times = list.map(e => e.value).filter(Boolean).sort();
    return times.length ? times[0] : null;
  }
  return list.reduce((a, e) => a + Number(e.value || 0), 0);
}
function todayXP(pid) {
  const t = todayStr();
  return S.entries.reduce((a, e) => a + (e.profileId === pid && e.date === t ? (e.xp || 0) : 0), 0);
}

/* Log one entry. Returns {entry, beaten:[bests], newBadges:[...]}. */
function logEntry(pid, aid, value, dateStr) {
  const act = getActivity(aid);
  if (!act) return null;
  const before = computeBests(pid);
  const earnedBefore = new Set(Object.keys(S.earnedBadges[pid] || {}));
  const entry = {
    id: uid(),
    profileId: pid,
    activityId: aid,
    date: dateStr || todayStr(),
    value: value,
    xp: entryXP(act, value),
    ts: Date.now(),
  };
  S.entries.push(entry);
  const after = computeBests(pid);
  const beaten = diffBests(before, after);
  const newBadges = checkBadges(pid).filter(b => !earnedBefore.has(b.id));
  for (const b of newBadges) S.earnedBadges[pid][b.id] = entry.date;
  saveState();
  return { entry, beaten, newBadges };
}

function deleteEntry(entryId) {
  S.entries = S.entries.filter(e => e.id !== entryId);
  saveState();
}
function updateEntry(entryId, newValue) {
  const e = S.entries.find(x => x.id === entryId);
  if (!e) return;
  const act = getActivity(e.activityId);
  e.value = newValue;
  e.xp = entryXP(act, newValue);
  saveState();
}

/* ---------- streaks ---------- */
/* Dates with activity. Frozen dates count as active for streak purposes. */
function activeDateSet(pid, aid) {
  const set = new Set();
  for (const e of S.entries) {
    if (e.profileId !== pid) continue;
    if (aid && e.activityId !== aid) continue;
    const act = getActivity(e.activityId);
    if (act && act.unit === "time") { set.add(e.date); continue; }
    if (Number(e.value) > 0) set.add(e.date);
  }
  for (const d of frozenDates(pid)) set.add(d);
  return set;
}
/* Raw active dates WITHOUT freezes (used to validate freeze usage). */
function rawActiveDateSet(pid) {
  const set = new Set();
  for (const e of S.entries) {
    if (e.profileId !== pid) continue;
    const act = getActivity(e.activityId);
    if (act && act.unit === "time") set.add(e.date);
    else if (Number(e.value) > 0) set.add(e.date);
  }
  return set;
}
/* Current streak ending today (a missing today doesn't break it yet). */
function currentStreak(dateSet, refDate) {
  let d = refDate || todayStr();
  if (!dateSet.has(d)) d = addDays(d, -1);
  let n = 0;
  while (dateSet.has(d)) { n++; d = addDays(d, -1); }
  return n;
}
function longestStreak(dateSet) {
  const days = [...dateSet].sort();
  let best = 0, run = 0, prev = null;
  for (const d of days) {
    run = (prev && addDays(prev, 1) === d) ? run + 1 : 1;
    if (run > best) best = run;
    prev = d;
  }
  return best;
}
/* Current streak of days where predicate(dayValues) holds (e.g. early bedtime). */
function currentStreakWhere(pid, aid, pred) {
  const byDate = {};
  for (const e of entriesFor(pid, aid)) {
    (byDate[e.date] = byDate[e.date] || []).push(e.value);
  }
  const set = new Set(Object.keys(byDate).filter(d => pred(byDate[d])));
  return currentStreak(set);
}
function longestStreakWhere(pid, aid, pred) {
  const byDate = {};
  for (const e of entriesFor(pid, aid)) {
    (byDate[e.date] = byDate[e.date] || []).push(e.value);
  }
  const set = new Set(Object.keys(byDate).filter(d => pred(byDate[d])));
  return longestStreak(set);
}

/* ---------- streak freezes: 1 token per profile per week ---------- */
function freezeState(pid) {
  const wk = mondayOf(todayStr());
  let f = S.freezes[pid];
  if (!f || f.week !== wk) {
    f = { week: wk, tokens: 1, used: [] };
    S.freezes[pid] = f;
    saveState();
  }
  return f;
}
function frozenDates(pid) {
  const f = freezeState(pid);
  return f.used || [];
}
function useFreeze(pid, dateStr) {
  const f = freezeState(pid);
  const t = todayStr();
  if (f.tokens < 1) return { ok: false, msg: "No freeze tokens left this week." };
  if (!dateStr || dateStr >= t) return { ok: false, msg: "Pick a past date." };
  if (addDays(t, -8) >= dateStr) return { ok: false, msg: "Only the last 7 days can be frozen." };
  if (f.used.includes(dateStr)) return { ok: false, msg: "That day is already frozen." };
  if (rawActiveDateSet(pid).has(dateStr)) return { ok: false, msg: "That day already has activity — no freeze needed!" };
  f.used.push(dateStr);
  f.tokens -= 1;
  saveState();
  return { ok: true, msg: `Streak protected for ${prettyDate(dateStr)}!` };
}
function grantFreeze(pid) {
  const f = freezeState(pid);
  f.tokens += 1;
  saveState();
}

/* ---------- personal bests ---------- */
function fmtValue(act, v) {
  if (v == null) return "—";
  switch (act.unit) {
    case "minutes": return `${v} min`;
    case "sessions": return `${v} session${v === 1 ? "" : "s"}`;
    case "count": return `${v}×`;
    case "servings": return `${v} serving${v === 1 ? "" : "s"}`;
    case "time": return prettyTime(v);
    default: return String(v);
  }
}
/* Returns array of {key, activityId, label, display, value, date, better}.
   better = "higher" | "lower" (for time, earlier is better). */
function computeBests(pid) {
  const bests = [];
  for (const act of S.activities) {
    if (!act.profiles.includes(pid)) continue;
    if (act.unit === "time") {
      const times = entriesFor(pid, act.id).map(e => e.value).filter(Boolean).sort();
      if (times.length) {
        bests.push({ key: act.id + ":earliest", activityId: act.id,
          label: `Earliest ${act.name.toLowerCase()}`, display: prettyTime(times[0]),
          value: times[0], date: entriesFor(pid, act.id).find(e => e.value === times[0]).date,
          better: "lower" });
      }
    } else {
      const byDate = {};
      for (const e of entriesFor(pid, act.id)) {
        byDate[e.date] = (byDate[e.date] || 0) + Number(e.value || 0);
      }
      const days = Object.keys(byDate);
      if (days.length) {
        let bd = days[0];
        for (const d of days) if (byDate[d] > byDate[bd]) bd = d;
        const unitWord = { minutes: "min", sessions: "sessions", count: "", servings: "servings" }[act.unit];
        bests.push({ key: act.id + ":day", activityId: act.id,
          label: `Most ${act.name.toLowerCase()} in one day`,
          display: `${byDate[bd]}${unitWord ? " " + unitWord : "×"}`,
          value: byDate[bd], date: bd, better: "higher" });
      }
      const ls = longestStreak(activeDateSet(pid, act.id));
      if (ls > 0) {
        bests.push({ key: act.id + ":streak", activityId: act.id,
          label: `Longest ${act.name.toLowerCase()} streak`,
          display: `${ls} day${ls === 1 ? "" : "s"}`, value: ls, date: null, better: "higher" });
      }
    }
  }
  const overall = longestStreak(activeDateSet(pid, null));
  if (overall > 0) {
    bests.push({ key: "overall:streak", activityId: null, label: "Longest active streak",
      display: `${overall} day${overall === 1 ? "" : "s"}`, value: overall, date: null, better: "higher" });
  }
  return bests;
}
/* Which bests improved from before[] to after[]? */
function diffBests(before, after) {
  const map = {};
  for (const b of before) map[b.key] = b;
  const beaten = [];
  for (const b of after) {
    const p = map[b.key];
    if (!p) { beaten.push(b); continue; }           // brand-new record
    if (b.better === "higher" && b.value > p.value) beaten.push(b);
    if (b.better === "lower" && String(b.value) < String(p.value)) beaten.push(b);
  }
  return beaten;
}

/* ---------- badges ---------- */
const BADGES = [
  { id: "early-bird", name: "Early Bird", emoji: "🌅",
    desc: "Lights out before 8:30 PM — even once!",
    hint: "Log a bedtime earlier than 8:30 PM.",
    check(pid) {
      const e = entriesFor(pid, "bedtime").find(e => e.value && e.value < "20:30");
      return e ? e.date : null;
    } },
  { id: "night-owl-tamer", name: "Night Owl Tamer", emoji: "🦉",
    desc: "5 early bedtimes in a row (9:00 PM or earlier).",
    hint: "Bedtime at 9:00 PM or earlier, 5 days in a row.",
    check(pid) {
      // earliest() via string sort — "HH:MM" compares correctly as strings
      const earliest = vals => vals.slice().sort()[0];
      return longestStreakWhere(pid, "bedtime", vals => earliest(vals) <= "21:00") >= 5
        ? todayStr() : null;
    } },
  { id: "double-instrument", name: "Double Instrument Day", emoji: "🎸",
    desc: "Piano AND guitar on the same day.",
    hint: "Log both piano and guitar practice in one day.",
    check(pid) {
      const p = new Set(entriesFor(pid, "piano").filter(e => Number(e.value) > 0).map(e => e.date));
      const g = entriesFor(pid, "guitar").find(e => Number(e.value) > 0 && p.has(e.date));
      return g ? g.date : null;
    } },
  { id: "century-club", name: "Century Club", emoji: "💯",
    desc: "100 focused practice minutes in one week.",
    hint: "Reach 100 minutes of piano + guitar in a single week.",
    check(pid) {
      const byWeek = {};
      for (const e of entriesFor(pid, null)) {
        if (e.activityId !== "piano" && e.activityId !== "guitar") continue;
        const w = mondayOf(e.date);
        byWeek[w] = (byWeek[w] || 0) + Number(e.value || 0);
      }
      const w = Object.keys(byWeek).find(w => byWeek[w] >= 100);
      return w || null;
    } },
  { id: "homework-hero", name: "Homework Hero", emoji: "📚",
    desc: "5 homework focus sessions in one week.",
    hint: "Log 5 homework sessions in a single week.",
    check(pid) {
      const byWeek = {};
      for (const e of entriesFor(pid, "homework")) {
        const w = mondayOf(e.date);
        byWeek[w] = (byWeek[w] || 0) + Number(e.value || 0);
      }
      const w = Object.keys(byWeek).find(w => byWeek[w] >= 5);
      return w || null;
    } },
  { id: "veggie-voyager", name: "Veggie Voyager", emoji: "🥦",
    desc: "5 fruit & veggie servings in one day.",
    hint: "Log 5 servings of fruits or veggies in a single day.",
    check(pid) {
      const byDate = {};
      for (const e of entriesFor(pid, "veggies")) {
        byDate[e.date] = (byDate[e.date] || 0) + Number(e.value || 0);
      }
      const d = Object.keys(byDate).find(d => byDate[d] >= 5);
      return d || null;
    } },
  { id: "bookworm", name: "Bookworm", emoji: "📖",
    desc: "Read for 30 minutes in one day.",
    hint: "Log 30 minutes of reading in a single day.",
    check(pid) {
      const byDate = {};
      for (const e of entriesFor(pid, "reading")) {
        byDate[e.date] = (byDate[e.date] || 0) + Number(e.value || 0);
      }
      const d = Object.keys(byDate).find(d => byDate[d] >= 30);
      return d || null;
    } },
  { id: "sport-star", name: "Sport Star", emoji: "⚽",
    desc: "30 active sport minutes in one day.",
    hint: "Log 30 minutes of sports in a single day.",
    check(pid) {
      const byDate = {};
      for (const e of entriesFor(pid, "sport")) {
        byDate[e.date] = (byDate[e.date] || 0) + Number(e.value || 0);
      }
      const d = Object.keys(byDate).find(d => byDate[d] >= 30);
      return d || null;
    } },
];

/* ---------- custom (parent-defined) badges ----------
   Stored as plain data: {id,name,emoji,desc,hint,custom:true,
   rule:{activityId, target, period:"day"|"week"}}.
   Checks are rebuilt from the rule at runtime so they survive JSON. */
function customBadgeDate(pid, rule) {
  if (!rule || !rule.activityId || !(rule.target > 0)) return null;
  const act = getActivity(rule.activityId);
  const byPeriod = {};
  for (const e of entriesFor(pid, rule.activityId)) {
    const key = rule.period === "week" ? mondayOf(e.date) : e.date;
    const inc = act && act.unit === "time" ? 1 : Number(e.value || 0);
    byPeriod[key] = (byPeriod[key] || 0) + inc;
  }
  const k = Object.keys(byPeriod).find(k => byPeriod[k] >= rule.target);
  return k || null;
}
function rehydrateBadge(b) {
  if (!b || !b.custom || typeof b.check === "function") return b;
  return Object.assign({}, b, { check: pid => customBadgeDate(pid, b.rule) });
}
/* Every badge the app knows about: built-ins + parent-created. */
function allBadges() {
  return BADGES.concat((S.customBadges || []).map(rehydrateBadge));
}
/* Human-readable rule summary for a custom badge. */
function badgeRuleText(b) {
  const r = b.rule || {};
  const act = getActivity(r.activityId);
  const what = act ? act.name : "activity";
  const unitWord = act && act.unit === "time" ? "logs" :
    { minutes: "min", sessions: "sessions", count: "", servings: "servings" }[(act && act.unit) || ""] || "";
  return `${r.target || "?"}${unitWord ? " " + unitWord : ""} of ${what} in one ${r.period === "week" ? "week" : "day"}`;
}
/* Returns [{...badge, earnedDate}] for badges whose check passes. */
function checkBadges(pid) {
  const out = [];
  for (const b of allBadges()) {
    try {
      const d = b.check(pid);
      if (d) out.push(Object.assign({}, b, { earnedDate: d }));
    } catch (e) { /* a badge check must never break logging */ }
  }
  return out;
}

/* ---------- weekly seasons ---------- */
function weekXP(pid, wk) {
  return S.entries.reduce((a, e) =>
    a + (e.profileId === pid && mondayOf(e.date) === wk ? (e.xp || 0) : 0), 0);
}
function standings(wk) {
  return S.profiles
    .map(p => ({ pid: p.id, name: p.name, xp: weekXP(p.id, wk) }))
    .sort((a, b) => b.xp - a.xp);
}
/* XP per day (Mon–Sun) for charting, optionally filtered to activities. */
function weekDailyTotals(pid, wk, activityIds) {
  const out = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(wk, i);
    let total = 0;
    for (const e of S.entries) {
      if (e.profileId !== pid || e.date !== d) continue;
      if (activityIds && !activityIds.includes(e.activityId)) continue;
      total += Number(e.value || 0);
    }
    out.push({ date: d, total });
  }
  return out;
}
