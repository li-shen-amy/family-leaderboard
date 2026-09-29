"use strict";
/* ============================================================
   auth.js — email + password login for cloud sync (Supabase Auth,
   plain REST, no dependencies).

   Design:
   - Sign up / log in once with an email + password. The account
     owns one row in family_sync (keyed by user_id, enforced by
     row-level security), so any device you log in on sees it.
   - Your login password ALSO encrypts the payload (AES-GCM, same
     code as before). The server only ever sees ciphertext.
   - The password lives in memory ONLY (sessionPassword). It is
     never written to localStorage, never synced, never logged.
     After a page reload you log in again to sync — local data
     always works offline regardless.
   - Session tokens are kept in their own localStorage key, never
     inside the synced app state (tokens are per-device).
   ============================================================ */

const AUTH_LS_KEY = "flb_auth_session_v1";

let sessionPassword = null; // in-memory only — the encryption key

function getSession() {
  try { return JSON.parse(localStorage.getItem(AUTH_LS_KEY)) || null; }
  catch (e) { return null; }
}
function saveSession(s) { localStorage.setItem(AUTH_LS_KEY, JSON.stringify(s)); }
function clearSession() {
  localStorage.removeItem(AUTH_LS_KEY);
  sessionPassword = null;
}
function loggedIn() {
  const s = getSession();
  return !!(s && s.accessToken);
}
function getSessionPassword() { return sessionPassword; }

function authBase() {
  return String((typeof S !== "undefined" && S.cloud.url) || "").replace(/\/+$/, "");
}
function anonKey() { return (typeof S !== "undefined" && S.cloud.key) || ""; }

function authError(j, fallback) {
  return (j && (j.msg || j.error_description || j.error || j.message)) || fallback;
}

function persistAuthSession(email, j) {
  // j: { access_token, refresh_token, expires_in, user: { id } }
  saveSession({
    email: email,
    userId: j.user && j.user.id,
    accessToken: j.access_token,
    refreshToken: j.refresh_token,
    expiresAt: Date.now() + (j.expires_in || 3600) * 1000,
  });
}

async function authSignup(email, password) {
  const res = await fetch(`${authBase()}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: anonKey(), "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(authError(j, "Sign-up failed."));
  if (j.session && j.session.access_token) {
    persistAuthSession(email, {
      access_token: j.session.access_token,
      refresh_token: j.session.refresh_token,
      expires_in: j.session.expires_in,
      user: j.user,
    });
    sessionPassword = password;
    return { needsConfirm: false };
  }
  // "Confirm email" is enabled in the Supabase project: no session yet.
  return { needsConfirm: true };
}

async function authLogin(email, password) {
  const res = await fetch(`${authBase()}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey(), "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(authError(j, "Log-in failed — check your email and password."));
  persistAuthSession(email, j);
  sessionPassword = password;
  return true;
}

/* Returns a valid session, refreshing the access token when needed.
   Throws (and clears the session) when the user must log in again. */
async function ensureSession() {
  let s = getSession();
  if (!s || !s.accessToken) throw new Error("Please log in first (Parent → Cloud Sync).");
  if (Date.now() > s.expiresAt - 60000) {
    const res = await fetch(`${authBase()}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { apikey: anonKey(), "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: s.refreshToken }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { clearSession(); throw new Error("Session expired — please log in again."); }
    persistAuthSession(s.email, j);
    s = getSession();
  }
  return s;
}

async function authLogout() {
  const s = getSession();
  try {
    if (s && s.accessToken) {
      await fetch(`${authBase()}/auth/v1/logout`, {
        method: "POST",
        headers: { apikey: anonKey(), Authorization: "Bearer " + s.accessToken },
      });
    }
  } catch (e) { /* best effort — local session is cleared regardless */ }
  clearSession();
}

/* Change the login password, then re-encrypt the cloud copy with the
   new password so it stays readable. Requires an active login. */
async function authChangePassword(newPassword) {
  const s = await ensureSession();
  const res = await fetch(`${authBase()}/auth/v1/user`, {
    method: "PUT",
    headers: {
      apikey: anonKey(),
      Authorization: "Bearer " + s.accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password: newPassword }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(authError(j, "Password change failed."));
  await authLogin(s.email, newPassword); // refresh tokens under the new password
  await pushCloud(false);               // re-encrypt cloud copy with the new key
}
