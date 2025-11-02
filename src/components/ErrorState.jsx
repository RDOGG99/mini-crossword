// src/components/ErrorState.jsx
import React from "react";

export default function ErrorState({ title = "Something went wrong", detail, action }) {
  return (
    <div
      role="alert"
      style={{
        margin: "12px 0",
        padding: "12px 14px",
        borderRadius: 8,
        border: "1px solid #fecaca",
        background: "#fff1f2",
        color: "#7f1d1d"
      }}
    >
      <div style={{ fontWeight: 700 }}>{title}</div>
      {detail ? <div style={{ marginTop: 6 }}>{detail}</div> : null}
      {action ? <div style={{ marginTop: 10 }}>{action}</div> : null}
    </div>
  );
}
