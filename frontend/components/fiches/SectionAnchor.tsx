"use client";

import { ReactNode } from "react";

const PURPLE = "#4F46E5";

interface SectionAnchorProps {
  id: string;
  title: string;
  icon: string;
  children: ReactNode;
  accentColor?: string;
}

export default function SectionAnchor({ id, title, icon, children, accentColor }: SectionAnchorProps) {
  const ac = accentColor || PURPLE;
  return (
    <section id={id} className="scroll-mt-24">
      <div
        className="bg-[#0c0c1a] rounded-2xl border border-white/[0.06] shadow-card overflow-hidden hover:shadow-card-hover transition-shadow duration-500"
        style={{ borderLeft: `3px solid ${ac}` }}
      >
        <div
          className="flex items-center gap-3 px-6 md:px-8 py-5 border-b border-white/[0.06]"
          style={{ background: `linear-gradient(135deg, ${ac}08 0%, ${ac}03 50%, transparent 100%)` }}
        >
          <span className="flex items-center justify-center w-9 h-9 rounded-xl text-lg" style={{ backgroundColor: `${ac}15` }}>
            {icon}
          </span>
          <h2 className="text-lg md:text-xl font-bold text-white">{title}</h2>
        </div>
        <div className="px-6 md:px-8 py-6">{children}</div>
      </div>
    </section>
  );
}
