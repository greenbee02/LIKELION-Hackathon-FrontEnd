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
  return stamp(d);
}

/**
 * When the warranty runs out, in the same stamp as every other date.
 *
 * The backend sends a length (`warrantyMonths`), not a date, so the only place the customer can
 * be told the thing they actually want to know — *until when* — is here. "24개월" is arithmetic
 * homework handed to someone holding a receipt; the passport should answer it.
 *
 * Month arithmetic overflows the way JavaScript's does: a purchase on the 31st with a 12-month
 * warranty lands on the 1st of the following month rather than the 30th. That is a day either
 * way on a two-year guarantee, and correcting it would mean deciding whose calendar rule to
 * follow — the brand's, and the brand has not said.
 */
export function formatWarrantyExpiry(iso: string, months: number): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  d.setMonth(d.getMonth() + months);
  return stamp(d);
}

function stamp(d: Date): string {
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}.${month}.${day}`;
}
