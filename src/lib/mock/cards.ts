import type { Brand, Card, Reward } from '../types';

/**
 * Stand-in data until the backend exposes `brand` and the product detail fields.
 *
 * `imageUrl` is null throughout on purpose: it mirrors the DTO, and the DTO has no image yet. The
 * artwork these cards actually show is bundled, in `mock/card-art.ts`, and `cardArtSource` is
 * what picks between the two.
 *
 * One house at the moment, which is a gap rather than a decision. This is a multi-brand platform,
 * and a mock that only ever shows one brand hides every layout problem the second one causes —
 * and leaves the collection screen's brand filter with nothing to choose, so it stays hidden. A
 * second house comes back as soon as there is artwork for one.
 */
export const BRANDS: Record<string, Brand> = {
  mcm: { id: 'mcm', name: 'MCM', accent: '#7B5E3B', logoUrl: null },
};

export const MOCK_CARDS: Card[] = [
  {
    id: 'c1',
    cardType: 'COLLECTOR',
    status: 'ACTIVE',
    purchaseDate: '2026-07-14T04:20:00Z',
    issuedAt: '2026-07-14T04:22:11Z',
    serialNumber: 'MCM-SE-0042',
    brand: BRANDS.mcm,
    product: {
      id: 'p1',
      name: 'Visetos Original Cabin Trolley',
      category: 'Trolley',
      imageUrl: null,
      limited: true,
      material: 'Coated canvas, leather trim',
      origin: 'Italy',
      warrantyMonths: 24,
      careInfo: 'Wipe with a dry cloth. Keep away from prolonged sunlight.',
      season: '26SS',
    },
    store: { id: 's1', name: 'Cheongdam Flagship', country: 'KR', city: 'Seoul' },
  },
  {
    id: 'c2',
    cardType: 'BASIC',
    status: 'ACTIVE',
    purchaseDate: '2026-06-02T09:05:00Z',
    issuedAt: '2026-06-02T09:06:40Z',
    serialNumber: 'MCM-DS-0117',
    brand: BRANDS.mcm,
    product: {
      id: 'p2',
      name: 'Dessau Drawstring Bag',
      category: 'Shoulder bag',
      imageUrl: null,
      limited: false,
      material: 'Embossed calf leather',
      origin: 'Korea',
      warrantyMonths: 12,
      careInfo: 'Store in the dust bag when unused.',
      season: '26SS',
    },
    store: { id: 's2', name: 'Myeongdong Store', country: 'KR', city: 'Seoul' },
  },
  {
    id: 'c3',
    cardType: 'CUSTOMIZE',
    status: 'ACTIVE',
    purchaseDate: '2026-04-21T02:40:00Z',
    issuedAt: '2026-04-21T02:41:03Z',
    serialNumber: 'MCM-KN-0231',
    brand: BRANDS.mcm,
    product: {
      id: 'p3',
      name: 'Chevron Intarsia Wool Cardigan',
      category: 'Knitwear',
      imageUrl: null,
      limited: false,
      material: 'Wool blend',
      origin: 'Italy',
      warrantyMonths: 12,
      careInfo: 'Dry clean only. Store folded, never on a hanger.',
      season: '25AW',
    },
    store: { id: 's3', name: 'Galeries Lafayette Paris', country: 'FR', city: 'Paris' },
  },
  {
    id: 'c4',
    cardType: 'BASIC',
    status: 'ACTIVE',
    purchaseDate: '2026-03-08T11:15:00Z',
    issuedAt: '2026-03-08T11:16:22Z',
    serialNumber: 'MCM-BZ-0088',
    brand: BRANDS.mcm,
    product: {
      id: 'p4',
      name: 'Bouclé Trim Wool Blazer',
      category: 'Outerwear',
      imageUrl: null,
      limited: false,
      material: 'Wool bouclé, gold-tone hardware',
      origin: 'Italy',
      warrantyMonths: 12,
      careInfo: 'Dry clean only. Brush along the grain after wear.',
      season: '26SS',
    },
    store: { id: 's4', name: 'MCM Champs-Élysées', country: 'FR', city: 'Paris' },
  },
];

export const MOCK_REWARDS: Reward[] = [
  {
    id: 'r1',
    brandId: 'mcm',
    kind: 'EVENT',
    title: '26SS Runway Invitation',
    collection: 'Seoul Exclusive',
    progress: 2,
    total: 4,
  },
  {
    id: 'r2',
    brandId: 'mcm',
    kind: 'BENEFIT',
    title: 'MCM Icons Premium Care',
    collection: 'MCM Icons',
    progress: 1,
    total: 5,
  },
];
