// src/auth/AdminRoute.jsx
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { supabase } from "../lib/supabaseClient";

// Optional: keep an email allowlist for admins you trust.
const DEV_ADMINS = [
  // "you@yourdomain.com",
];

export default function AdminRoute({ children }) {
  const { user } = useAuth();
  const [ok, setOk] = useState(null); // null = checking, true = allow, false = block

  useEffect(() => {
    let alive = true;

    (async () => {
      // Must be signed in
      if (!user) {
        if (alive) setOk(false);
        return;
      }

      // Fast path: email allowlist (optional)
      if (DEV_ADMINS.length && user.email && DEV_ADMINS.includes(user.email)) {
        if (alive) setOk(true);
        return;
      }

      // Check role in Supabase
      try {
        const { data, error } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (!alive) return;

        if (error) {
          console.warn("Admin check error:", error);
          setOk(false);
          return;
        }

        setOk(data?.role === "admin");
      } catch (e) {
        console.warn("Admin check threw:", e);
        if (alive) setOk(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [user]);

  if (ok === null) return <div style={{ padding: 16 }}>Checking access…</div>;
  if (!ok) return <Navigate to="/auth" replace />;
  return children;
}
