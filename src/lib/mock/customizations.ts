import { ApiError } from '../api/client';
import {
  CANDIDATES_PER_GROUP,
  type AiResource,
  type AiResourceType,
  type ComposeBody,
} from '../api/ai-resources';
import { validateComposeBody } from '../card-compose';
import type { CardCustomization } from '../types';

/**
 * 카드 꾸미기 — 목.
 *
 * `mock/registrations.ts` 와 같은 구조이고, **진행을 큐가 아니라 시계로 모델링하는 것**까지
 * 같다. 요청 시각을 적어두고 조회할 때마다 경과 시간을 재서 무엇이 끝났는지 답한다. 타이머를
 * 돌리지 않으므로 화면이 사라졌다 돌아와도 진행이 어긋나지 않는다 — 실서버의 폴링도 같은
 * 성질을 갖는다.
 *
 * **한 그룹의 후보 넷이 서로 다른 시각에 끝난다.** 동시에 끝나면 스켈레톤 네 개가 한꺼번에
 * 사라지고, 그러면 이 화면은 스피너 하나로 대체 가능해진다. 그것이 아니라는 것이 후보 화면의
 * 설계 전체다.
 */

/** 후보 넷이 도착하는 간격. */
const CANDIDATE_SCHEDULE_MS = [1400, 2500, 3600, 5000];

/** 종류마다 체감 소요가 다르다. 상품 각도는 원본을 가져와야 해서 실제로 느리다. */
const TYPE_LATENCY_MS: Record<AiResourceType, number> = {
  BACKGROUND: 0,
  BORDER: 300,
  PATTERN: 500,
  DECORATION: 400,
  PRODUCT_ANGLE: 2600,
  COLOR_PALETTE: -700,
  TEXT_STYLE: -700,
  COMPOSITION: -300,
};

/**
 * 상태 분기를 목에서도 걸을 수 있게 하는 고정 실패.
 *
 * `DECORATION` 의 셋째는 늘 `FAILED`, 넷째는 늘 `REJECTED` 다. 둘을 다른 문장으로 가르기로
 * 했으면 두 문장을 다 볼 수 있어야 한다.
 */
const FAILING_TYPE: AiResourceType = 'DECORATION';

/**
 * **가장 값어치 있는 목.** 이 카드의 첫 팔레트 후보는 `generatedData` 가 깨져 있다.
 *
 * 실서버의 `generatedData` 스키마가 미지수라 우리가 실제로 자주 밟게 될 경로는 파싱 실패다.
 * 목에서 그 경로를 걸을 수 없으면 릴리스에서 처음 본다.
 */
const BAD_DATA_CARD = 'c3';

type Batch = { startedAt: number; ids: string[] };

/** `${cardId}:${type}` → 그 그룹의 최신 배치. 재생성하면 덮어쓴다. */
const batches = new Map<string, Batch>();
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

const key = (cardId: string, type: AiResourceType) => `${cardId}:${type}`;

/**
 * 한 종류의 후보 넷을 요청한다.
 *
 * 실서버처럼 **만들어진 행 넷을 그대로 돌려준다** — 그 id 가 "어느 넷이 한 묶음인가"의 근거이고,
 * 목이 그걸 안 주면 프론트는 목 모드에서 시각 추측 경로만 걷게 된다. 두 경로 중 하나만
 * 시험되는 목은 절반짜리다.
 */
export function mockRequestCandidates(cardId: string, type: AiResourceType): AiResource[] {
  sequence += 1;
  const ids = Array.from(
    { length: CANDIDATES_PER_GROUP },
    (_, i) => `res-${cardId}-${type}-${sequence}-${i}`,
  );
  batches.set(key(cardId, type), { startedAt: Date.now(), ids });
  return ids.map((id, i) => row(cardId, type, id, i, 0));
}

export function mockFetchAiResources(cardId: string): AiResource[] {
  const out: AiResource[] = [];

  for (const [mapKey, batch] of batches) {
    const [owner, rawType] = mapKey.split(':');
    if (owner !== cardId) continue;
    const type = rawType as AiResourceType;
    const elapsed = Date.now() - batch.startedAt;
    batch.ids.forEach((id, i) => out.push(row(cardId, type, id, i, elapsed)));
  }

  return out;
}

function row(
  cardId: string,
  type: AiResourceType,
  id: string,
  index: number,
  elapsed: number,
): AiResource {
  const due = CANDIDATE_SCHEDULE_MS[index] + TYPE_LATENCY_MS[type];
  const arrived = elapsed >= due;

  const status: AiResource['status'] = !arrived
    ? 'PENDING'
    : type === FAILING_TYPE && index === 2
      ? 'FAILED'
      : type === FAILING_TYPE && index === 3
        ? 'REJECTED'
        : 'COMPLETED';

  return {
    id,
    cardId,
    resourceType: type,
    status,
    /* 목은 그림을 만들지 않는다. 주소가 `null` 이면 타일이 이름만 남은 상태로 떨어지는데,
       그건 실서버에서 생성은 됐지만 주소가 비어 온 경우와 같아서 화면이 이미 다룰 줄 안다. */
    generatedImageUrl: null,
    generatedData: arrived ? generatedData(cardId, type, index) : null,
    createdAt: new Date(Date.now() - Math.max(0, elapsed - due)).toISOString(),
  };
}

/**
 * JSON 리소스의 본문 — **실서버와 같이 문자열로** 준다.
 *
 * 객체로 두면 목 모드에서 파서가 한 번도 실행되지 않고, 파서는 실서버에 붙이는 날 처음
 * 돌아가서 그날 처음 깨진다.
 */
function generatedData(cardId: string, type: AiResourceType, index: number): string | null {
  if (cardId === BAD_DATA_CARD && type === 'COLOR_PALETTE' && index === 0) {
    return '{"colors": ["#3B2F2F", '; // 닫히지 않은 JSON — 파싱 실패 경로를 걷게 한다
  }

  switch (type) {
    case 'COLOR_PALETTE':
      return JSON.stringify({
        name: ['코냑 앤 잉크', '샌드 스톤', '미드나잇 서울', '카멜 로즈'][index],
        colors: [
          ['#15120F', '#8B6B45', '#B89A6A', '#E8DFD2'],
          ['#2B2622', '#7C6A55', '#C4B79E', '#F0E9DE'],
          ['#07111D', '#26384D', '#7C8CA0', '#E6EAF0'],
          ['#1B1218', '#6E1F38', '#C4A16B', '#F2E7DA'],
        ][index],
      });

    case 'TEXT_STYLE':
      return JSON.stringify({
        name: ['CLASSIC_SERIF', 'MODERN_SANS', 'ELEGANT_SERIF', 'CONDENSED'][index],
        fontWeight: ['600', '500', '400', '700'][index],
        letterSpacing: [0.5, 1.2, 0.2, 2][index],
        textTransform: index % 2 === 0 ? 'uppercase' : 'none',
      });

    case 'COMPOSITION':
      return JSON.stringify({
        name: ['상품 중심', '아래로 내린 상품', '가득 채운 배경', '여백 큰 배치'][index],
        slots: [
          { type: 'PRODUCT', x: 0.15, y: 0.2 + index * 0.04, width: 0.7, height: 0.44 },
          { type: 'TEXT', x: 0.08, y: 0.06, width: 0.62, height: 0.08 },
          { type: 'DECORATION', x: 0.6 - index * 0.05, y: 0.7, width: 0.3, height: 0.16 },
        ],
      });

    default:
      return null;
  }
}

/**
 * 합성.
 *
 * **실 경로와 같은 검증을 통과한다.** 목이 실서버보다 관대하면 화면은 목에서만 통과하는
 * 조합을 만들어내고, 그 사실은 실서버에 붙이는 날 드러난다.
 */
export function mockComposeCustomization(cardId: string, body: ComposeBody): CardCustomization {
  validateComposeBody(body);

  const batchCount = [...batches.keys()].filter((k) => k.startsWith(`${cardId}:`)).length;
  if (batchCount === 0) {
    throw new ApiError('AI_RESOURCE_NOT_READY', '아직 만들어진 것이 없습니다.', 409);
  }

  const made: CardCustomization = {
    id: `cus-mock-${cardId}-${++sequence}`,
    status: 'COMPLETED',
    /* 합성 결과 그림도 없다. 카드는 원래 얼굴을 유지하고, 바뀌는 것은 새긴 한 줄뿐이다 —
       목이 할 수 있는 정직한 결과가 거기까지다. */
    frontImageUrl: null,
    backImageUrl: null,
    message: body.message ?? null,
    createdAt: new Date().toISOString(),
  };
  composed.set(cardId, made);
  return made;
}

export function mockRestoreOriginal(cardId: string): void {
  composed.delete(cardId);
  chosen.delete(cardId);
  for (const mapKey of [...batches.keys()]) {
    if (mapKey.startsWith(`${cardId}:`)) batches.delete(mapKey);
  }
}

export function mockSelectedTemplate(cardId: string): string | undefined {
  return chosen.get(cardId);
}

/** 기록 화면이 쓰는 목록. 목은 한 카드에 한 벌만 들고 있다. */
export function mockCustomizations(cardId: string): CardCustomization[] {
  const made = composed.get(cardId);
  return made ? [made] : [];
}
