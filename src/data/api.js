// src/data/api.js
import { supabase } from "../lib/supabaseClient";
import { metrics } from "./metrics";

// -------- Local cache helpers (localStorage) --------
const CACHE_TTL_MS = 1000 * 60 * 10; // 10 minutes

function setCache(key, value) {
  try {
    const payload = { value, ts: Date.now() };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (_) {}
}

function getCache(key, ttl = CACHE_TTL_MS) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { value, ts } = JSON.parse(raw);
    if (Date.now() - ts > ttl) return null;
    return value;
  } catch (_) {
    return null;
  }
}

// ===================================================
// ✅ PUZZLE API
// ===================================================

/** Fetch puzzle by date (YYYY-MM-DD) */
export async function fetchPuzzleByDate(dateStr) {
  try {
    console.log("[PUZZLE] start", dateStr);

    const cacheKey = `puzzle:${dateStr}`;
    const cached = getCache(cacheKey);
    if (cached) {
      console.log("[PUZZLE] SOURCE=cached", dateStr);
      return cached;
    }

    if (!supabase) {
      console.warn("[PUZZLE] no supabase client (check env)");
      return null;
    }

    const { data, error } = await supabase
      .from("puzzles")
      .select("*")
      .eq("puzzle_date", dateStr)
      .maybeSingle();

    // Not found -> null (lets Play.jsx load local fallback)
    if (error) {
      // Supabase PostgREST codes: 404-ish/No rows — sometimes PGRST116/204 depending on version
      if (error.code === "PGRST116" || error.code === "PGRST204") {
        return null;
      }
      throw error;
    }

    if (data) {
      setCache(cacheKey, data);
      metrics?.puzzleLoad?.(dateStr, 0);
      return data;
    }

    return null;
  } catch (error) {
    console.error("fetchPuzzleByDate error:", error);
    metrics?.error?.("fetchPuzzleByDate", error);
    return null;
  }
}

/** List available puzzle dates */
export async function listAvailableDates(limit = 90) {
  const cacheKey = `puzzle_dates:${limit}`;
  const cached = getCache(cacheKey);
  if (cached?.length) return cached;

  if (!supabase) return cached || [];

  const { data, error } = await supabase
    .from("puzzles")
    .select("puzzle_date")
    .order("puzzle_date", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("listAvailableDates error:", error);
    metrics?.error?.("listAvailableDates", error);
    return cached || [];
  }

  const dates = (data || []).map((r) => r.puzzle_date);
  setCache(cacheKey, dates);
  return dates;
}

// ===================================================
// 🧩 5.3 — PROGRESS & STATS SYNC
// ===================================================

const NS = "mx";
const getLocal = (k) => {
  try { return JSON.parse(localStorage.getItem(`${NS}:${k}`)); } catch { return null; }
};
const setLocal = (k, v) => {
  try { localStorage.setItem(`${NS}:${k}`, JSON.stringify(v)); } catch {}
};

// ---------- Load user progress ----------
export async function loadProgress(date) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return getLocal(`progress:${date}`) || null;

  const { data, error } = await supabase
    .from("user_progress")
    .select("entries, seconds, updated_at")
    .eq("user_id", user.id)
    .eq("date", date)
    .maybeSingle();

  if (error) {
    console.warn("loadProgress error:", error);
    metrics?.error?.("loadProgress", error);
    return getLocal(`progress:${date}`) || null;
  }

  if (data) {
    const val = { entries: data.entries, seconds: data.seconds, updated_at: data.updated_at };
    setLocal(`progress:${date}`, val);
    return val;
  }
  return getLocal(`progress:${date}`) || null;
}

// ---------- Save user progress ----------
export async function saveProgress(date, payload /* { entries, seconds } */) {
  const { data: { user } } = await supabase.auth.getUser();
  setLocal(`progress:${date}`, { ...payload, updated_at: new Date().toISOString() });
  if (!user) return { ok: false, offline: true };

  try {
    const { error } = await supabase
      .from("user_progress")
      .upsert(
        { user_id: user.id, date, entries: payload.entries, seconds: payload.seconds ?? 0 },
        { onConflict: "user_id,date" }
      );

    if (error) throw error;
    metrics?.progressSave?.(date);
    return { ok: true };
  } catch (error) {
    enqueue({ type: "progress", date, payload });
    console.warn("saveProgress error:", error);
    metrics?.error?.("saveProgress", error);
    return { ok: false, queued: true, error };
  }
}

// ---------- Record puzzle completion ----------
export async function recordCompletion(date, stats /* { seconds, errors } */) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      enqueue({ type: "completion", date, payload: stats });
      return { ok: false, offline: true, queued: true };
    }

    await _writeCompletion(user.id, date, stats);
    metrics?.completion?.(date, stats?.seconds, stats?.errors);
  } catch (e) {
    enqueue({ type: "completion", date, payload: stats });
    console.warn("recordCompletion queued due to error:", e);
    metrics?.error?.("recordCompletion", e);
    return { ok: false, queued: true, error: e };
  }

  const lp = getLocal(`progress:${date}`) || {};
  setLocal(`progress:${date}`, {
    ...lp,
    completed: true,
    seconds: stats?.seconds ?? lp.seconds,
    updated_at: new Date().toISOString(),
  });

  return { ok: true };
}

// ---------- List all completions ----------
export async function listCompletions({ limit = 200 } = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("completions")
    .select("date, seconds, errors, finished_at")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

// ===================================================
// 5.4 — Offline Queue & Auto-Flush
// ===================================================

const QKEY = "mx:queue";

function qGet() {
  try { return JSON.parse(localStorage.getItem(QKEY)) || []; } catch { return []; }
}
function qSet(arr) {
  try { localStorage.setItem(QKEY, JSON.stringify(arr)); } catch {}
  notifyPending();
}
export function getPendingCount() { return qGet().length; }

const _pendingListeners = new Set();
function notifyPending() { for (const fn of _pendingListeners) fn(getPendingCount()); }
export function onPendingChange(fn) { _pendingListeners.add(fn); return () => _pendingListeners.delete(fn); }

function enqueue(op) {
  const item = { ...op, id: `${op.type}:${op.date}:${Date.now()}` };
  qSet([...qGet(), item]);
}

async function _writeProgress(userId, date, payload) {
  const { error } = await supabase
    .from("user_progress")
    .upsert(
      { user_id: userId, date, entries: payload.entries, seconds: payload.seconds ?? 0 },
      { onConflict: "user_id,date" }
    );
  if (error) throw error;
}

async function _writeCompletion(userId, date, stats) {
  const { error } = await supabase.from("completions").insert({
    user_id: userId, date, seconds: stats?.seconds ?? null, errors: stats?.errors ?? null,
  });
  if (error) throw error;
}

export async function flushPending() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return getPendingCount();

  let queue = qGet();
  const keep = [];
  for (const item of queue) {
    try {
      if (item.type === "progress") {
        await _writeProgress(user.id, item.date, item.payload);
      } else if (item.type === "completion") {
        await _writeCompletion(user.id, item.date, item.payload);
      }
    } catch {
      keep.push(item);
    }
  }
  qSet(keep);
  return keep.length;
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => { flushPending(); });
  setTimeout(() => notifyPending(), 0);
}

// ===================================================
// 5.5 — ADMIN API
// ===================================================

export async function adminListPuzzles({ limit = 200 } = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("puzzles")
    .select("id, puzzle_date, title, size")
    .order("puzzle_date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function adminUpsertPuzzle({ puzzle_date, puzzle }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  if (!puzzle_date || !/^\d{4}-\d{2}-\d{2}$/.test(puzzle_date)) throw new Error("Invalid date");
  if (!puzzle?.grid || !puzzle?.clues) throw new Error("Invalid puzzle JSON");

  const row = {
    puzzle_date,
    title: puzzle.title ?? null,
    size: puzzle.size ?? (puzzle.grid?.length || 5),
    grid: puzzle.grid,
    clues: puzzle.clues,
    author: puzzle.author ?? null,
  };

  const { error } = await supabase
    .from("puzzles")
    .upsert(row, { onConflict: "puzzle_date" });
  if (error) throw error;
  return { ok: true };
}

export async function adminDeletePuzzle(puzzle_date) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { error } = await supabase
    .from("puzzles")
    .delete()
    .eq("puzzle_date", puzzle_date);
  if (error) throw error;
  return { ok: true };
}

export async function adminEventsSummary({ days = 7 } = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const since = new Date(); since.setUTCDate(since.getUTCDate() - (days - 1));
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Vancouver", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(since).replaceAll("/", "-");

  const { data, error } = await supabase
    .from("events")
    .select("date, name, meta")
    .gte("date", ymd);
  if (error) throw error;

  const perDay = {};
  for (const e of data || []) {
    const d = e.date;
    perDay[d] ||= { loads: 0, saves: 0, completions: 0, errors: 0 };
    if (e.name === "puzzle_load") perDay[d].loads++;
    else if (e.name === "progress_save") perDay[d].saves++;
    else if (e.name === "completion") perDay[d].completions++;
    else if (e.name === "error") perDay[d].errors++;
  }
  return perDay;
}
