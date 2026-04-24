// src/main.jsx
if (import.meta.env.MODE === "development") {
  // uncomment to simulate any day for streak testing
  // import("./dev/dateFreeze").then(m => m.freezeDate("2025-09-27T08:00:00Z"));
}

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ClerkProvider } from "@clerk/clerk-react";

import { AuthProvider } from "./auth/AuthContext";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

import "./index.css";
import "./App.css";
import "./styles/crossword.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY && import.meta.env.DEV) {
  console.warn("⚠️  VITE_CLERK_PUBLISHABLE_KEY is not set. Auth will not work.");
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY ?? ""} afterSignOutUrl="/">
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </ClerkProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
