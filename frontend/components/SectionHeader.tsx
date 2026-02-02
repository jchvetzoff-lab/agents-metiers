interface SectionHeaderProps {
  badge?: string;
  title: string;
  description?: string;
}

export default function SectionHeader({ badge, title, description }: SectionHeaderProps) {
  return (
    <div className="section-header">
      {badge && (
        <div className="badge badge-purple mb-6">
          {badge}
        </div>
      )}
      <h2 className="section-title">{title}</h2>
      {description && (
        <p className="section-description">{description}</p>
      )}
    </div>
  );
}
