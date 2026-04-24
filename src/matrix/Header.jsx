// src/matrix/Header.jsx
import { Link, useLocation } from "react-router-dom";
import { UserButton, SignInButton, useUser } from "@clerk/clerk-react";
import { getUserStats } from "../data/store";
import SyncBadge from "../components/SyncBadge";

const IS_PROD = process.env.NODE_ENV === "production";

export default function Header() {
  const { user: clerkUser, isSignedIn, isLoaded } = useUser();
  const location = useLocation();

  // Live streak from localStorage — synchronous, no loading state needed
  const streak = isSignedIn && clerkUser
    ? (getUserStats(clerkUser.id)?.currentStreak ?? 0)
    : 0;

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <header className="site-header">
      <div className="header-inner">
        {/* Logo */}
        <Link to="/" className="site-logo">
          <span className="logo-daily">Daily</span>
          <span className="logo-mini">Mini</span>
        </Link>

        {/* Nav tabs */}
        <nav className="header-nav" aria-label="Main navigation">
          <Link
            to="/play"
            className={`nav-tab${isActive("/play") ? " active" : ""}`}
          >
            Today
          </Link>
          <Link
            to="/profile"
            className={`nav-tab${isActive("/profile") ? " active" : ""}`}
          >
            Stats
          </Link>
          <a href="#how-to-play" className="nav-tab">
            How to Play
          </a>
        </nav>

        {/* Right side */}
        <div className="header-right">
          {/* Streak pill — only visible when signed in */}
          {isSignedIn && (
            <div className="streak-badge" title="Current streak">
              🔥 <span>{streak}</span>
            </div>
          )}

          {/* Auth: Clerk UserButton (signed in) or SignInButton (signed out) */}
          {isLoaded && (
            isSignedIn ? (
              <UserButton />
            ) : (
              <SignInButton mode="modal">
                <button className="header-sign-in">Sign in</button>
              </SignInButton>
            )
          )}

          {!IS_PROD && <SyncBadge />}
        </div>
      </div>
    </header>
  );
}
