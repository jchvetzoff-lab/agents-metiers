/** Converts an enriched data item (object or string) to a displayable label. */
export function toLabel(item: any): string {
  if (typeof item === "string") return item;
  if (!item) return "";
  if (typeof item === "object") {
    if (item.nom) return String(item.nom);
    if (item.name) return String(item.name);
    if (item.label) return String(item.label);
    if (item.libelle) return String(item.libelle);
    const values = Object.values(item).filter(v => typeof v === "string" && (v as string).trim().length > 0);
    if (values.length > 0) return (values as string[]).join(" — ");
    return JSON.stringify(item);
  }
  return String(item);
}

/** Get display name with gender support (nom_masculin, nom_feminin, nom_epicene). */
export function getDisplayName(item: any, genre: "masculin" | "feminin" | "epicene" = "epicene"): string {
  if (typeof item === "string") return item;
  if (!item || typeof item !== "object") return "";
  if (genre === "feminin" && item.nom_feminin) return item.nom_feminin;
  if (genre === "masculin" && item.nom_masculin) return item.nom_masculin;
  if (item.nom_epicene) return item.nom_epicene;
  return toLabel(item);
}
