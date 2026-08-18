import { ApiError, request } from './client';
import { colors } from '@/theme/colors';
import type { Card, CardStatus, CardType } from '../types';

/**
 * `POST /cards/registrations` — the one endpoint that turns a receipt into a card.
 * See dev/active/scope-vs-backend.md §1.
 *
 * The four codes below are the whole reason this module exists as more than one line: each one
 * leaves the customer somewhere different, so the screen branches on the code rather than on
 * "did it fail". Anything else that comes back is a network or server problem and is treated as
 * one — retryable, not the customer's doing.
 */
export const REGISTRATION_ERROR_CODES = [
  'QR_TOKEN_INVALID',
  'QR_ALREADY_USED',
  'QR_EXPIRED',
  'CARD_TEMPLATE_NOT_FOUND',
] as const;

export type RegistrationErrorCode = (typeof REGISTRATION_ERROR_CODES)[number];

/** Everything the flow can end on. `UNKNOWN` covers the network and the server's bad days. */
export type IssueErrorCode = RegistrationErrorCode | 'UNKNOWN';

export function issueErrorCodeOf(e: unknown): IssueErrorCode {
  if (e instanceof ApiError && (REGISTRATION_ERROR_CODES as readonly string[]).includes(e.code)) {
    return e.code as RegistrationErrorCode;
  }
  return 'UNKNOWN';
}

/** The backend's `CardResponse`, verbatim — fields it does not send are not invented here. */
export type CardResponse = {
  id: string;
  originalCardType: CardType;
  cardType: CardType;
  status: CardStatus;
  purchaseDate: string;
  issuedAt: string;
  serialNumber: string;
  product: {
    id: string;
    name: string;
    offeringType: string;
    category: string;
    imageUrl: string | null;
    limited: boolean;
  };
  store: { id: string; name: string; country: string; city: string };
  template: {
    id: string;
    name: string;
    frontImageUrl: string | null;
    backImageUrl: string | null;
    allowedCardType: CardType;
  };
  selectedCustomization: unknown | null;
};

/**
 * `CardResponse` → `Card`.
 *
 * The gap is `brand`, which the DTO does not expose yet (§5-1) even though every catalogue table
 * is scoped by `brand_id`. Until it lands the house is read off the serial's prefix — `MCM-SE-0042`
 * is MCM's — which is a guess with a short life: the moment the field arrives this function loses
 * three lines and no screen changes. The accent is a token rather than a colour, because a brand
 * we cannot name is a brand whose colour we do not have.
 */
export function toCard(res: CardResponse): Card {
  const code = res.serialNumber.split('-')[0] ?? 'UNKNOWN';

  return {
    id: res.id,
    cardType: res.cardType,
    status: res.status,
    purchaseDate: res.purchaseDate,
    issuedAt: res.issuedAt,
    serialNumber: res.serialNumber,
    brand: { id: code.toLowerCase(), name: code, accent: colors.solid, logoUrl: null },
    product: {
      id: res.product.id,
      name: res.product.name,
      category: res.product.category,
      imageUrl: res.product.imageUrl,
      limited: res.product.limited,
    },
    store: res.store,
  };
}

export const registerCard = (qrToken: string) =>
  request<CardResponse>('/cards/registrations', {
    method: 'POST',
    body: JSON.stringify({ qrToken }),
  });
