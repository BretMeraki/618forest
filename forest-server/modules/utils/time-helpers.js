/*
 * Time Helpers Utility
 * Provides robust time parsing utilities with context awareness.
 */

/**
 * Parse a 12-hour clock time string (e.g. "7:00 AM", "12:00 AM") into minutes since midnight.
 * Adds optional semantic context so 12:00 AM can be treated as either start-of-day (0) or end-of-day (1440).
 *
 * @param {string} timeStr – Human readable time.
 * @param {('wake'|'sleep'|'meal'|'generic')} [context='generic'] – How the value is used.
 *        • "wake"  – 12:00 AM → 0 (start of day)
 *        • "sleep" – 12:00 AM → 1440 (end of day)
 *        • others  – defaults to 0.
 * @returns {number} Minutes since midnight (0-1440)
 */
export function parseTimeWithContext(timeStr = '', context = 'generic') {
  if (!timeStr || typeof timeStr !== 'string') {
    return 0;
  }

  const [rawTime, rawPeriod] = timeStr.trim().split(' ');
  if (!rawTime) {return 0;}

  const period = (rawPeriod || '').toUpperCase();
  let [hours, minutes] = rawTime.split(':').map(num => parseInt(num, 10));
  if (Number.isNaN(hours)) {return 0;}
  if (Number.isNaN(minutes)) {minutes = 0;}

  // Normalize into 24-hour.
  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    // Midnight edge-case: interpret based on context
    if (context === 'sleep') {
      // Treat as end of previous day → 24:00
      return 24 * 60;
    }
    hours = 0; // start of day
  }

  return hours * 60 + minutes;
}

// Shortcut wrapper that mimics old signature (kept for backwards compatibility).
export function parseTime(timeStr) {
  return parseTimeWithContext(timeStr, 'generic');
}