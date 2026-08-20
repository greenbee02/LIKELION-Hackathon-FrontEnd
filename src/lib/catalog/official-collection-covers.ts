/**
 * Demo fallback covers for the five seeded official collections.
 *
 * The API is the source of truth: these images are used only while the
 * corresponding `coverImageUrl` has not been populated in seed data.
 */
const covers: Record<string, number> = {
  'Seoul Exclusive': require('../../../assets/collection-covers/seoul-exclusive.jpg'),
  '2026 New Arrivals': require('../../../assets/collection-covers/new-arrivals.jpg'),
  "Women's Signature": require('../../../assets/collection-covers/womens-signature.jpg'),
  'Global Travel Collection': require('../../../assets/collection-covers/global-travel.jpg'),
  'MCM Icons': require('../../../assets/collection-covers/mcm-icons.jpg'),
};

export function officialCollectionCover(name: string): number | null {
  return covers[name] ?? null;
}
