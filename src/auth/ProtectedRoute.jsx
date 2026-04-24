// src/auth/ProtectedRoute.jsx
import { useUser, SignInButton } from "@clerk/clerk-react";
import Loader from "../components/Loader";

export default function ProtectedRoute({ children }) {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) return <Loader label="Checking sign-in…" />;

  // Instead of redirecting, show an inline prompt so users stay on the page
  // and understand why sign-in is needed (spec: Stats tab behaviour).
  if (!isSignedIn) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "64px 20px",
          maxWidth: 400,
          margin: "0 auto",
        }}
      >
        <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>📊</div>
        <h2
          style={{
            fontFamily: "'Sora', system-ui, sans-serif",
            fontWeight: 800,
            fontSize: "1.4rem",
            color: "var(--text)",
            margin: "0 0 8px",
          }}
        >
          Track your progress
        </h2>
        <p
          style={{
            fontSize: "0.95rem",
            color: "var(--text-2)",
            margin: "0 0 24px",
            lineHeight: 1.5,
          }}
        >
          Sign in to track your stats and streak
        </p>
        <SignInButton mode="modal">
          <button
            style={{
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "11px 32px",
              fontSize: "0.95rem",
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Sign in
          </button>
        </SignInButton>
      </div>
    );
  }

  return children;
}
