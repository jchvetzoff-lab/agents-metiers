/**
 * Enhanced list components for rendering enriched data safely
 */

import React from "react";
import { toLabel } from "@/lib/utils";
import { validateEnrichedArray } from "@/lib/data-validation";
import { SafeRender } from "./SafeRender";

interface EnrichedListProps {
  items: any[];
  className?: string;
  itemClassName?: string;
  color?: string;
  fallback?: React.ReactNode;
  maxItems?: number;
}

/**
 * Enhanced BulletList that handles enriched data safely
 */
export const EnrichedBulletList: React.FC<EnrichedListProps> = ({
  items,
  className = "space-y-2.5",
  itemClassName,
  color = "#4F46E5",
  fallback = null,
  maxItems
}) => {
  const validItems = validateEnrichedArray(items);
  
  if (validItems.length === 0) {
    return fallback;
  }
  
  const displayItems = maxItems ? validItems.slice(0, maxItems) : validItems;
  const hasMore = maxItems && validItems.length > maxItems;
  
  return (
    <ul className={className}>
      {displayItems.map((item, i) => (
        <li key={i} className={`flex items-start gap-3 ${itemClassName || ""}`}>
          <span 
            className="w-2 h-2 rounded-full shrink-0 mt-2" 
            style={{ backgroundColor: color }}
          />
          <SafeRender 
            data={item} 
            className="text-[15px] text-gray-700 leading-relaxed"
          />
        </li>
      ))}
      {hasMore && (
        <li className="flex items-start gap-3 text-sm text-gray-500 italic">
          <span 
            className="w-2 h-2 rounded-full shrink-0 mt-2 opacity-50" 
            style={{ backgroundColor: color }}
          />
          <span>... et {validItems.length - maxItems} autres</span>
        </li>
      )}
    </ul>
  );
};

/**
 * Enhanced NumberedList that handles enriched data safely
 */
export const EnrichedNumberedList: React.FC<EnrichedListProps> = ({
  items,
  className = "space-y-3",
  itemClassName,
  color = "#4F46E5",
  fallback = null,
  maxItems
}) => {
  const validItems = validateEnrichedArray(items);
  
  if (validItems.length === 0) {
    return fallback;
  }
  
  const displayItems = maxItems ? validItems.slice(0, maxItems) : validItems;
  const hasMore = maxItems && validItems.length > maxItems;
  
  return (
    <div className={className}>
      {displayItems.map((item, i) => (
        <div key={i} className={`flex items-start gap-3 ${itemClassName || ""}`}>
          <span 
            className="flex items-center justify-center w-7 h-7 rounded-lg text-white text-xs font-bold shrink-0 mt-0.5" 
            style={{ backgroundColor: color }}
          >
            {i + 1}
          </span>
          <SafeRender 
            data={item}
            className="text-[15px] text-gray-700 leading-relaxed pt-0.5"
          />
        </div>
      ))}
      {hasMore && (
        <div className="flex items-start gap-3 text-sm text-gray-500 italic">
          <span 
            className="flex items-center justify-center w-7 h-7 rounded-lg text-white text-xs font-bold shrink-0 mt-0.5 opacity-50" 
            style={{ backgroundColor: color }}
          >
            ...
          </span>
          <span className="pt-0.5">... et {validItems.length - maxItems} autres</span>
        </div>
      )}
    </div>
  );
};

interface TagListProps extends EnrichedListProps {
  variant?: "default" | "colored";
  colors?: string[];
}

/**
 * Tag list for displaying enriched data as tags/badges
 */
export const EnrichedTagList: React.FC<TagListProps> = ({
  items,
  className = "flex flex-wrap gap-2",
  variant = "default",
  colors = [
    "#EEF2FF", "#F0FDF4", "#FFF7ED", "#FDF2F8", "#F0F9FF", "#FAF5FF"
  ],
  fallback = null,
  maxItems
}) => {
  const validItems = validateEnrichedArray(items);
  
  if (validItems.length === 0) {
    return fallback;
  }
  
  const displayItems = maxItems ? validItems.slice(0, maxItems) : validItems;
  const hasMore = maxItems && validItems.length > maxItems;
  
  return (
    <div className={className}>
      {displayItems.map((item, i) => {
        const bgColor = variant === "colored" ? colors[i % colors.length] : undefined;
        const textColors = ["#4338CA", "#15803D", "#C2410C", "#BE185D", "#0369A1", "#7E22CE"];
        const textColor = variant === "colored" ? textColors[i % textColors.length] : undefined;
        
        return (
          <span
            key={i}
            className="px-3 py-1.5 rounded-full text-sm font-medium"
            style={variant === "colored" ? {
              backgroundColor: bgColor,
              color: textColor,
            } : {}}
          >
            <SafeRender data={item} />
          </span>
        );
      })}
      {hasMore && (
        <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
          +{validItems.length - maxItems} autres
        </span>
      )}
    </div>
  );
};

/**
 * Compact inline list for displaying enriched data inline
 */
export const EnrichedInlineList: React.FC<EnrichedListProps & {
  separator?: string;
  prefix?: string;
  suffix?: string;
}> = ({
  items,
  className = "text-sm text-gray-600",
  separator = ", ",
  prefix = "",
  suffix = "",
  maxItems,
  fallback = null
}) => {
  const validItems = validateEnrichedArray(items);
  
  if (validItems.length === 0) {
    return fallback;
  }
  
  const displayItems = maxItems ? validItems.slice(0, maxItems) : validItems;
  const hasMore = maxItems && validItems.length > maxItems;
  
  const text = displayItems.map(toLabel).join(separator);
  const moreText = hasMore ? ` (+${validItems.length - maxItems})` : "";
  
  return (
    <span className={className}>
      {prefix}{text}{moreText}{suffix}
    </span>
  );
};

export default {
  BulletList: EnrichedBulletList,
  NumberedList: EnrichedNumberedList,
  TagList: EnrichedTagList,
  InlineList: EnrichedInlineList,
};