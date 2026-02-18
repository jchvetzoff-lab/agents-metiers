"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { removeToken } from "@/lib/auth";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { api, FicheMetier } from "@/lib/api";

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
  const { scrollY } = useScroll();
  const bgOpacity = useTransform(scrollY, [0, 100], [0.7, 0.95]);
  const borderOpacity = useTransform(scrollY, [0, 100], [0, 0.08]);

  // Search
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FicheMetier[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { setMobileOpen(false); setSearchOpen(false); setSearchQuery(""); }, [pathname]);

  // Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q || q.length < 2) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      const data = await api.getFiches({ search: q, limit: 5, offset: 0 });
      setSearchResults(data.results);
    } catch { setSearchResults([]); }
    setSearchLoading(false);
  }, []);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => doSearch(searchQuery), 300);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [searchQuery, doSearch]);

  const handleLogout = () => { removeToken(); router.push("/login"); };

  return (
    <motion.nav className="sticky top-0 z-[100]"
      style={{ backdropFilter: "blur(24px) saturate(1.5)", WebkitBackdropFilter: "blur(24px) saturate(1.5)" }}>
      <motion.div className="absolute inset-0"
        style={{ backgroundColor: `rgba(255, 255, 255, ${bgOpacity.get()})`, borderBottom: `1px solid rgba(0, 0, 0, ${borderOpacity.get()})` }} />
      <div className="relative" style={{ backdropFilter: "blur(24px) saturate(1.5)", background: "rgba(255,255,255,0.8)", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <motion.div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-md"
                style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED, #EC4899)" }}
                whileHover={{ rotate: 6, scale: 1.05 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
                AM
              </motion.div>
              <div>
                <div className="font-bold text-lg text-gray-900 group-hover:text-indigo-600 transition-colors">Agents Métiers</div>
                <div className="text-xs text-gray-500 hidden sm:block">By JAE Fondation</div>
              </div>
            </Link>

            {/* Desktop nav + search */}
            <div className="hidden md:flex items-center gap-1">
              {/* Search button */}
              <button onClick={() => { setSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 50); }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all mr-1"
                title="Recherche (Ctrl+K)">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="text-xs text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">⌘K</span>
              </button>

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

            {/* Mobile */}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition" aria-label="Menu">
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
              style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(24px)" }}>
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
      </div>

      {/* Search overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm" onClick={() => { setSearchOpen(false); setSearchQuery(""); }}>
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="max-w-xl mx-auto mt-24 bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input ref={searchInputRef} type="text" value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher une fiche métier..."
                  className="flex-1 text-lg outline-none placeholder-gray-400" autoFocus />
                <kbd className="text-xs text-gray-400 border border-gray-200 rounded px-2 py-1">Échap</kbd>
              </div>
              {searchQuery.length >= 2 && (
                <div className="max-h-80 overflow-y-auto">
                  {searchLoading ? (
                    <div className="p-6 text-center text-gray-400">Recherche en cours...</div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-6 text-center text-gray-400">Aucun résultat pour &quot;{searchQuery}&quot;</div>
                  ) : (
                    searchResults.map((fiche) => (
                      <Link key={fiche.code_rome} href={`/fiches/${fiche.code_rome}`}
                        onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                        className="flex items-center gap-4 px-5 py-3 hover:bg-indigo-50 transition-colors border-b border-gray-50 last:border-0">
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded">{fiche.code_rome}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">{fiche.nom_epicene || fiche.nom_masculin}</div>
                          {fiche.description_courte && <div className="text-xs text-gray-500 truncate">{fiche.description_courte}</div>}
                        </div>
                        {fiche.score_completude != null && (
                          <span className={`text-xs font-bold ${fiche.score_completude >= 80 ? "text-green-600" : fiche.score_completude >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                            {fiche.score_completude}%
                          </span>
                        )}
                      </Link>
                    ))
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
