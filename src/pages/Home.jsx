import React from "react";
import { Link } from "react-router-dom";
import { getTodayPuzzle, ymdVancouver } from "../data/puzzles";

export default function Home() {
  const today = ymdVancouver();
  const puzzle = getTodayPuzzle();

  return (
    <div style={{ padding: 16 }}>
      <h1>Welcome!</h1>
      {puzzle ? (
        <>
          <p>Today’s puzzle: <strong>{today}</strong></p>
          <p><Link to="/play">Play today’s mini →</Link></p>
        </>
      ) : (
        <>
          <p>No puzzle loaded for <strong>{today}</strong>.</p>
          <p>
            Add an entry for {today} in <code>PUZZLES_BY_DATE</code> in <code>src/data/puzzles.js</code>
            (you can point it to <code>samplePuzzle.json</code> for now).
          </p>
        </>
      )}
    </div>
  );
}
