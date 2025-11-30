// client/src/lib/utils.ts

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Tailwind class-merging helper (shadcn)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format-ar verð á einfaldan hátt (kr. án aukastafa).
 */
export function formatPrice(value?: number | null): string {
  if (value == null || isNaN(value)) return "";
  return `${Math.round(value).toLocaleString("is-IS")} kr.`;
}

/**
 * Reiknar afslátt í % út frá upphafs- og útsöluverði.
 * Skilar null ef ekki er hægt að reikna skynsamlegan afslátt.
 */
export function calculateDiscount(
  original?: number | null,
  sale?: number | null,
): number | null {
  if (
    original == null ||
    sale == null ||
    isNaN(original) ||
    isNaN(sale) ||
    original <= 0 ||
    sale >= original
  ) {
    return null;
  }
  const diff = original - sale;
  const pct = (diff / original) * 100;
  return Math.round(pct);
}

/**
 * Reiknar hversu mikið er eftir af tíma fram að endsAt.
 *
 * Tekur við:
 * - ISO-streng (t.d. "2025-12-16T23:59:59.000Z")
 * - Date hluti
 * - eða null/undefined
 *
 * Skilar:
 * - null ef endsAt vantar, er ógilt eða er liðið
 * - annars { days, hours, minutes, totalMs }
 *
 * Mikilvægt: notar ALDREI .getTime() á undefined.
 */
export function getTimeRemaining(endsAt?: string | Date | null): {
  days: number;
  hours: number;
  minutes: number;
  totalMs: number;
} | null {
  if (!endsAt) return null;

  let endTs: number;

  if (endsAt instanceof Date) {
    endTs = endsAt.getTime();
  } else if (typeof endsAt === "string") {
    const parsed = Date.parse(endsAt);
    if (!Number.isFinite(parsed)) {
      return null;
    }
    endTs = parsed;
  } else {
    // Önnur týpa en string/Date → ekki reyna að vinna úr því
    return null;
  }

  const nowTs = Date.now();
  const diff = endTs - nowTs;

  if (diff <= 0) {
    // Útrunnið tilboð
    return null;
  }

  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  return {
    days,
    hours,
    minutes,
    totalMs: diff,
  };
}
