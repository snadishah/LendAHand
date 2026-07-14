import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

interface NavItem {
  to: string;
  label: string;
  short: string;
  icon: string;
}

const linkBase =
  "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-navy dark:text-slate-200 hover:bg-ink/5 dark:hover:bg-white/10 transition-colors";
const linkActive = "bg-ink/10 text-ink dark:bg-white/15 dark:text-white font-semibold";

const SETTINGS_LINK: NavItem = { to: "/settings", label: "Settings", short: "Settings", icon: "⚙️" };

export function Sidebar() {
  const { user } = useAuth();
  const isPoster = user?.userType === "POSTER";

  const links: NavItem[] = [
    { to: "/dashboard", label: "Dashboard", short: "Home", icon: "🏠" },
    ...(isPoster ? [{ to: "/tasks/new", label: "Post a New Task", short: "Post", icon: "➕" }] : []),
    { to: "/tasks", label: "Browse Tasks", short: "Browse", icon: "🔍" },
    { to: "/bids", label: isPoster ? "Manage Bids" : "My Bids", short: "Bids", icon: "📝" },
    { to: "/map", label: "Full-Screen Map", short: "Map", icon: "🗺️" },
    { to: "/wallet", label: "My Wallet", short: "Wallet", icon: "💰" },
    { to: "/chat", label: "AI Chat Assistant", short: "Chat", icon: "🤖" },
    ...(user?.isAdmin ? [{ to: "/admin", label: "Admin Console", short: "Admin", icon: "🛡️" }] : []),
  ];

  // Mobile bottom bar: every destination, in a compact scrollable row, so
  // nothing (like the map) ends up buried out of sight.
  const mobileLinks: NavItem[] = [...links, SETTINGS_LINK];

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden sm:flex w-60 shrink-0 flex-col gap-1 p-3 bg-paper dark:bg-[#0B0B0B] border-r border-ink/10 dark:border-white/10 sm:sticky sm:top-[61px] sm:h-[calc(100vh-61px)] overflow-y-auto">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => `${linkBase} ${isActive ? linkActive : ""} whitespace-nowrap`}
          >
            <span className="text-base w-5 text-center">{link.icon}</span>
            <span>{link.label}</span>
          </NavLink>
        ))}

        <div className="mt-auto pt-2 border-t border-ink/10 dark:border-white/10">
          <NavLink
            to={SETTINGS_LINK.to}
            className={({ isActive }) => `${linkBase} ${isActive ? linkActive : ""} whitespace-nowrap`}
          >
            <span className="text-base w-5 text-center">{SETTINGS_LINK.icon}</span>
            <span>{SETTINGS_LINK.label}</span>
          </NavLink>
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 sm:hidden flex overflow-x-auto bg-paper dark:bg-[#0B0B0B] border-t border-ink/10 dark:border-white/10 pb-[env(safe-area-inset-bottom)]">
        {mobileLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex-1 min-w-[64px] flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold whitespace-nowrap transition-colors ${
                isActive ? "text-ink dark:text-white" : "text-muted"
              }`
            }
          >
            <span className="text-lg leading-none">{link.icon}</span>
            <span>{link.short}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
