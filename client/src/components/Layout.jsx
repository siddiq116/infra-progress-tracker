import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: "📊", end: true },
  { to: "/projects", label: "Projects", icon: "🏗️" },
  { to: "/users", label: "Users", icon: "👥", roles: ["admin"] },
];

export default function Layout() {
  const { user, logout } = useAuth();

  const items = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user?.role));

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-950 text-slate-200 md:flex">
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-5">
          <span className="text-xl">🏗️</span>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">Infra Progress</p>
            <p className="text-[11px] text-slate-400">SIH26122 Tracker</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? "bg-brand-600 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 px-4 py-4 text-xs text-slate-400">
          Planning-to-Execution Bridge for real-time infrastructure monitoring.
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:px-6">
          <div className="md:hidden text-sm font-semibold text-slate-900">🏗️ Infra Progress</div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-800">{user?.name}</p>
              <p className="text-xs capitalize text-slate-400">{user?.role?.replace("_", " ")}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <button
              onClick={logout}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Log out
            </button>
          </div>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2 md:hidden">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium ${
                  isActive ? "bg-brand-600 text-white" : "text-slate-500"
                }`
              }
            >
              {item.icon} {item.label}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 px-4 py-6 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
