import React from "react";
import { fetchPuzzleByDate } from "../data/api";

export default function Dev() {
  async function testFetch() {
    const data = await fetchPuzzleByDate("2025-10-01"); // match your seed date
    console.log("Supabase puzzle:", data);
    alert(data ? `Loaded: ${data.title}` : "No puzzle returned");
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Dev Utilities</h1>
      <p>Click to test Supabase connection and puzzle fetch.</p>
      <button onClick={testFetch}>Test Puzzle Fetch</button>
    </div>
  );
}
