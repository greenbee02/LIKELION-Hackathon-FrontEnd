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
      category: 'Bag',
      imageUrl: null,
      limited: true,
      material: 'Coated canvas, leather trim',
      origin: 'Italy',
      warrantyMonths: 24,
      careInfo: '마른 천으로 닦고 직사광선을 오래 받지 않게 보관하세요.',
      season: '26SS',
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
      category: 'Bag',
      imageUrl: null,
      limited: false,
      material: 'Calf leather',
      origin: 'Korea',
      warrantyMonths: 12,
      careInfo: '사용하지 않을 때는 더스트백에 보관하세요.',
      season: '26SS',
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
      category: 'Scarf',
      imageUrl: null,
      limited: false,
      material: 'Silk twill',
      origin: 'France',
      warrantyMonths: 12,
      careInfo: '드라이클리닝만 가능합니다.',
      season: '25AW',
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
      category: 'Bag',
      imageUrl: null,
      limited: true,
      material: 'Coated canvas',
      origin: 'Italy',
      warrantyMonths: 24,
      careInfo: '마른 천으로 닦아 보관하세요.',
      season: '26SS',
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
      category: 'Belt',
      imageUrl: null,
      limited: false,
      material: 'Calf leather',
      origin: 'France',
      warrantyMonths: 12,
      careInfo: '습기를 피해 보관하세요.',
      season: '26SS',
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
  PRODUCT_ANGLE: 5600,
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
    generationStatus:
      elapsed < SCHEDULE_MS[type]
        ? ('PENDING' as const)
        : type === 'PATTERN' && patternFails
          ? ('FAILED' as const)
          : ('COMPLETED' as const),
    imageUrl: null,
  }));
}
