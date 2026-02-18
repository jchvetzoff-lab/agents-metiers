import { motion } from "framer-motion";

interface Section {
  id: string;
  label: string;
  icon: string;
  show: boolean;
}

interface FicheNavProps {
  sections: Section[];
  activeSection: string;
}

export default function FicheNav({ sections, activeSection }: FicheNavProps) {
  return (
    <aside className="hidden lg:block w-60 shrink-0">
      <nav className="sticky top-24 space-y-1">
        {sections.map(s => (
          <a key={s.id} href={`#${s.id}`}
            className={`relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all ${
              activeSection === s.id ? "text-white font-medium" : "text-gray-600 hover:bg-gray-100"
            }`}>
            {activeSection === s.id && (
              <motion.div
                layoutId="sidebar-active"
                className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-lg shadow-sm"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10 text-base">{s.icon}</span>
            <span className="relative z-10">{s.label}</span>
          </a>
        ))}
      </nav>
    </aside>
  );
}