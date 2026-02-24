"use client";

interface VariantesCheckboxesProps {
  genres: Set<string>;
  setGenres: (s: Set<string>) => void;
  tranches: Set<string>;
  setTranches: (s: Set<string>) => void;
  formats: Set<string>;
  setFormats: (s: Set<string>) => void;
  langues: Set<string>;
  setLangues: (s: Set<string>) => void;
}

function toggle(set: Set<string>, setFn: (s: Set<string>) => void, val: string) {
  const next = new Set(set);
  if (next.has(val)) next.delete(val);
  else next.add(val);
  setFn(next);
}

export default function VariantesCheckboxes({
  genres,
  setGenres,
  tranches,
  setTranches,
  formats,
  setFormats,
  langues,
  setLangues,
}: VariantesCheckboxesProps) {
  const total = genres.size * tranches.size * formats.size * langues.size;

  return (
    <div className="space-y-2.5">
      <div>
        <h5 className="text-xs font-semibold text-gray-300 mb-1.5">Genre grammatical</h5>
        <div className="flex gap-3">
          {[
            { v: "masculin", l: "Masculin" },
            { v: "feminin", l: "Féminin" },
            { v: "epicene", l: "Épicène" },
          ].map((g) => (
            <label key={g.v} className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={genres.has(g.v)}
                onChange={() => toggle(genres, setGenres, g.v)}
                className="w-3.5 h-3.5 rounded border-white/[0.1] text-indigo-400 focus:ring-indigo-500"
              />
              {g.l}
            </label>
          ))}
        </div>
      </div>
      <div>
        <h5 className="text-xs font-semibold text-gray-300 mb-1.5">Tranche d&apos;âge</h5>
        <div className="flex gap-3">
          {[
            { v: "18+", l: "Adultes (18+)" },
            { v: "15-18", l: "Ados (15-18)" },
            { v: "11-15", l: "Jeunes (11-15)" },
          ].map((t) => (
            <label key={t.v} className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={tranches.has(t.v)}
                onChange={() => toggle(tranches, setTranches, t.v)}
                className="w-3.5 h-3.5 rounded border-white/[0.1] text-indigo-400 focus:ring-indigo-500"
              />
              {t.l}
            </label>
          ))}
        </div>
      </div>
      <div>
        <h5 className="text-xs font-semibold text-gray-300 mb-1.5">Format</h5>
        <div className="flex gap-3">
          {[
            { v: "standard", l: "Standard" },
            { v: "falc", l: "FALC" },
          ].map((f) => (
            <label key={f.v} className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formats.has(f.v)}
                onChange={() => toggle(formats, setFormats, f.v)}
                className="w-3.5 h-3.5 rounded border-white/[0.1] text-indigo-400 focus:ring-indigo-500"
              />
              {f.l}
            </label>
          ))}
        </div>
      </div>
      <div>
        <h5 className="text-xs font-semibold text-gray-300 mb-1.5">Langues</h5>
        <div className="flex flex-wrap gap-3">
          {[
            { v: "fr", l: "Français" },
            { v: "en", l: "Anglais" },
            { v: "es", l: "Espagnol" },
            { v: "it", l: "Italien" },
            { v: "pt", l: "Portugais" },
            { v: "ar", l: "Arabe" },
            { v: "de", l: "Allemand" },
          ].map((lang) => (
            <label key={lang.v} className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={langues.has(lang.v)}
                onChange={() => toggle(langues, setLangues, lang.v)}
                className="w-3.5 h-3.5 rounded border-white/[0.1] text-indigo-400 focus:ring-indigo-500"
              />
              {lang.l}
            </label>
          ))}
        </div>
      </div>
      <div className="text-xs font-medium text-indigo-400">
        {total > 0
          ? `${total} variante${total > 1 ? "s" : ""} à générer`
          : "Sélectionnez au moins une option par axe"}
      </div>
    </div>
  );
}
