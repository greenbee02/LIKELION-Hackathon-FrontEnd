import { request } from './client';

/**
 * `/cards/{cardId}/ai-resources` — the card's artwork, generated rather than picked.
 * See dev/active/scope-vs-backend.md §4-A.
 *
 * **There is no push channel.** `POST` answers 202 with `PENDING` and returns; the only way to
 * learn that a resource finished is to ask again. That is why this module exposes a plain `GET`
 * and the flow above it owns an interval — the waiting is a designed state, not a gap between
 * two calls.
 */

export type AiResourceType =
  | 'BACKGROUND'
  | 'BORDER'
  | 'PATTERN'
  | 'PRODUCT_ANGLE'
  | 'DECORATION'
  | 'COLOR_PALETTE'
  | 'TEXT_STYLE'
  | 'COMPOSITION';

export type GenerationStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REJECTED' | 'ARCHIVED';

export type AiResource = {
  id: string;
  cardId: string;
  resourceType: AiResourceType;
  generationStatus: GenerationStatus;
  imageUrl: string | null;
};

/**
 * The four an issuance asks for, in the order they are shown.
 *
 * The backend defines eight types but documents no request body for `POST`, so this list is the
 * frontend's assumption and the one thing to check first when this runs live. The other four
 * (decoration, palette, text style, composition) belong to the customisation screen, which is a
 * later decision — issuing a card should not wait on artwork nobody has asked for yet.
 */
export const ISSUE_RESOURCE_TYPES = [
  'BACKGROUND',
  'BORDER',
  'PATTERN',
  'PRODUCT_ANGLE',
] as const satisfies readonly AiResourceType[];

export type IssueResourceType = (typeof ISSUE_RESOURCE_TYPES)[number];

/** What each one is called on screen. The backend's enum never reaches the customer. */
export const RESOURCE_LABELS: Record<IssueResourceType, string> = {
  BACKGROUND: '배경',
  BORDER: '테두리',
  PATTERN: '패턴',
  PRODUCT_ANGLE: '상품 컷',
};

/** 202 + `PENDING`. The response body is not useful — the `GET` below is what carries state. */
export const requestAiResources = (cardId: string, types: readonly AiResourceType[]) =>
  request<unknown>(`/cards/${cardId}/ai-resources`, {
    method: 'POST',
    body: JSON.stringify({ resourceTypes: types }),
  });

export const fetchAiResources = (cardId: string) =>
  request<AiResource[]>(`/cards/${cardId}/ai-resources`);
