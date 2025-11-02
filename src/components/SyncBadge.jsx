// src/components/SyncBadge.jsx
import { useEffect, useState } from "react";
import { getPendingCount, onPendingChange, flushPending } from "../data/api";

// dev helpers (optional, handy while iterating)
window.flushMiniQueue = () => flushPending().catch(console.warn);
window.clearMiniQueue = () => {
  try {
    localStorage.removeItem("mx:queue"); // storage key used by data/api
    // fire a storage event for other tabs
    window.dispatchEvent(new StorageEvent("storage", { key: "mx:queue" }));
  } catch (e) { console.warn(e); }
};

const HIDE_WHEN_ZERO = false; // set true to hide the pill when synced

export default function SyncBadge() {
  const [pending, setPending] = useState(getPendingCount());

  useEffect(() => {
    // subscribe to queue size updates from data/api
    const off = onPendingChange(setPending);

    // reflect changes from other tabs
    const onStorage = (e) => { if (e.key === "mx:queue") setPending(getPendingCount()); };
    window.addEventListener("storage", onStorage);

    // auto-flush when we come online or tab becomes active
    const tryFlush = () => flushPending().catch(() => {});
    window.addEventListener("online", tryFlush);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") tryFlush();
    });

    return () => {
      off();
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("online", tryFlush);
      document.removeEventListener("visibilitychange", tryFlush);
    };
  }, []);

  if (HIDE_WHEN_ZERO && pending === 0) return null;

  const label = pending === 0 ? "Synced" : `Pending: ${pending}`;
  const bg = pending === 0 ? "#e8f9ed" : "#fff7ed";
  const br = pending === 0 ? "#b6e7c3" : "#fb923c";

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <button
        onClick={() => flushPending().catch(() => {})}
        title={pending ? "Click to retry syncing pending changes" : "All caught up"}
        style={{
          padding: "4px 8px",
          borderRadius: 999,
          fontSize: 12,
          border: `1px solid ${br}`,
          background: bg,
          cursor: pending ? "pointer" : "default",
        }}
        aria-live="polite"
      >
        {label}
      </button>

      {/* Dev-only clear button; remove if you don't want it visible */}
      {pending > 0 && (
        <button
          onClick={() => { window.clearMiniQueue(); setPending(0); }}
          title="Clear pending queue (dev)"
          style={{
            padding: "3px 6px",
            borderRadius: 8,
            fontSize: 11,
            border: "1px solid #e5e7eb",
            background: "#f9fafb",
          }}
        >
          Clear
        </button>
      )}
    </div>
  );
}
