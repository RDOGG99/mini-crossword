// src/matrix/Grid.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import Cell from "./Cell";
import ClueList from "./ClueList";
import { computeNumbering } from "./numbering";
import { useAuth } from "../auth/AuthContext";
import { bumpPlayed, getUserStats } from "../data/store";
import { buildShareText, copyShareText } from "../utils/share";
import {
  saveProgress,
  loadProgress,
  recordCompletion as recordCompletionAPI,
  flushPending,
} from "../data/api";
import { ymdVancouver } from "../utils/dates";
import { metrics } from "../data/metrics";

// ---- small debounce
function useDebounced(fn, ms) {
  const t = useRef();
  return (...args) => {
    clearTimeout(t.current);
    t.current = setTimeout(() => fn(...args), ms);
  };
}

// ---- time formatting
const formatElapsed = (total) => {
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
};

function formatLongDate(ymd) {
  const [Y, M, D] = (ymd || "").split("-").map((n) => parseInt(n, 10));
  const d = Y && M && D ? new Date(Y, M - 1, D) : new Date();
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

// 👇 Accept a parent-controlled `started` (from Play.jsx). If omitted, fall back to internal state.
export default function Grid({ puzzle, started: startedFromParent = undefined }) {
  if (!puzzle || !puzzle.grid) return <div style={{ padding: 12 }}>Loading puzzle…</div>;

  const { user } = useAuth();
  const SIZE = puzzle?.size || puzzle?.grid?.length || 5;
  const date = puzzle?.puzzle_date || puzzle?.date || ymdVancouver();

  // once-only guards
  const hasBumpedPlayed = useRef(false);
  const finishedRef = useRef(false);
  const everIncorrect = useRef(new Set());

  // helpers
  const makeMatrix = (fill) => [...Array(SIZE)].map(() => Array(SIZE).fill(fill));
  const clone = (m) => m.map((row) => row.slice());
  const norm = (ch) => (ch || "").toUpperCase().trim();

  // state
  const emptyEntries = useMemo(() => makeMatrix(""), [SIZE]);
  const emptyFeedback = useMemo(() => makeMatrix(null), [SIZE]);
  const emptyRevealed = useMemo(() => makeMatrix(false), [SIZE]);
  const emptyLocked = useMemo(() => makeMatrix(false), [SIZE]);

  const [entries, setEntries] = useState(emptyEntries);
  const [feedback, setFeedback] = useState(emptyFeedback);
  const [revealed, setRevealed] = useState(emptyRevealed);
  const [locked, setLocked] = useState(emptyLocked);

  const [isSolved, setIsSolved] = useState(false);

  // NOTE: internal started exists for legacy flows; parent prop takes precedence
  const [started, setStarted] = useState(false);
  const startedEffective = (startedFromParent !== undefined) ? startedFromParent : started;

  const [showFinishModal, setShowFinishModal] = useState(false);
  const [finishStats, setFinishStats] = useState(null);
  const [finishMeta, setFinishMeta] = useState(null);

  // timer
  const [elapsedSec, setElapsedSec] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const isPaused = !timerRunning;
  const handlePauseToggle = () => setTimerRunning((v) => !v);

  // Auto-start timer when parent opens the game
  useEffect(() => {
    if (startedFromParent && !timerRunning && !isSolved) {
      setTimerRunning(true);
    }
  }, [startedFromParent, timerRunning, isSolved]);

  // numbering/maps
  const { across, down, cellToAcross, cellToDown } = useMemo(
    () => computeNumbering(puzzle.grid),
    [puzzle.grid]
  );

  const acrossWithText = useMemo(
    () => across.map((cl) => ({ ...cl, text: puzzle?.clues?.across?.[String(cl.num)] || null })),
    [across, puzzle?.clues?.across]
  );

  const downWithText = useMemo(
    () => down.map((cl) => ({ ...cl, text: puzzle?.clues?.down?.[String(cl.num)] || null })),
    [down, puzzle?.clues?.down]
  );

  const cornerNumbers = useMemo(() => {
    const map = new Map();
    for (const cl of across) map.set(`${cl.start[0]}-${cl.start[1]}`, cl.num);
    for (const cl of down) map.set(`${cl.start[0]}-${cl.start[1]}`, cl.num);
    return map;
  }, [across, down]);

  const linearClues = useMemo(() => {
    const a = acrossWithText.map((cl) => ({ dir: "across", num: cl.num, start: cl.start }));
    const d = downWithText.map((cl) => ({ dir: "down", num: cl.num, start: cl.start }));
    return [...a, ...d];
  }, [acrossWithText, downWithText]);

  const firstPlayable = useMemo(() => {
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++) if (puzzle.grid[r][c] !== "#") return [r, c];
    return [0, 0];
  }, [SIZE, puzzle.grid]);

  const [activeCell, setActiveCell] = useState(firstPlayable);
  const [direction, setDirection] = useState("across");
  const [showMistakes] = useState(false);
  const [navSkipsFilled] = useState(true);

  const hasAnyInput = useMemo(
    () => entries.some((row) => row.some((ch) => (ch ?? "").trim() !== "")),
    [entries]
  );
  const hasProgress = hasAnyInput || elapsedSec > 0;

  // bump 'played' once
  useEffect(() => {
    if (!user || hasBumpedPlayed.current) return;
    if (hasAnyInput) {
      bumpPlayed(user.id);
      hasBumpedPlayed.current = true;
    }
  }, [hasAnyInput, user]);

  // reset when puzzle changes
  useEffect(() => {
    setEntries(emptyEntries);
    setFeedback(emptyFeedback);
    setRevealed(emptyRevealed);
    setLocked(emptyLocked);
    setIsSolved(false);
    setActiveCell(firstPlayable);
    setDirection("across");
    setElapsedSec(0);
    setTimerRunning(false);
    setShowFinishModal(false);
    setStarted(false);
    hasBumpedPlayed.current = false;
    everIncorrect.current = new Set();
    finishedRef.current = false;
  }, [emptyEntries, emptyFeedback, emptyRevealed, emptyLocked, firstPlayable, puzzle?.grid]);

  // load saved progress
  useEffect(() => {
    let alive = true;
    (async () => {
      const saved = await loadProgress(date);
      if (!alive || !saved) return;
      if (saved.entries) setEntries(saved.entries);
      if (Number.isFinite(saved.seconds)) setElapsedSec(saved.seconds);
      setTimerRunning(false);
      setStarted(false);
    })();
    return () => {
      alive = false;
    };
  }, [date]);

  // debounced save on edits
  const debouncedSave = useDebounced((payload) => {
    saveProgress(date, payload).catch(() => {});
  }, 800);

  useEffect(() => {
    debouncedSave({ entries, seconds: elapsedSec });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries]);

  // timer tick + periodic save
  useEffect(() => {
    if (!timerRunning || !startedEffective) return;
    const id = setInterval(() => {
      if (finishedRef.current) return;
      setElapsedSec((t) => {
        const next = t + 1;
        if (next % 10 === 0) {
          saveProgress(date, { entries, seconds: next }).catch(() => {});
          if (navigator.onLine) flushPending().catch(() => {});
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timerRunning, startedEffective, date, entries]);

  // movement helpers
  const isInBounds = (r, c) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;
  const isBlock = (r, c) => puzzle.grid[r][c] === "#";
  const delta = direction === "across" ? [0, 1] : [1, 0];

  const step = (r, c, dr, dc) => {
    let nr = r + dr, nc = c + dc;
    while (isInBounds(nr, nc) && isBlock(nr, nc)) {
      nr += dr; nc += dc;
    }
    return isInBounds(nr, nc) ? [nr, nc] : [r, c];
  };

  const stepBackwardEditable = (r, c, dr, dc) => {
    let nr = r - dr, nc = c - dc;
    while (isInBounds(nr, nc) && (isBlock(nr, nc) || locked[nr][nc])) {
      nr -= dr; nc -= dc;
    }
    return isInBounds(nr, nc) ? [nr, nc] : [r, c];
  };

  const stepForwardSmart = (r, c, dr, dc) => {
    let nr = r + dr, nc = c + dc;
    while (isInBounds(nr, nc) && (isBlock(nr, nc) || locked[nr][nc] || entries[nr][nc])) {
      nr += dr; nc += dc;
    }
    return isInBounds(nr, nc) ? [nr, nc] : [r, c];
  };

  const stepBackwardSmart = (r, c, dr, dc) => {
    let nr = r - dr, nc = c - dc;
    while (isInBounds(nr, nc) && (isBlock(nr, nc) || locked[nr][nc] || entries[nr][nc])) {
      nr -= dr; nc -= dc;
    }
    return isInBounds(nr, nc) ? [nr, nc] : [r, c];
  };

  // current clue + sets
  const currentClue = useMemo(() => {
    const [r, c] = activeCell;
    if (isBlock(r, c)) return null;
    if (direction === "across") {
      const idx = cellToAcross[r][c];
      return idx != null ? acrossWithText[idx] : null;
    } else {
      const idx = cellToDown[r][c];
      return idx != null ? downWithText[idx] : null;
    }
  }, [activeCell, direction, cellToAcross, cellToDown, acrossWithText, downWithText]);

  const currentCellSet = useMemo(() => {
    if (!currentClue) return new Set();
    return new Set(currentClue.cells.map(([rr, cc]) => `${rr}-${cc}`));
  }, [currentClue]);

  // clue navigation helpers...
  const jumpToClueByIndex = (index) => {
    if (!linearClues.length) return;
    const i = ((index % linearClues.length) + linearClues.length) % linearClues.length;
    const next = linearClues[i];
    setDirection(next.dir);
    setActiveCell(next.start);
  };

  const getCurrentLinearIndex = () => {
    if (!linearClues.length) return -1;
    if (currentClue) {
      const found = linearClues.findIndex((c) => c.dir === direction && c.num === currentClue.num);
      if (found !== -1) return found;
    }
    const [r, c] = activeCell;
    return linearClues.findIndex((cl) => cl.start[0] === r && cl.start[1] === c);
  };

  // ---- Dropdown menus: refs + close behavior
  const checkRef = useRef(null);
  const clearRef = useRef(null);
  const revealRef = useRef(null);
  const allMenuRefs = [checkRef, clearRef, revealRef];

  const closeAllMenus = () => {
    allMenuRefs.forEach((ref) => {
      if (ref.current && ref.current.hasAttribute("open")) {
        ref.current.removeAttribute("open");
      }
    });
  };

  useEffect(() => {
    function onDocPointerDown(e) {
      // Close if click happens outside any <details> menu
      const inside = allMenuRefs.some((ref) => ref.current && ref.current.contains(e.target));
      if (!inside) closeAllMenus();
    }
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // events
  const handleClick = (r, c) => {
    closeAllMenus();
    if (activeCell[0] === r && activeCell[1] === c) {
      setDirection((d) => (d === "across" ? "down" : "across"));
    } else {
      setActiveCell([r, c]);
    }
  };

  const clearCellFeedbackAt = (r, c) => {
    setFeedback((prev) => {
      if (prev[r][c] == null) return prev;
      const next = clone(prev);
      next[r][c] = null;
      return next;
    });
  };

  const softMarkCell = (r, c) => {
    if (!showMistakes || isBlock(r, c)) return;
    const correct = norm(puzzle.grid[r][c]);
    const guess = norm(entries[r][c]);
    setFeedback((prev) => {
      const next = clone(prev);
      next[r][c] = guess && guess !== correct ? "incorrect" : null;
      return next;
    });
  };

  // ---- Place a char then advance (used by both keyboard + mobile)
  const placeCharAndAdvance = (r, c, rawCh) => {
    if (isPaused || locked[r][c]) return; // pause blocks input
    const ch = norm(rawCh).slice(-1).replace(/[^A-Z]/g, "");
    if (!ch) return;

    // Start timer if this is the first user action
    if (!startedEffective && !isSolved) {
      setStarted(true);
      setTimerRunning(true);
    }

    const [dr, dc] = direction === "across" ? [0, 1] : [1, 0];

    setEntries((prev) => {
      const copy = clone(prev);
      copy[r][c] = ch;
      return copy;
    });
    clearCellFeedbackAt(r, c);
    requestAnimationFrame(() => softMarkCell(r, c));

    const [nr, nc] = stepForwardSmart(r, c, dr, dc);
    setActiveCell([nr, nc]);
  };

  // Mobile-friendly onChange path from <Cell />
  const handleChange = (r, c, raw) => {
    // Use unified helper so phones auto-advance
    placeCharAndAdvance(r, c, raw);
  };

  // lock words when solved
  function lockSolvedWords() {
    const next = clone(locked);
    let changed = false;
    const isCellCorrect = (r, c) =>
      puzzle.grid[r][c] !== "#" && norm(entries[r][c]) === norm(puzzle.grid[r][c]);
    const markIfSolved = (cl) => {
      const solved = cl.cells.every(([rr, cc]) => isCellCorrect(rr, cc));
      if (solved) {
        for (const [rr, cc] of cl.cells) {
          if (!next[rr][cc]) {
            next[rr][cc] = true;
            changed = true;
          }
        }
      }
    };
    across.forEach(markIfSolved);
    down.forEach(markIfSolved);
    if (changed) setLocked(next);
  }

  // checks (square/word/puzzle) ...
  function checkSquare(r, c, { autoFadeMs = 1200 } = {}) {
    if (isBlock(r, c)) return;
    const correct = norm(puzzle.grid[r][c]);
    const guess = norm(entries[r][c]);
    if (guess && guess !== correct) everIncorrect.current.add(`${r}-${c}`);
    setFeedback((prev) => {
      const copy = clone(prev);
      copy[r][c] = guess && guess === correct ? "correct" : "incorrect";
      return copy;
    });
    if (autoFadeMs != null) {
      setTimeout(() => {
        setFeedback((prev) => {
          const copy = clone(prev);
          if (copy[r][c] === "incorrect") copy[r][c] = null;
          return copy;
        });
      }, autoFadeMs);
    }
    lockSolvedWords();
    closeAllMenus();
  }

  function checkWord({ treatEmptyAsIncorrect = false } = {}) {
    if (!currentClue) return;
    const next = clone(feedback);
    for (const [r, c] of currentClue.cells) {
      if (isBlock(r, c)) {
        next[r][c] = null;
        continue;
      }
      const correct = norm(puzzle.grid[r][c]);
      const guess = norm(entries[r][c]);
      next[r][c] = !guess
        ? treatEmptyAsIncorrect
          ? "incorrect"
          : null
        : guess === correct
        ? "correct"
        : "incorrect";
      if (next[r][c] === "incorrect") everIncorrect.current.add(`${r}-${c}`);
    }
    setFeedback(next);
    lockSolvedWords();

    const solved = puzzle.grid.every((row, rr) =>
      row.every((cell, cc) => cell === "#" || norm(entries[rr][cc]) === norm(cell))
    );
    setIsSolved(solved);
    closeAllMenus();
  }

  function checkPuzzle({ treatEmptyAsIncorrect = false } = {}) {
    const next = puzzle.grid.map((row, r) =>
      row.map((cell, c) => {
        if (cell === "#") return null;
        const correct = norm(cell);
        const guess = norm(entries[r][c]);
        if (!guess) {
          if (treatEmptyAsIncorrect) everIncorrect.current.add(`${r}-${c}`);
          return treatEmptyAsIncorrect ? "incorrect" : null;
        }
        const mark = guess === correct ? "correct" : "incorrect";
        if (mark === "incorrect") everIncorrect.current.add(`${r}-${c}`);
        return mark;
      })
    );
    setFeedback(next);
    lockSolvedWords();
    const solved = next.every((row, r) =>
      row.every((f, c) => puzzle.grid[r][c] === "#" || f === "correct")
    );
    setIsSolved(solved);
    closeAllMenus();
  }

  // reveal / clear helpers ...
  const revealCells = (cells) => {
    const nextEntries = clone(entries);
    const nextFeedback = clone(feedback);
    const nextRevealed = clone(revealed);
    for (const [r, c] of cells) {
      if (puzzle.grid[r][c] === "#") continue;
      const correct = norm(puzzle.grid[r][c]);
      nextEntries[r][c] = correct;
      nextFeedback[r][c] = "correct";
      nextRevealed[r][c] = true;
    }
    setEntries(nextEntries);
    setFeedback(nextFeedback);
    setRevealed(nextRevealed);

    const solved = puzzle.grid.every((row, rr) =>
      row.every((cell, cc) => cell === "#" || norm(nextEntries[rr][cc]) === norm(cell))
    );
    setIsSolved(solved);
    closeAllMenus();
  };

  const revealSquare = (r, c, { advance = true } = {}) => {
    revealCells([[r, c]]);
    if (advance) {
      const [dr, dc] = delta;
      const [nr, nc] = step(r, c, dr, dc);
      setActiveCell([nr, nc]);
    }
  };
  const revealWord = () => currentClue && revealCells(currentClue.cells);
  const revealPuzzle = () => {
    const cells = [];
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++) if (puzzle.grid[r][c] !== "#") cells.push([r, c]);
    revealCells(cells);
  };

  const clearCells = (cells, { includeRevealed = false, clearMarks = true } = {}) => {
    const nextEntries = clone(entries);
    const nextFeedback = clone(feedback);
    for (const [r, c] of cells) {
      if (puzzle.grid[r][c] === "#") continue;
      if (!includeRevealed && revealed[r][c]) continue;
      nextEntries[r][c] = "";
      if (clearMarks) nextFeedback[r][c] = null;
    }
    setEntries(nextEntries);
    setFeedback(nextFeedback);
    setIsSolved(false);
    closeAllMenus();
  };

  const clearSquare = (r, c, opts) => clearCells([[r, c]], opts);
  const clearWord = (opts) => currentClue && clearCells(currentClue.cells, opts);
  const clearPuzzle = (opts) => {
    const cells = [];
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++) if (puzzle.grid[r][c] !== "#") cells.push([r, c]);
    clearCells(cells, opts);
  };

  // full reset
  function resetAll() {
    setEntries(emptyEntries);
    setFeedback(emptyFeedback);
    setRevealed(emptyRevealed);
    setLocked(emptyLocked);
    setIsSolved(false);
    setActiveCell(firstPlayable);
    setDirection("across");
    setElapsedSec(0);
    setTimerRunning(false);
    setShowFinishModal(false);
    setStarted(false);
    hasBumpedPlayed.current = false;
    everIncorrect.current = new Set();
    finishedRef.current = false;
  }

  // auto-finish
  useEffect(() => {
    const solved = puzzle.grid.every((row, r) =>
      row.every((cell, c) => cell === "#" || norm(entries[r][c]) === norm(cell))
    );
    if (solved && !isSolved) setIsSolved(true);
  }, [entries, puzzle.grid, isSolved]);

  // when solved: save + modal + metrics + confetti trigger
  useEffect(() => {
    if (!isSolved) return;
    setTimerRunning(false);
    finishedRef.current = true;
    setShowFinishModal(true);

    setLocked((prev) => {
      const next = clone(prev);
      for (let r = 0; r < SIZE; r++)
        for (let c = 0; c < SIZE; c++) if (puzzle.grid[r][c] !== "#") next[r][c] = true;
      return next;
    });

    (async () => {
      try {
        await saveProgress(date, { entries, seconds: elapsedSec });
        const didReveal = revealed.some((row) => row.some(Boolean));
        const errors = didReveal ? null : everIncorrect.current.size;
        await recordCompletionAPI(date, {
          seconds: elapsedSec,
          errors: didReveal ? null : errors,
        });
        metrics.completion(date, elapsedSec, didReveal ? null : errors);

        try {
          const stats = await getUserStats?.(user?.id);
          if (stats) setFinishStats(stats);
        } catch {
          /* ignore */
        }
      } catch (e) {
        console.warn("Completion save error", e);
        metrics.error("grid.recordCompletion", e);
      }
    })();
  }, [isSolved, SIZE, puzzle.grid, date, entries, elapsedSec, revealed, user]);

  // confetti
  const didConfetti = useRef(false);
  useEffect(() => {
    if (isSolved && !didConfetti.current) {
      didConfetti.current = true;
      requestAnimationFrame(() => launchEmojiConfetti(90));
    }
    if (!isSolved) didConfetti.current = false;
  }, [isSolved]);

  // keyboard
  useEffect(() => {
    const onKeyDown = (e) => {
      // Close menus on any key press that isn't modifier-only
      if (!e.altKey && !e.ctrlKey && !e.metaKey) closeAllMenus();

      const [r, c] = activeCell;
      const [dr, dc] = direction === "across" ? [0, 1] : [1, 0];

      // pause/resume
      if (e.altKey && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        setTimerRunning((v) => !v);
        return;
      }

      if (isBlock(r, c)) {
        if (e.key === "Tab") e.preventDefault();
        return;
      }

      // If paused, block letter/backspace/navigation that edits
      const editingKey =
        /^[a-z]$/i.test(e.key) ||
        e.key === "Backspace";
      if (isPaused && editingKey) {
        e.preventDefault();
        return;
      }

      // combos
      const cmdOrCtrl = e.metaKey || e.ctrlKey;
      if (cmdOrCtrl && e.shiftKey && e.key === "Enter") {
        e.preventDefault();
        checkWord();
        return;
      }
      if (cmdOrCtrl && e.key === "Enter") {
        e.preventDefault();
        checkSquare(r, c);
        return;
      }
      if (e.shiftKey && e.key === "Enter") {
        e.preventDefault();
        checkPuzzle();
        return;
      }

      // reveal
      if (e.altKey && !e.shiftKey && e.key === "Enter") {
        e.preventDefault();
        revealSquare(r, c);
        return;
      }
      if (e.altKey && e.shiftKey && e.key === "Enter") {
        e.preventDefault();
        revealWord();
        return;
      }

      // clear
      if (e.altKey && !e.shiftKey && e.key === "Backspace") {
        e.preventDefault();
        clearSquare(r, c);
        return;
      }
      if (cmdOrCtrl && e.key === "Backspace") {
        e.preventDefault();
        clearWord();
        return;
      }
      if (e.altKey && e.shiftKey && e.key === "Backspace") {
        e.preventDefault();
        clearPuzzle();
        return;
      }
      if (
        e.altKey &&
        !cmdOrCtrl &&
        !e.metaKey &&
        !e.shiftKey &&
        (e.key === "r" || e.key === "R")
      ) {
        e.preventDefault();
        resetAll();
        return;
      }

      // tab between clues
      if (e.key === "Tab") {
        e.preventDefault();
        const cur = getCurrentLinearIndex();
        const deltaIdx = e.shiftKey ? -1 : 1;
        jumpToClueByIndex(cur === -1 ? 0 : cur + deltaIdx);
        return;
      }

      // toggle direction
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setDirection((d) => (d === "across" ? "down" : "across"));
        return;
      }

      // arrows
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setActiveCell(navSkipsFilled ? stepBackwardSmart(r, c, 0, 1) : step(r, c, 0, -1));
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setActiveCell(navSkipsFilled ? stepForwardSmart(r, c, 0, 1) : step(r, c, 0, 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveCell(navSkipsFilled ? stepBackwardSmart(r, c, 1, 0) : step(r, c, -1, 0));
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveCell(navSkipsFilled ? stepForwardSmart(r, c, 1, 0) : step(r, c, 1, 0));
        return;
      }

      // backspace
      if (e.key === "Backspace") {
        e.preventDefault();
        if (locked[r][c]) return;
        setEntries((prev) => {
          const copy = clone(prev);
          if (copy[r][c]) {
            copy[r][c] = "";
            clearCellFeedbackAt(r, c);
          } else {
            const [pr, pc] = stepBackwardEditable(r, c, dr, dc);
            if (!locked[pr][pc]) {
              copy[pr][pc] = "";
              clearCellFeedbackAt(pr, pc);
              setActiveCell([pr, pc]);
            }
          }
          return copy;
        });
        return;
      }

      // letters
      if (/^[a-z]$/i.test(e.key)) {
        e.preventDefault();
        if (locked[r][c]) {
          const [nr, nc] = stepForwardSmart(r, c, dr, dc);
          setActiveCell([nr, nc]);
          return;
        }
        // Ensure timer starts on first input if not already started
        if (!startedEffective && !isSolved) {
          setStarted(true);
          setTimerRunning(true);
        }
        placeCharAndAdvance(r, c, e.key);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    activeCell,
    direction,
    SIZE,
    linearClues,
    locked,
    entries,
    navSkipsFilled,
    isPaused,
    startedEffective,
    isSolved,
  ]);

  const handleSelectClue = (dir, num) => {
    closeAllMenus();
    const list = dir === "across" ? acrossWithText : downWithText;
    const found = list.find((cl) => cl.num === num);
    if (!found) return;
    setDirection(dir);
    setActiveCell(found.start);
  };

  // ---------- Render ----------
  return (
    <main className="page-wrap" style={{ padding: 12 }}>
      {/* Toolbar (centered) */}
      <div className="top-center">
        <div
          className="toolbar"
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 8,
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <details ref={checkRef} className="menu">
            <summary className="menu-trigger">Check ▾</summary>
            <div className="menu-list" role="menu" onMouseDown={(e) => e.stopPropagation()}>
              <button type="button" className="menu-item" onClick={() => checkSquare(activeCell[0], activeCell[1])}>
                Check Square (⌘/Ctrl + Enter)
              </button>
              <button type="button" className="menu-item" onClick={() => checkWord()}>
                Check Word (⌘/Ctrl + Shift + Enter)
              </button>
              <button type="button" className="menu-item" onClick={() => checkPuzzle()}>
                Check Puzzle (Shift + Enter)
              </button>
            </div>
          </details>

          <details ref={clearRef} className="menu">
            <summary className="menu-trigger">Clear ▾</summary>
            <div className="menu-list" role="menu" onMouseDown={(e) => e.stopPropagation()}>
              <button type="button" className="menu-item" onClick={() => clearSquare(activeCell[0], activeCell[1])}>
                Clear Square (⌥/Alt + Backspace)
              </button>
              <button type="button" className="menu-item" onClick={() => clearWord()}>
                Clear Word (⌘/Ctrl + Backspace)
              </button>
              <button type="button" className="menu-item" onClick={() => clearPuzzle()}>
                Clear Puzzle (⌥/Alt + Shift + Backspace)
              </button>
            </div>
          </details>

          <details ref={revealRef} className="menu">
            <summary className="menu-trigger">Reveal ▾</summary>
            <div className="menu-list" role="menu" onMouseDown={(e) => e.stopPropagation()}>
              <button type="button" className="menu-item" onClick={() => revealSquare(activeCell[0], activeCell[1])}>
                Reveal Square (⌥/Alt + Enter)
              </button>
              <button type="button" className="menu-item" onClick={() => revealWord()}>
                Reveal Word (⌥/Alt + Shift + Enter)
              </button>
              <button type="button" className="menu-item" onClick={() => revealPuzzle()}>
                Reveal Puzzle
              </button>
            </div>
          </details>

          <button type="button" onClick={() => { closeAllMenus(); resetAll(); }}>Reset All (⌥/Alt + R)</button>
        </div>
      </div>

      {/* Timer (centered) */}
      <div className="top-center">
        <div
          className="timer-row"
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 8,
            margin: "6px 0",
          }}
        >
          <div className="timer" aria-live="polite" aria-atomic="true" style={{ fontWeight: 700 }}>
            {formatElapsed(elapsedSec)} {!timerRunning ? " (Paused)" : ""}
          </div>
          <button
            type="button"
            className="btn secondary"
            onClick={() => { closeAllMenus(); handlePauseToggle(); }}
            aria-pressed={!timerRunning}
            title="Pause/Resume (⌥/Alt + P)"
            disabled={isSolved || !startedEffective}
          >
            {timerRunning ? "Pause" : "Resume"}
          </button>
        </div>
      </div>

      {/* Current clue bar (centered) */}
      {currentClue && (
        <div className="top-center">
          <div className="current-clue-bar" role="status" aria-live="polite" style={{ textAlign: "center", marginBottom: 8 }}>
            <span className="num">{currentClue.num} {direction === "across" ? "Across" : "Down"}</span>{" "}
            | <span className="txt">{currentClue.text || "(no clue text)"}</span>
          </div>
        </div>
      )}

      {/* Solved banner (centered) */}
      {isSolved && (
        <div className="top-center">
          <div
            className="banner-solved"
            role="status"
            aria-live="polite"
            style={{
              margin: "8px auto 12px",
              padding: "10px 12px",
              borderRadius: 8,
              background: "#e8f9ed",
              border: "1px solid #b6e7c3",
              fontWeight: 600,
              textAlign: "center",
              maxWidth: 640,
            }}
          >
            🎉 Congratulations — All correct!
          </div>
        </div>
      )}

      {/* Centered two-column layout */}
      <section className="play-flex">
        {/* Board */}
        <div className="board-wrap">
<div
  className="grid"
  role="grid"
  aria-label="crossword grid"
  aria-disabled={!startedEffective}
  style={{ width: "fit-content" }}
>

            {puzzle.grid.map((row, r) => (
              <div key={r} className="row" role="row">
                {row.map((cell, c) => {
                  const inAnswer = currentCellSet.has(`${r}-${c}`);
                  const [ar, ac] = activeCell;
                  const inBand = direction === "across" ? r === ar : c === ac;
                  return (
                    <Cell
                      key={`${r}-${c}`}
                      row={r}
                      col={c}
                      isBlock={cell === "#"}
                      value={entries[r][c]}
                      feedback={feedback[r][c]}
                      isActive={activeCell[0] === r && activeCell[1] === c}
                      inAnswer={inAnswer}
                      inBand={inBand}
                      cornerNumber={cornerNumbers.get(`${r}-${c}`) || null}
                      isRevealed={revealed[r][c]}
                      locked={locked[r][c]}
                      onClick={(...args) => { closeAllMenus(); handleClick(...args); }}
                      onChange={(ch) => handleChange(r, c, ch)}  // mobile: auto-advance
                      onContextMenu={(e) => {
                        e.preventDefault();
                        checkSquare(r, c);
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Clues */}
        <aside className="clues-wrap">
          <ClueList
            across={acrossWithText}
            down={downWithText}
            currentDirection={direction}
            currentNum={currentClue?.num ?? null}
            onSelectClue={handleSelectClue}
          />
        </aside>
      </section>

      {/* Finish modal */}
      {showFinishModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Puzzle finished"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onPointerDown={(e) => {
            // Clicking the dim scrim closes the modal
            if (e.target === e.currentTarget) setShowFinishModal(false);
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 20,
              minWidth: 280,
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
              textAlign: "center",
            }}
          >
            <h2 style={{ margin: 0, marginBottom: 8 }}>🎉 All Correct!</h2>
            <p style={{ marginTop: 0, marginBottom: 8 }}>
              Time: <strong>{formatElapsed(elapsedSec)}</strong>
            </p>
            <p style={{ margin: "8px 0", fontWeight: 500 }}>Share your results or challenge a friend 👇</p>

            {revealed.some((row) => row.some(Boolean)) && (
              <p style={{ margin: "4px 0", color: "#b45309" }}>⚠️ Assisted solve — PR not updated</p>
            )}

            {finishMeta && (
              <>
                {finishMeta.isPR && (
                  <p style={{ margin: "4px 0", color: "green", fontWeight: 600 }}>
                    🎉 New Personal Best!
                    {finishMeta.prImprovementSec != null && ` (−${formatElapsed(finishMeta.prImprovementSec)})`}
                  </p>
                )}
                {!finishMeta.isPR && finishMeta.deltaVsPRSec != null && (
                  <p style={{ margin: "4px 0", fontWeight: 500 }}>
                    {finishMeta.deltaVsPRSec > 0
                      ? `+${formatElapsed(finishMeta.deltaVsPRSec)} slower than PR`
                      : `Equal to PR`}
                  </p>
                )}
              </>
            )}

            {finishStats && (
              <p style={{ margin: "4px 0", fontSize: "0.95em", color: "#444" }}>
                Streak: {finishStats.currentStreak} (Longest: {finishStats.longestStreak})
              </p>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
              <button type="button" onClick={() => setShowFinishModal(false)}>Close</button>
              {/* New Puzzle button removed */}
            </div>

<button
  type="button"
  onClick={async () => {
    const payload = buildSharePayload({
      title: puzzle?.title || "Mini Crossword",
      ymd: date, // use actual puzzle date
      elapsedSec,
      didReveal: revealed.some((row) => row.some(Boolean)),
      stats: finishStats,
    });
    await copyShare(payload); // tries rich HTML first, falls back to text
  }}
  style={{
    marginTop: 12,
    padding: "6px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    background: "#f9fafb",
    cursor: "pointer",
  }}
>
  Copy results
</button>

          </div>
        </div>
      )}

      {/* Layout styles */}
<style>{`
  :root{
    --wrap: clamp(1000px, 92vw, 1700px);
    --rail: 420px;
    --gap: 32px;
    --board-nudge: 500px;
  }
  .page-wrap{ width: var(--wrap); margin: 0 auto; }
  .top-center{ width: var(--wrap); margin: 0 auto; }
  .play-flex{
    display: grid;
    grid-template-columns: 1fr var(--rail);
    align-items: start;
    justify-content: center;
    column-gap: var(--gap);
    width: var(--wrap);
    margin: 0 auto;
  }
  .board-wrap{
    display: flex;
    justify-content: center;
    min-width: 0;
    margin-left: var(--board-nudge);
  }
  .clues-wrap{
    max-width: 100%;
    position: sticky;
    top: 12px;
  }
  @media (min-width: 1600px){
    :root{ --rail: 460px; }
  }
  @media (max-width: 900px){
    .top-center, .page-wrap, .play-flex{ width: min(96vw, 1000px); }
    .play-flex{ display: block; }
    .board-wrap{ margin-left: 0; }
    .clues-wrap{ position: static; margin-top: 16px; }
  }
`}</style>
    </main>
  );
}

// ==========================
// 🎉 Confetti helpers
// ==========================
function injectConfettiStylesOnce() {
  if (document.getElementById("mc-confetti-style")) return;
  const css = `
    @keyframes mc-pop {
      0%   { transform: translate3d(0, -10vh, 0) rotate(0deg); opacity: 1; }
      100% { transform: translate3d(var(--drift, 0px), 110vh, 0) rotate(var(--rot, 0deg)); opacity: 1; }
    }
    .mc-emoji {
      position: fixed;
      top: -24px;
      pointer-events: none;
      z-index: 999999;
      will-change: transform, opacity;
      animation-timing-function: cubic-bezier(.2,.8,.2,1);
      animation-fill-mode: forwards;
    }
  `;
  const style = document.createElement("style");
  style.id = "mc-confetti-style";
  style.textContent = css;
  document.head.appendChild(style);
}

function launchEmojiConfetti(count = 90) {
  injectConfettiStylesOnce();
  const container = document.body;
  const emojis = ["🎉", "✨", "🎈", "⭐", "🎊", "🏆", "🥳", "💥", "💫", "🍾"];
  for (let i = 0; i < count; i++) {
    const span = document.createElement("span");
    span.className = "mc-emoji";
    span.textContent = emojis[Math.floor(Math.random() * emojis.length)];

    const delayMs = Math.random() * 600;
    const durMs   = 2400 + Math.random() * 1600;
    const leftVW  = Math.random() * 100;
    const sizePx  = 18 + Math.random() * 18;
    const driftPx = (Math.random() - 0.5) * 120;
    const rotDeg  = (Math.random() - 0.5) * 120;

    span.style.left = leftVW + "vw";
    span.style.fontSize = sizePx + "px";
    span.style.setProperty("--drift", driftPx + "px");
    span.style.setProperty("--rot", rotDeg + "deg");
    span.style.animation = `mc-pop ${durMs}ms ${delayMs}ms forwards`;

    container.appendChild(span);
    const ttl = delayMs + durMs + 200;
    setTimeout(() => span.remove(), ttl);
  }
}
