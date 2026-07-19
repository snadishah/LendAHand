import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useNotifications } from "../../hooks/useNotifications";
import { Avatar } from "../ui/Avatar";

function formatRelativeTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return d.toLocaleDateString();
}

export function Navbar() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [showBell, setShowBell] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Close the dropdown whenever the route changes.
  useEffect(() => {
    setShowBell(false);
  }, [location.pathname]);

  // Close on click outside or Escape.
  useEffect(() => {
    if (!showBell) return;

    function handleMouseDown(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setShowBell(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setShowBell(false);
    }

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showBell]);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-4 border-b border-ink/10 dark:border-white/10 bg-paper/80 dark:bg-[#0B0B0B]/80 backdrop-blur px-4 sm:px-6 py-3">
      <Link to="/dashboard" className="flex items-center gap-2 font-display font-bold text-lg shrink-0">
        <span className="text-2xl">🤝</span>
        <span className="hidden sm:inline">LendAHand</span>
      </Link>

      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          to="/wallet"
          className="flex items-center gap-1.5 rounded-full bg-ink/5 dark:bg-white/5 text-ink dark:text-white font-bold px-3 py-1.5 text-sm hover:bg-ink/15 dark:hover:bg-white/20 transition-colors"
        >
          💰 Rs. {user?.walletBalance.toFixed(0)}
        </Link>

        <div className="relative" ref={bellRef}>
          <button
            onClick={() => setShowBell((s) => !s)}
            className="relative rounded-full h-9 w-9 flex items-center justify-center hover:bg-ink/5 dark:hover:bg-white/10 transition-colors"
            aria-label="Notifications"
          >
            🔔
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-ink dark:bg-white text-white dark:text-ink text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {showBell && (
            <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] max-h-96 overflow-y-auto card p-3 shadow-card-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold text-sm">Notifications</p>
                {unreadCount > 0 && (
                  <button onClick={() => markAllRead()} className="text-xs text-ink dark:text-white font-semibold hover:underline">
                    Mark all read
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <p className="text-sm text-muted py-6 text-center">No notifications yet.</p>
              ) : (
                <ul className="space-y-1">
                  {notifications.map((n) => (
                    <li
                      key={n.id}
                      onClick={() => !n.isRead && markRead(n.id)}
                      className={`text-sm rounded-lg px-2.5 py-2 cursor-pointer ${
                        n.isRead ? "text-muted" : "bg-coral/5 font-medium"
                      }`}
                    >
                      <span>{n.message}</span>
                      <span className="ml-2 text-[11px] text-muted whitespace-nowrap">
                        {formatRelativeTime(n.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <button
          onClick={toggle}
          className="rounded-full h-9 w-9 flex items-center justify-center hover:bg-ink/5 dark:hover:bg-white/10 transition-colors"
          aria-label="Toggle dark mode"
        >
          {dark ? "☀️" : "🌙"}
        </button>

        <div className="hidden sm:flex items-center gap-2 mr-1">
          <Avatar name={user?.name ?? "?"} size={32} />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">{user?.name}</span>
            <span className="text-xs text-muted">{user?.userType === "POSTER" ? "🧑‍💼 Task Poster" : "🦺 Helper"}</span>
          </div>
        </div>

        <button onClick={handleLogout} className="btn-secondary !px-3 !py-1.5 text-sm">
          Logout
        </button>
      </div>
    </header>
  );
}
