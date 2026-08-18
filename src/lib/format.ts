/**
 * Formatting at the edge of the UI.
 *
 * The store keeps what the backend sends — ISO-8601 UTC — and nothing above it converts. These
 * are the only place a timestamp becomes a string a customer reads.
 */

/**
 * `2026.07.14`, always, on every device.
 *
 * Deliberately not `toLocaleDateString`: the locale version changes length between devices
 * (`2026. 7. 14.` vs `Jul 14, 2026`), and in a two-column grid a date that changes width breaks
 * the alignment of every row under it. A fixed format also means the demo looks the same whatever
 * the phone in the room is set to.
 */
export function formatPurchaseDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}.${month}.${day}`;
}
