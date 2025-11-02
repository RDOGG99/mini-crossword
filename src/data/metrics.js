// src/data/metrics.js
import { supabase } from "../lib/supabaseClient";

async function insertEvent(name, meta = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const ymd = meta?.date ?? meta?.ymd ?? new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Vancouver", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date()).replaceAll("/", "-");

    // user_id comes from RLS context; include explicitly for clarity
    const row = { user_id: user?.id ?? null, name, date: ymd, meta };
    const { error } = await supabase.from("events").insert(row);
    if (error) throw error;
  } catch (_) {
    // swallow: metrics are best-effort
  }
}

/** Public API (tiny, stable) */
export const metrics = {
  puzzleLoad: (date, ms) => insertEvent("puzzle_load", { date, ms }),
  progressSave: (date) => insertEvent("progress_save", { date }),
  completion: (date, seconds, errors) => insertEvent("completion", { date, seconds, errors }),
  error: (where, err) =>
    insertEvent("error", { where, message: String(err?.message ?? err), stack: err?.stack }),
};
