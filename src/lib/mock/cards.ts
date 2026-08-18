import type { Brand, Card, Reward } from '../types';

/**
 * Stand-in data until the backend exposes `brand` and the product detail fields.
 *
 * Two houses on purpose: this is a multi-brand platform, and a collection that only ever shows
 * one brand hides every layout problem the second one causes.
 */
export const BRANDS: Record<string, Brand> = {
  mcm: { id: 'mcm', name: 'MCM', accent: '#7B5E3B' },
  atelier: { id: 'atelier', name: 'Atelier Rouge', accent: '#8E2A3A' },
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
      name: 'Visetos Seoul Exclusive Backpack',
      category: 'Backpack',
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
    serialNumber: 'MCM-TT-0117',
    brand: BRANDS.mcm,
    product: {
      id: 'p2',
      name: 'Tracery Card Wallet',
      category: 'Wallet',
      imageUrl: null,
      limited: false,
      material: 'Calf leather',
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
    serialNumber: 'ATR-SC-0009',
    brand: BRANDS.atelier,
    product: {
      id: 'p3',
      name: 'Soie Carré Scarf',
      category: 'Scarf',
      imageUrl: null,
      limited: false,
      material: 'Silk twill',
      origin: 'France',
      warrantyMonths: 12,
      careInfo: 'Dry clean only.',
      season: '25AW',
    },
    store: { id: 's3', name: 'Busan Shinsegae', country: 'KR', city: 'Busan' },
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
  {
    id: 'r3',
    brandId: 'atelier',
    kind: 'EVENT',
    title: 'Atelier Private Preview',
    collection: 'Global Travel Collection',
    progress: 1,
    total: 3,
  },
];
