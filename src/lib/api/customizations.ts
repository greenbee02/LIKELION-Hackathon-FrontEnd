import { request } from './client';
import { assetUrl } from '../config';
import type { CardCustomization } from '../types';

/**
 * 카드 커스터마이징 — `POST/GET /cards/{cardId}/customizations`,
 * `POST .../{customizationId}/select`, `POST /cards/{cardId}/restore-original`.
 *
 * 한 벌의 커스텀은 **템플릿 하나와 AI 가 만든 자원 몇 개의 합성 결과**다. 만드는 것과 고르는
 * 것이 나뉘어 있는 이유는 여러 벌을 만들어두고 그중 하나를 얼굴로 삼을 수 있기 때문이고,
 * 그래서 되돌리기(`restore-original`)가 삭제가 아니라 선택 해제로 존재한다.
 */

type CardCustomizationResponse = {
  id: string;
  cardId: string;
  templateId: string | null;
  inputImageUrl: string | null;
  inputText: string | null;
  generatedFrontImageUrl: string | null;
  generatedBackImageUrl: string | null;
  generatedMessage: string | null;
  customizationData: string | null;
  aiModel: string | null;
  status: string;
  createdAt: string;
};

/** 서버 쪽 이름을 화면 쪽 이름으로. `generated*` 의 "생성된"은 화면에서 뜻이 없다. */
export function toCustomization(res: CardCustomizationResponse): CardCustomization {
  return {
    id: res.id,
    status: res.status,
    frontImageUrl: assetUrl(res.generatedFrontImageUrl),
    backImageUrl: assetUrl(res.generatedBackImageUrl),
    message: res.generatedMessage,
    createdAt: res.createdAt,
  };
}

export type CustomizationInput = {
  templateId: string;
  /** 카드에 새길 한 줄. 없어도 된다. */
  inputText?: string;
};

export async function createCustomization(
  cardId: string,
  body: CustomizationInput,
): Promise<CardCustomization> {
  return toCustomization(
    await request<CardCustomizationResponse>(`/cards/${cardId}/customizations`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  );
}

export async function fetchCustomizations(cardId: string): Promise<CardCustomization[]> {
  const list = await request<CardCustomizationResponse[]>(`/cards/${cardId}/customizations`);
  return list.map(toCustomization);
}

export const selectCustomization = (cardId: string, customizationId: string) =>
  request<void>(`/cards/${cardId}/customizations/${customizationId}/select`, { method: 'POST' });

/**
 * 발급 때의 얼굴로 되돌린다.
 *
 * 커스텀을 지우는 것이 아니라 고르지 않은 상태로 두는 것이다. 그래서 편집 화면이 저장에
 * `Dialog` 로 한 번 더 묻지 않는다 — 되돌릴 수 있는 일에는 확인이 필요 없고, 확인을 요구하면
 * 꾸미는 일이 위험한 일처럼 보인다.
 */
export const restoreOriginalCard = (cardId: string) =>
  request<void>(`/cards/${cardId}/restore-original`, { method: 'POST' });
