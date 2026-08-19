import { useCallback, useEffect, useRef, useState } from 'react';

import {
  composeAiResources,
  CUSTOM_RESOURCE_TYPES,
  fetchAiResources,
  requestAiResources,
  type CustomResourceType,
  type GenerationStatus,
} from './api/ai-resources';
import { createCustomization, selectCustomization } from './api/customizations';
import { USE_MOCK } from './config';
import {
  mockComposeCustomization,
  mockCreateCustomization,
  mockFetchAiResources,
  mockRequestAiResources,
} from './mock/customizations';
import type { CardCustomization } from './types';

/**
 * 카드를 꾸미는 동안 벌어지는 일.
 *
 * 발급(`issue-flow.ts`)과 같은 계약을 쓴다 — 요청은 202 와 `PENDING` 만 돌려주고 푸시 채널이
 * 없으므로 끝났는지는 다시 물어봐야 안다. 그래서 폴링이 여기에도 있다.
 *
 * **다만 발급처럼 모듈 레벨 run 을 두지 않는다.** 그쪽이 언마운트를 넘겨 살아남아야 하는
 * 이유는 QR 토큰이 1회용이라 다시 등록할 수 없기 때문이다. 꾸미기는 몇 번이든 다시 만들 수
 * 있고, 무엇보다 **진행 상태를 서버가 들고 있다** — 화면을 떠났다 돌아오면 `GET /ai-resources`
 * 가 이미 끝난 것들을 그대로 돌려준다. 클라이언트가 같은 사실을 한 벌 더 들고 있을 이유가 없다.
 */

export type DesignPhase = 'choose' | 'generating' | 'preview' | 'error';

export type DesignResource = { type: CustomResourceType; status: GenerationStatus };

const POLL_MS = 900;
/** 이보다 오래 걸리면 기다림이 환영받지 못한다. 나갈 길이 생긴다. */
const PATIENCE_MS = 25_000;
/** 여기까지 오면 폴링을 멈춘다. 서버는 계속 만들고 있을 수 있다. */
const MAX_MS = 90_000;

const idle: DesignResource[] = CUSTOM_RESOURCE_TYPES.map((type) => ({ type, status: 'PENDING' }));

function done(resources: DesignResource[]) {
  return resources.every((r) => r.status !== 'PENDING');
}

export function useCardDesign(cardId: string) {
  const [phase, setPhase] = useState<DesignPhase>('choose');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [resources, setResources] = useState<DesignResource[]>(idle);
  const [customization, setCustomization] = useState<CardCustomization | null>(null);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const began = useRef(0);

  /**
   * 고른 디자인으로 만들기를 시작한다.
   *
   * 커스텀 한 벌을 먼저 만들고(그래야 무엇의 자원인지 서버가 안다) 네 종류를 한 번에
   * 요청한다. 넷은 임의의 수가 아니라 `minItems: 3, maxItems: 4` 가 정한 상한이다.
   */
  const start = useCallback(
    (chosen: string) => {
      setTemplateId(chosen);
      setResources(idle);
      setSlow(false);
      setError(null);
      setPhase('generating');
      began.current = Date.now();

      void (async () => {
        try {
          if (USE_MOCK) {
            mockCreateCustomization(cardId, chosen);
            mockRequestAiResources(cardId);
          } else {
            await createCustomization(cardId, { templateId: chosen });
            await requestAiResources(cardId, CUSTOM_RESOURCE_TYPES, chosen);
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : '만들기를 시작하지 못했습니다.');
          setPhase('error');
        }
      })();
    },
    [cardId],
  );

  /* 만들어지는 동안만 묻는다. 다 끝났거나 화면이 다른 단계에 있으면 묻지 않는다. */
  useEffect(() => {
    if (phase !== 'generating') return;
    let alive = true;

    const ask = async () => {
      try {
        const list = USE_MOCK ? mockFetchAiResources(cardId) : await fetchAiResources(cardId);
        if (!alive) return;

        /* 응답에는 발급 때 만든 배경·테두리·패턴도 섞여 있다. 이 화면이 요청한 넷만 본다. */
        const mine = CUSTOM_RESOURCE_TYPES.map<DesignResource>((type) => {
          const found = list.find((r) => r.resourceType === type);
          return { type, status: found?.status ?? 'PENDING' };
        });
        setResources(mine);

        const elapsed = Date.now() - began.current;
        if (elapsed > PATIENCE_MS) setSlow(true);
        if (done(mine) || elapsed > MAX_MS) setPhase('preview');
      } catch {
        /* 한 번 실패했다고 흐름을 끊지 않는다 — 다음 물음에서 회복될 수 있다. */
      }
    };

    void ask();
    const timer = setInterval(() => void ask(), POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [phase, cardId]);

  /**
   * 만들어진 것들을 한 장으로 합쳐 이 카드의 얼굴로 삼는다.
   *
   * 합성 결과가 커스텀 한 벌이고, 그것을 `select` 로 고르는 것까지가 저장이다. 고르기가
   * 실패해도 합성은 남으므로 여기서 흐름을 끊지 않는다 — 다시 눌러 고르면 된다.
   */
  const save = useCallback(
    async (message?: string): Promise<CardCustomization | null> => {
      try {
        if (USE_MOCK) {
          const made = mockComposeCustomization(cardId, message);
          setCustomization(made);
          return made;
        }
        const list = await fetchAiResources(cardId);
        const ids = list
          .filter((r) => r.status === 'COMPLETED')
          .filter((r) => (CUSTOM_RESOURCE_TYPES as readonly string[]).includes(r.resourceType))
          .map((r) => r.id);

        const result = await composeAiResources(cardId, { resourceIds: ids, message });
        const made = result.customization
          ? {
              id: result.customization.id,
              status: result.customization.status,
              frontImageUrl: result.customization.generatedFrontImageUrl,
              backImageUrl: result.customization.generatedBackImageUrl,
              message: result.customization.generatedMessage,
              createdAt: result.customization.createdAt,
            }
          : null;

        if (made) {
          setCustomization(made);
          try {
            await selectCustomization(cardId, made.id);
          } catch {
            /* 합성은 남는다. 고르기만 다시 하면 된다. */
          }
        }
        return made;
      } catch (e) {
        setError(e instanceof Error ? e.message : '저장하지 못했습니다.');
        return null;
      }
    },
    [cardId],
  );

  /** 처음으로. 고른 디자인을 버리고 목록으로 돌아간다. */
  const reset = useCallback(() => {
    setPhase('choose');
    setResources(idle);
    setTemplateId(null);
    setSlow(false);
    setError(null);
  }, []);

  return { phase, templateId, resources, customization, slow, error, start, save, reset };
}
