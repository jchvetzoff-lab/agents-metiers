/**
 * Data validation and sanitization utilities for enriched data
 */

import { toLabel } from "./utils";

/**
 * Validates and sanitizes an array of enriched data items
 * Ensures all items can be safely rendered
 */
export function validateEnrichedArray(items: any[]): any[] {
  if (!Array.isArray(items)) {
    console.warn("validateEnrichedArray: input is not an array", items);
    return [];
  }
  
  return items.filter(item => {
    if (item === null || item === undefined) return false;
    if (typeof item === "string" && item.trim() === "") return false;
    if (typeof item === "object" && Object.keys(item).length === 0) return false;
    return true;
  });
}

/**
 * Converts an array of enriched items to safe strings for rendering
 */
export function toSafeStringArray(items: any[]): string[] {
  const validItems = validateEnrichedArray(items);
  return validItems.map(toLabel);
}

/**
 * Validates that an enriched object has required fields for display
 */
export function validateEnrichedObject(obj: any, requiredFields: string[] = ['nom']): boolean {
  if (!obj || typeof obj !== "object") return false;
  
  return requiredFields.some(field => 
    obj[field] && typeof obj[field] === "string" && obj[field].trim().length > 0
  );
}

/**
 * Type guard to check if data is in enriched format (objects) vs legacy format (strings)
 */
export function isEnrichedData(items: any[]): boolean {
  if (!Array.isArray(items) || items.length === 0) return false;
  
  // Check if first item is an object with common enriched fields
  const firstItem = items[0];
  if (typeof firstItem === "object" && firstItem !== null) {
    return ['nom', 'name', 'label', 'libelle', 'titre'].some(field => field in firstItem);
  }
  
  return false;
}

/**
 * Safely extracts display text from potentially mixed data (strings or objects)
 */
export function extractDisplayText(value: any): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object") {
    return toLabel(value);
  }
  return "";
}

/**
 * Validates aptitude data structure
 */
export function validateAptitudes(aptitudes: any[]): Array<{nom: string; niveau: number}> {
  if (!Array.isArray(aptitudes)) return [];
  
  return aptitudes
    .filter(apt => 
      apt && 
      typeof apt === "object" && 
      apt.nom && 
      typeof apt.nom === "string" &&
      typeof apt.niveau === "number" &&
      apt.niveau >= 1 && 
      apt.niveau <= 5
    )
    .map(apt => ({
      nom: apt.nom.trim(),
      niveau: Math.round(apt.niveau)
    }));
}

/**
 * Validates and cleans salary data
 */
export function validateSalaryData(salaires: any): any {
  if (!salaires || typeof salaires !== "object") return null;
  
  const cleanSalaryLevel = (level: any) => {
    if (!level || typeof level !== "object") return null;
    
    const clean: Record<string, number> = {};
    ['min', 'max', 'median'].forEach(field => {
      if ((level as any)[field] && typeof (level as any)[field] === "number" && (level as any)[field] > 0) {
        clean[field] = Math.round((level as any)[field]);
      }
    });
    
    return Object.keys(clean).length > 0 ? clean : null;
  };
  
  const result: Record<string, any> = {};
  ['junior', 'confirme', 'senior'].forEach(level => {
    const cleaned = cleanSalaryLevel((salaires as any)[level]);
    if (cleaned) result[level] = cleaned;
  });
  
  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Error boundary for data rendering - returns safe fallback
 */
export function safeRender(data: any, fallback: string = ""): string {
  try {
    return extractDisplayText(data);
  } catch (error) {
    console.warn("safeRender: Error rendering data", data, error);
    return fallback;
  }
}