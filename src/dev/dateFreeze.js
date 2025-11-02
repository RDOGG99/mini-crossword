// src/dev/dateFreeze.js
export function freezeDate(iso = "2025-09-27T12:00:00Z") {
  const RealDate = Date;
  globalThis.__REAL_DATE__ = RealDate;
  globalThis.Date = class extends RealDate {
    constructor(...args) {
      if (args.length === 0) return new RealDate(iso);
      return new RealDate(...args);
    }
    static now() { return new RealDate(iso).getTime(); }
    static parse = RealDate.parse;
    static UTC = RealDate.UTC;
  };
  console.info("[dev] Date frozen at", iso);
}

export function unfreezeDate() {
  if (globalThis.__REAL_DATE__) {
    globalThis.Date = globalThis.__REAL_DATE__;
    delete globalThis.__REAL_DATE__;
    console.info("[dev] Date unfrozen");
  }
}
