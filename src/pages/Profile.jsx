// src/pages/Profile.jsx
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { listCompletions } from "../data/api";
import { formatYmdHuman } from "../utils/dates";

const secondsToPretty = (s) => {
  if (s == null) return "—";
  const m = Math.floor(s / 60), sec = s % 60;
  return m ? `${m}m ${sec}s` : `${sec}s`;
};

// Compute streaks from a set of YYYY-MM-DD completion dates (Vancouver time)
function computeStreaks(dates) {
  if (!dates?.length) return { current: 0, longest: 0 };
  const done = new Set(dates);
  const ymd = (d) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Vancouver", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(d).replaceAll("/", "-");

  // Walk backwards from the most recent completion for current streak
  const sorted = [...done].sort(); // ascending
  let current = 0, longest = 0;
  // longest streak: scan all runs
  let run = 0, prev = null;
  for (const d of sorted) {
    if (!prev) { run = 1; }
    else {
      const p = new Date(prev + "T00:00:00Z");
      const n = new Date(d + "T00:00:00Z");
      // if d is exactly prev+1 day → continue run
      p.setUTCDate(p.getUTCDate() + 1);
      run = (ymd(p) === d) ? run + 1 : 1;
    }
    longest = Math.max(longest, run);
    prev = d;
  }
  // current streak: count back from latest until a gap
  let d = new Date(sorted.at(-1) + "T00:00:00Z");
  while (done.has(ymd(d))) { current++; d.setUTCDate(d.getUTCDate() - 1); }
  return { current, longest };
}

export default function Profile() {
  const { user, updateName, signOut } = useAuth();
  if (!user) return <div style={{ padding: 16 }}>Please sign in.</div>;

  const [name, setName] = useState(user.name || "");
  const [rows, setRows] = useState([]);   // completions: [{date, seconds, errors, finished_at}]
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try { const data = await listCompletions({ limit: 365 }); if (alive) setRows(data); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  // Derived stats
  const completed = rows.length;
  const played = completed; // If you later log "plays", replace this with that metric
  const best = useMemo(() => rows.reduce((m, r) => (r.seconds != null && r.seconds < m ? r.seconds : m), Infinity), [rows]);
  const avg = useMemo(() => (completed ? Math.round(rows.reduce((a, r) => a + (r.seconds || 0), 0) / completed) : 0), [rows]);
  const { current: streak, longest } = useMemo(
    () => computeStreaks(rows.map((r) => r.date)),
    [rows]
  );
  const recent = useMemo(
    () => rows.slice().sort((a, b) => (a.date > b.date ? -1 : 1)).slice(0, 14),
    [rows]
  );

  const saveDisplayName = (e) => {
    e.preventDefault();
    const next = name.trim();
    if (!next || next === user.name) return;
    // AuthContext already wires profile row upsert in 5.1; this updates auth display name
    updateName(next);
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: 12 }}>Your Profile</h1>

      {/* Identity */}
      <section style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <form onSubmit={saveDisplayName} style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ width: 48, height: 48, borderRadius: 9999, display: "grid", placeItems: "center", border: "1px solid #e5e7eb", fontWeight: 600 }}>
            {(user.name || name || "U")[0]?.toUpperCase() ?? "U"}
          </div>
          <div style={{ flex: "1 1 240px" }}>
            <label style={{ display: "block", fontSize: 12, color: "#6b7280" }}>Display name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6 }}
            />
          </div>
          <button
            type="submit"
            disabled={!name.trim() || name.trim() === user.name}
            style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, background: "#f9fafb" }}
          >
            Save
          </button>
          <button
            type="button"
            onClick={signOut}
            style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, background: "white" }}
          >
            Sign out
          </button>
        </form>
      </section>

      {/* Stats */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12, marginBottom: 16
        }}
      >
        <StatCard label="Played" value={loading ? "…" : played} />
        <StatCard label="Completed" value={loading ? "…" : completed} />
        <StatCard label="Best (5×5)" value={loading ? "…" : secondsToPretty(best === Infinity ? null : best)} />
        <StatCard label="Average" value={loading ? "…" : secondsToPretty(avg || null)} />
        <StatCard label="Streak" value={loading ? "…" : streak} />
        <StatCard label="Longest Streak" value={loading ? "…" : longest} />
      </section>

      {/* Recent completions */}
      <section style={{ margin: "16px 0" }}>
        <h3 style={{ margin: "8px 0 6px" }}>Recent Completions</h3>
        {loading ? (
          <div style={{ color: "#666" }}>Loading…</div>
        ) : recent.length ? (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {recent.map(({ date, seconds }) => (
              <li key={date} style={{ padding: "6px 0", borderBottom: "1px solid #eee" }}>
                <strong>{formatYmdHuman(date)}</strong> — {secondsToPretty(seconds)}
              </li>
            ))}
          </ul>
        ) : (
          <div style={{ color: "#666" }}>No completions yet.</div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 12, color: "#6b7280" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
