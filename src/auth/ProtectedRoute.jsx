import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // 1) Wait for auth to finish initializing
  if (loading) return null; // or a spinner

  // 2) If no user, send them to /auth and remember where they came from
  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  // 3) Otherwise, render the protected content
  return children;
}
