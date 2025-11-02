// src/pages/Play.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Grid from "../matrix/Grid"; // adjust path if your Grid lives elsewhere
import ErrorState from "../components/ErrorState.jsx";

import { fetchPuzzleByDate } from "../data/api";     // NEW (Phase 5.2)
import { ymdVancouver, formatYmdHuman } from "../utils/dates";
import { metrics } from "../data/metrics";

export default function Play() {
  const params = useParams();
  const nav = useNavigate();

  // If no :ymd provided, play today's puzzle.
  const today = ymdVancouver();
  const ymd = params.ymd || today;

  const [puzzle, setPuzzle] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | error | fallback

  useEffect(() => {
  let alive = true;
  setStatus("loading");

  const t0 = performance.now();

  (async () => {
    try {
      const data = await fetchPuzzleByDate(ymd);
      if (!alive) return;

      if (data) {
        setPuzzle(data);
        setStatus("ready");
        metrics.puzzleLoad(ymd, Math.round(performance.now() - t0)); // ✅ log success
        return;
      }

      // ✅ local fallback when no live puzzle
      try {
        const local = await import("../data/samplePuzzle.json");
        if (!alive) return;
        setPuzzle({
          puzzle_date: ymd,
          title: local.title || `Puzzle — ${formatYmdHuman(ymd)}`,
          size: local.size,
          grid: local.grid,
          clues: local.clues,
          author: local.author || "Local",
        });
        setStatus("fallback");
        metrics.puzzleLoad(ymd, Math.round(performance.now() - t0)); // still log load time
      } catch (e) {
        console.error("Fallback load failed:", e);
        setStatus("error");
        metrics.error("play.fallbackImport", e);
      }
    } catch (error) {
      if (!alive) return;
      console.error(error);
      setStatus("error");
      metrics.error("play.fetchPuzzleByDate", error); // ✅ log error
    }
  })();

  return () => { alive = false; };
}, [ymd]);


  // ⬇️ MOVE HOOKS ABOVE ANY RETURNS
  const humanDate = formatYmdHuman(ymd);
  const normalized = useMemo(() => {
    if (!puzzle) return null;
    return {
      title: puzzle.title || `Puzzle — ${humanDate}`,
      size: puzzle.size,
      grid: puzzle.grid,
      clues: puzzle.clues,
      author: puzzle.author,
    };
  }, [puzzle, humanDate]);
  // ⬆️ HOOKS END

  if (status === "loading") {
    return <main style={{ maxWidth: 720, margin: "0 auto", padding: "1rem" }}>Loading puzzle…</main>;
  }

  if (status === "error") {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "1rem" }}>
        <header style={{ marginBottom: "0.75rem" }}>
          <h1 style={{ margin: 0 }}>Play: {humanDate}</h1>
          <ErrorState
            title="Couldn’t load this puzzle"
            detail={
              <>
                We couldn’t fetch the puzzle for <b>{humanDate}</b>. Try another date in the{" "}
                <button onClick={() => nav("/archive")} style={{ textDecoration: "underline", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                  Archive
                </button>.
              </>
            }
          />
        </header>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1rem" }}>
      <header style={{ marginBottom: "0.75rem" }}>
        <h1 style={{ margin: 0 }}>
          {normalized?.title || `Puzzle — ${humanDate}`}
        </h1>

        {status === "fallback" && (
          <ErrorState
            title="Live puzzle not available"
            detail="Showing a local sample so you can still play."
          />
        )}
      </header>

      {normalized && <Grid puzzle={normalized} />}
    </main>
  );
}

