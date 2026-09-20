import type { BeoEvent } from "../types";

/** Start of the event in minutes after midnight, from text like "6:00 PM – 9:00 PM" or "18:00 - 21:00". */
export function startMinutes(time: string | null | undefined): number {
  const m = (time || "").match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!m) return 24 * 60 + 1; // no time set: goes last in its day
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const ap = m[3]?.toUpperCase();
  if (ap === "PM" && h < 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return h * 60 + min;
}

/** Sort by date, then by start time, then by name. Use with array.sort(compareEvents). */
export function compareEvents(a: BeoEvent, b: BeoEvent): number {
  return (
    a.event_date.localeCompare(b.event_date) ||
    startMinutes(a.event_time) - startMinutes(b.event_time) ||
    (a.name || "").localeCompare(b.name || "")
  );
}
