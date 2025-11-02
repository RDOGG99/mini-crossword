import { describe, it, expect } from "vitest";
import { validatePuzzle } from "./puzzleSchema";

const good = {
  title: "Mini",
  size: 5,
  grid: [
    ["#", "A", "B", "C", "#"],
    ["D", "E", "F", "#", "#"],
    ["#", "G", "H", "I", "#"],
    ["J", "K", "L", "#", "#"],
    ["#", "M", "N", "O", "#"]
  ],
  clues: {
    across: { "1": "clue", "2": "clue" },
    down: { "1": "clue", "2": "clue" }
  }
};

describe("puzzleSchema.validatePuzzle", () => {
  it("accepts a valid puzzle", () => {
    const res = validatePuzzle(good);
    expect(res.ok).toBe(true);
    expect(res.errors.length).toBe(0);
  });

  it("rejects when size mismatches grid", () => {
    const bad = { ...good, size: 4 };
    const res = validatePuzzle(bad);
    expect(res.ok).toBe(false);
    expect(res.errors.join("\n")).toMatch(/grid must have 4 rows|must have 4 columns/);
  });

  it("rejects when a cell is not # or single letter", () => {
    const bad = structuredClone(good);
    bad.grid[0][1] = "AA";
    const res = validatePuzzle(bad);
    expect(res.ok).toBe(false);
    expect(res.errors.join("\n")).toMatch(/must be "#" or a single A–Z letter/);
  });

  it("rejects when clue keys are non-numeric", () => {
    const bad = structuredClone(good);
    bad.clues.across = { a1: "bad" };
    const res = validatePuzzle(bad);
    expect(res.ok).toBe(false);
    expect(res.errors.join("\n")).toMatch(/key "a1" must be digits/);
  });
});
