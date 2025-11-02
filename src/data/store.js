// src/data/store.js

// -------- Stats (game history) --------
// Schema v2 (backward compatible with your v1):
// {
//   totals: { played, completed, reveals, errors, totalTimeSec, bestTimeSec },
//   history: [ { ts, ymd, title, puzzleKey, size, errors, didReveal, elapsedSec, completed, played? } ],
//   lastPlayedTs,
//   // v2 additions below:
//   completionsByYmd: { [ymd]: bestSecForThatDay }, // includes assisted; we keep best-of-day
//   currentStreak: 0,       // CLEAN-only (no reveal)
//   longestStreak: 0,
//   lastCleanYmd: null      // last day that counted toward streak/PR
// }

const STATS_KEY = (uid) => `mc::stats::${uid}`;

function emptyStats() {
  return {
    totals: {
      played: 0,
      completed: 0,
      reveals: 0,
      errors: 0,
      totalTimeSec: 0,
      bestTimeSec: null, // all-time PR (CLEAN only)
    },
    history: [],
    lastPlayedTs: null,

    // v2 fields
    completionsByYmd: {},
    currentStreak: 0,
    longestStreak: 0,
    lastCleanYmd: null,
    lastStreakYmd: null,
  };
}

function normalizeStats(s) {
  // Ensure v1 → v2 safe defaults
  s = s || {};
  s.totals = s.totals || {};
  if (!("played" in s.totals)) s.totals.played = 0;
  if (!("completed" in s.totals)) s.totals.completed = 0;
  if (!("reveals" in s.totals)) s.totals.reveals = 0;
  if (!("errors" in s.totals)) s.totals.errors = 0;
  if (!("totalTimeSec" in s.totals)) s.totals.totalTimeSec = 0;
  if (!("bestTimeSec" in s.totals)) s.totals.bestTimeSec = null;

  s.history = Array.isArray(s.history) ? s.history : [];
  if (!("lastPlayedTs" in s)) s.lastPlayedTs = null;

  if (!s.completionsByYmd) s.completionsByYmd = {};
  if (typeof s.currentStreak !== "number") s.currentStreak = 0;
  if (typeof s.longestStreak !== "number") s.longestStreak = 0;
  if (!("lastCleanYmd" in s)) s.lastCleanYmd = null;
  if (!("lastStreakYmd" in s)) s.lastStreakYmd = s.lastCleanYmd ?? null;

  return s;
}

function readStats(uid) {
  try {
    const raw = localStorage.getItem(STATS_KEY(uid));
    return normalizeStats(raw ? JSON.parse(raw) : emptyStats());
  } catch {
    return emptyStats();
  }
}

function writeStats(uid, stats) {
  try {
    localStorage.setItem(STATS_KEY(uid), JSON.stringify(stats));
  } catch {
    /* ignore quota */
  }
}

export function getUserStats(uid) {
  return readStats(uid);
}

// Optional helper (used by streak math)
function ymdToUTCDate(ymd) {
  if (!ymd) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function daysBetween(aYmd, bYmd) {
  if (!aYmd || !bYmd) return null;
  const a = ymdToUTCDate(aYmd);
  const b = ymdToUTCDate(bYmd);
  const MS = 24 * 60 * 60 * 1000;
  return Math.round((b - a) / MS);
}

// Played bump (you already called this in Grid)
export function bumpPlayed(uid, ymd) {
  const stats = readStats(uid);
  stats.totals.played = (stats.totals.played || 0) + 1;
  stats.lastPlayedTs = Date.now();

  // Optional per-day “played” marker (keeps your existing pattern)
  if (ymd) {
    let entry = stats.history.find((h) => h.ymd === ymd && h.played);
    if (!entry) {
      entry = { ts: Date.now(), ymd, played: 1 };
      stats.history.push(entry);
    } else {
      entry.played = (entry.played || 0) + 1;
    }
  }

  writeStats(uid, stats);
}

/**
 * Record a completion attempt.
 * Supports both call styles:
 *  A) recordCompletion({ userId, elapsedSec, ... })
 *  B) recordCompletion(userId, { elapsedSec, ... })
 *
 * payload fields used for stats:
 *   userId (required for stats), elapsedSec, didReveal, errors, ymd (YYYY-MM-DD),
 *   puzzleKey, size, title
 *
 * Returns: { ...entry, stats, meta }
 *   meta: { isPR, prImprovementSec, deltaVsPRSec }
 */
export function recordCompletion(arg1, arg2) {
  const {
    userId,
    elapsedSec = 0,
    didReveal = false,
    errors = 0,
    ymd = null,
    puzzleKey = null,
    size = null,
    title = null,
  } =
    typeof arg1 === "string"
      ? { userId: arg1, ...(arg2 || {}) }
      : { ...(arg1 || {}) };

  // Build the history entry regardless (even if not signed in)
  const entry = {
    ts: Date.now(),
    ymd,
    title,
    puzzleKey,
    size,
    errors: errors || 0,
    didReveal: !!didReveal,
    elapsedSec: elapsedSec || 0,
    completed: true,
  };

  // If no userId, just return the entry (same behavior you had)
  if (!userId) {
    return { ...entry, stats: null, meta: null };
  }

  const stats = readStats(userId);

  // Always count attempts/completions (assisted or not)
  stats.totals.completed = (stats.totals.completed || 0) + 1;
  stats.totals.reveals = (stats.totals.reveals || 0) + (didReveal ? 1 : 0);
  stats.totals.errors = (stats.totals.errors || 0) + (errors || 0);
  stats.totals.totalTimeSec =
    (stats.totals.totalTimeSec || 0) + (elapsedSec || 0);

  // Best-of-day time (keep the lowest time for that ymd), even if assisted
  if (ymd) {
    const prevDayBest = stats.completionsByYmd[ymd];
    const newBest =
      prevDayBest == null ? elapsedSec : Math.min(prevDayBest, elapsedSec);
    stats.completionsByYmd[ymd] = newBest;
  }

  // Compute PR/meta BEFORE updating bestTimeSec
  const prevBest = stats.totals.bestTimeSec == null ? null : stats.totals.bestTimeSec;

  // Clean solve (no reveal) affects PR & streaks
// --- PR (clean-only) ---
const clean = !didReveal;
if (clean) {
  // All-time PR
  stats.totals.bestTimeSec =
    prevBest == null ? elapsedSec : Math.min(prevBest, elapsedSec);

  // Keep the last clean day for history
  if (ymd) {
    stats.lastCleanYmd = ymd;
  }
}

// --- Streak (clean OR assisted) ---
if (ymd) {
  const last = stats.lastStreakYmd ?? null; // requires emptyStats/normalizeStats to define lastStreakYmd
  if (!last) {
    stats.currentStreak = 1;
  } else {
    const gap = daysBetween(last, ymd);
    if (gap === 0) {
      // same day: no change
    } else if (gap === 1) {
      stats.currentStreak = (stats.currentStreak || 0) + 1;
    } else if (gap > 1) {
      stats.currentStreak = 1; // missed days -> reset
    }
  }
  stats.lastStreakYmd = ymd;
  stats.longestStreak = Math.max(stats.longestStreak || 0, stats.currentStreak || 0);
}


  // Persist + push history entry (keep your existing log)
  stats.history.push(entry);
  writeStats(userId, stats);

  // Modal helpers
  const bestAfter = stats.totals.bestTimeSec;
  const isPR = clean && (prevBest == null || elapsedSec < prevBest);
  const prImprovementSec =
    isPR && prevBest != null ? prevBest - elapsedSec : null;
  const deltaVsPRSec = bestAfter != null ? elapsedSec - bestAfter : null;

  return {
    ...entry, // keep compatibility with old callers
    stats: structuredClone(stats),
    meta: { isPR, prImprovementSec, deltaVsPRSec },
  };
}

export function clearUserStats(uid) {
  writeStats(uid, emptyStats());
}

// -------- Profile (name/preferences) --------
const PROFILE_KEY = (uid) => `mc::profile::${uid}`;

function defaultProfile() {
  return {
    name: null,
    settings: {}, // free space for UI prefs later
    _updatedAt: null,
  };
}

function readProfile(uid) {
  try {
    const raw = localStorage.getItem(PROFILE_KEY(uid));
    return raw ? JSON.parse(raw) : defaultProfile();
  } catch {
    return defaultProfile();
  }
}

function writeProfile(uid, profile) {
  try {
    localStorage.setItem(PROFILE_KEY(uid), JSON.stringify(profile));
  } catch {
    /* ignore quota */
  }
}

export function getProfile(uid) {
  return readProfile(uid);
}

export function saveProfile(uid, partial) {
  const cur = readProfile(uid);
  const next = { ...cur, ...(partial || {}), _updatedAt: Date.now() };
  writeProfile(uid, next);
  return next;
}


const LS_KEY = "uploadedPuzzles";

// Load uploaded puzzles (if any)
export function getUploadedPuzzles() {
  try {
    const data = localStorage.getItem(LS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// Save puzzle
export function addUploadedPuzzle(puzzle) {
  const existing = getUploadedPuzzles();
  existing.unshift(puzzle); // newest first
  localStorage.setItem(LS_KEY, JSON.stringify(existing));
}
