"use client";

import Link from "next/link";
import { ReactNode } from "react";

interface FicheListItemProps {
  codeRome: string;
  nom: string;
  statut?: string;
  version?: number;
  actions?: ReactNode;
  prefix?: ReactNode;
  onClick?: () => void;
  selected?: boolean;
}

const statutStyles: Record<string, string> = {
  en_validation: "bg-yellow-500/20 text-yellow-300",
  publiee: "bg-green-500/20 text-green-400",
};

export default function FicheListItem({
  codeRome,
  nom,
  statut,
  version,
  actions,
  prefix,
  onClick,
  selected,
}: FicheListItemProps) {
  const Wrapper = onClick ? "div" : "div";
  return (
    <div
      className={`flex items-center justify-between px-4 py-2.5 hover:bg-[#0c0c1a]/[0.03] transition ${
        onClick ? "cursor-pointer" : ""
      } ${selected ? "bg-indigo-500/10" : ""}`}
      onClick={onClick}
    >
      <div className="min-w-0 flex items-center gap-2">
        {prefix}
        <span className="text-xs font-bold text-indigo-400">{codeRome}</span>
        <span className="text-sm text-gray-300 truncate">{nom}</span>
        {statut && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              statutStyles[statut] || "bg-white/[0.06] text-gray-500"
            }`}
          >
            {statut}
          </span>
        )}
        {version != null && <span className="text-xs text-gray-500">v{version}</span>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0 ml-4">{actions}</div>}
    </div>
  );
}
