"use client";

import { FadeInView } from "@/components/motion";

interface SectionHeaderProps {
  badge?: string;
  title: string;
  description?: string;
}

export default function SectionHeader({ badge, title, description }: SectionHeaderProps) {
  return (
    <div className="section-header">
      {badge && (
        <FadeInView delay={0}>
          <span className="badge badge-purple mb-6 text-base hover:shimmer-bg transition-all cursor-default">
            {badge}
          </span>
        </FadeInView>
      )}
      <FadeInView delay={0.1}>
        <h2 className="section-title text-white">{title}</h2>
      </FadeInView>
      {description && (
        <FadeInView delay={0.2}>
          <p className="section-description text-gray-400">{description}</p>
        </FadeInView>
      )}
    </div>
  );
}
