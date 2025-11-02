import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Header from "./matrix/Header";
import Today from "./pages/Today";
import Play from "./pages/Play";
import Archive from "./pages/Archive";
import AuthPage from "./pages/Auth";
import Profile from "./pages/Profile";
import ProtectedRoute from "./auth/ProtectedRoute";
import Dev from "./pages/Dev";
import AdminRoute from "./auth/AdminRoute";
import Admin from "./pages/Admin.jsx";  
import "./index.css";

export default function App() {
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
        <Route path="/dev" element={<Dev />} />
        <Route path="*" element={<Navigate to="/" replace />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Admin />
            </AdminRoute>
          }
        />
      </Routes>
    </div>
  );
}
