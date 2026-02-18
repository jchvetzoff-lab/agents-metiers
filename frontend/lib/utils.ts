/**
 * Utilities for data handling and rendering
 */

/**
 * Converts an enriched data item (object or string) to a displayable label.
 * 
 * The AI enrichment returns objects like:
 * - {"nom": "Compétence", "niveau": "avancé", "categorie": "technique"}
 * - {"nom": "Formation", "niveau": "Bac+3", "duree": "3 ans"}
 * 
 * But sometimes we also have plain strings. This function handles both cases.
 * 
 * @param item - Can be a string, an object with 'nom' field, or other object
 * @returns A displayable string
 */
export function toLabel(item: any): string {
  // Already a string
  if (typeof item === "string") return item;
  
  // Null or undefined
  if (!item) return "";
  
  // Object with common naming fields
  if (typeof item === "object") {
    // Try common French field names first
    if (item.nom) return String(item.nom);
    if (item.name) return String(item.name);
    if (item.label) return String(item.label);
    if (item.libelle) return String(item.libelle);
    if (item.titre) return String(item.titre);
    
    // For other objects, try to construct a meaningful label
    const values = Object.values(item).filter(v => 
      typeof v === "string" && v.trim().length > 0
    );
    
    if (values.length > 0) {
      return values.join(" — ");
    }
    
    // Last resort: JSON stringify
    return JSON.stringify(item);
  }
  
  // Fallback for primitives
  return String(item);
}

/**
 * Type guard to check if an array contains enriched objects vs plain strings
 */
export function hasEnrichedObjects(arr: any[]): boolean {
  return arr.length > 0 && typeof arr[0] === "object" && arr[0] !== null;
}

/**
 * Safely convert an array of mixed string/object items to labels
 */
export function toLabels(items: any[]): string[] {
  return items.map(toLabel);
}

/**
 * Get a safe display name for a person (handles objects with nom_masculin, nom_feminin, etc.)
 */
export function getDisplayName(item: any, genre: "masculin" | "feminin" | "epicene" = "epicene"): string {
  if (typeof item === "string") return item;
  if (!item || typeof item !== "object") return "";
  
  // Try gender-specific names first
  if (genre === "feminin" && item.nom_feminin) return item.nom_feminin;
  if (genre === "masculin" && item.nom_masculin) return item.nom_masculin;
  if (item.nom_epicene) return item.nom_epicene;
  
  // Fallback to generic nom
  return toLabel(item);
}

/**
 * Converts any value to a safe string for debugging/logging
 */
export function toSafeString(value: any): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  
  try {
    return JSON.stringify(value, null, 2);
  } catch (e) {
    return `[Object: ${typeof value}]`;
  }
}