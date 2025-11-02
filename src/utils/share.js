// src/utils/share.js
import { ymdVancouver } from "../data/puzzles";

// Local copy of the tiny time formatter
function formatElapsed(total) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

/**
 * Build a shareable text summary for the finished puzzle.
 * @param {Object} opts
 * @param {number} opts.elapsedSec
 * @param {boolean} opts.didReveal
 * @param {Object|null} opts.user
 * @param {Object|null} opts.stats
 * @param {string} [opts.ymd]
 */
export function buildShareText({ elapsedSec, didReveal, user, stats, ymd }) {
  const date = ymd || ymdVancouver();
  const time = formatElapsed(elapsedSec);
  const streak =
    user && stats && typeof stats.currentStreak === "number"
      ? ` • Streak: ${stats.currentStreak}`
      : "";
  const assisted = didReveal ? " *assisted" : "";

  return `Mini Crossword — ${date}\nTime: ${time}${streak}${assisted}`;
}

export async function copyShareText(text) {
  try {
    await navigator.clipboard.writeText(text);
    alert("✅ Copied to clipboard!");
  } catch {
    alert("⚠️ Couldn't copy text — please copy manually.");
  }
}
