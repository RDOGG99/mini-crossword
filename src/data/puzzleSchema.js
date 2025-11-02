// src/data/puzzleSchema.js
/**
 * Minimal runtime validator for our mini-puzzle JSON.
 *
 * Shape:
 * {
 *   title: string,
 *   size: number,
 *   grid: string[size][size], // "#" or single letter A–Z/a–z
 *   clues: {
 *     across: { [num:string]: string },
 *     down:   { [num:string]: string }
 *   }
 * }
 */

const LETTER_RE = /^[A-Za-z]$/; // change to /^[A-Z]$/ to enforce uppercase only

export function validatePuzzle(puzzle) {
  const errors = [];
  const fail = (msg) => errors.push(msg);

  if (!puzzle || typeof puzzle !== "object") fail("Puzzle must be an object.");

  // title
  if (typeof puzzle?.title !== "string" || puzzle.title.trim() === "") {
    fail('title must be a non-empty string.');
  }

  // size
  const size = puzzle?.size;
  if (typeof size !== "number" || !Number.isInteger(size) || size <= 0) {
    fail('size must be a positive integer.');
  }

  // grid
  const grid = puzzle?.grid;
  if (!Array.isArray(grid)) {
    fail('grid must be an array of rows.');
  } else {
    if (size && grid.length !== size) {
      fail(`grid must have ${size} rows; got ${grid.length}.`);
    }
    grid.forEach((row, r) => {
      if (!Array.isArray(row)) {
        fail(`grid row ${r} must be an array.`);
        return;
      }
      if (size && row.length !== size) {
        fail(`grid row ${r} must have ${size} columns; got ${row.length}.`);
      }
      row.forEach((cell, c) => {
        const at = `grid[${r}][${c}]`;
        if (typeof cell !== "string") {
          fail(`${at} must be a string.`);
        } else if (cell !== "#" && !LETTER_RE.test(cell)) {
          fail(`${at} must be "#" or a single A–Z letter.`);
        }
      });
    });
  }

  // clues
  const clues = puzzle?.clues;
  if (!clues || typeof clues !== "object") {
    fail('clues must be an object.');
  } else {
    ["across", "down"].forEach((dir) => {
      const bag = clues[dir];
      if (!bag || typeof bag !== "object") {
        fail(`clues.${dir} must be an object.`);
        return;
      }
      Object.entries(bag).forEach(([num, text]) => {
        if (!/^\d+$/.test(num)) fail(`clues.${dir} key "${num}" must be digits.`);
        if (typeof text !== "string" || text.trim() === "") {
          fail(`clues.${dir}[${num}] must be a non-empty string.`);
        }
      });
    });
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Throws in dev if invalid; warns in prod. Returns boolean ok.
 */
export function assertValidPuzzle(puzzle, idForLogs = "unknown") {
  const { ok, errors } = validatePuzzle(puzzle);
  if (!ok) {
    const message = `Invalid puzzle "${idForLogs}":\n- ` + errors.join("\n- ");
    if (import.meta?.env?.MODE === "development") {
      throw new Error(message);
    } else {
      console.warn(message);
    }
  }
  return ok;
}
