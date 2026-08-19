import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  CANDIDATES_PER_GROUP,
  composeAiResources,
  fetchAiResources,
  isArchived,
  requestCandidates,
  toCandidate,
  type AiResourceType,
  type Candidate,
} from './api/ai-resources';
import { selectCustomization } from './api/customizations';
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
import { USE_MOCK } from './config';
import {
  mockComposeCustomization,
  mockFetchAiResources,
  mockRequestCandidates,
} from './mock/customizations';
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
 * ## 후보라는 개념은 프론트가 만든다
 *
 * 백엔드에는 후보 그룹이 없다 — 응답에 `candidateGroupId` 도 `candidateIndex` 도 없고,
 * `/batch` 는 `candidateCount` 를 받지 않는다. 대신 `resources` 배열이 최대 4다. 그래서
 * **같은 `resourceType` 을 네 번 보내 후보 넷을 만들고, 그룹은 `resourceType` 이 된다.**
 * "같은 그룹에서 하나만 고른다"는 그 결과 자료구조의 성질이 된다 (`selected` 는 종류당 슬롯이
 * 하나뿐이다).
 */

export type DesignPhase = 'choose' | 'candidates' | 'editor' | 'error';

export type GroupState = {
  /**
   * 이번 배치의 id 넷 — `POST /batch` 의 응답이 알려준 것.
   *
   * 어느 넷이 한 묶음인지 아는 **확실한** 근거다. 없을 수도 있는데(앱을 다시 켠 뒤, 또는
   * 202 가 본문 없이 왔을 때) 그때는 아래 `clusterLatest` 가 시각으로 추측한다.
   */
  ids: string[] | null;
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

const POLL_MS = 1200;
/** 이보다 오래 걸리면 그 그룹에 한 줄이 붙는다. 붙잡아두는 화면이 아니므로 나갈 길은 늘 있다. */
const PATIENCE_MS = 30_000;
/** 여기까지 오면 그 그룹의 폴링을 멈춘다. 서버는 계속 만들고 있을 수 있다. */
const MAX_MS = 180_000;

/**
 * 한 배치로 볼 시간 간격.
 *
 * 서버는 넷을 한 트랜잭션에서 만들므로 `createdAt` 이 밀리초 단위로 붙어 있다. 사람이 '다시
 * 만들기'를 누르는 최소 간격은 그보다 한참 크다. 5초는 그 사이의 넉넉한 골짜기다 —
 * **근사치이고, 위의 `ids` 가 있을 때는 쓰이지 않는다.**
 */
const BATCH_WINDOW_MS = 5_000;

const emptyGroup = (): GroupState => ({
  ids: null,
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

  /** 이번 세션이 요청한 배치. 상태에 두면 폴링 콜백이 낡은 값을 보게 된다. */
  const batches = useRef(new Map<AiResourceType, string[]>());

  /* ──────────────────────────────────────────────────────────────────────────
   * 후보 만들기
   * ────────────────────────────────────────────────────────────────────────── */

  const generate = useCallback(
    (type: AiResourceType) => {
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
          const made = USE_MOCK
            ? mockRequestCandidates(cardId, type)
            : await requestCandidates(cardId, type, {
                ...(templateId && { templateId }),
                /* 상품 각도만 원본을 필요로 한다. 서버가 밖에서 가져갈 수 있어야 하므로
                   상대 경로면 보내지 않는다 — 보내봐야 서버가 못 읽는다. */
                ...(type === 'PRODUCT_ANGLE' &&
                  card?.product.imageUrl?.startsWith('http') && {
                    sourceImageUrl: card.product.imageUrl,
                  }),
              });

          const ids = made.map((r) => r.id);
          if (ids.length > 0) batches.current.set(type, ids);
          setGroups((prev) => ({
            ...prev,
            [type]: { ...(prev[type] ?? emptyGroup()), ids: ids.length > 0 ? ids : null },
          }));
        } catch (e) {
          setError(failureMessage(e));
          /* 그룹 하나가 실패했다고 화면 전체를 오류로 만들지 않는다 — 다른 그룹은 멀쩡하고,
             이 그룹은 '다시 만들기'로 되살릴 수 있다. */
          setGroups((prev) => ({ ...prev, [type]: { ...emptyGroup(), requestedAt: null } }));
        }
      })();
    },
    [cardId, templateId, card],
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
          (g.candidates.length === 0 || g.candidates.some((c) => c.status === 'PENDING')),
      ),
    [groups],
  );

  useEffect(() => {
    if (!cardId || !waiting) return;
    let alive = true;

    const ask = async () => {
      try {
        const list = USE_MOCK ? mockFetchAiResources(cardId) : await fetchAiResources(cardId);
        if (!alive) return;

        setGroups((prev) => {
          const next: Groups = { ...prev };
          const all = list.map(toCandidate).filter((c) => !isArchived(c));

          for (const [type, group] of Object.entries(prev) as [AiResourceType, GroupState][]) {
            if (!group?.requestedAt) continue;
            const mine = all.filter((c) => c.type === type);
            const ids = group.ids ?? batches.current.get(type) ?? null;
            const candidates = ids
              ? mine.filter((c) => ids.includes(c.id))
              : clusterLatest(mine);

            const waited = Date.now() - group.requestedAt;
            next[type] = {
              ...group,
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
    setLayers((prev) => (prev.length > 0 ? prev : initialLayers(card, selected, templateResource)));
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

  const save = useCallback(async (): Promise<CardCustomization | null> => {
    if (!cardId || !draft.ok) {
      if (!draft.ok) setError(draft.reason);
      return null;
    }

    try {
      validateComposeBody(draft.body);

      if (USE_MOCK) return mockComposeCustomization(cardId, draft.body);

      const result = await composeAiResources(cardId, draft.body);
      const raw = result?.customization ?? null;

      /**
       * **응답이 비어 있을 수 있다.** compose 가 200 인지 202 인지 스펙에 없고, 202 는 본문
       * 없이 접수만 알릴 수 있다. 그때는 실패가 아니라 "아직"이므로, 부르는 쪽이 카드를 다시
       * 불러 확인하도록 `null` 을 돌려준다.
       */
      if (!raw) return null;

      const made: CardCustomization = {
        id: raw.id,
        status: raw.status,
        frontImageUrl: raw.generatedFrontImageUrl,
        backImageUrl: raw.generatedBackImageUrl,
        message: raw.generatedMessage,
        createdAt: raw.createdAt,
      };

      try {
        await selectCustomization(cardId, made.id);
      } catch {
        /* 합성은 남는다. 고르기만 다시 하면 된다 — 기록 화면에서 그 한 번을 누를 수 있다. */
      }
      return made;
    } catch (e) {
      setError(failureMessage(e));
      return null;
    }
  }, [cardId, draft]);

  /** 처음으로. 고른 디자인과 배치를 버리고 템플릿 목록으로 돌아간다. */
  const reset = useCallback(() => {
    batches.current.clear();
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

/**
 * 배치를 시각으로 추측한다 — `ids` 를 모를 때만.
 *
 * 가장 최근 것부터 인접 간격이 `BATCH_WINDOW_MS` 안에 있는 동안 이어 붙이고 넷에서 자른다.
 * **근사치라는 것을 숨기지 않는다**: 서버가 후보 그룹을 알려주기 시작하면 이 함수는 통째로
 * 사라지는 것이 맞다.
 */
function clusterLatest(candidates: Candidate[]): Candidate[] {
  const sorted = [...candidates].sort((a, b) => time(b) - time(a));
  const batch: Candidate[] = [];

  for (const candidate of sorted) {
    if (batch.length === 0) {
      batch.push(candidate);
      continue;
    }
    if (time(batch[batch.length - 1]) - time(candidate) > BATCH_WINDOW_MS) break;
    batch.push(candidate);
    if (batch.length >= CANDIDATES_PER_GROUP) break;
  }

  /* 만든 순서대로 되돌린다 — 격자가 매 폴링마다 뒤섞이면 고르려던 칸이 손 밑에서 움직인다. */
  return batch.reverse();
}

const time = (c: Candidate) => (c.createdAt ? Date.parse(c.createdAt) : 0);
