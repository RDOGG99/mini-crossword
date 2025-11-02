// src/main.jsx
if (import.meta.env.MODE === "development") {
  // uncomment to simulate any day for streak testing
  // import("./dev/dateFreeze").then(m => m.freezeDate("2025-09-27T08:00:00Z"));
}


import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { AuthProvider } from "./auth/AuthContext"; // ✅ named import
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

import "./index.css";
import "./App.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
