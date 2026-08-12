/**
 * Utility functions for GMT+3 (Europe/Kiev) timezone date calculations
 * and precise currency rounding.
 */

const KYIV_TIMEZONE = "Europe/Kiev";

/**
 * Formats a Date object or current time to YYYY-MM-DD string strictly in GMT+3 (Europe/Kiev).
 */
export function getKyivDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: KYIV_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(date); // Output format: YYYY-MM-DD
}

/**
 * Returns today's date string (YYYY-MM-DD) in GMT+3.
 */
export function getKyivTodayStr(): string {
  return getKyivDateString(new Date());
}

/**
 * Returns yesterday's date string (YYYY-MM-DD) in GMT+3.
 */
export function getKyivYesterdayStr(): string {
  const d = new Date();
  // Subtract 24 hours in milliseconds to shift safely, then format in GMT+3
  d.setTime(d.getTime() - 24 * 60 * 60 * 1000);
  return getKyivDateString(d);
}

/**
 * Converts a YYYY-MM-DD string (representing a calendar date in GMT+3)
 * into a UTC midnight Date object for consistent database storage and lookup.
 */
export function parseKyivDateToUTC(dateStr: string): Date {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date();
  }
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/**
 * Rounds a monetary amount to 2 decimal places with exact floating point protection.
 */
export function roundCurrency(amount: number): number {
  if (isNaN(amount) || !isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export interface KyivDateRange {
  startDateStr: string;
  endDateStr: string;
  startDateObj: Date;
  endDateObj: Date;
}

/**
 * Calculates start and end dates (string & Date object) for dashboard & API queries
 * based on selected period in GMT+3.
 */
export function getKyivDateRange(
  period: string,
  customStartStr?: string,
  customEndStr?: string
): KyivDateRange {
  const todayStr = getKyivTodayStr();

  let startDateStr = todayStr;
  let endDateStr = todayStr;

  if (period === "yesterday") {
    const yestStr = getKyivYesterdayStr();
    startDateStr = yestStr;
    endDateStr = yestStr;
  } else if (period === "last7") {
    const d = new Date();
    d.setTime(d.getTime() - 6 * 24 * 60 * 60 * 1000);
    startDateStr = getKyivDateString(d);
    endDateStr = todayStr;
  } else if (period === "last30") {
    const d = new Date();
    d.setTime(d.getTime() - 29 * 24 * 60 * 60 * 1000);
    startDateStr = getKyivDateString(d);
    endDateStr = todayStr;
  } else if (period === "month") {
    // First day of current month in Kyiv
    const nowKyivStr = todayStr; // YYYY-MM-DD
    const [year, month] = nowKyivStr.split("-");
    startDateStr = `${year}-${month}-01`;
    endDateStr = todayStr;
  } else if (period === "custom" && customStartStr && customEndStr) {
    startDateStr = customStartStr;
    endDateStr = customEndStr;
  }

  const startDateObj = parseKyivDateToUTC(startDateStr);
  
  // End date object covers the full end day up to 23:59:59.999 UTC
  const endDateObj = parseKyivDateToUTC(endDateStr);
  endDateObj.setUTCHours(23, 59, 59, 999);

  return {
    startDateStr,
    endDateStr,
    startDateObj,
    endDateObj
  };
}
