import type { Brand, Card } from '../types';

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
  /* The second house. It issues no card in `MOCK_CARDS` — this collection is deliberately one
     brand, so the collection screen's brand filter stays hidden until there is artwork for a
     second — but `mock/registrations.ts` hands out its cards, and a blueprint naming a house that
     is not in this map resolves to `undefined` and takes `CardFace` down with it. `logoUrl` is
     null, so it signs its cards with its name set in type: a supported state, not a gap. */
  atelier: { id: 'atelier', name: 'Atelier', accent: '#3B4A5E', logoUrl: null },
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
      code: 'MWT9AVI01CO001',
      category: '트롤리',
      imageUrl: null,
      limited: true,
      material: '코팅 캔버스 · 레더 트림',
      origin: '이탈리아',
      warrantyMonths: 24,
      warrantyInfo: '구매일로부터 24개월간 제조상 결함에 한해 무상 수선됩니다. 사용 중 생긴 흠집과 변색은 제외됩니다.',
      careInfo: '마른 천으로 닦고 직사광선을 오래 받지 않게 보관하세요.',
      season: '26SS',
      collection: { id: 'seoul-exclusive', name: 'Seoul Exclusive' },
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
      code: 'MWXAADS03BK002',
      category: '숄더백',
      imageUrl: null,
      limited: false,
      material: '엠보싱 카프 레더',
      origin: '대한민국',
      warrantyMonths: 12,
      warrantyInfo: '제조상 결함에 한해 무상 수선됩니다. 가죽의 자연스러운 색 변화는 하자가 아닙니다.',
      careInfo: '사용하지 않을 때는 더스트백에 보관하세요.',
      season: '26SS',
      collection: { id: 'aw26-new', name: '2026 New Arrivals' },
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
      code: 'MFCADCH02BE001',
      category: '니트웨어',
      imageUrl: null,
      limited: false,
      material: '울 혼방',
      origin: '이탈리아',
      warrantyMonths: 12,
      warrantyInfo: '봉제와 편직 결함에 한해 무상 수선됩니다. 착용 마모와 보풀은 제외됩니다.',
      careInfo: '드라이클리닝만 가능합니다. 옷걸이에 걸지 말고 접어서 보관하세요.',
      season: '25AW',
      collection: { id: 'womens-signature', name: "Women's Signature" },
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
      code: 'MFJAABO01BK003',
      category: '아우터',
      imageUrl: null,
      limited: false,
      material: '울 부클레 · 골드 톤 하드웨어',
      origin: '이탈리아',
      warrantyMonths: 12,
      warrantyInfo: '봉제와 부자재 결함에 한해 무상 수선됩니다. 드라이클리닝 과정에서 생긴 손상은 제외됩니다.',
      careInfo: '드라이클리닝만 가능합니다. 착용 후 결을 따라 브러시로 손질하세요.',
      season: '26SS',
      collection: { id: 'womens-signature', name: "Women's Signature" },
    },
    store: { id: 's4', name: 'MCM Champs-Élysées', country: 'FR', city: 'Paris' },
  },
];
