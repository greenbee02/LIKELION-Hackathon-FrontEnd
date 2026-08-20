import { ApiError, request } from './client';
import { hydrateCard, type CardResponse } from './cards';

/**
 * `POST /cards/registrations` — 영수증을 카드로 바꾸는 유일한 엔드포인트.
 *
 * 이 모듈이 한 줄이 아닌 이유는 오류 코드다. 각 코드는 고객을 서로 다른 곳에 남겨두므로,
 * 화면은 "실패했다"가 아니라 코드에 따라 갈라진다.
 */

/** QR 자체의 문제 — 고객이 다시 해볼 여지가 있거나, 최소한 무슨 일인지 말해줄 수 있다. */
export const QR_ERROR_CODES = ['QR_TOKEN_INVALID', 'QR_ALREADY_USED', 'QR_EXPIRED'] as const;

/**
 * QR 은 멀쩡한데 발급을 못 하는 경우.
 *
 * 다섯 가지지만 고객에게는 전부 같은 사건이다 — 브랜드 쪽 설정 문제이고, 고객이 할 수 있는
 * 일이 없다. **코드는 늘리되 화면은 늘리지 않는다**: 다섯 개의 사과문을 쓰는 대신 하나를
 * 정확히 쓰고, 원인은 로그에 남긴다.
 */
export const ISSUE_BLOCKED_CODES = [
  'CARD_TEMPLATE_NOT_FOUND',
  'TEMPLATE_INACTIVE',
  'TEMPLATE_CARD_TYPE_NOT_ALLOWED',
  'TEMPLATE_BRAND_MISMATCH',
  'PRODUCT_INACTIVE',
] as const;

export const REGISTRATION_ERROR_CODES = [...QR_ERROR_CODES, ...ISSUE_BLOCKED_CODES] as const;

export type RegistrationErrorCode = (typeof REGISTRATION_ERROR_CODES)[number];

/** 흐름이 끝날 수 있는 지점 전부. `UNKNOWN` 은 네트워크와 서버의 나쁜 날을 덮는다. */
export type IssueErrorCode = RegistrationErrorCode | 'AI_GENERATION_FAILED' | 'UNKNOWN';

export function issueErrorCodeOf(e: unknown): IssueErrorCode {
  if (e instanceof ApiError && (REGISTRATION_ERROR_CODES as readonly string[]).includes(e.code)) {
    return e.code as RegistrationErrorCode;
  }
  return 'UNKNOWN';
}

/** 발급이 막힌 다섯 코드는 한 화면으로 모인다. */
export const isIssueBlocked = (code: IssueErrorCode) =>
  (ISSUE_BLOCKED_CODES as readonly string[]).includes(code);

export type { CardResponse };

/** `GET /purchase-qrs/preview` — 등록 전에 영수증이 가리키는 상품을 확인한다. */
export type PurchaseQrPreview = {
  status: 'AVAILABLE' | 'USED' | 'EXPIRED';
  usable: boolean;
  purchaseDate: string;
  serialNumber: string | null;
  expiresAt: string | null;
  product: {
    id: string;
    productCode: string | null;
    name: string;
    imageUrl: string | null;
    limited: boolean;
  };
  store: {
    id: string;
    name: string;
    country: string;
    city: string;
  };
};

/**
 * 등록 전에 QR을 확인한다.
 *
 * 운영 서버의 미리보기는 로그인된 사용자가 호출하며, 사용된 QR이나 만료된 QR도 오류 대신
 * `usable: false` 상태로 돌려준다. 그래서 화면은 응답을 받은 뒤 등록 버튼을 결정한다.
 */
export async function fetchPurchaseQrPreview(qrToken: string): Promise<PurchaseQrPreview> {
  const token = qrToken.trim();
  return request<PurchaseQrPreview>(
    `/purchase-qrs/preview?qrToken=${encodeURIComponent(token)}`,
  );
}

/** 등록하고, 곧바로 상품 상세까지 채운 카드를 돌려준다. */
export async function registerCard(qrToken: string) {
  const res = await request<CardResponse>('/cards/registrations', {
    method: 'POST',
    body: JSON.stringify({ qrToken }),
  });
  return hydrateCard(res);
}
