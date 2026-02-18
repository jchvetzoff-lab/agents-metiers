/**
 * SafeRender component - prevents React rendering errors with enriched data
 */

import React from "react";
import { toLabel, toSafeString } from "@/lib/utils";

interface SafeRenderProps {
  data: any;
  fallback?: string;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  style?: React.CSSProperties;
  children?: never; // Prevent children to avoid confusion
}

/**
 * Safely renders any data (strings, objects, etc.) preventing React errors
 */
export const SafeRender: React.FC<SafeRenderProps> = ({ 
  data, 
  fallback = "", 
  as: Component = "span",
  className,
  style
}) => {
  try {
    const displayText = toLabel(data);
    
    if (!displayText && !fallback) {
      return null;
    }
    
    return React.createElement(
      Component, 
      { className, style }, 
      displayText || fallback
    );
  } catch (error) {
    console.warn("SafeRender: Error rendering data", { data, error });
    return React.createElement(
      Component,
      { className, style },
      fallback
    );
  }
};

interface SafeListProps {
  items: any[];
  renderItem?: (item: any, index: number) => React.ReactNode;
  className?: string;
  itemClassName?: string;
  fallback?: React.ReactNode;
}

/**
 * Safely renders a list of enriched items
 */
export const SafeList: React.FC<SafeListProps> = ({
  items,
  renderItem,
  className,
  itemClassName,
  fallback = null
}) => {
  if (!Array.isArray(items) || items.length === 0) {
    return fallback;
  }
  
  const defaultRenderItem = (item: any, index: number) => (
    <SafeRender key={index} data={item} className={itemClassName} />
  );
  
  return (
    <div className={className}>
      {items.map(renderItem || defaultRenderItem)}
    </div>
  );
};

interface SafeArrayRenderProps {
  items: any[];
  separator?: string;
  maxItems?: number;
  className?: string;
  fallback?: string;
}

/**
 * Renders an array as a comma-separated string safely
 */
export const SafeArrayRender: React.FC<SafeArrayRenderProps> = ({
  items,
  separator = ", ",
  maxItems,
  className,
  fallback = ""
}) => {
  if (!Array.isArray(items) || items.length === 0) {
    return fallback ? <span className={className}>{fallback}</span> : null;
  }
  
  try {
    const processedItems = items
      .slice(0, maxItems || items.length)
      .map(toLabel)
      .filter(label => label.trim().length > 0);
    
    if (processedItems.length === 0) {
      return fallback ? <span className={className}>{fallback}</span> : null;
    }
    
    const text = processedItems.join(separator);
    const suffix = maxItems && items.length > maxItems ? ` (+${items.length - maxItems} autres)` : "";
    
    return <span className={className}>{text}{suffix}</span>;
  } catch (error) {
    console.warn("SafeArrayRender: Error rendering items", { items, error });
    return fallback ? <span className={className}>{fallback}</span> : null;
  }
};

export default SafeRender;