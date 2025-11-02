// src/pages/Archive.jsx
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { listAvailableDates } from "../data/api";
import { formatYmdHuman } from "../utils/dates";
import { getUploadedPuzzles } from "../data/store";


export default function Archive() {
  const nav = useNavigate();
  const [dates, setDates] = React.useState(null); // array of 'YYYY-MM-DD'

  // Fetch available dates from the backend
React.useEffect(() => {
  let alive = true;
  (async () => {
    const d = await listAvailableDates(120);
    if (!alive) return;

    // merge admin-uploaded puzzles
    const uploads = getUploadedPuzzles().map((p) => ({
      ymd: "uploaded-" + p.title,
      title: p.title + " (uploaded)",
    }));

    setDates([...uploads, ...d]);
  })();

  return () => {
    alive = false;
  };
}, []);


  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: 16 }}>
      <h1 style={{ margin: "0 0 12px" }}>Archive</h1>

      {!dates ? (
        <div>Loading…</div>
      ) : dates.length === 0 ? (
        <div>No puzzles yet.</div>
      ) : (
        <ul style={{ lineHeight: 1.8, paddingLeft: 0 }}>
          {dates.map((d) => (
            <li
              key={d}
              style={{
                listStyle: "none",
                padding: "6px 0",
                borderBottom: "1px solid #eee",
              }}
            >
              <Link to={`/play/${d}`} style={{ textDecoration: "none" }}>
                <div style={{ fontWeight: 600 }}>{formatYmdHuman(d)}</div>
                <div style={{ opacity: 0.7, fontSize: 12 }}>{d}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
