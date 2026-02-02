interface MetricCardProps {
  label: string;
  value: string | number;
  delta?: string;
  icon?: string;
}

export default function MetricCard({ label, value, delta, icon = "📊" }: MetricCardProps) {
  const deltaColor = delta?.startsWith("+") ? "text-primary-purple" : "text-primary-pink";

  return (
    <div className="sojai-card">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="text-xs text-text-muted uppercase tracking-wide mb-2">
            {label}
          </div>
          <div className="text-3xl font-bold text-primary-purple mb-1">
            {value}
          </div>
          {delta && (
            <div className={`text-sm font-semibold ${deltaColor}`}>
              {delta}
            </div>
          )}
        </div>
        <div className="text-3xl opacity-50">{icon}</div>
      </div>
    </div>
  );
}
