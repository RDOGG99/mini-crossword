// src/pages/Auth.jsx
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  // ProtectedRoute sends state={{ from: location }}
  const from = location.state?.from?.pathname || "/";

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
      navigate(from, { replace: true });
    } catch (error) {
      setErr(error.message || "Authentication error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "48px auto", padding: 16 }}>
      <h1 style={{ marginBottom: 12 }}>
        {mode === "signin" ? "Sign In" : "Create Account"}
      </h1>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        <input
          type="email"
          placeholder="email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {err && <div style={{ color: "crimson" }}>{err}</div>}
        <button disabled={loading} type="submit">
          {loading ? "Please wait…" : mode === "signin" ? "Sign In" : "Sign Up"}
        </button>
      </form>

      <div style={{ marginTop: 12 }}>
        {mode === "signin" ? (
          <button onClick={() => setMode("signup")}>
            Need an account? Sign up
          </button>
        ) : (
          <button onClick={() => setMode("signin")}>
            Already have an account? Sign in
          </button>
        )}
      </div>
    </div>
  );
}
