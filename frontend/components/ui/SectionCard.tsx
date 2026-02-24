"use client";

import { ReactNode } from "react";

interface SectionCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  headerExtra?: ReactNode;
}

export default function SectionCard({ title, subtitle, children, headerExtra }: SectionCardProps) {
  return (
    <div className="bg-[#0c0c1a] rounded-2xl border border-white/[0.06] overflow-hidden">
      <div className="px-6 md:px-8 py-5 border-b border-white/[0.06] bg-[#0c0c1a]/[0.02]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>
          {headerExtra}
        </div>
      </div>
      <div className="px-6 md:px-8 py-5">{children}</div>
    </div>
  );
}
