import { ApiError } from '../api/client';
import type { AiResource, CustomResourceType } from '../api/ai-resources';
import { CUSTOM_RESOURCE_TYPES } from '../api/ai-resources';
import type { CardCustomization } from '../types';

/**
 * 카드 꾸미기 — 목.
 *
 * `mock/registrations.ts` 와 같은 구조이고, **진행을 큐가 아니라 시계로 모델링하는 것**까지
 * 같다. 요청 시각을 적어두고 조회할 때마다 경과 시간을 재서 무엇이 끝났는지 답한다. 타이머를
 * 돌리지 않으므로 화면이 사라졌다 돌아와도 진행이 어긋나지 않는다 — 실서버의 폴링도 같은
 * 성질을 갖는다.
 *
 * 넷의 완료 시각을 다르게 둔 이유는 그것이 사실이기 때문이다. 진짜 생성도 네 개가 동시에
 * 끝나지 않고, 체크리스트가 하나씩 정착하는 모습이 대기를 읽히게 만든다.
 */

const SCHEDULE_MS: Record<CustomResourceType, number> = {
  DECORATION: 1600,
  COLOR_PALETTE: 2600,
  TEXT_STYLE: 3600,
  COMPOSITION: 4800,
};

/** 카드별 생성 시작 시각. */
const startedAt = new Map<string, number>();
/** 카드별로 만들어 둔 커스텀. 합성이 끝나야 생긴다. */
const composed = new Map<string, CardCustomization>();
/** 카드별로 고른 템플릿. 미리보기가 무엇을 보여줄지 정한다. */
const chosen = new Map<string, string>();

let sequence = 0;

export function mockCreateCustomization(
  cardId: string,
  templateId: string,
): { id: string; templateId: string } {
  sequence += 1;
  chosen.set(cardId, templateId);
  return { id: `cus-mock-${String(sequence).padStart(3, '0')}`, templateId };
}

export function mockRequestAiResources(cardId: string): void {
  startedAt.set(cardId, Date.now());
}

export function mockFetchAiResources(cardId: string): AiResource[] {
  const began = startedAt.get(cardId);
  if (!began) return [];
  const elapsed = Date.now() - began;

  return CUSTOM_RESOURCE_TYPES.map((resourceType) => ({
    id: `res-${cardId}-${resourceType}`,
    cardId,
    resourceType,
    status: elapsed >= SCHEDULE_MS[resourceType] ? 'COMPLETED' : 'PENDING',
    /* 목은 그림을 만들지 않는다. 주소가 `null` 이면 미리보기가 원래 얼굴로 떨어지는데,
       그건 실서버에서 생성이 실패했을 때와 같은 상태라 화면이 이미 다룰 줄 안다. */
    generatedImageUrl: null,
  }));
}

export function mockComposeCustomization(cardId: string, message?: string): CardCustomization {
  if (!startedAt.has(cardId)) {
    throw new ApiError('AI_RESOURCE_NOT_READY', '아직 만들어진 것이 없습니다.');
  }
  const made: CardCustomization = {
    id: `cus-mock-${cardId}`,
    status: 'COMPLETED',
    /* 합성 결과 그림도 없다. 카드는 원래 얼굴을 유지하고, 바뀌는 것은 새긴 한 줄뿐이다 —
       목이 할 수 있는 정직한 결과가 거기까지다. */
    frontImageUrl: null,
    backImageUrl: null,
    message: message ?? null,
    createdAt: new Date().toISOString(),
  };
  composed.set(cardId, made);
  return made;
}

export function mockRestoreOriginal(cardId: string): void {
  composed.delete(cardId);
  startedAt.delete(cardId);
  chosen.delete(cardId);
}

export function mockSelectedTemplate(cardId: string): string | undefined {
  return chosen.get(cardId);
}
