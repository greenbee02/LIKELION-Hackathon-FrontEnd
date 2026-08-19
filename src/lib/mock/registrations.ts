import { ApiError } from '../api/client';
import { ISSUE_RESOURCE_TYPES, type AiResource } from '../api/ai-resources';
import type { Card } from '../types';
import { BRANDS } from './cards';

/**
 * The scan flow's stand-in backend.
 *
 * `src/lib/mock/cards.ts` holds the collection a returning customer already has; this file holds
 * what a receipt turns into, which is a different job — it needs tokens, a memory of which ones
 * have been spent, and a clock for artwork that is not instant. Kept apart so neither file has to
 * know about the other's concerns.
 *
 * The demo tokens match the backend seed: `MCM-DEMO-2026-001` … `-010`.
 */

/** A spent token cannot be spent again, which is the whole of `QR_ALREADY_USED`. */
const consumed = new Set<string>();

/** Tokens that exist only to make the error branches walkable in a demo. */
const EXPIRED_TOKEN = 'MCM-DEMO-EXPIRED-001';
const NO_TEMPLATE_TOKEN = 'MCM-DEMO-NOTMPL-001';

/** `-010` issues normally but its pattern generation fails, so that branch is demoable too. */
const PATTERN_FAILS_ON = 'MCM-DEMO-2026-010';

type Blueprint = {
  serial: string;
  brandId: keyof typeof BRANDS;
  product: Card['product'];
  store: Card['store'];
  cardType: Card['cardType'];
};

const CHEONGDAM: Card['store'] = { id: 's1', name: 'Cheongdam Flagship', country: 'KR', city: 'Seoul' };
const MYEONGDONG: Card['store'] = { id: 's2', name: 'Myeongdong Store', country: 'KR', city: 'Seoul' };
const BUSAN: Card['store'] = { id: 's3', name: 'Busan Shinsegae', country: 'KR', city: 'Busan' };

/**
 * Ten receipts, cycled over the ten tokens. Two houses and three stores on purpose: a demo that
 * only ever issues the same card hides every layout problem the second one causes.
 */
const BLUEPRINTS: Blueprint[] = [
  {
    serial: 'MCM-VS-0301',
    brandId: 'mcm',
    cardType: 'COLLECTOR',
    store: CHEONGDAM,
    product: {
      id: 'p-demo-1',
      name: 'Visetos Original Shoulder Bag',
      code: 'MWXAAVI02BK004',
      category: '가방',
      imageUrl: null,
      limited: true,
      material: '코팅 캔버스 · 레더 트림',
      origin: '이탈리아',
      warrantyMonths: 24,
      warrantyInfo: '구매일로부터 24개월간 제조상 결함에 한해 무상 수선됩니다. 사용 중 생긴 흠집과 변색은 제외됩니다.',
      careInfo: '마른 천으로 닦고 직사광선을 오래 받지 않게 보관하세요.',
      season: '26SS',
      collection: { id: 'aw26-new', name: '2026 New Arrivals' },
    },
  },
  {
    serial: 'MCM-AR-0188',
    brandId: 'mcm',
    cardType: 'BASIC',
    store: MYEONGDONG,
    product: {
      id: 'p-demo-2',
      name: 'Aren Small Crossbody',
      code: 'MWXAAAR01BK005',
      category: '가방',
      imageUrl: null,
      limited: false,
      material: '카프 레더',
      origin: '대한민국',
      warrantyMonths: 12,
      warrantyInfo: '제조상 결함에 한해 무상 수선됩니다. 가죽의 자연스러운 색 변화는 하자가 아닙니다.',
      careInfo: '사용하지 않을 때는 더스트백에 보관하세요.',
      season: '26SS',
      collection: { id: 'aw26-new', name: '2026 New Arrivals' },
    },
  },
  {
    serial: 'ATR-PL-0044',
    brandId: 'atelier',
    cardType: 'BASIC',
    store: BUSAN,
    product: {
      id: 'p-demo-3',
      name: 'Plissé Silk Scarf',
      code: 'ATR-SC-PL0044',
      category: '스카프',
      imageUrl: null,
      limited: false,
      material: '실크 트윌',
      origin: '프랑스',
      warrantyMonths: 12,
      warrantyInfo: '봉제와 프린트 결함에 한해 무상 수선됩니다. 세탁으로 인한 손상은 제외됩니다.',
      careInfo: '드라이클리닝만 가능합니다.',
      season: '25AW',
      collection: { id: 'atelier-signature', name: 'Atelier Signature' },
    },
  },
  {
    serial: 'MCM-TT-0620',
    brandId: 'mcm',
    cardType: 'COLLECTOR',
    store: CHEONGDAM,
    product: {
      id: 'p-demo-4',
      name: 'Tracery Seoul Exclusive Tote',
      code: 'MWXAATR04CO006',
      category: '가방',
      imageUrl: null,
      limited: true,
      material: '코팅 캔버스',
      origin: '이탈리아',
      warrantyMonths: 24,
      warrantyInfo: '구매일로부터 24개월간 제조상 결함에 한해 무상 수선됩니다. 사용 중 생긴 흠집과 변색은 제외됩니다.',
      careInfo: '마른 천으로 닦아 보관하세요.',
      season: '26SS',
      collection: { id: 'seoul-exclusive', name: 'Seoul Exclusive' },
    },
  },
  {
    serial: 'ATR-CB-0077',
    brandId: 'atelier',
    cardType: 'BASIC',
    store: BUSAN,
    product: {
      id: 'p-demo-5',
      name: 'Cabas Leather Belt',
      code: 'ATR-BT-CB0077',
      category: '벨트',
      imageUrl: null,
      limited: false,
      material: '카프 레더',
      origin: '프랑스',
      warrantyMonths: 12,
      warrantyInfo: '버클과 봉제 결함에 한해 무상 수선됩니다. 가죽의 자연스러운 색 변화는 하자가 아닙니다.',
      careInfo: '습기를 피해 보관하세요.',
      season: '26SS',
      collection: { id: 'atelier-signature', name: 'Atelier Signature' },
    },
  },
];

const tokenIndex = (token: string): number | null => {
  const match = /^MCM-DEMO-2026-(\d{3})$/.exec(token);
  if (!match) return null;
  const n = Number(match[1]);
  return n >= 1 && n <= 10 ? n : null;
};

const pad = (n: number) => String(n).padStart(3, '0');

/**
 * The mock's own `POST /cards/registrations`. It throws `ApiError` rather than returning a result
 * union so the mock and live paths fail the same way and the flow above needs no branch.
 */
export function registerMockCard(token: string): Card {
  const normalized = token.trim().toUpperCase();

  if (normalized === EXPIRED_TOKEN) throw new ApiError('QR_EXPIRED', 'token expired');
  if (normalized === NO_TEMPLATE_TOKEN) throw new ApiError('CARD_TEMPLATE_NOT_FOUND', 'no template');

  const index = tokenIndex(normalized);
  if (index === null) throw new ApiError('QR_TOKEN_INVALID', 'unknown token');
  if (consumed.has(normalized)) throw new ApiError('QR_ALREADY_USED', 'token already used');

  consumed.add(normalized);

  const blueprint = BLUEPRINTS[(index - 1) % BLUEPRINTS.length];
  // The purchase is minutes old, not weeks — a receipt is scanned in the store.
  const now = new Date();
  const purchased = new Date(now.getTime() - 6 * 60 * 1000);

  return {
    id: `c-demo-${pad(index)}`,
    cardType: blueprint.cardType,
    status: 'ACTIVE',
    purchaseDate: purchased.toISOString(),
    issuedAt: now.toISOString(),
    serialNumber: `${blueprint.serial}-${pad(index)}`,
    brand: BRANDS[blueprint.brandId],
    product: blueprint.product,
    store: blueprint.store,
  };
}

/**
 * Generation is a clock, not a queue.
 *
 * `POST` only records when the card's artwork was asked for; each `GET` reads the current time
 * against that and reports what would have finished by now. The staggered schedule is the point —
 * four resources that all appear at once would let a spinner stand in for the screen, and the
 * whole reason this state is designed is that they do not.
 */
const startedAt = new Map<string, number>();

const SCHEDULE_MS: Record<(typeof ISSUE_RESOURCE_TYPES)[number], number> = {
  BACKGROUND: 1500,
  BORDER: 2800,
  PATTERN: 4200,
};

export function requestMockAiResources(cardId: string): void {
  if (!startedAt.has(cardId)) startedAt.set(cardId, Date.now());
}

export function fetchMockAiResources(cardId: string): AiResource[] {
  const started = startedAt.get(cardId);
  const elapsed = started === undefined ? 0 : Date.now() - started;
  const patternFails = cardId === `c-demo-${pad(tokenIndex(PATTERN_FAILS_ON) ?? 10)}`;

  return ISSUE_RESOURCE_TYPES.map((type) => ({
    id: `${cardId}-${type.toLowerCase()}`,
    cardId,
    resourceType: type,
    status:
      elapsed < SCHEDULE_MS[type]
        ? ('PENDING' as const)
        : type === 'PATTERN' && patternFails
          ? ('FAILED' as const)
          : ('COMPLETED' as const),
    generatedImageUrl: null,
    generatedData: null,
    createdAt: new Date(started ?? Date.now()).toISOString(),
  }));
}
