// src/matrix/Header.jsx
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import SyncBadge from "../components/SyncBadge";

const IS_PROD = process.env.NODE_ENV === "production";

export default function Header() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const location = useLocation();

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

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <header className="site-header">
      <div className="header-inner">
        {/* Logo: "Daily" dark + "Mini" teal */}
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

        {/* Right: streak badge + auth */}
        <div className="header-right">
          <div className="streak-badge" title="Current streak">
            🔥 <span>0</span>
          </div>

          {user ? (
            <>
              <Link to="/profile" className="header-auth-link">
                {displayName || "Profile"}
              </Link>
              <button onClick={handleSignOut} className="header-sign-out">
                Sign out
              </button>
            </>
          ) : (
            <Link to="/auth" className="header-auth-link header-sign-in">
              Sign in
            </Link>
          )}

          {!IS_PROD && <SyncBadge />}
        </div>
      </div>
    </header>
  );
}
