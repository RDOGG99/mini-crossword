// src/data/puzzles.js
// Import your puzzles here (Vite supports JSON imports out of the box)
import sample from "./samplePuzzle.json";
import { validatePuzzle } from "./puzzleSchema";


// Map dates (YYYY-MM-DD) to puzzle objects
export const PUZZLES_BY_DATE = {
  "2025-09-26": sample,
  "2025-09-27": sample, // keep or change as needed
};

// Dev-friendly validation pass (warns; does not crash)
(() => {
  try {
    Object.entries(PUZZLES_BY_DATE).forEach(([ymd, puz]) => {
      const { ok, errors } = validatePuzzle(puz);
      if (!ok) {
        console.warn(
          `[puzzles.js] Invalid puzzle for ${ymd}:\n- ` + errors.join("\n- ")
        );
      }
    });
  } catch (e) {
    // If validatePuzzle itself throws, keep dev from white-screening
    console.warn("[puzzles.js] Validation encountered an error:", e);
  }
})();


// Helper: get today in America/Vancouver
export function ymdVancouver(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Vancouver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(d)
    .replaceAll("/", "-"); // e.g., 2025-09-27
}

export function getPuzzleByDate(dateStr) {
  return PUZZLES_BY_DATE[dateStr] ?? null;
}

// ✅ boolean helper for Archive.jsx
export function hasPuzzle(dateStr) {
  return Object.prototype.hasOwnProperty.call(PUZZLES_BY_DATE, dateStr);
}

// Handy for archives/lists
export function listAvailableDates() {
  return Object.keys(PUZZLES_BY_DATE).sort(); // ascending
}

export function getTodayPuzzle() {
  return getPuzzleByDate(ymdVancouver());
}

export { sample };
