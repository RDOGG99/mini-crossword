export const userKey = (userId, type, puzzleId) =>
  `mc::${userId}::${type}${puzzleId ? `::${puzzleId}` : ""}`;

// Examples:
// userKey("ryan_s", "profile") => mc::ryan_s::profile
// userKey("ryan_s", "progress", "2025-09-20") => mc::ryan_s::progress::2025-09-20
