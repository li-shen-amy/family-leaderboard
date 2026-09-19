"use strict";
/* ============================================================
   ui.js — rendering + interactions. Vanilla JS, no libraries.
   Charts and confetti are hand-rolled on <canvas>.
   ============================================================ */

let S = loadState();

/* ---------------- inline SVG icons (no emoji as UI icons) ---------------- */
function svg(paths, fill) {
  return `<svg viewBox="0 0 24 24" fill="${fill ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}
const ICONS = {
  trophy: svg('<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M7 6H4.6a.6.6 0 0 0-.6.6C4 8.6 5.5 10 8 10"/><path d="M17 6h2.4a.6.6 0 0 1 .6.6C20 8.6 18.5 10 16 10"/>'),
  clipboard: svg('<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"/><path d="M9 11h6M9 15h6"/>'),
  medal: svg('<circle cx="12" cy="14" r="4.5"/><path d="M9 10.5 6.5 3h4L12 6l1.5-3h4L15 10.5"/>'),
  award: svg('<circle cx="12" cy="9" r="5"/><path d="M8.6 13.4 7 21l5-2.6L17 21l-1.6-7.6"/>'),
  lock: svg('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  piano: svg('<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 6v7M11 6v7M15 6v7M19 6v7"/><path d="M9 6v4.5M13 6v4.5M17 6v4.5"/>'),
  guitar: svg('<circle cx="9" cy="15" r="5.5"/><circle cx="9" cy="15" r="1.4"/><path d="M12.8 11.2 19 5"/><path d="M16.6 5.4l2 2"/><path d="M18.4 3.6l2 2"/>'),
  book: svg('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5V5.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20"/>'),
  sparkles: svg('<path d="M12 4l1.7 4.8 4.8 1.7-4.8 1.7L12 17l-1.7-4.8L5.5 10.5l4.8-1.7L12 4z"/><path d="M18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z"/>'),
  moon: svg('<path d="M20 13.5A8 8 0 1 1 10.5 4 6.5 6.5 0 0 0 20 13.5z"/>'),
  apple: svg('<path d="M12 8.5c-3.8 0-6 2.6-6 6 0 3.6 2.6 6.5 6 6.5 1.4 0 2.3-.4 3-.4s1.6.4 3 .4c3.4 0 6-2.9 6-6.5 0-3.4-2.2-6-6-6-1.2 0-2 .3-3 .3s-1.8-.3-3-.3z"/><path d="M12 8.5c0-2.2 1.2-3.8 3.2-4.5"/>'),
  play: svg('<path d="M8 5v14l11-7z"/>'),
  stop: svg('<rect x="7" y="7" width="10" height="10" rx="2"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  check: svg('<path d="M4.5 12.5 10 18 19.5 6.5"/>'),
  x: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
  trash: svg('<path d="M4 7h16"/><path d="M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2"/><path d="M6.5 7l1 12.2a1 1 0 0 0 1 .8h7a1 1 0 0 0 1-.8L17.5 7"/>'),
  pencil: svg('<path d="M4 20l1-4.5L16.6 3.9a1.5 1.5 0 0 1 2.1 2.1L7 17.5 4 20z"/>'),
  download: svg('<path d="M12 4v11"/><path d="M7 10.5 12 15.5 17 10.5"/><path d="M4 20h16"/>'),
  upload: svg('<path d="M12 15V4"/><path d="M7 8.5 12 3.5 17 8.5"/><path d="M4 20h16"/>'),
  users: svg('<circle cx="9" cy="8" r="3.5"/><path d="M3.5 20c0-3.2 2.5-5.5 5.5-5.5s5.5 2.3 5.5 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M16.2 14.6c2.6.4 4.3 2.3 4.3 4.9"/>'),
  clock: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  flame: svg('<path d="M12 22c3.9 0 6.5-2.6 6.5-6 0-4.4-3.9-6.3-4.2-10.5-2.9 1.9-4.3 4.3-5.8 6.9-1.1 2-1.9 3.6-1.9 5.3 0 2.6 2.2 4.3 5.4 4.3z"/><path d="M12 22c-1.9 0-3.2-1.1-3.2-2.7 0-1.9 2-2.7 2.4-4.7 1.4 1 2.3 2.1 2.9 3.4.5 1 .4 2-.3 2.7-.6.8-1.1 1.3-1.8 1.3z"/>'),
  calendar: svg('<rect x="4" y="6" width="16" height="14" rx="2"/><path d="M4 10.5h16"/><path d="M8.5 3.5V8M15.5 3.5V8"/>'),
  chart: svg('<path d="M4 20h16"/><path d="M7.5 20v-6M12.5 20V6M17.5 20v-9"/>'),
  star: svg('<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.9L12 3.5z"/>'),
  freeze: svg('<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9"/><path d="M12 3l-2 2.5M12 3l2 2.5M12 21l-2-2.5M12 21l2-2.5"/>'),
  dumbbell: svg('<path d="M6.5 6.5v11M3.5 9v6M17.5 6.5v11M20.5 9v6M6.5 12h11"/>'),
};
function icon(name) { return ICONS[name] || ""; }
/* Profile photo (data URL) or fallback icon. Never escape: src is canvas-generated. */
function avatarHTML(p, cls) {
  if (p && p.photo) return `<img class="${cls || "avatar"}" src="${p.photo}" alt="">`;
  return icon("users");
}

const TABS = [
  { id: "log", label: "Log", icon: "clipboard" },
  { id: "boards", label: "Boards", icon: "trophy" },
  { id: "records", label: "Records", icon: "medal" },
  { id: "badges", label: "Badges", icon: "award" },
  { id: "parent", label: "Parent", icon: "lock" },
];

/* ---------------- toast / modal ---------------- */
function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.getElementById("toastRoot").appendChild(el);
  setTimeout(() => el.remove(), 2600);
}
function openModal(title, iconName, bodyHTML) {
  document.getElementById("modalRoot").innerHTML =
    `<div class="modal-backdrop" data-action="close-modal"><div class="modal" role="dialog" aria-modal="true">` +
    `<h2>${icon(iconName)} ${esc(title)}</h2><div>${bodyHTML}</div></div></div>`;
}
function closeModal() { document.getElementById("modalRoot").innerHTML = ""; }

/* ---------------- confetti celebration ---------------- */
function celebrate(title, sub) {
  const cv = document.getElementById("confettiCv");
  const banner = document.getElementById("celebrateBanner");
  const dpr = window.devicePixelRatio || 1;
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  cv.hidden = false;
  const ctx = cv.getContext("2d");
  ctx.scale(dpr, dpr);
  banner.innerHTML = `<div class="big">${esc(title)}</div>` +
    (sub ? `<div class="small">${sub}</div>` : "");
  banner.hidden = false;

  const colors = ["#7c5cff", "#ff6b9d", "#ffc93c", "#2fbf71", "#3aa7ff", "#ff9f43"];
  const parts = [];
  for (let i = 0; i < 160; i++) {
    parts.push({
      x: Math.random() * innerWidth,
      y: -20 - Math.random() * innerHeight * 0.4,
      vx: (Math.random() - 0.5) * 3,
      vy: 2 + Math.random() * 4,
      s: 6 + Math.random() * 8,
      c: colors[i % colors.length],
      r: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.3,
      circle: Math.random() < 0.35,
    });
  }
  const t0 = performance.now();
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  (function frame(now) {
    const elapsed = now - t0;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.r += p.vr;
      if (p.y > innerHeight + 30) { p.y = -20; p.x = Math.random() * innerWidth; p.vy = 2 + Math.random() * 3; }
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      if (p.circle) { ctx.beginPath(); ctx.arc(0, 0, p.s / 2, 0, 7); ctx.fill(); }
      else ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66);
      ctx.restore();
    }
    if (elapsed < (reduce ? 600 : 3200)) requestAnimationFrame(frame);
    else { cv.hidden = true; banner.hidden = true; }
  })(t0);
}
/* Shared post-log flow: celebrate records/badges, else a small toast. */
function afterLog(result, fallbackMsg) {
  if (!result) return;
  const bits = [];
  for (const b of result.beaten) bits.push(`New record: <b>${esc(b.label)}</b> — ${esc(b.display)}`);
  for (const b of result.newBadges) bits.push(`Badge earned: ${b.emoji} <b>${esc(b.name)}</b>`);
  if (bits.length) {
    celebrate(bits.length > 1 ? `${bits.length} awesome things!` : "Awesome!",
      bits.slice(0, 3).join("<br>") + (bits.length > 3 ? `<br>…and ${bits.length - 3} more!` : ""));
  } else if (fallbackMsg) {
    toast(`${fallbackMsg}  (+${result.entry.xp} XP)`);
  }
  render();
}

/* ---------------- header / tabs ---------------- */
function renderHeader() {
  document.getElementById("profileSwitch").innerHTML = S.profiles.map(p =>
    `<button class="profile-btn ${p.id === S.activeProfileId ? "active" : ""}" data-action="switch-profile" data-pid="${p.id}">${avatarHTML(p)}<span>${esc(p.name)}</span></button>`
  ).join("");
  const pid = S.activeProfileId;
  const xp = profileXP(pid), lvl = levelFor(xp), [lo, hi] = xpBounds(lvl);
  const pct = hi === lo ? 100 : Math.min(100, (xp - lo) / (hi - lo) * 100);
  document.getElementById("xpStrip").innerHTML =
    `<div class="xp-row"><span>Level ${lvl} · ${esc(profileName(pid))}</span><span>${xp} XP</span></div>` +
    `<div class="xp-bar"><div class="xp-fill" style="width:${pct.toFixed(1)}%"></div></div>` +
    `<div class="xp-row" style="font-size:.78rem;opacity:.9"><span>${hi - xp} XP to Level ${lvl + 1}</span></div>`;
}
function renderTabbar() {
  document.getElementById("tabbar").innerHTML = TABS.map(t =>
    `<button data-action="goto-tab" data-tab="${t.id}" class="${S.activeTab === t.id ? "active" : ""}">${icon(t.icon)}<span>${t.label}</span></button>`
  ).join("");
}

/* ---------------- LOG tab ---------------- */
function activityCard(pid, act) {
  const t = todayStr();
  let body = "";
  if (act.timer) {
    body = timerCardBody(pid, act);
  } else if (act.unit === "time") {
    const cur = todayTotal(pid, act.id);
    body = `<div class="today-line">Tonight: <strong>${cur ? prettyTime(cur) : "not logged yet"}</strong></div>
      <div class="inline-form">
        <input type="time" id="time-${act.id}" value="${cur || ""}" aria-label="${esc(act.name)} time">
        <button class="btn blue small" data-action="log-time" data-aid="${act.id}">${icon("check")} Log</button>
      </div>`;
  } else if (act.quick) {
    const total = todayTotal(pid, act.id);
    const capped = act.capPerDay && total >= act.capPerDay;
    const unitWord = { sessions: "session", count: "chore", servings: "serving" }[act.unit] || act.unit;
    let extra = "";
    if (act.unit === "servings") {
      extra = `<div class="serving-dots">${[1, 2, 3, 4, 5].map(i =>
        `<span class="dot ${i <= total ? "on" : ""}">${icon("apple")}</span>`).join("")}</div>`;
    }
    body = `<div class="today-line">Today: <strong>${total} ${unitWord}${total === 1 ? "" : "s"}</strong></div>${extra}
      <button class="btn green" data-action="quick-log" data-aid="${act.id}" ${capped ? "disabled" : ""}>${icon("plus")} Log ${unitWord}${capped ? " (daily max!)" : ""}</button>`;
  } else {
    // custom minutes-style activities: manual number entry
    const total = todayTotal(pid, act.id);
    body = `<div class="today-line">Today: <strong>${total} ${esc(act.unit)}</strong></div>
      <div class="inline-form">
        <input type="number" id="manual-${act.id}" min="1" max="600" inputmode="numeric" placeholder="How many?" aria-label="Amount">
        <button class="btn primary small" data-action="log-manual" data-aid="${act.id}">${icon("plus")} Log</button>
      </div>`;
  }
  return `<div class="card activity-card" style="border-top-color:${act.color || "var(--brand)"}">
    <div class="head">
      <span class="icon" style="background:${act.color || "#7c5cff"}22;color:${act.color || "#5f43d6"}">${icon(act.icon)}</span>
      <div><h3>${esc(act.name)}</h3><div class="xp-note">${esc(act.xpNote || "")}</div></div>
    </div>
    <div style="margin-top:6px">${body}</div>
  </div>`;
}

function timerCardBody(pid, act) {
  const total = todayTotal(pid, act.id);
  // A running timer belongs to whoever started it; show its controls
  // on that activity's card regardless of the currently viewed profile.
  const mine = timerState && timerState.activityId === act.id;
  let inner;
  if (mine) {
    inner = `<div class="timer-display running" data-timer-display>00:00</div>
      <div class="today-line">Timer running for <strong>${esc(profileName(timerState.profileId))}</strong></div>
      <button class="btn orange" data-action="stop-timer">${icon("stop")} Stop &amp; Log</button>`;
  } else {
    inner = `<div class="timer-display" data-timer-display>00:00</div>
      <button class="btn green" data-action="start-timer" data-aid="${act.id}" ${timerState ? "disabled" : ""}>${icon("play")} Start Practice</button>`;
  }
  return `<div class="today-line">Today: <strong>${total} min</strong> focused</div>${inner}
    <div class="inline-form" style="margin-top:10px">
      <input type="number" id="manual-${act.id}" min="1" max="300" inputmode="numeric" placeholder="Or type minutes" aria-label="Minutes">
      <button class="btn ghost small" data-action="log-manual" data-aid="${act.id}">Log</button>
    </div>`;
}

function renderLog() {
  const pid = S.activeProfileId;
  const acts = S.activities.filter(a => a.profiles.includes(pid));
  return `<div class="card"><h2>${icon("clock")} Today's Log</h2>
      <p class="sub">${prettyDate(todayStr())} · tap to log, earn XP, beat your records!</p>
      <div class="today-line" style="margin:0">Today's XP so far: <strong>+${todayXP(pid)}</strong></div>
    </div>` +
    acts.map(a => activityCard(pid, a)).join("");
}

/* ---------------- BOARDS tab ---------------- */
function barRow(name, xp, max, cls, extra, avatar) {
  const pct = max > 0 ? (xp / max * 100).toFixed(1) : 0;
  return `<div class="standing-row">${avatar || ""}<span class="who">${esc(name)}</span>
    <div class="track"><div class="fill ${cls || ""}" style="width:${pct}%"></div></div>
    <span class="pts">${xp} XP</span>${extra || ""}</div>`;
}
function deltaHTML(diff) {
  if (diff > 0) return `<span class="delta up">▲ +${diff} vs last wk</span>`;
  if (diff < 0) return `<span class="delta down">▼ ${diff} vs last wk</span>`;
  return `<span class="delta flat">— same as last wk</span>`;
}
function renderBoards() {
  const pid = S.activeProfileId;
  const wk = mondayOf(todayStr());
  const lastWk = mondayOf(addDays(wk, -7));
  const st = standings(wk);
  const max = Math.max(1, ...st.map(s => s.xp));
  const leader = st[0] && st[0].xp > 0 ? st[0] : null;

  let html = `<div class="card"><h2>${icon("trophy")} Season Standings</h2>
    <p class="sub">Week of ${weekRangeLabel(wk)} · resets Monday</p>`;
  for (const s of st) {
    const diff = weekXP(s.pid, wk) - weekXP(s.pid, lastWk);
    const crown = leader && s.pid === leader.pid ? `<span class="crown">${icon("trophy")}</span>` : "";
    html += barRow(s.name, s.xp, max, s.pid === "dad" ? "dad" : "", crown, avatarHTML(getProfile(s.pid), "avatar-sm")) +
      `<div style="margin:-6px 0 8px 84px">${deltaHTML(diff)}</div>`;
  }
  html += `</div>`;

  // Practice chart
  html += `<div class="card"><h2>${icon("chart")} Practice This Week</h2>
    <p class="sub">Piano + guitar focused minutes per day · ${esc(profileName(pid))}</p>
    <canvas class="chart" id="weekChart"></canvas>
    <div class="chart-legend"><span><b style="color:var(--brand)">■</b> minutes</span><span><b style="color:var(--gold)">■</b> today</span></div>
  </div>`;

  // Family board: all-time
  html += `<div class="card"><h2>${icon("users")} Family Board</h2><p class="sub">All-time XP and levels</p>`;
  const all = S.profiles.map(p => ({ name: p.name, xp: profileXP(p.id), lvl: levelFor(profileXP(p.id)), pid: p.id,
    streak: currentStreak(activeDateSet(p.id, null)) }));
  const amax = Math.max(1, ...all.map(a => a.xp));
  for (const a of all) {
    html += barRow(`${a.name} · Lv${a.lvl}`, a.xp, amax, a.pid === "dad" ? "dad" : "", "", avatarHTML(getProfile(a.pid), "avatar-sm")) +
      `<div class="muted" style="margin:-4px 0 8px 84px"><span class="streak-flame" style="font-size:.95rem">${icon("flame")} ${a.streak}-day streak</span></div>`;
  }
  html += `</div>`;

  // Season recap: last week
  const lst = standings(lastWk);
  if (lst.some(s => s.xp > 0)) {
    const w = lst[0];
    html += `<div class="card"><h2>${icon("star")} Last Week's Recap</h2>
      <p class="sub">${weekRangeLabel(lastWk)}</p>
      <p style="font-size:1.05rem"><span class="crown">${icon("trophy")}</span> <b>${esc(w.name)}</b> won with <b>${w.xp} XP</b>!</p>
      <p class="muted">${lst.map(s => `${esc(s.name)}: ${s.xp} XP`).join(" · ")}</p></div>`;
  }

  // Month heatmap
  html += `<div class="card"><h2>${icon("calendar")} Streak Calendar</h2>
    <p class="sub">${parseDate(todayStr()).toLocaleDateString(undefined, { month: "long", year: "numeric" })} · ${esc(profileName(pid))} · darker = more XP</p>
    <canvas class="heatmap" id="monthHeat"></canvas></div>`;

  return html;
}

/* ---------------- RECORDS tab ---------------- */
function renderRecords() {
  const pid = S.activeProfileId;
  const set = activeDateSet(pid, null);
  const cur = currentStreak(set);
  const f = freezeState(pid);
  let html = `<div class="card"><h2>${icon("flame")} Streaks</h2>
    <div class="streak-flame">${icon("flame")} ${cur} day${cur === 1 ? "" : "s"} active!</div>
    <p class="sub">Log anything each day to keep it going.</p>`;
  for (const act of S.activities) {
    if (!act.profiles.includes(pid) || act.unit === "time") continue;
    const s = currentStreak(activeDateSet(pid, act.id));
    if (s > 0) html += `<div class="today-line">${esc(act.name)}: <strong>${s} day${s === 1 ? "" : "s"}</strong></div>`;
  }
  html += `<div class="today-line">Freeze tokens this week: <strong>${f.tokens}</strong> ${icon("freeze")}</div>
    <button class="btn ghost small" data-action="kid-freeze-open">${icon("freeze")} Protect a missed day</button>
  </div>`;

  html += `<div class="card"><h2>${icon("medal")} Personal Bests</h2><p class="sub">${esc(profileName(pid))} · all-time records</p>`;
  const bests = computeBests(pid);
  if (!bests.length) {
    html += `<p class="muted">No records yet — log something today and set your first one!</p>`;
  } else {
    for (const b of bests) {
      const act = b.activityId ? getActivity(b.activityId) : null;
      html += `<div class="record-row">
        <span class="icon">${icon(act ? act.icon : "flame")}</span>
        <span class="lbl"><span class="t">${esc(b.label)}</span><br><span class="d">${b.date ? prettyDate(b.date) : "best streak ever"}</span></span>
        <span class="val">${esc(b.display)}</span></div>`;
    }
  }
  html += `</div>`;
  return html;
}

/* ---------------- BADGES tab ---------------- */
function renderBadges() {
  const pid = S.activeProfileId;
  const earned = S.earnedBadges[pid] || {};
  // Re-run checks so badges earned via parent edits still show up.
  for (const b of checkBadges(pid)) if (!earned[b.id]) { earned[b.id] = b.earnedDate; }
  saveState();
  return `<div class="card"><h2>${icon("award")} Badge Shelf</h2>
      <p class="sub">${esc(profileName(pid))} · ${Object.keys(earned).length} of ${allBadges().length} earned</p></div>
    <div class="badge-grid">` +
    allBadges().map(b => {
      const e = earned[b.id];
      return `<div class="badge-card ${e ? "" : "locked"}">
        <div class="emoji">${b.emoji}</div>
        <div class="nm">${esc(b.name)}</div>
        <div class="ds">${esc(e ? b.desc : b.hint)}</div>
        ${e ? `<div class="dt">Earned ${prettyDate(e)}</div>` : ""}
      </div>`;
    }).join("") + `</div>`;
}

/* ---------------- PARENT tab ---------------- */
function renderParent() {
  if (!S.parentUnlocked) {
    if (!S.pinHash) {
      return `<div class="card"><div class="pin-wrap">
        <h2>${icon("lock")} Set a Parent PIN</h2>
        <p class="sub">Pick a 4-digit PIN. Kids can't guess into this screen.</p>
        <input id="pin1" type="password" inputmode="numeric" maxlength="4" placeholder="••••" aria-label="New PIN">
        <input id="pin2" type="password" inputmode="numeric" maxlength="4" placeholder="repeat ••••" aria-label="Repeat PIN">
        <button class="btn primary" data-action="pin-setup" style="max-width:280px;margin:6px auto 0">${icon("check")} Set PIN</button>
      </div></div>`;
    }
    return `<div class="card"><div class="pin-wrap">
      <h2>${icon("lock")} Parent Area</h2>
      <p class="sub">Enter your 4-digit PIN.</p>
      <input id="pinEntry" type="password" inputmode="numeric" maxlength="4" placeholder="••••" aria-label="Parent PIN">
      <button class="btn primary" data-action="pin-unlock" style="max-width:280px;margin:6px auto 0">${icon("lock")} Unlock</button>
    </div></div>`;
  }

  let html = `<div class="card"><h2>${icon("lock")} Parent Controls</h2>
    <p class="sub">Verify entries, manage activities, freezes, and data.</p>
    <button class="btn ghost small" data-action="parent-lock">${icon("lock")} Lock parent area</button></div>`;

  // Profiles — names + photos
  html += `<div class="card"><div class="section-title">${icon("users")} Profiles</div>` +
    S.profiles.map(p => `
      <div class="profile-edit">
        <div class="photo-prev">${avatarHTML(p, "avatar-lg")}</div>
        <div class="grow">
          <label class="field">${p.id === "kid" ? "Kid" : "Parent"} name</label>
          <input id="pname-${p.id}" value="${esc(p.name)}" maxlength="20">
          <div class="btn-row" style="margin-top:8px">
            <label class="btn ghost small" style="cursor:pointer">${icon("upload")} Photo
              <input type="file" data-photo-for="${p.id}" accept="image/*" hidden></label>
            ${p.photo ? `<button class="btn ghost small" data-action="photo-remove" data-pid="${p.id}">${icon("x")} Remove</button>` : ""}
          </div>
        </div>
      </div>`).join("") +
    `<div style="margin-top:6px"><button class="btn primary small" data-action="rename-save">${icon("check")} Save names</button></div>
    <p class="muted">Photos are resized small and stored on this device only.</p></div>`;

  // Cloud sync (optional, free)
  html += `<div class="card"><div class="section-title">${icon("upload")} Cloud Sync <span class="muted" style="font-weight:400">· optional, free</span></div>
    <p class="sub">Keep data safe across devices &amp; browsers. Data is encrypted on this device with your family code — the server only sees scrambled text.</p>
    <div class="today-line" id="cloudStatus">${esc(cloudStatusText())}</div>
    <label class="field">Supabase URL</label>
    <input id="cloud-url" value="${esc(S.cloud.url)}" placeholder="https://xyz.supabase.co" autocomplete="off">
    <label class="field">Anon (public) key</label>
    <input id="cloud-key" type="password" value="${esc(S.cloud.key)}" placeholder="eyJ…" autocomplete="off">
    <label class="field">Family sync code — your encryption key, don't forget it!</label>
    <input id="cloud-code" type="password" value="${esc(S.cloud.code)}" placeholder="e.g. sunny-tiger-42" autocomplete="off">
    <label style="display:flex;align-items:center;gap:8px;margin-top:10px;font-weight:700">
      <input type="checkbox" id="cloud-auto" ${S.cloud.auto ? "checked" : ""} style="width:auto"> Auto-sync changes to cloud</label>
    <div class="btn-row" style="margin-top:10px">
      <button class="btn primary small" data-action="cloud-save">${icon("check")} Save</button>
      <button class="btn blue small" data-action="cloud-push">${icon("upload")} Push</button>
      <button class="btn ghost small" data-action="cloud-pull">${icon("download")} Pull</button>
    </div>
    <details style="margin-top:10px"><summary style="font-weight:700;cursor:pointer">One-time setup guide (~5 min, free)</summary>
      <ol class="muted" style="line-height:1.7;padding-left:20px">
        <li>Create a free account at <b>supabase.com</b> → <b>New project</b>.</li>
        <li>Open <b>SQL Editor</b> → New query, paste &amp; run:
          <pre style="white-space:pre-wrap;background:#f4f1ff;padding:8px;border-radius:8px;font-size:.75rem">create table family_sync (
  code text primary key,
  payload jsonb not null,
  updated_at timestamptz default now()
);
alter table family_sync enable row level security;
create policy "open sync" on family_sync for all
  using (true) with check (true);</pre></li>
        <li><b>Project Settings → API</b>: copy the <b>Project URL</b> and the <b>anon public</b> key.</li>
        <li>Paste them above, invent a <b>family sync code</b>, tap <b>Save</b>, then <b>Push</b>.</li>
        <li>On the other device/browser: paste the same URL, key &amp; code, tap <b>Save</b>, then <b>Pull</b>.</li>
      </ol>
      <p class="muted">Your payload is encrypted — Supabase can't read it. Anyone who guesses your code could overwrite it, so pick a code that's hard to guess.</p>
    </details>
  </div>`;

  // Custom badges
  html += `<div class="card"><div class="section-title">${icon("award")} Badges</div>
    <p class="sub">Built-in badges plus your own — make one for anything you want to encourage!</p>`;
  for (const b of allBadges()) {
    html += `<div class="entry-row"><span style="font-size:1.6rem">${b.emoji}</span>
      <span class="grow"><b>${esc(b.name)}</b> <span class="muted">· ${b.custom ? "custom" : "built-in"}</span><br>
      <span class="muted">${esc(b.desc)}${b.custom ? ` · <i>${esc(badgeRuleText(b))}</i>` : ""}</span></span>
      ${b.custom ? `<button class="icon-btn" data-action="badge-edit-open" data-bid="${b.id}" title="Edit">${icon("pencil")}</button>
      <button class="icon-btn red" data-action="badge-delete" data-bid="${b.id}" title="Delete">${icon("trash")}</button>` : ""}</div>`;
  }
  html += `<div style="margin-top:10px"><button class="btn blue small" data-action="badge-add-open">${icon("plus")} Add custom badge</button></div></div>`;

  // Activities
  html += `<div class="card"><div class="section-title">${icon("clipboard")} Activities</div>`;
  for (const a of S.activities) {
    html += `<div class="entry-row"><span class="grow"><b>${esc(a.name)}</b> <span class="muted">· ${esc(a.unit)} · ${a.xpPerUnit} XP/unit${a.custom ? " · custom" : ""}</span></span>
      <button class="icon-btn" data-action="edit-activity-open" data-aid="${a.id}" title="Edit">${icon("pencil")}</button>
      ${a.custom ? `<button class="icon-btn red" data-action="delete-activity" data-aid="${a.id}" title="Delete">${icon("trash")}</button>` : ""}</div>`;
  }
  html += `<div style="margin-top:10px"><button class="btn blue small" data-action="add-activity-open">${icon("plus")} Add custom activity</button></div></div>`;

  // Recent entries
  const recent = [...S.entries].sort((a, b) => b.ts - a.ts).slice(0, 40);
  html += `<div class="card"><div class="section-title">${icon("check")} Recent Entries</div>`;
  if (!recent.length) html += `<p class="muted">Nothing logged yet.</p>`;
  for (const e of recent) {
    const act = getActivity(e.activityId);
    html += `<div class="entry-row"><span class="grow"><b>${esc(profileName(e.profileId))}</b> · ${esc(act ? act.name : "(removed)")} · ${act ? esc(fmtValue(act, e.value)) : esc(String(e.value))}<br><span class="muted">${prettyDate(e.date)}</span></span>
      <span class="xp">+${e.xp}</span>
      <button class="icon-btn" data-action="edit-entry-open" data-eid="${e.id}" title="Edit">${icon("pencil")}</button>
      <button class="icon-btn red" data-action="delete-entry" data-eid="${e.id}" title="Delete">${icon("x")}</button></div>`;
  }
  html += `</div>`;

  // Freezes
  html += `<div class="card"><div class="section-title">${icon("freeze")} Streak Freezes</div><p class="sub">Week of ${weekRangeLabel(mondayOf(todayStr()))}</p>`;
  for (const p of S.profiles) {
    const f = freezeState(p.id);
    html += `<div class="entry-row"><span class="grow"><b>${esc(p.name)}</b> — ${f.tokens} token${f.tokens === 1 ? "" : "s"} left${f.used.length ? `<br><span class="muted">used: ${f.used.map(prettyDate).join(", ")}</span>` : ""}</span>
      <button class="btn ghost small" data-action="grant-freeze" data-pid="${p.id}">${icon("plus")} Token</button>
      <button class="btn ghost small" data-action="use-freeze-open" data-pid="${p.id}">${icon("freeze")} Use</button></div>`;
  }
  html += `</div>`;

  // Data
  html += `<div class="card"><div class="section-title">${icon("download")} Data</div>
    <div class="today-line" id="saveStatus">${esc(saveStatusText())}</div>
    <div class="btn-row" style="margin-bottom:10px">
      <button class="btn primary small" data-action="save-now">${icon("check")} Save now</button>
      <button class="btn blue small" data-action="export-json">${icon("download")} Export</button>
      <button class="btn ghost small" data-action="import-json">${icon("upload")} Import</button>
    </div>
    <input type="file" id="importFile" accept="application/json" hidden>
    <button class="btn danger small" data-action="reset-week">${icon("trash")} Reset this week's season</button>
    <p class="muted">The app auto-saves every change on this device. <b>Save now</b> forces a save; <b>Export</b> downloads a backup file you can keep or move to another device. Private browsing or clearing site data will erase saved data — export a backup to be safe.</p>
    <div class="section-title">${icon("lock")} Change PIN</div>
    <div class="inline-form"><input id="pinNew" type="password" inputmode="numeric" maxlength="4" placeholder="new 4-digit PIN"><button class="btn ghost small" data-action="pin-change">Set</button></div>
  </div>`;

  return html;
}

/* Human-readable save status for the Parent > Data card. */
function saveStatusText() {
  if (!storageOK()) return "⚠️ This browser is blocking saved data (private mode?) — use Export to keep a backup file.";
  const t = lastSavedAt();
  if (!t) return "No save yet on this device.";
  const d = new Date(t);
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const day = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `✓ All changes saved on this device · last save ${day} ${time}`;
}
function refreshSaveStatus() {
  const el = document.getElementById("saveStatus");
  if (el) el.textContent = saveStatusText();
}

/* ---------------- main render ---------------- */
function renderMain() {
  const main = document.getElementById("main");
  let html = "";
  if (S.activeTab === "log") html = renderLog();
  else if (S.activeTab === "boards") html = renderBoards();
  else if (S.activeTab === "records") html = renderRecords();
  else if (S.activeTab === "badges") html = renderBadges();
  else if (S.activeTab === "parent") html = renderParent();
  main.innerHTML = html;
  drawCharts();
}
function render() {
  renderHeader();
  renderTabbar();
  renderMain();
  updateTimerPill();
}

/* ---------------- charts (hand-rolled canvas) ---------------- */
function setupCanvas(cv, hCss) {
  const dpr = window.devicePixelRatio || 1;
  const w = cv.clientWidth || 300;
  cv.width = w * dpr; cv.height = hCss * dpr;
  cv.style.height = hCss + "px";
  const ctx = cv.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h: hCss };
}
function rrect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, 0);
  ctx.arcTo(x, y + h, x, y, 0);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function drawCharts() {
  if (S.activeTab !== "boards") return;
  const pid = S.activeProfileId;
  const wk = mondayOf(todayStr());

  const cv = document.getElementById("weekChart");
  if (cv) {
    const { ctx, w, h } = setupCanvas(cv, 190);
    const data = weekDailyTotals(pid, wk, ["piano", "guitar"]);
    const max = Math.max(10, ...data.map(d => d.total));
    const padL = 8, padR = 8, padT = 22, padB = 24;
    const cw = (w - padL - padR) / 7;
    const labels = ["M", "T", "W", "T", "F", "S", "S"];
    ctx.textAlign = "center";
    data.forEach((d, i) => {
      const bh = (h - padT - padB) * (d.total / max);
      const x = padL + i * cw + cw * 0.18;
      const bw = cw * 0.64;
      const y = h - padB - bh;
      const isToday = d.date === todayStr();
      ctx.fillStyle = isToday ? "#ffc93c" : "#7c5cff";
      if (bh > 1) { rrect(ctx, x, y, bw, Math.max(bh, 4), 6); ctx.fill(); }
      ctx.fillStyle = "#2b2440";
      ctx.font = "700 11px system-ui";
      ctx.fillText(d.total > 0 ? d.total : "", x + bw / 2, y - 6);
      ctx.fillStyle = isToday ? "#2b2440" : "#8a84a3";
      ctx.font = "700 12px system-ui";
      ctx.fillText(labels[i], x + bw / 2, h - 8);
    });
  }

  const heat = document.getElementById("monthHeat");
  if (heat) {
    const mk = todayStr().slice(0, 7);
    const first = parseDate(mk + "-01");
    const offset = (first.getDay() + 6) % 7;
    const dim = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const rows = Math.ceil((offset + dim) / 7);
    const dpr0 = window.devicePixelRatio || 1;
    const w = heat.clientWidth || 300;
    const cell = (w - 6 * 6) / 7, gap = 6;
    const hCss = rows * (cell + gap);
    heat.width = w * dpr0; heat.height = hCss * dpr0;
    heat.style.height = hCss + "px";
    const ctx = heat.getContext("2d");
    ctx.setTransform(dpr0, 0, 0, dpr0, 0, 0);
    // day XP per date
    const xpByDate = {};
    for (const e of S.entries) {
      if (e.profileId !== pid || e.date.slice(0, 7) !== mk) continue;
      xpByDate[e.date] = (xpByDate[e.date] || 0) + (e.xp || 0);
    }
    const dayNames = ["M", "T", "W", "T", "F", "S", "S"];
    ctx.textAlign = "center";
    ctx.clearRect(0, 0, w, hCss);
    dayNames.forEach((n, i) => {
      ctx.fillStyle = "#8a84a3"; ctx.font = "700 11px system-ui";
      ctx.fillText(n, i * (cell + gap) + cell / 2, 12);
    });
    const y0 = 20;
    for (let d = 1; d <= dim; d++) {
      const idx = offset + d - 1;
      const r = Math.floor(idx / 7), c = idx % 7;
      const x = c * (cell + gap), y = y0 + r * (cell + gap);
      const ds = `${mk}-${String(d).padStart(2, "0")}`;
      const xp = xpByDate[ds] || 0;
      const a = xp === 0 ? 0 : Math.min(1, 0.25 + xp / 120);
      ctx.fillStyle = xp === 0 ? "#f0ecff" : `rgba(124,92,255,${a.toFixed(2)})`;
      rrect(ctx, x, y, cell, cell, 8); ctx.fill();
      if (ds === todayStr()) { ctx.strokeStyle = "#ffc93c"; ctx.lineWidth = 3; rrect(ctx, x + 1.5, y + 1.5, cell - 3, cell - 3, 7); ctx.stroke(); }
      ctx.fillStyle = xp === 0 ? "#b9b2d8" : (a > 0.6 ? "#fff" : "#2b2440");
      ctx.font = "700 12px system-ui";
      ctx.fillText(String(d), x + cell / 2, y + cell / 2 + 4);
    }
  }
}

/* ---------------- practice timer ---------------- */
let timerState = null; // {activityId, profileId, startTs, intId}
function fmtClock(ms) {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
function tickTimer() {
  if (!timerState) return;
  const txt = fmtClock(Date.now() - timerState.startTs);
  document.querySelectorAll("[data-timer-display]").forEach(el => el.textContent = txt);
  const pill = document.getElementById("timerPill");
  if (pill && !pill.hidden) pill.querySelector("span.t").textContent = txt;
}
function startTimer(aid) {
  if (timerState) { toast("A timer is already running!"); return; }
  timerState = { activityId: aid, profileId: S.activeProfileId, startTs: Date.now(), intId: setInterval(tickTimer, 500) };
  render();
}
function stopTimer() {
  if (!timerState) return;
  clearInterval(timerState.intId);
  const mins = Math.round((Date.now() - timerState.startTs) / 60000);
  const { activityId, profileId } = timerState;
  timerState = null;
  if (mins < 1) { toast("Under a minute — keep practicing!"); render(); return; }
  const r = logEntry(profileId, activityId, mins);
  afterLog(r, `${mins} focused minutes logged`);
}
function updateTimerPill() {
  const pill = document.getElementById("timerPill");
  if (timerState) {
    const act = getActivity(timerState.activityId);
    pill.hidden = false;
    pill.innerHTML = `${icon("clock")} ${esc(act ? act.name : "Practice")} · <span class="t">${fmtClock(Date.now() - timerState.startTs)}</span> — tap to log`;
  } else {
    pill.hidden = true;
  }
}

/* ---------------- modals for parent actions ---------------- */
function activityFormHTML(a) {
  const isNew = !a;
  a = a || { name: "", unit: "minutes", xpPerUnit: 5, xpNote: "", profiles: ["kid", "dad"], icon: "star", color: "#7c5cff" };
  const units = ["minutes", "count", "sessions", "servings", "time"];
  return `
    <label class="field">Name</label><input id="af-name" value="${esc(a.name)}" maxlength="24" placeholder="e.g. Reading">
    <label class="field">Unit</label><select id="af-unit" ${isNew ? "" : "disabled"}>
      ${units.map(u => `<option ${a.unit === u ? "selected" : ""}>${u}</option>`).join("")}</select>
    ${isNew ? "" : `<p class="muted">Unit can't be changed after creation.</p>`}
    <label class="field">XP per unit ${a.unit === "time" ? "(per log)" : ""}</label>
    <input id="af-xp" type="number" min="0" max="500" value="${a.xpPerUnit}">
    <label class="field">Note shown to kids (e.g. "5 XP per page")</label>
    <input id="af-note" value="${esc(a.xpNote || "")}" maxlength="40">
    <label class="field">Visible to</label>
    <div class="btn-row">
      <label style="flex:1"><input type="checkbox" id="af-kid" ${a.profiles.includes("kid") ? "checked" : ""} style="width:auto"> Kid</label>
      <label style="flex:1"><input type="checkbox" id="af-dad" ${a.profiles.includes("dad") ? "checked" : ""} style="width:auto"> Parent</label>
    </div>
    <div style="margin-top:14px"><button class="btn primary" data-action="${isNew ? "add-activity-save" : "edit-activity-save"}" data-aid="${isNew ? "" : a.id}">${icon("check")} ${isNew ? "Add activity" : "Save changes"}</button></div>`;
}
function badgeFormHTML(b) {
  const isNew = !b;
  b = b || { name: "", emoji: "🏅", desc: "", hint: "", rule: { activityId: "reading", target: 30, period: "day" } };
  const r = b.rule || { activityId: "reading", target: 30, period: "day" };
  return `
    <label class="field">Badge name</label><input id="bf-name" value="${esc(b.name)}" maxlength="24" placeholder="e.g. Weekend Warrior">
    <label class="field">Emoji</label><input id="bf-emoji" value="${esc(b.emoji || "🏅")}" maxlength="8" placeholder="🏅">
    <label class="field">Description (shown when earned)</label><input id="bf-desc" value="${esc(b.desc || "")}" maxlength="80" placeholder="e.g. Sports on both weekend days!">
    <label class="field">Hint (shown while locked)</label><input id="bf-hint" value="${esc(b.hint || "")}" maxlength="80" placeholder="e.g. Log sports on Saturday and Sunday.">
    <label class="field">Activity</label><select id="bf-activity">
      ${S.activities.map(a => `<option value="${a.id}" ${r.activityId === a.id ? "selected" : ""}>${esc(a.name)}</option>`).join("")}</select>
    <label class="field">Target amount</label><input id="bf-target" type="number" min="1" max="10000" value="${r.target || 30}">
    <label class="field">In one…</label><select id="bf-period">
      <option value="day" ${r.period !== "week" ? "selected" : ""}>day</option>
      <option value="week" ${r.period === "week" ? "selected" : ""}>week</option></select>
    <p class="muted">Example: 30 + Sports + day = "30 min of Sports in one day".</p>
    <div style="margin-top:14px"><button class="btn primary" data-action="${isNew ? "badge-add-save" : "badge-edit-save"}" data-bid="${isNew ? "" : b.id}">${icon("check")} ${isNew ? "Add badge" : "Save badge"}</button></div>`;
}

function entryFormHTML(e) {
  const act = getActivity(e.activityId);
  const unit = act ? act.unit : "count";
  const input = unit === "time"
    ? `<input type="time" id="ef-value" value="${esc(e.value)}">`
    : `<input type="number" id="ef-value" value="${esc(e.value)}" min="0" max="1000">`;
  return `<p class="muted">${esc(profileName(e.profileId))} · ${esc(act ? act.name : "(removed)")} · ${prettyDate(e.date)}</p>
    <label class="field">Value (${esc(unit)})</label>${input}
    <div style="margin-top:14px"><button class="btn primary" data-action="edit-entry-save" data-eid="${e.id}">${icon("check")} Save</button></div>`;
}

/* ---------------- events ---------------- */
function val(id) { const el = document.getElementById(id); return el ? el.value.trim() : ""; }

document.addEventListener("click", ev => {
  const el = ev.target.closest("[data-action]");
  if (!el) return;
  const a = el.dataset.action;

  if (a === "close-modal") { if (ev.target === el) closeModal(); return; }
  if (a === "goto-log") { S.activeTab = "log"; saveState(); render(); window.scrollTo(0, 0); return; }

  const pid = S.activeProfileId;

  switch (a) {
    case "switch-profile":
      S.activeProfileId = el.dataset.pid; S.activeTab = "log"; saveState(); render(); break;

    case "goto-tab":
      S.activeTab = el.dataset.tab; saveState(); render(); window.scrollTo(0, 0); break;

    case "start-timer": startTimer(el.dataset.aid); break;
    case "stop-timer": stopTimer(); break;

    case "quick-log": {
      const act = getActivity(el.dataset.aid);
      if (!act) break;
      if (act.capPerDay && todayTotal(pid, act.id) >= act.capPerDay) { toast("Daily max reached — great job!"); break; }
      const r = logEntry(pid, act.id, act.quick || 1);
      afterLog(r, "Logged");
      break;
    }
    case "log-manual": {
      const act = getActivity(el.dataset.aid);
      const n = Math.round(Number(val("manual-" + act.id)));
      if (!act || !(n > 0) || n > 600) { toast("Enter minutes between 1 and 600."); break; }
      const r = logEntry(pid, act.id, n);
      afterLog(r, `${n} minutes logged`);
      break;
    }
    case "log-time": {
      const act = getActivity(el.dataset.aid);
      const t = val("time-" + act.id);
      if (!act || !t) { toast("Pick a time first."); break; }
      const r = logEntry(pid, act.id, t);
      afterLog(r, `Bedtime logged: ${prettyTime(t)}`);
      break;
    }

    case "pin-setup": {
      const p1 = val("pin1"), p2 = val("pin2");
      if (!/^\d{4}$/.test(p1)) { toast("PIN must be 4 digits."); break; }
      if (p1 !== p2) { toast("PINs don't match — try again."); break; }
      S.pinHash = hashPin(p1); S.parentUnlocked = true; saveState(); render();
      toast("PIN set. Welcome, parent!"); break;
    }
    case "pin-unlock": {
      if (hashPin(val("pinEntry")) === S.pinHash) {
        S.parentUnlocked = true; render(); toast("Unlocked.");
      } else toast("Wrong PIN — try again.");
      break;
    }
    case "parent-lock": S.parentUnlocked = false; render(); break;
    case "pin-change": {
      const p = val("pinNew");
      if (!/^\d{4}$/.test(p)) { toast("PIN must be 4 digits."); break; }
      S.pinHash = hashPin(p); saveState(); toast("PIN updated."); render(); break;
    }

    case "rename-save": {
      for (const p of S.profiles) {
        const n = val("pname-" + p.id);
        if (n) p.name = n.slice(0, 20);
      }
      saveState(); render(); toast("Names saved."); break;
    }

    case "photo-remove": {
      const p = getProfile(el.dataset.pid);
      if (p) { p.photo = null; saveState(); render(); toast("Photo removed."); }
      break;
    }

    case "add-activity-open": openModal("Add Activity", "plus", activityFormHTML(null)); break;
    case "add-activity-save": {
      const name = val("af-name");
      const unit = val("af-unit");
      const xp = Math.max(0, Math.min(500, Math.round(Number(val("af-xp")) || 0)));
      const profiles = ["kid", "dad"].filter(k => document.getElementById("af-" + k).checked);
      if (!name) { toast("Give the activity a name."); break; }
      if (!profiles.length) { toast("Pick at least one profile."); break; }
      S.activities.push({ id: uid(), name, unit, xpPerUnit: xp,
        xpNote: val("af-note") || `${xp} XP per ${unit}`, timer: false,
        profiles, custom: true, icon: "star", color: "#3aa7ff" });
      saveState(); closeModal(); render(); toast(`"${name}" added!`); break;
    }
    case "edit-activity-open": {
      const act = getActivity(el.dataset.aid);
      if (act) openModal("Edit Activity", "pencil", activityFormHTML(act));
      break;
    }
    case "edit-activity-save": {
      const act = getActivity(el.dataset.aid);
      if (!act) break;
      const name = val("af-name");
      const xp = Math.max(0, Math.min(500, Math.round(Number(val("af-xp")) || 0)));
      const profiles = ["kid", "dad"].filter(k => document.getElementById("af-" + k).checked);
      if (!name || !profiles.length) { toast("Name and at least one profile are required."); break; }
      act.name = name; act.xpPerUnit = xp; act.xpNote = val("af-note"); act.profiles = profiles;
      saveState(); closeModal(); render(); toast("Activity updated."); break;
    }
    case "delete-activity": {
      const act = getActivity(el.dataset.aid);
      if (!act || !act.custom) break;
      if (!confirm(`Delete "${act.name}"? Its past entries stay but earn no new logs.`)) break;
      S.activities = S.activities.filter(x => x.id !== act.id);
      saveState(); render(); toast("Activity deleted."); break;
    }

    case "delete-entry":
      if (confirm("Delete this entry?")) { deleteEntry(el.dataset.eid); render(); toast("Entry deleted."); }
      break;
    case "edit-entry-open": {
      const e = S.entries.find(x => x.id === el.dataset.eid);
      if (e) openModal("Edit Entry", "pencil", entryFormHTML(e));
      break;
    }
    case "edit-entry-save": {
      const v = val("ef-value");
      if (v === "" || Number(v) < 0) { toast("Enter a valid value."); break; }
      updateEntry(el.dataset.eid, v);
      closeModal(); render(); toast("Entry updated."); break;
    }

    case "grant-freeze": grantFreeze(el.dataset.pid); render(); toast("Freeze token granted!"); break;
    case "use-freeze-open": {
      const p = getProfile(el.dataset.pid);
      openModal("Use Freeze Token", "freeze",
        `<p class="muted">Protect <b>${esc(p.name)}</b>'s streak for a missed day in the last 7 days.</p>
         <label class="field">Missed date</label>
         <input type="date" id="fz-date" value="${addDays(todayStr(), -1)}" max="${addDays(todayStr(), -1)}">
         <div style="margin-top:14px"><button class="btn primary" data-action="use-freeze-save" data-pid="${p.id}">${icon("freeze")} Use token</button></div>`);
      break;
    }
    case "use-freeze-save": {
      const r = useFreeze(el.dataset.pid, val("fz-date"));
      toast(r.msg); if (r.ok) { closeModal(); } render(); break;
    }
    case "kid-freeze-open":
      openModal("Protect My Streak", "freeze",
        `<p class="muted">Ask a parent to enter the PIN, then pick the missed day.</p>
         <label class="field">Parent PIN</label>
         <input id="kfz-pin" type="password" inputmode="numeric" maxlength="4" placeholder="••••">
         <label class="field">Missed date</label>
         <input type="date" id="kfz-date" value="${addDays(todayStr(), -1)}" max="${addDays(todayStr(), -1)}">
         <div style="margin-top:14px"><button class="btn primary" data-action="kid-freeze-save">${icon("freeze")} Protect streak</button></div>`);
      break;
    case "kid-freeze-save": {
      if (hashPin(val("kfz-pin")) !== S.pinHash) { toast("Wrong PIN — ask a parent."); break; }
      const r = useFreeze(pid, val("kfz-date"));
      toast(r.msg); if (r.ok) closeModal(); render(); break;
    }

    case "reset-week":
      if (confirm("Reset this week's season? This deletes all entries from this week. Records and badges stay.")) {
        const wk = mondayOf(todayStr());
        const n = S.entries.filter(e => mondayOf(e.date) === wk).length;
        S.entries = S.entries.filter(e => mondayOf(e.date) !== wk);
        saveState(); render(); toast(`Season reset — ${n} entries cleared.`);
      }
      break;
    case "save-now":
      saveState();
      refreshSaveStatus();
      toast(storageOK() ? "All data saved on this device ✓" : "Couldn't save — browser is blocking storage. Use Export!");
      break;

    case "cloud-save": {
      S.cloud.provider = "supabase";
      S.cloud.url = val("cloud-url").replace(/\/+$/, "");
      S.cloud.key = val("cloud-key");
      S.cloud.code = val("cloud-code");
      const autoEl = document.getElementById("cloud-auto");
      S.cloud.auto = !!(autoEl && autoEl.checked);
      S.cloud.lastError = null;
      saveState({ touch: false });
      updateCloudUI();
      toast(cloudConfigured() ? "Cloud settings saved." : "Fill in URL, key and family code to enable sync.");
      break;
    }
    case "cloud-push": pushCloud(false); break;
    case "cloud-pull": pullCloud(false); break;

    case "badge-add-open": openModal("Add Badge", "plus", badgeFormHTML(null)); break;
    case "badge-edit-open": {
      const b = (S.customBadges || []).find(x => x.id === el.dataset.bid);
      if (b) openModal("Edit Badge", "pencil", badgeFormHTML(b));
      break;
    }
    case "badge-add-save":
    case "badge-edit-save": {
      const name = val("bf-name");
      const target = Math.round(Number(val("bf-target")));
      const act = getActivity(val("bf-activity"));
      if (!name) { toast("Give the badge a name."); break; }
      if (!act) { toast("Pick an activity."); break; }
      if (!(target > 0)) { toast("Target must be at least 1."); break; }
      const data = {
        name: name.slice(0, 24),
        emoji: val("bf-emoji") || "🏅",
        desc: val("bf-desc") || name,
        hint: val("bf-hint") || val("bf-desc") || "Keep going!",
        custom: true,
        rule: { activityId: act.id, target, period: val("bf-period") === "week" ? "week" : "day" },
      };
      if (a === "badge-add-save") {
        data.id = uid();
        S.customBadges.push(data);
        toast(`Badge "${data.name}" added!`);
      } else {
        const b = (S.customBadges || []).find(x => x.id === el.dataset.bid);
        if (!b) break;
        Object.assign(b, data);
        toast("Badge updated.");
      }
      // Immediately award it if already earned.
      for (const p of S.profiles) {
        const earned = S.earnedBadges[p.id] || {};
        for (const eb of checkBadges(p.id)) if (!earned[eb.id]) earned[eb.id] = eb.earnedDate;
      }
      saveState(); closeModal(); render();
      break;
    }
    case "badge-delete": {
      const b = (S.customBadges || []).find(x => x.id === el.dataset.bid);
      if (!b) break;
      if (!confirm(`Delete the "${b.name}" badge?`)) break;
      S.customBadges = S.customBadges.filter(x => x.id !== b.id);
      for (const p of S.profiles) { if (S.earnedBadges[p.id]) delete S.earnedBadges[p.id][b.id]; }
      saveState(); render(); toast("Badge deleted.");
      break;
    }

    case "export-json": {
      const blob = new Blob([JSON.stringify(S, null, 2)], { type: "application/json" });
      const aEl = document.createElement("a");
      aEl.href = URL.createObjectURL(blob);
      aEl.download = `family-leaderboard-${todayStr()}.json`;
      document.body.appendChild(aEl); aEl.click(); aEl.remove();
      setTimeout(() => URL.revokeObjectURL(aEl.href), 5000);
      toast("Data exported!");
      break;
    }
    case "import-json": {
      const f = document.getElementById("importFile");
      if (f) f.click();
      break;
    }
  }
});

/* profile photos: downscale to keep localStorage small, store as data URL */
function handlePhotoFile(input, pid) {
  const f = input.files && input.files[0];
  if (!f) return;
  if (!f.type.startsWith("image/")) { toast("Please pick an image file."); input.value = ""; return; }
  const img = new Image();
  const url = URL.createObjectURL(f);
  img.onload = () => {
    const max = 160;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    cv.getContext("2d").drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(url);
    const p = getProfile(pid);
    if (p) { p.photo = cv.toDataURL("image/jpeg", 0.82); saveState(); render(); toast("Photo updated!"); }
  };
  img.onerror = () => { URL.revokeObjectURL(url); toast("Couldn't read that image."); };
  img.src = url;
  input.value = "";
}

/* import file + profile photo picker */
document.addEventListener("change", ev => {
  if (ev.target.dataset && ev.target.dataset.photoFor) {
    handlePhotoFile(ev.target, ev.target.dataset.photoFor);
    return;
  }
  if (ev.target.id !== "importFile") return;
  const f = ev.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const s = JSON.parse(r.result);
      if (!s || s.version !== 1 || !Array.isArray(s.entries) || !Array.isArray(s.profiles)) throw new Error("bad");
      s.parentUnlocked = false;
      S = s; saveState(); render();
      toast("Data imported!");
    } catch (e) { toast("That file doesn't look like Family Leaderboard data."); }
    ev.target.value = "";
  };
  r.readAsText(f);
});

/* keep charts crisp on resize/rotation */
let resizeT = null;
window.addEventListener("resize", () => {
  clearTimeout(resizeT);
  resizeT = setTimeout(() => { if (S.activeTab === "boards") drawCharts(); }, 200);
});

/* ---- persistence safety nets ---- */
// Save whenever the page is about to go away (tab close, refresh, …).
window.addEventListener("beforeunload", () => { try { saveState(); } catch (e) {} });
// Also re-save periodically, so a crash between edits loses at most a minute.
setInterval(() => { try { saveState(); } catch (e) {} }, 60000);
// Keep the Parent > Data save-status line fresh after every save,
// and queue a cloud auto-push when one's due.
window.addEventListener("fl-saved", () => {
  refreshSaveStatus();
  if (typeof scheduleAutoPush === "function") {
    try { scheduleAutoPush(); } catch (e) {}
  }
});

/* ---------------- init ---------------- */
(function init() {
  const brand = document.querySelector('[data-icon="trophy"].brand-icon');
  if (brand) brand.innerHTML = icon("trophy");
  // Weekly freeze tokens auto-reset inside freezeState(); touch both profiles.
  freezeState("kid"); freezeState("dad");
  render();
  // If cloud sync was left on, quietly pull the latest on launch.
  if (typeof pullCloud === "function" && S.cloud && S.cloud.auto) {
    try {
      const p = pullCloud(true);
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch (e) {}
  }
})();
