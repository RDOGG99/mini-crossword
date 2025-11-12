// src/utils/analytics.js
const isDev = import.meta.env.DEV;

// Safe wrapper around gtag
export function track(eventName, params = {}) {
  // Add GA4 recommended shape; never send PII
  const payload = {
    ...params,
    // Helpful defaults
    app_name: "Daily Mini Crossword",
    debug_mode: isDev ? true : undefined, // shows in DebugView while dev
  };

  if (window.gtag) {
    window.gtag("event", eventName, payload);
  } else if (isDev) {
    console.log("[GA4 mock]", eventName, payload);
  }
}

// Convenience helpers
export function trackStarted({ ymd, source = "unknown" }) {
  track("start_puzzle", { puzzle_date: ymd, source });
}

export function trackCompleted({ ymd, elapsed_sec, clean = true }) {
  track("complete_puzzle", {
    puzzle_date: ymd,
    elapsed_sec,
    result: clean ? "clean" : "revealed",
  });
}
