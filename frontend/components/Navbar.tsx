"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { removeToken } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";

const NAV_ITEMS = [
  {
    href: "/actions",
    label: "Actions",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    )
  },
  {
    href: "/fiches",
    label: "Fiches",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Hide on scroll down, show on scroll up (robust for fast scrolls)
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          const y = window.scrollY;
          if (y < 20) { setVisible(true); }
          else if (y > lastScrollY.current) { setVisible(false); setMobileOpen(false); }
          else { setVisible(true); }
          lastScrollY.current = y;
          ticking = false;
        });
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = () => { removeToken(); router.push("/login"); };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-[100] transition-transform duration-300 ${visible ? "translate-y-0" : "-translate-y-full"}`}
      style={{ backdropFilter: "blur(24px) saturate(1.5)", WebkitBackdropFilter: "blur(24px) saturate(1.5)", background: "rgba(255,255,255,0.85)", borderBottom: "1px solid rgba(0,0,0,0.06)" }}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center text-white text-sm md:text-xl font-bold shadow-md"
              style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED, #EC4899)" }}>
              AM
            </div>
            <span className="font-bold text-base md:text-lg text-gray-900 group-hover:text-indigo-600 transition-colors">Agents Métiers</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href}
                  className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive ? "text-indigo-600" : "text-gray-700 hover:text-indigo-600 hover:bg-indigo-50"}`}>
                  {item.icon}<span>{item.label}</span>
                  {isActive && (
                    <motion.div layoutId="navbar-active" className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                      style={{ background: "linear-gradient(90deg, #4F46E5, #EC4899)" }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                  )}
                </Link>
              );
            })}
            <button onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all ml-2" title="Déconnexion">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 -mr-2 rounded-lg text-gray-600 hover:bg-gray-100 transition" aria-label="Menu">
            {mobileOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }} className="md:hidden border-t border-gray-200/50 overflow-hidden"
            style={{ background: "rgba(255,255,255,0.98)" }}>
            <div className="px-4 py-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${isActive ? "bg-indigo-600 text-white shadow-md" : "text-gray-700 hover:bg-gray-50"}`}>
                    {item.icon}<span>{item.label}</span>
                  </Link>
                );
              })}
              <button onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all w-full">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Déconnexion</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
