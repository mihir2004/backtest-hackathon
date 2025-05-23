import moment from "moment-timezone";

const TIMEZONE = "Asia/Kolkata";

/**
 * Format a Date object to YYYY-MM-DD string
 * @param date The date to format
 */

export function formatDate(date: Date): string {
  // TODO: Implement date formatting functionality
  return moment(date).tz(TIMEZONE).format("YYYY-MM-DD");
}
/**
 * Convert time string to Date object
 * @param dateStr Date string in YYYY-MM-DD format
 * @param timeStr Time string in HH:MM format
 */
export function createDateTime(dateStr: string, timeStr: string): Date {
  // TODO: Create a Date object from date string and time string
  return moment
    .tz(`${dateStr} ${timeStr}`, "YYYY-MM-DD HH:mm", TIMEZONE)
    .toDate();
}

/**
 * Check if a time is within a specific range
 * @param time The time to check (HH:MM format)
 * @param startTime Range start time (HH:MM format)
 * @param endTime Range end time (HH:MM format)
 */
export function isTimeInRange(
  time: string,
  startTime: string,
  endTime: string
): boolean {
  // TODO: Implement time range check functionality
  const t = moment(time, "HH:mm");
  const start = moment(startTime, "HH:mm");
  const end = moment(endTime, "HH:mm");
  return t.isSameOrAfter(start) && t.isSameOrBefore(end);
}

/**
 * Get the last N trading days
 * @param n Number of trading days to retrieve
 */
