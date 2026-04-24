// src/pages/Auth.jsx
// Sign-in is now modal-based throughout the app.
// This page exists as a fallback for direct /auth navigation (e.g. AdminRoute).
import { SignInButton } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";

export default function AuthPage() {
  const nav = useNavigate();

  return (
    <div style={{ textAlign: "center", padding: "64px 20px" }}>
      <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>🔐</div>
      <h2
        style={{
          fontFamily: "'Sora', system-ui, sans-serif",
          fontWeight: 800,
          fontSize: "1.4rem",
          color: "var(--text)",
          margin: "0 0 8px",
        }}
      >
        Sign in to continue
      </h2>
      <p style={{ color: "var(--text-2)", marginBottom: 24 }}>
        You need an account to access this page.
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <SignInButton mode="modal" fallbackRedirectUrl="/play">
          <button
            style={{
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 28px",
              fontSize: "0.95rem",
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Sign in
          </button>
        </SignInButton>
        <button
          onClick={() => nav("/play")}
          style={{
            background: "var(--surface)",
            color: "var(--text-2)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "10px 28px",
            fontSize: "0.95rem",
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Back to puzzle
        </button>
      </div>
    </div>
  );
}
