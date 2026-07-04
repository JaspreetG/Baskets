import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calculates the exact calendar days difference between two dates in Asia/Kolkata timezone.
 * Completely immune to local browser/system timezone differences.
 */
export function getISTDaysDiff(date1: Date | string, date2: Date | string): number {
  const d1Str = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(date1)); // MM/DD/YYYY
  
  const d2Str = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(date2)); // MM/DD/YYYY
  
  const [m1, r1, y1] = d1Str.split("/");
  const [m2, r2, y2] = d2Str.split("/");
  
  const utc1 = Date.UTC(Number(y1), Number(m1) - 1, Number(r1));
  const utc2 = Date.UTC(Number(y2), Number(m2) - 1, Number(r2));
  
  return Math.max(0, Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24)));
}
