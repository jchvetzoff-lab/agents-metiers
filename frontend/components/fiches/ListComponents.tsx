"use client";

const PURPLE = "#4F46E5";

export function BulletList({ items, color = PURPLE }: { items: string[]; color?: string }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="w-2 h-2 rounded-full shrink-0 mt-2" style={{ backgroundColor: color }} />
          <span className="text-[15px] text-gray-300 leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function NumberedList({ items, color = PURPLE }: { items: string[]; color?: string }) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-3">
          <span
            className="flex items-center justify-center w-7 h-7 rounded-lg text-white text-xs font-bold shrink-0 mt-0.5"
            style={{ backgroundColor: color }}
          >
            {i + 1}
          </span>
          <span className="text-[15px] text-gray-300 leading-relaxed pt-0.5">{item}</span>
        </div>
      ))}
    </div>
  );
}

export function ServiceLink({ icon, title, desc, url }: { icon: string; title: string; desc: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-4 p-4 rounded-xl border border-white/[0.08] hover:border-indigo-500 hover:shadow-lg transition-all bg-[#0c0c1a] group"
    >
      <span className="text-2xl shrink-0">{icon}</span>
      <div className="min-w-0">
        <div className="font-semibold text-white group-hover:text-indigo-400 transition-colors text-sm">{title}</div>
        <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
      </div>
      <svg
        className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 shrink-0 ml-auto mt-1 transition-colors"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        />
      </svg>
    </a>
  );
}

export function SourceTag({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 text-[11px] text-gray-500 italic flex items-center gap-1">
      <svg className="w-3 h-3 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <circle cx="12" cy="12" r="10" strokeWidth="2" />
        <path strokeLinecap="round" d="M12 16v-4m0-4h.01" strokeWidth="2" />
      </svg>
      {children}
    </p>
  );
}
