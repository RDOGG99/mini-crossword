// src/matrix/Header.jsx
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
// Keep SyncBadge available in dev only
import SyncBadge from "../components/SyncBadge";

const SHOW_ARCHIVE = false; // flip to true if you want Archive later
const IS_PROD = process.env.NODE_ENV === "production";

export default function Header() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();

  const displayName =
    user?.user_metadata?.display_name ||
    user?.user_metadata?.username ||
    (user?.email ? user.email.split("@")[0] : "");

  async function handleSignOut() {
    try {
      await signOut();
    } finally {
      nav("/", { replace: true });
    }
  }

  return (
    <header className="border-b">
      <div className="max-w-4xl mx-auto flex items-center gap-4 p-3">
        <Link to="/" className="font-semibold">Mini Crossword</Link>

        <nav className="ml-auto flex items-center gap-3">
          <Link to="/play">Play</Link>
          {SHOW_ARCHIVE && <Link to="/archive">Archive</Link>}

          {user ? (
            <>
              <Link to="/profile" className="font-medium">
                {displayName || "Profile"}
              </Link>
              <button
                onClick={handleSignOut}
                className="border rounded px-2 py-1"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link to="/auth" className="border rounded px-2 py-1">
              Sign in
            </Link>
          )}

          {/* Status / sync indicator — hide in production */}
          {!IS_PROD && (
            <div className="flex items-center">
              <SyncBadge />
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
