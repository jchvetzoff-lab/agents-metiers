"use client";

interface TensionBarProps {
  value: number; // 0 to 1
  showLabel?: boolean;
}

export function TensionBar({ value, showLabel = true }: TensionBarProps) {
  const percentage = Math.round(value * 100);

  let colorClass = "tension-low";
  if (value > 0.7) {
    colorClass = "tension-high";
  } else if (value > 0.4) {
    colorClass = "tension-medium";
  }

  return (
    <div className="flex items-center gap-3">
      <div className="tension-bar flex-1">
        <div
          className={`tension-fill ${colorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-sm font-medium text-[#1A1A2E] w-12 text-right">
          {percentage}%
        </span>
      )}
    </div>
  );
}
