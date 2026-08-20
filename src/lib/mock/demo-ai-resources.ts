/**
 * ⚠️ 임시 — 보고 나면 지운다.
 *
 * 실서버의 데모 QR 이 열한 개 모두 소진돼(`backend-open-items.md` §3) 카드를 한 장도 발급할
 * 수 없고, 그래서 `demo-cards.ts` 의 가짜 카드로 화면을 본다. 그 카드들은 **서버에 없으므로**
 * `POST /cards/c1/ai-resources` 는 `Invalid UUID string: c1` (400) 이다 — 꾸미기가 1단계에서
 * 멈춘다.
 *
 * 이 파일은 그 세 호출을 **데모 카드일 때만** 가로챈다. 서버에 있는 카드는 한 줄도 다르게
 * 흐르지 않는다. 이 저장소에 목 데이터가 없다는 것은 규칙이고(AGENTS.md), 이 파일은 그
 * 규칙의 예외가 아니라 **잠깐 어긴 것**이다.
 *
 * **되돌리는 방법:** 이 파일을 지우고, `card-design.ts` 와 `cards-store.tsx` 의 import 를
 * 각각 `./api/ai-resources` · `./api/cards` 로 되돌린다. 그게 전부다 — 아래 함수들은 이름과
 * 시그니처가 원본과 같고, 데모 카드가 아니면 원본을 그대로 부른다.
 *
 * 가짜인 것은 **응답뿐이다.** 202 도, `PENDING` 도, 폴링이 몇 초 도는 것도 실제와 같게 둔다 —
 * 기다리는 상태가 이 화면 디자인의 일부라서, 즉시 완성되는 목으로는 볼 것을 못 본다.
 */

import {
  composeAiResources as realCompose,
  fetchAiResources as realFetch,
  requestCandidates as realRequest,
  CANDIDATES_PER_GROUP,
  type AiResource,
  type AiResourceBatch,
  type AiResourceType,
  type ComposeBody,
  type ComposeResult,
  type GenerationStatus,
} from '../api/ai-resources';
import { fetchCard as realFetchCard } from '../api/cards';
import type { Card } from '../types';
import { DEMO_CARDS } from './demo-cards';

const isDemo = (cardId: string) => DEMO_CARDS.some((c) => c.id === cardId);

/* ────────────────────────────────────────────────────────────────────────────
 * 후보가 무엇으로 만들어지는가
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * 그림 후보의 그림.
 *
 * 서버의 `/images/**` 는 공개라 토큰 없이 200 이고, 상대 경로 그대로 두면 `toCandidate` 가
 * `assetUrl()` 을 태워 웹에서는 프록시로, 네이티브에서는 절대 주소로 바꾼다. **직접 절대
 * 주소를 적으면 웹에서 mixed content 로 끊긴다** — 상대 경로인 것이 요점이다.
 *
 * 그림이 그 역할(테두리·패턴·장식)로 그려진 것은 아니다. 여기서 볼 것은 격자가 넷을 구별해
 * 세우는지, 고른 하나가 레이어로 내려가는지이지 그림의 적절함이 아니다.
 */
const IMAGE_POOL: Partial<Record<AiResourceType, string[]>> = {
  BACKGROUND: [
    '/images/templates/template_001_front.png',
    '/images/templates/template_002_front.png',
    '/images/templates/template_003_front.png',
    '/images/templates/template_001_back.png',
  ],
  BORDER: [
    '/images/templates/template_002_back.png',
    '/images/templates/template_003_back.png',
    '/images/products/prod_001.png',
    '/images/products/prod_002.png',
  ],
  PATTERN: [
    '/images/products/prod_003.png',
    '/images/products/prod_004.png',
    '/images/products/prod_005.png',
    '/images/products/prod_006.png',
  ],
  DECORATION: [
    '/images/products/prod_007.png',
    '/images/products/prod_008.png',
    '/images/products/prod_009.png',
    '/images/products/prod_010.png',
  ],
};

/**
 * 그림이 아닌 후보의 `generatedData`.
 *
 * **객체가 아니라 JSON 문자열이다** — 계약이 그렇고(`generatedData: string`),
 * `parseResourceData` 가 문자열을 받는다. 여기서 객체로 두면 파서가 통째로 `UNPARSED` 로
 * 떨어뜨려 타일이 전부 "읽지 못했습니다"가 된다.
 *
 * 색은 실서버 템플릿 셋의 `resourceData` 에서 그대로 가져왔다.
 */
const DATA_POOL: Partial<Record<AiResourceType, unknown[]>> = {
  COLOR_PALETTE: [
    { name: '클래식 비세토스', colors: ['#15120F', '#8B6B45', '#B89A6A', '#E8DFD2'] },
    { name: '상그리아 선셋', colors: ['#1B1218', '#6E1F38', '#C4A16B', '#F2E7DA'] },
    { name: '서울 나이트', colors: ['#07111D', '#101E2D', '#B8B4AA', '#E6E1D9'] },
    { name: '코냑 모노', colors: ['#1A1512', '#3E2E22', '#8A6A44', '#D8CBB8'] },
  ],
  TEXT_STYLE: [
    { name: '정갈한 세리프', fontWeight: '600', fontSize: 13, letterSpacing: 1.4, textAlign: 'left', transform: 'uppercase', color: '#E8DFD2' },
    { name: '넓은 산세리프', fontWeight: '400', fontSize: 12, letterSpacing: 3, textAlign: 'center', transform: 'uppercase', color: '#F2E7DA' },
    { name: '굵은 제목', fontWeight: '700', fontSize: 16, letterSpacing: 0.5, textAlign: 'left', transform: 'none', color: '#E6E1D9' },
    { name: '작은 서명', fontWeight: '500', fontSize: 10, letterSpacing: 2, textAlign: 'right', transform: 'uppercase', color: '#B8B4AA' },
  ],
  COMPOSITION: [
    {
      name: '가운데 크게',
      slots: [
        { slot: 'pattern', type: 'PATTERN', frame: { x: 0, y: 0, width: 1, height: 1 } },
        { slot: 'decoration', type: 'DECORATION', frame: { x: 0.22, y: 0.28, width: 0.56, height: 0.44 } },
        { slot: 'text', type: 'TEXT', frame: { x: 0.1, y: 0.78, width: 0.8, height: 0.12 } },
      ],
    },
    {
      name: '왼쪽 정렬',
      slots: [
        { slot: 'pattern', type: 'PATTERN', frame: { x: 0, y: 0, width: 1, height: 1 } },
        { slot: 'decoration', type: 'DECORATION', frame: { x: 0.06, y: 0.34, width: 0.42, height: 0.34 } },
        { slot: 'text', type: 'TEXT', frame: { x: 0.06, y: 0.74, width: 0.6, height: 0.12 } },
      ],
    },
    {
      name: '아래로 밀기',
      slots: [
        { slot: 'border', type: 'BORDER', frame: { x: 0, y: 0, width: 1, height: 1 } },
        { slot: 'decoration', type: 'DECORATION', frame: { x: 0.3, y: 0.5, width: 0.4, height: 0.32 } },
        { slot: 'text', type: 'TEXT', frame: { x: 0.1, y: 0.14, width: 0.8, height: 0.12 } },
      ],
    },
    {
      name: '모서리 장식',
      slots: [
        { slot: 'border', type: 'BORDER', frame: { x: 0, y: 0, width: 1, height: 1 } },
        { slot: 'decoration', type: 'DECORATION', frame: { x: 0.62, y: 0.08, width: 0.3, height: 0.24 } },
        { slot: 'text', type: 'TEXT', frame: { x: 0.08, y: 0.8, width: 0.66, height: 0.12 } },
      ],
    },
  ],
};

/* ────────────────────────────────────────────────────────────────────────────
 * 만든 것을 들고 있는다
 * ──────────────────────────────────────────────────────────────────────────── */

type DemoRow = { resource: AiResource; readyAt: number };
type DemoGroup = { groupId: string; type: AiResourceType; rows: DemoRow[] };

/** 카드 하나가 지금까지 만든 그룹들. 종류당 최신 하나 — 다시 만들면 옛 그룹을 덮는다. */
const store = new Map<string, Map<AiResourceType, DemoGroup>>();

/** 데모 카드에 얹힌 커스터마이징. 서버가 들고 있을 자리를 대신한다. */
const applied = new Map<string, NonNullable<Card['customization']>>();

let counter = 0;
const nextId = () => `demo-${(counter += 1).toString().padStart(4, '0')}`;

/**
 * 후보 넷이 **한꺼번에 끝나지 않는다.**
 *
 * 실제 워커가 그렇고, 격자가 끝난 것부터 차례로 채워지는지가 이 화면에서 볼 것 중 하나다.
 * 넷이 동시에 완성되면 그 동작을 한 번도 못 본 채로 넘어가게 된다.
 */
const READY_MS = [2_500, 4_000, 5_500, 7_000];

function makeGroup(cardId: string, type: AiResourceType): DemoGroup {
  const groupId = nextId();
  const now = Date.now();
  const images = IMAGE_POOL[type];
  const data = DATA_POOL[type];

  const rows: DemoRow[] = Array.from({ length: CANDIDATES_PER_GROUP }, (_, i) => ({
    readyAt: now + (READY_MS[i] ?? 7_000),
    resource: {
      id: nextId(),
      cardId,
      candidateGroupId: groupId,
      candidateIndex: i + 1,
      candidateCount: CANDIDATES_PER_GROUP,
      resourceType: type,
      status: 'PENDING',
      generatedImageUrl: images?.[i] ?? null,
      generatedData: data?.[i] ? JSON.stringify(data[i]) : null,
      failureReason: null,
      createdAt: new Date(now).toISOString(),
    },
  }));

  return { groupId, type, rows };
}

/**
 * 지금 시각으로 상태를 정한다.
 *
 * 타이머로 상태를 바꾸는 대신 읽는 순간 계산한다 — 화면을 떠났다 돌아와도, 폴링이 몇 번을
 * 걸렀어도 같은 답이 나온다. 실제 서버가 상태를 들고 있는 것과 같은 성질이다.
 */
function settle(group: DemoGroup): AiResource[] {
  const now = Date.now();
  return group.rows.map(({ resource, readyAt }): AiResource => {
    if (now >= readyAt) return { ...resource, status: 'COMPLETED' };
    const status: GenerationStatus = now >= readyAt - 1_500 ? 'PROCESSING' : 'PENDING';
    return { ...resource, status, generatedImageUrl: null, generatedData: null };
  });
}

const toBatch = (cardId: string): AiResourceBatch => ({
  cardId,
  groups: [...(store.get(cardId)?.values() ?? [])].map((g) => ({
    candidateGroupId: g.groupId,
    resourceType: g.type,
    candidateCount: CANDIDATES_PER_GROUP,
    candidates: settle(g),
  })),
});

/* ────────────────────────────────────────────────────────────────────────────
 * 원본과 같은 이름, 같은 시그니처
 * ──────────────────────────────────────────────────────────────────────────── */

export const requestCandidates: typeof realRequest = (cardId, type, options) => {
  if (!isDemo(cardId)) return realRequest(cardId, type, options);

  const groups = store.get(cardId) ?? new Map<AiResourceType, DemoGroup>();
  groups.set(type, makeGroup(cardId, type));
  store.set(cardId, groups);

  /* 실제 `POST` 는 202 로 `PENDING` 만 돌려준다. 여기서 완성본을 돌려주면 폴링이 한 번도
     돌지 않아, 기다리는 화면이 존재하는지조차 확인할 수 없다. */
  return Promise.resolve(toBatch(cardId));
};

export const fetchAiResources: typeof realFetch = (cardId) =>
  isDemo(cardId) ? Promise.resolve(toBatch(cardId)) : realFetch(cardId);

/**
 * 합성 — 고른 것들이 한 장이 된다.
 *
 * 진짜 합성은 서버가 레이어를 실제로 겹쳐 새 이미지를 굽는 일이고, 그건 여기서 흉내 낼 수
 * 없다. **고른 그림 중 첫 장을 앞면으로 삼는다** — 카드 상세가 커스터마이징이 붙은 카드를
 * 어떻게 그리는지 보기에는 그것으로 충분하고, 그 이상은 없는 것을 있다고 말하는 쪽에 가깝다.
 */
export const composeAiResources: typeof realCompose = (cardId, body: ComposeBody) => {
  if (!isDemo(cardId)) return realCompose(cardId, body);

  const all = [...(store.get(cardId)?.values() ?? [])].flatMap(settle);
  const picked = body.resourceIds
    .map((id) => all.find((r) => r.id === id))
    .find((r) => r?.generatedImageUrl);

  const made = {
    id: nextId(),
    status: 'COMPLETED',
    generatedFrontImageUrl:
      picked?.generatedImageUrl ?? '/images/templates/template_001_front.png',
    generatedBackImageUrl: null,
    generatedMessage: body.message ?? null,
    createdAt: new Date().toISOString(),
  };

  /* 카드 자체에도 얹는다. 저장 직후 화면이 카드 상세로 넘어가면서 `loadCard()` 를 부르는데,
     그 조회가 아래 `fetchCard` 를 지나므로 여기서 얹어둔 것이 그대로 보인다. */
  applied.set(cardId, {
    id: made.id,
    status: made.status,
    frontImageUrl: made.generatedFrontImageUrl,
    backImageUrl: null,
    message: made.generatedMessage,
    createdAt: made.createdAt,
  });

  return Promise.resolve({ card: null, customization: made } satisfies ComposeResult);
};

/**
 * `fetchCard` 도 지난다.
 *
 * 데모 카드의 id 는 UUID 가 아니라 실서버 조회가 400 이고, `loadCard()` 는 실패를 조용히
 * `null` 로 삼킨다 — 저장은 됐는데 카드 얼굴은 그대로인 상태가 된다. 여기서 가로채지 않으면
 * 3단계의 결과를 볼 수 없다.
 */
export const fetchCard: typeof realFetchCard = (cardId) => {
  if (!isDemo(cardId)) return realFetchCard(cardId);

  /* `isDemo` 가 이미 통과했으므로 찾지 못할 수 없다. 그래도 넘겨보내는 쪽을 두는 것은,
     원본이 실패를 `throw` 로 답하므로 여기서 `null` 을 만들어 계약을 흐리지 않기 위해서다. */
  const base = DEMO_CARDS.find((c) => c.id === cardId);
  if (!base) return realFetchCard(cardId);

  const customization = applied.get(cardId);
  return Promise.resolve(customization ? { ...base, customization } : base);
};
