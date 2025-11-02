import { useEffect, useMemo, useRef, useState } from "react";

export default function Crossword({ puzzle }) {
  const SIZE = puzzle.size || 5;
  const [letters, setLetters] = useState(() =>
    Array.from({ length: SIZE }, () => Array(SIZE).fill(""))
  );
  const [cursor, setCursor] = useState({ r: 0, c: 0, dir: "across" }); // across|down
  const inputsRef = useRef({});


  const isBlock = (r, c) => puzzle.grid[r][c] === "#";

  useEffect(() => {
    if (isBlock(cursor.r, cursor.c)) {
      const next = findNextOpen(cursor.r, cursor.c, cursor.dir, 1);
      if (next) setCursor(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = `${cursor.r}-${cursor.c}`;
    const el = inputsRef.current[id];
    if (el && !isBlock(cursor.r, cursor.c)) {
      el.focus({ preventScroll: true });
      el.select?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor.r, cursor.c]);

  const findNextOpen = (r, c, dir, step) => {
    let nr = r;
    let nc = c;
    for (let i = 0; i < SIZE; i++) {
      if (dir === "across") nc += step;
      else nr += step;
      if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) return null;
      if (!isBlock(nr, nc)) return { r: nr, c: nc, dir };
    }
    return null;
  };

  const findPrevOpen = (r, c, dir) => findNextOpen(r, c, dir, -1);

  const handleKeyDown = (e, r, c) => {
    const key = e.key;

    if (key === "Enter") {
      setCursor((cur) => ({ ...cur, dir: cur.dir === "across" ? "down" : "across" }));
      e.preventDefault();
      return;
    }

    if (key.startsWith("Arrow")) {
      const dir = key === "ArrowLeft" || key === "ArrowRight" ? "across" : "down";
      const step = key === "ArrowLeft" || key === "ArrowUp" ? -1 : 1;
      const next = dir === "across"
        ? findNextOpen(r, c, "across", step)
        : findNextOpen(r, c, "down", step);
      if (next) setCursor(next);
      e.preventDefault();
      return;
    }

    if (key === "Backspace") {
      setLetters((L) => {
        const copy = L.map((row) => row.slice());
        if (copy[r][c]) {
          copy[r][c] = "";
          return copy;
        }
        const prev = cursor.dir === "across" ? findPrevOpen(r, c, "across") : findPrevOpen(r, c, "down");
        if (prev) {
          copy[prev.r][prev.c] = "";
          setCursor(prev);
        }
        return copy;
      });
      e.preventDefault();
      return;
    }

    if (/^[a-zA-Z]$/.test(key)) {
      const char = key.toUpperCase();
      setLetters((L) => {
        const copy = L.map((row) => row.slice());
        copy[r][c] = char;
        return copy;
      });
      const next = cursor.dir === "across"
        ? findNextOpen(r, c, "across", 1)
        : findNextOpen(r, c, "down", 1);
      if (next) setCursor(next);
      e.preventDefault();
      return;
    }
  };

    const correctCount = useMemo(() => {
    let filled = 0;
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
        if (puzzle.grid[r][c] !== "#" && letters[r][c]) filled++;
        }
    }
    return filled;
}, [letters, puzzle.grid, SIZE]);

  return (
    <section className="grid-and-sidebar">
      <div
        className="xw-grid"
        role="grid"
        aria-label={`Crossword grid ${SIZE} by ${SIZE}`}
        style={{
          gridTemplateColumns: `repeat(${SIZE}, 1fr)`,
          gridTemplateRows: `repeat(${SIZE}, 1fr)`,
        }}
      >
        {Array.from({ length: SIZE }).map((_, r) =>
          Array.from({ length: SIZE }).map((__, c) => {
            const id = `${r}-${c}`;
            const active = r === cursor.r && c === cursor.c && !isBlock(r, c);
            const blocked = isBlock(r, c);
            return (
              <div
                key={id}
                className={`cell ${blocked ? "cell-block" : ""} ${active ? "cell-active" : ""}`}
                role="gridcell"
                aria-selected={active ? "true" : "false"}
                aria-label={blocked ? "Block" : `Row ${r + 1}, Column ${c + 1}`}
              >
                {!blocked ? (
                  <input
                    ref={(el) => (inputsRef.current[id] = el)}
                    className="cell-input"
                    inputMode="text"
                    maxLength={1}
                    value={letters[r][c]}
                    onChange={() => {}}
                    onKeyDown={(e) => handleKeyDown(e, r, c)}
                    onFocus={() => setCursor({ r, c, dir: cursor.dir })}
                    aria-label={`Cell ${r + 1}-${c + 1}`}
                  />
                ) : null}
              </div>
            );
          })
        )}
      </div>

      <aside className="sidebar">
        <div className="stats">
          <div><strong>Filled:</strong> {correctCount}</div>
          <div><strong>Direction:</strong> {cursor.dir}</div>
          <div><strong>Date:</strong> {puzzle.date}</div>
        </div>
        <div className="help">
          <p><strong>Keys:</strong> Letters to type • Arrows to move • Enter switches direction • Backspace erases</p>
        </div>
        <div className="actions">
          <button className="btn secondary" disabled>Check Square (soon)</button>
          <button className="btn secondary" disabled>Check Puzzle (soon)</button>
        </div>
      </aside>
    </section>
  );
}