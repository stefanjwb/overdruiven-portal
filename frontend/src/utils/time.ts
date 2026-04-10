/** Zet een tijdstring om naar Europees 24-uursformaat (HH:MM).
 *  Werkt met "14:30", "2:30 PM", "14:30:00", enz.
 */
export function formatTime(t: string | null | undefined): string {
  if (!t) return '';
  const match = t.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return t;
  let h = parseInt(match[1], 10);
  const m = match[2];
  const period = match[3]?.toUpperCase();
  if (period === 'AM' && h === 12) h = 0;
  if (period === 'PM' && h !== 12) h += 12;
  return `${String(h).padStart(2, '0')}:${m}`;
}
