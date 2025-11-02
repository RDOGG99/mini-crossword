// src/utils/share.js

// ---------- time helpers ----------
function mmss(totalSec = 0) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Resolve the site base URL: env wins; fallback to current origin
function getSiteUrl() {
  const env = (import.meta?.env?.VITE_SITE_URL || "").trim();
  if (env) return env.replace(/\/$/, "");
  if (typeof window !== "undefined" && window.location?.origin)
    return window.location.origin.replace(/\/$/, "");
  return ""; // last resort (tests)
}

/**
 * Build both plain and HTML share payloads.
 * Includes a "Can you beat this time?" link to /play/:ymd.
 */
export function buildSharePayload({
  title = "Mini Crossword",
  ymd,
  elapsedSec = 0,
  didReveal = false,
  stats = null, // { currentStreak?, longestStreak? }
  siteUrl = getSiteUrl(),
}) {
  const timeText = mmss(elapsedSec);
  const revealNote = didReveal ? " (assisted)" : "";

  const url = `${siteUrl}/play/${ymd}`;

  const lines = [
    `${title} — ${ymd}`,
    `Time: ${timeText}${revealNote}`,
  ];

  if (stats && Number.isFinite(stats.currentStreak)) {
    const longest =
      Number.isFinite(stats.longestStreak) ? ` (Longest: ${stats.longestStreak})` : "";
    lines.push(`Streak: ${stats.currentStreak}${longest}`);
  }

  const challengeText = `Can you beat this time? ${url}`;
  const text = `${lines.join("\n")}\n\n${challengeText}`;

  const html = `
    <div>
      <strong>${escapeHtml(title)}</strong> — ${escapeHtml(ymd)}<br/>
      Time: ${escapeHtml(timeText)}${revealNote ? " (assisted)" : ""}<br/>
      ${
        stats && Number.isFinite(stats.currentStreak)
          ? `Streak: ${escapeHtml(String(stats.currentStreak))}${
              Number.isFinite(stats.longestStreak)
                ? ` (Longest: ${escapeHtml(String(stats.longestStreak))})`
                : ""
            }<br/>`
          : ""
      }
      <a href="${url}" target="_blank" rel="noopener noreferrer">Can you beat this time?</a>
    </div>
  `.trim();

  return { text, html, url };
}

/**
 * Copy rich HTML + plain text to clipboard (falls back to text).
 */
export async function copyShare(payload) {
  const { text, html } = payload;
  try {
    if (
      "clipboard" in navigator &&
      "write" in navigator.clipboard &&
      typeof window.ClipboardItem !== "undefined"
    ) {
      const item = new ClipboardItem({
        "text/plain": new Blob([text], { type: "text/plain" }),
        "text/html": new Blob([html], { type: "text/html" }),
      });
      await navigator.clipboard.write([item]);
      return true;
    }
  } catch {
    // ignore; fallback next
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Optional: use the native share sheet on mobile, with graceful fallback.
 */
export async function shareNative(payload) {
  const { text, url } = payload;
  try {
    if (navigator.share) {
      await navigator.share({ text, url });
      return true;
    }
  } catch {
    // ignore; fallback next
  }
  return copyShare(payload);
}

/* -------------------------------------------
 * Backward-compat wrappers (do not break old code)
 * -------------------------------------------
 */

/**
 * Legacy builder -> returns plain text only.
 * Now upgraded to include the challenge link.
 */
export function buildShareText({
  title = "Mini Crossword",
  ymd,
  elapsedSec = 0,
  didReveal = false,
  user,   // kept for signature compatibility; not used
  stats,  // { currentStreak?, longestStreak? }
  siteUrl = getSiteUrl(),
}) {
  const { text } = buildSharePayload({
    title,
    ymd,
    elapsedSec,
    didReveal,
    stats,
    siteUrl,
  });
  return text;
}

/**
 * Legacy copier -> accepts a plain string OR a payload.
 */
export async function copyShareText(arg) {
  if (typeof arg === "string") {
    // Plain string provided
    try {
      await navigator.clipboard.writeText(arg);
      return true;
    } catch {
      return false;
    }
  }
  // If someone calls with { text, html } object, use rich flow
  if (arg && (arg.text || arg.html)) {
    return copyShare(arg);
  }
  // Otherwise nothing to do
  return false;
}
