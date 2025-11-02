// src/pages/Play.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Grid from "../matrix/Grid";
import ErrorState from "../components/ErrorState.jsx";
import { fetchPuzzleByDate } from "../data/api";
import { ymdVancouver, formatYmdHuman } from "../utils/dates";
import { metrics } from "../data/metrics";

export default function Play() {
  const params = useParams();
  const nav = useNavigate();

  const today = ymdVancouver();
  const ymd = params.ymd || today;

  const [puzzle, setPuzzle] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | error | fallback
  const [gateOpen, setGateOpen] = useState(true);  // 🔒 overlay open -> blur visible

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
          metrics.puzzleLoad(ymd, Math.round(performance.now() - t0));
          return;
        }

        // Fallback to local sample
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
          metrics.puzzleLoad(ymd, Math.round(performance.now() - t0));
        } catch (e) {
          console.error("Fallback load failed:", e);
          setStatus("error");
          metrics.error("play.fallbackImport", e);
        }
      } catch (error) {
        if (!alive) return;
        console.error(error);
        setStatus("error");
        metrics.error("play.fetchPuzzleByDate", error);
      }
    })();

    return () => { alive = false; };
  }, [ymd]);

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
    <div style={{ position: "relative" }}>
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

        {/* Render grid regardless; overlay will blur it */}
        {normalized && <Grid puzzle={normalized} started={!gateOpen} />}
      </main>

      {/* 🔒 Blur overlay that shows YOUR existing modal content */}
      {normalized && gateOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Blur + dim */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.40)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
            }}
          />

          {/* === YOUR EXISTING MODAL CONTENT GOES HERE === */}
          <div
            style={{
              position: "relative",
              zIndex: 1,
              width: 360,
              background: "#fff",
              borderRadius: 16,
              padding: 20,
              textAlign: "left",
              boxShadow: "0 20px 50px rgba(0,0,0,.25)",
            }}
          >
            {/* Example that matches your screenshot — replace as needed */}
            <h3 style={{ margin: "0 0 4px 0", fontSize: 18, fontWeight: 700 }}>Animal Mini</h3>
            <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 12 }}>{humanDate}</div>

            <button
              onClick={() => nav("/auth")} // or your sign-in flow; optional
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                background: "#f8fafc",
                cursor: "pointer",
                marginBottom: 12,
              }}
            >
              Sign in / Create account
            </button>

            <button
              onClick={() => setGateOpen(false)}   // ✅ closes overlay, keeps same page, removes blur
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 10,
                background: "#2563eb",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Play
            </button>
          </div>
          {/* === END YOUR MODAL CONTENT === */}
        </div>
      )}
    </div>
  );
}
