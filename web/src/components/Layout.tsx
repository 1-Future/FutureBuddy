// Copyright 2025 #1 Future — Apache 2.0 License

import { useState, useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  MessageSquare,
  Terminal,
  FolderOpen,
  Shield,
  Package,
  Brain,
  ScrollText,
  Bookmark,
  Settings,
  Menu,
  X,
  Wifi,
  WifiOff,
} from "lucide-react";
import { checkHealth } from "../services/api.js";
import { NudgeToast } from "./NudgeToast.js";

const NAV_ITEMS = [
  { to: "/chat", icon: MessageSquare, label: "Chat" },
  { to: "/terminal", icon: Terminal, label: "Terminal" },
  { to: "/files", icon: FolderOpen, label: "Files" },
  { to: "/actions", icon: Shield, label: "Actions" },
  { to: "/inventory", icon: Package, label: "Inventory" },
  { to: "/memory", icon: Brain, label: "Memory" },
  { to: "/sessions", icon: ScrollText, label: "Sessions" },
  { to: "/bookmarks", icon: Bookmark, label: "Bookmarks" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    checkHealth().then(setOnline);
    const interval = setInterval(() => checkHealth().then(setOnline), 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-full">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-56 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 border-b border-[var(--color-border)] px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-accent)] text-sm font-bold text-white">
            FB
          </div>
          <div>
            <div className="text-sm font-semibold">FutureBuddy</div>
            <div className="text-[10px] text-[var(--color-text-dim)]">
              Your 24/7 IT Department
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-1 p-2">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                    : "text-[var(--color-text-dim)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Status */}
        <div className="border-t border-[var(--color-border)] p-3">
          <div className="flex items-center gap-2 text-xs">
            {online ? (
              <>
                <Wifi size={14} className="text-[var(--color-green)]" />
                <span className="text-[var(--color-text-dim)]">Connected</span>
              </>
            ) : (
              <>
                <WifiOff size={14} className="text-[var(--color-red)]" />
                <span className="text-[var(--color-red)]">Offline</span>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex h-14 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span className="text-sm font-semibold">FutureBuddy</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
      <NudgeToast />
    </div>
  );
}
