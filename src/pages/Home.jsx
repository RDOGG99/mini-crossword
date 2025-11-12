// src/pages/Home.jsx
import React from "react";
import { Link } from "react-router-dom";
import { getTodayPuzzle, ymdVancouver } from "../data/puzzles";
import { trackStarted } from "../utils/analytics"; // ✅ add this

export default function Home() {
  const today = ymdVancouver();
  const puzzle = getTodayPuzzle();

  const handleStartPlay = () => {
    // fire once per day per browser (so refreshes don't inflate)
    const key = `started-${today}`;
    if (!localStorage.getItem(key)) {
      trackStarted({ ymd: today, source: "home_play_link" });
      localStorage.setItem(key, "1");
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h1>Welcome!</h1>
      {puzzle ? (
        <>
          <p>
            Today’s puzzle: <strong>{today}</strong>
          </p>
          <p>
            <Link to="/play" onClick={handleStartPlay}>
              Play today’s mini →
            </Link>
          </p>
        </>
      ) : (
        <>
          <p>
            No puzzle loaded for <strong>{today}</strong>.
          </p>
          <p>
            Add an entry for {today} in <code>PUZZLES_BY_DATE</code> in{" "}
            <code>src/data/puzzles.js</code> (you can point it to{" "}
            <code>samplePuzzle.json</code> for now).
          </p>
        </>
      )}
    </div>
  );
}
