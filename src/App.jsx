// src/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Header from "./matrix/Header";
import Today from "./pages/Today";
import Play from "./pages/Play";
import Archive from "./pages/Archive";
import AuthPage from "./pages/Auth";
import Profile from "./pages/Profile";
import ProtectedRoute from "./auth/ProtectedRoute";
import AdminRoute from "./auth/AdminRoute";
import Admin from "./pages/Admin.jsx";
import Dev from "./pages/Dev";
import "./index.css";

export default function App() {
  const IS_PROD = process.env.NODE_ENV === "production";

  return (
    <div className="min-h-screen">
      <Header />
      <Routes>
        <Route path="/" element={<Today />} />
        <Route path="/play" element={<Play />} />
        <Route path="/play/:ymd" element={<Play />} />
        <Route path="/archive" element={<Archive />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* Hide /dev route in production */}
        {!IS_PROD && <Route path="/dev" element={<Dev />} />}

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Admin />
            </AdminRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
