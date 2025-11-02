// Standard crossword numbering:
// A cell starts an Across answer if it's not a block and (left is off-grid or a block) and (right is a letter).
// A cell starts a Down answer if it's not a block and (above is off-grid or a block) and (below is a letter).

export function computeNumbering(grid) {
  const SIZE = grid.length;

  const inBounds = (r, c) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;
  const isBlock = (r, c) => grid[r][c] === "#";

  const across = [];
  const down = [];

  // Maps from cell -> index into across/down arrays
  const cellToAcross = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  const cellToDown = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));

  let nextNum = 1;

  // First pass: assign numbers to starts and build their cell lists
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (isBlock(r, c)) continue;

      const startsAcross = (!inBounds(r, c - 1) || isBlock(r, c - 1)) && inBounds(r, c + 1) && !isBlock(r, c + 1);
      const startsDown   = (!inBounds(r - 1, c) || isBlock(r - 1, c)) && inBounds(r + 1, c) && !isBlock(r + 1, c);

      if (startsAcross || startsDown) {
        // Assign a shared number to both directions if both start here
        const num = nextNum++;

        if (startsAcross) {
          const cells = [];
          let cc = c;
          while (inBounds(r, cc) && !isBlock(r, cc)) {
            cells.push([r, cc]);
            cc++;
          }
          across.push({ num, start: [r, c], cells, length: cells.length });
          const idx = across.length - 1;
          for (const [rr, cc2] of cells) cellToAcross[rr][cc2] = idx;
        }

        if (startsDown) {
          const cells = [];
          let rr = r;
          while (inBounds(rr, c) && !isBlock(rr, c)) {
            cells.push([rr, c]);
            rr++;
          }
          down.push({ num, start: [r, c], cells, length: cells.length });
          const idx = down.length - 1;
          for (const [rr2] of cells) cellToDown[rr2][c] = idx;
        }
      }
    }
  }

  return { across, down, cellToAcross, cellToDown };
}
