interface SectionHeaderProps {
  badge?: string;
  title: string;
  description?: string;
}

export default function SectionHeader({ badge, title, description }: SectionHeaderProps) {
  return (
    <div className="section-header">
      {badge && (
        <span className="badge badge-purple mb-6 text-base animate-scale-in">
          {badge}
        </span>
      )}
      <h2 className="section-title animate-slide-up">{title}</h2>
      {description && (
        <p className="section-description animate-slide-up" style={{ animationDelay: "0.1s" }}>
          {description}
        </p>
      )}
    </div>
  );
}
