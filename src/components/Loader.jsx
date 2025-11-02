// src/components/Loader.jsx
import React from "react";

export default function Loader({ label = "Loading…" }) {
  return (
    <div style={{ padding: "24px 12px", display: "grid", placeItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          aria-hidden
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            border: "2px solid #cbd5e1",
            borderTopColor: "#0ea5e9",
            animation: "spin 0.8s linear infinite"
          }}
        />
        <span>{label}</span>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
