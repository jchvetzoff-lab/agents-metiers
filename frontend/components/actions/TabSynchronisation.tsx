"use client";

import TabMiseAJour from "./TabMiseAJour";

export default function TabSynchronisation() {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 border border-indigo-500/20 rounded-xl p-5">
        <h3 className="text-sm font-bold text-white mb-1">Synchronisation ROME</h3>
        <p className="text-sm text-gray-400">
          Importez et synchronisez les fiches depuis le referentiel ROME de France Travail.
        </p>
      </div>
      <TabMiseAJour />
    </div>
  );
}
