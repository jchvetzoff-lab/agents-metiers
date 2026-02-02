"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Settings,
  BookOpen,
  Briefcase,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/fiches", label: "Fiches", icon: FileText },
  { href: "/actions", label: "Actions", icon: Settings },
  { href: "/guide", label: "Guide", icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="mb-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#4A39C0] flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Agents Métiers</h1>
            <p className="text-xs text-white/50">Fiches métiers</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive ? "active" : ""}`}
            >
              <Icon className="nav-item-icon" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto pt-8 border-t border-white/10">
        <div className="px-4 py-3">
          <p className="text-xs text-white/40">Version 2.0</p>
          <p className="text-xs text-white/40">Next.js + FastAPI</p>
        </div>
      </div>
    </aside>
  );
}
