import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as P from "./puzzles";

// Small helper: freeze Date so ymdVancouver is deterministic
function freezeDate(iso = "2025-09-27T12:00:00Z") {
  const RealDate = Date;
  global.Date = class extends RealDate {
    constructor(...args) {
      if (args.length === 0) return new RealDate(iso);
      return new RealDate(...args);
    }
    static now() { return new RealDate(iso).getTime(); }
    static parse = RealDate.parse;
    static UTC = RealDate.UTC;
  };
  return () => { global.Date = RealDate; };
}

describe("puzzles registry", () => {
  let unfreeze;
  beforeEach(() => {
    unfreeze = freezeDate();
  });
  afterEach(() => {
    unfreeze?.();
  });

  it("listAvailableDates returns sorted array", () => {
    const dates = P.listAvailableDates();
    const sorted = [...dates].sort();
    expect(dates).toEqual(sorted);
  });

  it("hasPuzzle returns boolean on known keys", () => {
    const dates = P.listAvailableDates();
    expect(P.hasPuzzle(dates[0])).toBe(true);
    expect(P.hasPuzzle("1999-01-01")).toBe(false);
  });

  it("getPuzzleByDate returns object or null", () => {
    const dates = P.listAvailableDates();
    const puz = P.getPuzzleByDate(dates[0]);
    expect(puz && typeof puz).toBe("object");
    expect(P.getPuzzleByDate("1999-01-01")).toBeNull();
  });

  it("ymdVancouver formats YYYY-MM-DD for the frozen day", () => {
    const ymd = P.ymdVancouver();
    expect(ymd).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
