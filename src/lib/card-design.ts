import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  GENERATABLE_IMAGE_TYPES,
  composeAiResources,
  fetchAiResources,
  isArchived,
  isPending,
  requestCandidates,
  toCandidate,
  type AiGenerationOptions,
  type AiResourceType,
  type Candidate,
  type ImageResourceType,
} from './api/ai-resources';
import { selectCustomization } from './api/customizations';
import { assetUrl } from './config';
import { failureMessage } from './api/errors';
import { buildComposeBody, validateComposeBody } from './card-compose';
import {
  applyComposition,
  initialLayers,
  moveLayer,
  removeLayer as dropLayer,
  makeLayer,
  replaceLayer,
  syncSelection,
} from './card-layers';
import type {
  Card,
  CardCustomization,
  CardLayer,
  CardLayerType,
  CardTemplate,
  TemplateResource,
  Uuid,
} from './types';

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
 *
 * ## 후보 그룹은 서버가 만든다
 *
 * V8 이후 `POST /ai-resources` 한 번이 `candidateGroupId` 하나에 `candidateCount` 개의 행을
 * 만들고, 모든 응답이 그 id 와 `candidateIndex` 를 싣고 온다. 그래서 이 훅은 **어느 넷이 한
 * 배치인지 추측하지 않는다** — 예전에는 요청 응답의 id 를 `useRef` 에 기억하고, 기억이 없으면
 * `createdAt` 이 5초 안에 붙은 것들을 한 묶음으로 보는 근사가 있었다. 둘 다 사라졌다.
 *
 * 화면 쪽 그룹의 키는 여전히 `resourceType` 이다. "같은 종류에서 하나만 고른다"가 이 화면의
 * 규칙이고(`selected` 는 종류당 슬롯이 하나뿐이다), 한 종류를 다시 만들면 새 그룹이 옛 그룹을
 * 대체하기 때문이다. 서버의 `candidateGroupId` 는 그 대체를 **판별하는 데** 쓴다.
 */

export type DesignPhase = 'choose' | 'candidates' | 'editor' | 'error';

/**
 * 저장이 끝나는 세 가지 방식.
 *
 * **실패와 "아직"을 같은 값으로 돌려주면 안 된다.** compose 는 200 으로 결과를 주기도 하고
 * 202 로 접수만 알리기도 하는데, 둘 다 `null` 로 돌려주던 시절에는 400 을 맞은 화면이
 * "저장을 시작했습니다"라고 말하고 카드 상세로 넘어갔다. 오류 문구는 `error` 에 이미 들어가
 * 있으므로, 여기서는 성공했는지 아닌지만 정확히 말한다.
 */
export type SaveResult =
  | { ok: true; customization: CardCustomization | null }
  | { ok: false };

export type GroupState = {
  /**
   * 서버가 이번 묶음에 붙인 id.
   *
   * `null` 이면 "이 종류에 대해 서버가 가진 가장 최근 그룹"을 쓴다 — 화면을 다시 열었을 때가
   * 그렇다. 요청 직후에는 응답이 알려준 id 를 쓰므로, 옛 그룹이 아직 목록에 남아 있어도
   * 새로 만든 넷만 격자에 선다.
   */
  groupId: string | null;
  requestedAt: number | null;
  candidates: Candidate[];
  slow: boolean;
  /**
   * 폴링을 그만둔 그룹인가.
   *
   * 렌더 중에 `Date.now()` 로 판단하면 같은 상태가 호출 시각마다 다른 답을 낸다 — React
   * Compiler 가 정확히 그것을 막는다. 시간은 **틱 안에서만** 읽고 그 결과를 상태에 적는다.
   */
  expired: boolean;
};

/* 워커가 5초에 한 번 큐를 집으므로 그 박자에 맞춘다. 더 자주 물어도 새 답은 나오지 않는다. */
const POLL_MS = 2_000;
/** 이보다 오래 걸리면 그 그룹에 한 줄이 붙는다. 붙잡아두는 화면이 아니므로 나갈 길은 늘 있다. */
const PATIENCE_MS = 30_000;
/** 여기까지 오면 그 그룹의 폴링을 멈춘다. 서버는 계속 만들고 있을 수 있다. */
const MAX_MS = 180_000;

const emptyGroup = (): GroupState => ({
  groupId: null,
  requestedAt: null,
  candidates: [],
  slow: false,
  expired: false,
});

type Groups = Partial<Record<AiResourceType, GroupState>>;
type Selected = Partial<Record<string, Uuid>>;

/**
 * 템플릿 목록을 통째로 받는 이유.
 *
 * 씨앗이 되는 색·서체는 **고객이 방금 고른** 템플릿의 것이어야 하는데, 무엇을 골랐는지는 이
 * 훅이 들고 있다(`templateId`). 화면이 resource 하나를 골라 넘기게 하면 훅이 상태를 갖기
 * 전에 골라야 하므로 언제나 한 발 늦은 값이 들어온다 — 실제로 카드에 원래 붙어 있던 템플릿의
 * 색이 새로 고른 템플릿의 카드에 깔리는 버그였다. 목록을 받아 여기서 찾으면 그 어긋남이
 * 존재할 수 없다.
 */
export function useCardDesign(card: Card | null, templates: CardTemplate[]) {
  const cardId = card?.id ?? '';

  const [phase, setPhase] = useState<DesignPhase>('choose');
  const [templateId, setTemplateId] = useState<Uuid | null>(null);
  const [groups, setGroups] = useState<Groups>({});
  const [selected, setSelected] = useState<Selected>({});
  const [layers, setLayers] = useState<CardLayer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  /**
   * 이번 세션이 요청한 그룹의 id. 상태에 두면 폴링 콜백이 낡은 값을 보게 된다.
   *
   * 서버가 그룹을 알려주므로 id 하나면 충분하다 — 예전에는 후보 넷의 id 를 전부 기억해야 했다.
   */
  const requested = useRef(new Map<AiResourceType, string>());

  /* ──────────────────────────────────────────────────────────────────────────
   * 후보 만들기
   * ────────────────────────────────────────────────────────────────────────── */

  const generate = useCallback(
    (
      type: AiResourceType,
      generationOptions: Omit<AiGenerationOptions, 'templateId'> = {},
    ) => {
      if (!cardId) return;

      setGroups((prev) => ({
        ...prev,
        [type]: { ...emptyGroup(), requestedAt: Date.now() },
      }));

      /* 재생성하면 그 그룹의 선택이 풀린다. 격자에 없는 리소스를 고른 채로 두면 그건 화면에
         보이지 않는 상태이고, 저장할 때가 되어서야 드러난다. */
      setSelected((prev) => {
        if (!prev[type]) return prev;
        const next = { ...prev };
        delete next[type];
        return next;
      });
      setLayers((prev) => syncSelection(prev, type as CardLayerType, undefined));

      void (async () => {
        try {
          /* `sourceImageUrl` 은 넘기지 않는다 — `BACKGROUND` 의 원본은 서버가 카드의
             상품에서 직접 꺼낸다. 상품 이미지가 없으면 `PRODUCT_IMAGE_REQUIRED` (409) 이고,
             그건 프론트가 주소를 실어 보낸다고 달라지지 않는다. */
          const made = await requestCandidates(cardId, type, {
            ...(templateId && { templateId }),
            ...generationOptions,
          });

          /* 응답이 곧 이번 그룹이다. 요청 하나가 그룹 하나이므로 `groups` 는 길이 1 이지만,
             비어 있을 수도 있어서(202 가 본문 없이 오는 경우) 그때는 폴링이 가장 최근
             그룹을 집는다. */
          const groupId = made?.groups?.[0]?.candidateGroupId ?? null;
          if (groupId) requested.current.set(type, groupId);
          setGroups((prev) => ({
            ...prev,
            [type]: { ...(prev[type] ?? emptyGroup()), groupId },
          }));
        } catch (e) {
          setError(failureMessage(e));
          /* 그룹 하나가 실패했다고 화면 전체를 오류로 만들지 않는다 — 다른 그룹은 멀쩡하고,
             이 그룹은 '다시 만들기'로 되살릴 수 있다. */
          setGroups((prev) => ({ ...prev, [type]: { ...emptyGroup(), requestedAt: null } }));
        }
      })();
    },
    [cardId, templateId],
  );

  /**
   * 이 카드가 실제로 만들 수 있는 그림 종류.
   *
   * **`BACKGROUND` 는 상품 사진이 있어야 만들어진다.** 서버가 원본을 카드의 상품에서 직접
   * 꺼내 쓰고, 없으면 `PRODUCT_IMAGE_REQUIRED` (409) 로 거절한다. 목록에 남겨두면 고객은
   * 「배경」을 고르고 버튼을 누른 다음에야 그 사실을 알게 되는데, 실패가 예정된 항목은
   * 목록에 없는 것만 못하다 — `PRODUCT_ANGLE` 을 뺀 것과 같은 이유다.
   */
  const generatableTypes = useMemo<readonly ImageResourceType[]>(
    () =>
      GENERATABLE_IMAGE_TYPES.filter(
        (t) => t !== 'BACKGROUND' || Boolean(card?.product.imageUrl),
      ),
    [card],
  );

  /* ──────────────────────────────────────────────────────────────────────────
   * 폴링 — 기다리는 것이 있을 때만
   * ────────────────────────────────────────────────────────────────────────── */

  const waiting = useMemo(
    () =>
      Object.values(groups).some(
        (g) =>
          g &&
          g.requestedAt !== null &&
          !g.expired &&
          (g.candidates.length === 0 || g.candidates.some((c) => isPending(c.status))),
      ),
    [groups],
  );

  useEffect(() => {
    if (!cardId || !waiting) return;
    let alive = true;

    const ask = async () => {
      try {
        const batch = await fetchAiResources(cardId);
        if (!alive) return;

        setGroups((prev) => {
          const next: Groups = { ...prev };

          for (const [type, group] of Object.entries(prev) as [AiResourceType, GroupState][]) {
            if (!group?.requestedAt) continue;

            /* 이 종류의 그룹들 중 하나를 고른다. 요청한 id 가 있으면 그것, 없으면 마지막 —
               응답은 최신순이므로 같은 종류의 첫 그룹이 가장 최근에 만든 것이다. */
            const wanted = group.groupId ?? requested.current.get(type) ?? null;
            const ofType = batch.groups.filter((g) => g.resourceType === type);
            const mine = wanted
              ? (ofType.find((g) => g.candidateGroupId === wanted) ?? null)
              : (ofType[0] ?? null);

            const candidates = (mine?.candidates ?? [])
              .map(toCandidate)
              .filter((c) => !isArchived(c));

            const waited = Date.now() - group.requestedAt;
            next[type] = {
              ...group,
              /* 서버가 알려준 id 를 붙잡아 둔다. 다음 폴링부터는 '마지막 그룹'이 아니라
                 '이 그룹'을 본다 — 그 사이 다른 기기에서 하나 더 만들어도 흔들리지 않는다. */
              groupId: group.groupId ?? mine?.candidateGroupId ?? null,
              candidates,
              slow: waited > PATIENCE_MS,
              /* 여기서 멈춰도 서버는 계속 만든다 — 화면을 다시 열면 끝나 있다. */
              expired: waited > MAX_MS,
            };
          }
          return next;
        });
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
  }, [cardId, waiting]);

  /* ──────────────────────────────────────────────────────────────────────────
   * 고르기
   * ────────────────────────────────────────────────────────────────────────── */

  const allCandidates = useMemo(
    () => Object.values(groups).flatMap((g) => g?.candidates ?? []),
    [groups],
  );

  /**
   * 그룹에서 하나 고른다. 같은 것을 다시 누르면 해제된다.
   *
   * `COMPOSITION` 만 다르게 다룬다 — 그건 그림이 아니라 좌표라서, 고르는 순간 이미 놓인
   * 레이어들의 자리가 바뀐다.
   */
  const select = useCallback(
    (type: AiResourceType, resourceId: Uuid) => {
      /* 같은 것을 다시 누르면 해제다. 다음 값을 먼저 정해두면 선택과 레이어가 같은 하나의
         사실을 보게 된다 — 상태 갱신 안에서 다른 상태를 갱신하면 둘이 어긋날 수 있다. */
      const next = selected[type] === resourceId ? undefined : resourceId;

      setSelected((prev) => {
        const draft = { ...prev };
        if (next) draft[type] = next;
        else delete draft[type];
        return draft;
      });

      setLayers((prev) => {
        if (type === 'COMPOSITION') {
          if (!next) return prev;
          const picked = allCandidates.find((c) => c.id === next);
          return picked?.kind === 'data' && picked.data.kind === 'COMPOSITION'
            ? applyComposition(prev, picked.data)
            : prev;
        }
        /* 팔레트와 글자 모양은 레이어가 되지 않는다. 카드가 쓰는 색과 조판이지 카드 위에
           놓이는 물건이 아니고, compose 가 `layoutData`/`styleData` 로 받아간다. */
        if (type === 'COLOR_PALETTE' || type === 'TEXT_STYLE') return prev;
        return syncSelection(prev, type as CardLayerType, next);
      });
    },
    [selected, allCandidates],
  );

  /* ──────────────────────────────────────────────────────────────────────────
   * 단계 이동
   * ────────────────────────────────────────────────────────────────────────── */

  const chooseTemplate = useCallback((id: Uuid) => {
    setTemplateId(id);
    setPhase('candidates');
  }, []);

  const templateResource: TemplateResource | null =
    templates.find((t) => t.id === templateId)?.resource ?? null;

  const openEditor = useCallback(() => {
    if (!card) return;
    /* 편집기에 처음 들어갈 때만 배치를 깐다. 두 번째부터는 고객이 옮겨둔 것을 지키는 편이
       맞다 — 후보 화면에 다녀왔다고 배치가 초기화되면 그건 왕복이 아니라 취소다. */
    setLayers((prev) => (prev.length > 0 ? prev : initialLayers(selected, templateResource)));
    setPhase('editor');
  }, [card, selected, templateResource]);

  const backToCandidates = useCallback(() => setPhase('candidates'), []);

  /* ──────────────────────────────────────────────────────────────────────────
   * 레이어
   * ────────────────────────────────────────────────────────────────────────── */

  const updateLayer = useCallback(
    (id: string, patch: Partial<CardLayer>) => setLayers((prev) => replaceLayer(prev, id, patch)),
    [],
  );

  const addLayer = useCallback((type: CardLayerType, patch: Partial<CardLayer> = {}) => {
    const layer = makeLayer(type, patch);
    setLayers((prev) => [...prev, layer]);
    setActiveLayerId(layer.id);
  }, []);

  const removeLayer = useCallback((id: string) => {
    setLayers((prev) => dropLayer(prev, id));
    setActiveLayerId((prev) => (prev === id ? null : prev));
  }, []);

  const reorderLayer = useCallback(
    (id: string, delta: -1 | 1) => setLayers((prev) => moveLayer(prev, id, delta)),
    [],
  );

  /* ──────────────────────────────────────────────────────────────────────────
   * 저장
   * ────────────────────────────────────────────────────────────────────────── */

  /** 지금 저장할 수 있는가. 못 하면 이유가 붙는다 — 버튼 옆에서 읽힐 문장이다. */
  const draft = useMemo(
    () =>
      buildComposeBody({
        templateId,
        templateResource,
        selected,
        candidates: allCandidates,
        layers,
        message,
      }),
    [templateId, templateResource, selected, allCandidates, layers, message],
  );

  const save = useCallback(async (): Promise<SaveResult> => {
    if (!cardId || !draft.ok) {
      if (!draft.ok) setError(draft.reason);
      return { ok: false };
    }

    try {
      validateComposeBody(draft.body);

      const result = await composeAiResources(cardId, draft.body);
      const raw = result?.customization ?? null;

      /**
       * **응답이 비어 있을 수 있다.** compose 가 200 인지 202 인지 스펙에 없고, 202 는 본문
       * 없이 접수만 알릴 수 있다. 그때는 실패가 아니라 "아직"이므로 `ok: true` 에
       * `customization: null` 로 답한다 — **실패와 같은 값으로 돌려주면 부르는 쪽이 둘을
       * 구분할 수 없고**, 실제로 그것 때문에 저장에 실패한 화면이 "저장을 시작했습니다"라고
       * 말한 뒤 카드 상세로 넘어가고 있었다.
       */
      if (!raw) return { ok: true, customization: null };

      /* 주소는 `assetUrl()` 을 태운다. 합성 결과가 `/generated/...` 상대 경로로 오기 때문이고,
         여기서 빠뜨리면 그 값이 그대로 `CardFace` 까지 내려가 네이티브에서 부를 수 없는
         주소가 된다 — `cards.ts` 와 `customizations.ts` 는 처음부터 같은 변환을 지난다. */
      const made: CardCustomization = {
        id: raw.id,
        status: raw.status,
        frontImageUrl: assetUrl(raw.generatedFrontImageUrl),
        backImageUrl: assetUrl(raw.generatedBackImageUrl),
        message: raw.generatedMessage,
        createdAt: raw.createdAt,
        /* AI 경로는 레이어를 남기지 않는다 — 서버가 이미 한 장으로 구웠고, 그 주소가 얼굴이다. */
        layers: [],
        back: null,
      };

      try {
        await selectCustomization(cardId, made.id);
      } catch {
        /* 합성은 남는다. 고르기만 다시 하면 된다 — 기록 화면에서 그 한 번을 누를 수 있다. */
      }
      return { ok: true, customization: made };
    } catch (e) {
      setError(failureMessage(e));
      return { ok: false };
    }
  }, [cardId, draft]);

  /** 처음으로. 고른 디자인과 배치를 버리고 템플릿 목록으로 돌아간다. */
  const reset = useCallback(() => {
    requested.current.clear();
    setPhase('choose');
    setTemplateId(null);
    setGroups({});
    setSelected({});
    setLayers([]);
    setActiveLayerId(null);
    setMessage('');
    setError(null);
  }, []);

  return {
    phase,
    templateId,
    groups,
    generatableTypes,
    selected,
    candidates: allCandidates,
    layers,
    activeLayerId,
    message,
    error,
    canSave: draft.ok,
    blockedReason: draft.ok ? null : draft.reason,
    chooseTemplate,
    generate,
    select,
    openEditor,
    backToCandidates,
    setActiveLayerId,
    updateLayer,
    addLayer,
    removeLayer,
    reorderLayer,
    setMessage,
    save,
    reset,
    dismissError: useCallback(() => setError(null), []),
  };
}


