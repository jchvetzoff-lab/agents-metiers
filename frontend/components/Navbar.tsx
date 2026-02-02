"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Accueil", icon: "🏠" },
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/fiches", label: "Fiches", icon: "📋" },
  { href: "/actions", label: "Actions", icon: "🔧" },
  { href: "/guide", label: "Guide", icon: "📖" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-border-subtle backdrop-blur-sm bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            <span className="text-xl font-serif font-bold gradient-text">
              Agents Métiers
            </span>
          </Link>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-pill text-sm font-medium transition-all ${
                    isActive
                      ? "bg-primary-purple text-white"
                      : "text-text-dark hover:bg-background-light"
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
