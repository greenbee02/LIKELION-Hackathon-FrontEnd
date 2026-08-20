import { request } from './client';
import { parseResourceData, type DataResourceType, type ResourceData } from './resource-data';
import { assetUrl } from '../config';
import type { CardLayer } from '../types';

/**
 * `/cards/{cardId}/ai-resources` — the card's artwork, generated rather than picked.
 * See `dev/active/backend-contract.md` §3.
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

/**
 * 여섯 값. `PROCESSING` 은 V9 가 더한 것으로, 워커가 집어갔지만 아직 끝나지 않은 상태다.
 *
 * **이 유니온으로 `assertNever` 를 하지 않는다.** 이 값은 네트워크에서 오므로 컴파일러가
 * 보장할 수 있는 것이 아니고, 실제로 `PROCESSING` 이 늘었을 때 편집기가 렌더 도중 던졌다.
 * 모르는 값은 "아직 아무 말도 할 수 없는 것"으로 다룬다.
 */
export type GenerationStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REJECTED'
  | 'ARCHIVED';

/** 아직 만들고 있는가. 화면은 `PENDING` 과 `PROCESSING` 을 구분하지 않는다 — 할 일이 같다. */
export const isPending = (status: GenerationStatus) =>
  status === 'PENDING' || status === 'PROCESSING';

/**
 * 백엔드의 `AiResourceGenerationResponse` 중 화면이 쓰는 부분.
 *
 * 필드 이름이 DB 컬럼과 다르다 — 테이블은 `generation_status` 인데 DTO 는 `status` 로 내보내고,
 * 이미지는 `generated_image_url` → `generatedImageUrl` 이다. 이름을 여기서 한 번 맞춰두면
 * 위쪽은 신경 쓸 일이 없다.
 */
export type AiResource = {
  id: string;
  cardId: string;
  /** V8. 같은 요청으로 만들어진 후보들이 공유하는 id — 그룹은 이제 서버가 정한다. */
  candidateGroupId: string | null;
  /** 1-based. 격자 순서가 폴링마다 흔들리지 않는 유일한 근거다. */
  candidateIndex: number | null;
  candidateCount: number | null;
  resourceType: AiResourceType;
  status: GenerationStatus;
  generatedImageUrl: string | null;
  /**
   * 이미지가 아닌 결과 — **객체가 아니라 JSON 문자열이다.**
   *
   * 여덟 종류 중 셋(`COLOR_PALETTE` `TEXT_STYLE` `COMPOSITION`)은 그림을 만들지 않는다.
   * 색 목록이고, 조판 규칙이고, 칸 배치다. 그것들이 이 필드로 온다.
   *
   * **안쪽 스키마는 계약서 어디에도 없다.** OpenAPI 가 `string` 이라고만 말하고, 실제 값을
   * 아직 한 번도 관찰하지 못했다. `resource-data.ts` 가 어떤 모양이 와도 죽지 않는 방식으로
   * 읽는다.
   */
  generatedData: string | null;
  /** 실패한 타일이 왜 실패했는지. 고객에게 보여주진 않지만 로그에는 남길 값이다. */
  failureReason?: string | null;
  /** 만들어진 시각. 그룹을 서버가 알려주므로 더 이상 묶는 데 쓰지 않는다. */
  createdAt?: string;
};

/**
 * 한 번의 요청이 만든 후보 묶음 — 백엔드의 `AiResourceCandidateGroupResponse`.
 *
 * **이 모양이 V8 에서 새로 생겼고, 그전까지 응답은 평평한 배열이었다.** 프론트가 그 시절의
 * 배열을 계속 기대한 탓에 `list.map` 이 객체를 만나 던졌고, 그 예외가 폴링의 빈 catch 에
 * 삼켜져서 후보가 영원히 채워지지 않았다 — 오류 화면조차 뜨지 않는 침묵이었다.
 */
export type AiResourceGroup = {
  candidateGroupId: string | null;
  resourceType: AiResourceType;
  candidateCount: number;
  candidates: AiResource[];
};

/** `GET`·`POST` 가 공통으로 돌려주는 봉투. */
export type AiResourceBatch = {
  cardId: string;
  groups: AiResourceGroup[];
};

/**
 * 발급이 요청하는 것들, 보이는 순서대로.
 *
 * 백엔드는 여덟 종류를 정의하지만 나머지 넷(장식·팔레트·텍스트 스타일·조합)은 커스텀 화면의
 * 것이다 — 아무도 요청하지 않은 장식을 기다리느라 카드 발급이 늦어질 이유가 없다.
 *
 * **`PRODUCT_ANGLE` 은 이제 존재하지 않는다.** 백엔드가 폐지했고, 요청하면
 * `AI_RESOURCE_TYPE_UNSUPPORTED` (400) 로 즉시 거절한다 — 상품을 다른 각도로 다시 그리는
 * 대신 `PRODUCT` 레이어가 상품 기본 이미지를 그대로 쓴다. 아래 `AiResourceType` 유니온에는
 * 남겨둔다: 서버의 enum 에 아직 있으므로 과거 이력이 그 값을 달고 올라올 수 있고, 화면은
 * 그것을 읽을 수 있어야 한다. **다만 아무 데서도 요청하지 않는다.**
 */
export const ISSUE_RESOURCE_TYPES = [
  'BACKGROUND',
  'BORDER',
  'PATTERN',
] as const satisfies readonly AiResourceType[];

export type IssueResourceType = (typeof ISSUE_RESOURCE_TYPES)[number];

/**
 * 커스텀 화면이 요청하는 넷.
 *
 * 발급이 쓰는 셋을 뺀 나머지이고, 그 나눔은 이 파일이 처음부터 갖고 있던 것이다.
 *
 * 넷인 것은 이제 계약의 상한이 아니라 우리의 선택이다 — `/batch` 의 `resources` 는 1~8 이고,
 * 3~4 라는 제약은 그 배열이 아니라 **한 그룹의 후보 수**(`candidateCount`)로 옮겨갔다.
 */
export const CUSTOM_RESOURCE_TYPES = [
  'DECORATION',
  'COLOR_PALETTE',
  'TEXT_STYLE',
  'COMPOSITION',
] as const satisfies readonly AiResourceType[];

export type CustomResourceType = (typeof CUSTOM_RESOURCE_TYPES)[number];

/** What each one is called on screen. The backend's enum never reaches the customer. */
export const RESOURCE_LABELS: Record<AiResourceType, string> = {
  BACKGROUND: '배경',
  BORDER: '테두리',
  PATTERN: '패턴',
  PRODUCT_ANGLE: '상품 각도',
  DECORATION: '장식',
  COLOR_PALETTE: '색 조합',
  TEXT_STYLE: '글자 모양',
  COMPOSITION: '구성',
};

/** 각 종류가 카드에서 맡는 자리. 종류를 고르는 화면의 부제다. */
export const RESOURCE_NOTES: Record<AiResourceType, string> = {
  BACKGROUND: '카드 전면을 채우는 바탕',
  BORDER: '가장자리를 두르는 테두리',
  PATTERN: '바탕 위에 겹치는 반복 무늬',
  PRODUCT_ANGLE: '상품을 다른 각도에서 다시 찍은 컷',
  DECORATION: '한쪽에 놓는 작은 장식',
  COLOR_PALETTE: '카드 전체가 쓰는 색 조합',
  TEXT_STYLE: '글자의 굵기와 자간',
  COMPOSITION: '무엇을 어디에 놓을지',
};

/* ────────────────────────────────────────────────────────────────────────────
 * 이미지 리소스와 JSON 리소스를 타입으로 가른다
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * 여덟 종류는 두 부류다. **이 구분이 규율이 아니라 타입인 것이 요점이다.**
 *
 * 팔레트를 이미지 타일처럼 그리면 안 된다는 규칙은 주석으로 지켜지지 않는다 — 언젠가 누군가
 * `generatedImageUrl` 을 팔레트에 넘긴다. 그래서 DTO 가 화면 타입이 되는 길목(`toCandidate`)
 * 에서 유니온으로 쪼갠다. 이미지 타일은 이미지 멤버만 받으므로, 잘못 넘기면 컴파일이 깨진다.
 */
export const IMAGE_RESOURCE_TYPES = [
  'BACKGROUND',
  'BORDER',
  'PATTERN',
  'PRODUCT_ANGLE',
  'DECORATION',
] as const satisfies readonly AiResourceType[];

export const DATA_RESOURCE_TYPES = [
  'COLOR_PALETTE',
  'TEXT_STYLE',
  'COMPOSITION',
] as const satisfies readonly AiResourceType[];

export type ImageResourceType = (typeof IMAGE_RESOURCE_TYPES)[number];

/**
 * 그중 **실제로 만들어 달라고 할 수 있는** 것들.
 *
 * `IMAGE_RESOURCE_TYPES` 와 갈리는 이유는 `PRODUCT_ANGLE` 하나다. 그 값은 지난 이력에
 * 남아 있을 수 있어 *읽을* 수는 있어야 하지만, 요청하면 400 이다. 화면이 고르게 하는 목록은
 * 이쪽이어야 한다 — 고를 수 있는데 누르면 실패하는 항목은 목록에 없는 것만 못하다.
 */
export const GENERATABLE_IMAGE_TYPES = [
  'BACKGROUND',
  'BORDER',
  'PATTERN',
  'DECORATION',
] as const satisfies readonly ImageResourceType[];

export const isDataResourceType = (type: AiResourceType): type is DataResourceType =>
  (DATA_RESOURCE_TYPES as readonly string[]).includes(type);

type CandidateBase = {
  id: string;
  status: GenerationStatus;
  failureReason: string | null;
  createdAt: string | null;
  /** 그룹 안에서의 자리. 서버가 이미 이 순서로 정렬해 주지만, 값 자체도 들고 있어야 격자가
      다시 정렬될 일이 생겨도 순서를 되찾을 수 있다. */
  index: number | null;
};

export type ImageCandidate = CandidateBase & {
  kind: 'image';
  type: ImageResourceType;
  imageUrl: string | null;
};

export type DataCandidate = CandidateBase & {
  kind: 'data';
  type: DataResourceType;
  data: ResourceData;
};

export type Candidate = ImageCandidate | DataCandidate;

/**
 * 원시 DTO 가 화면 타입이 되는 **유일한** 통로.
 *
 * 이미지 쪽은 `generatedData` 를 버리고, 데이터 쪽은 `generatedImageUrl` 을 버린다. 잘못된
 * 필드를 쓰고 싶어도 타입에 없다.
 */
export function toCandidate(res: AiResource): Candidate {
  const base: CandidateBase = {
    id: res.id,
    status: res.status,
    failureReason: res.failureReason ?? null,
    createdAt: res.createdAt ?? null,
    index: res.candidateIndex ?? null,
  };

  return isDataResourceType(res.resourceType)
    ? {
        ...base,
        kind: 'data',
        type: res.resourceType,
        data: parseResourceData(res.resourceType, res.generatedData),
      }
    : {
        ...base,
        kind: 'image',
        type: res.resourceType as ImageResourceType,
        imageUrl: assetUrl(res.generatedImageUrl),
      };
}

/** 고를 수 있는가. 끝나지 않은 것과 실패한 것은 고를 수 없다. */
export const isSelectable = (c: Candidate) => c.status === 'COMPLETED';

/**
 * 격자에서 아예 빼야 하는가.
 *
 * `ARCHIVED` 는 서버가 "이건 대체됐다"고 말하는 유일한 수단이다. 서버가 언젠가 옛 배치를
 * 아카이브하기 시작하면 프론트가 배치를 기억하는 장치는 무해하게 잉여가 된다.
 */
export const isArchived = (c: Candidate) => c.status === 'ARCHIVED';

/**
 * 실패의 두 얼굴.
 *
 * 발급 화면은 둘을 '실패' 하나로 뭉친다 — 거기서는 고객이 할 수 있는 일이 없기 때문이다.
 * 편집기는 다르다: `FAILED` 는 시스템 사고라 다시 만들면 되고, `REJECTED` 는 브랜드 심사라
 * 다시 만들어도 같은 답이 올 수 있다. 할 일이 다르므로 문장도 다르다.
 */
export function failureLabel(status: GenerationStatus): string | null {
  switch (status) {
    case 'FAILED':
      return '만들지 못했습니다';
    case 'REJECTED':
      return '브랜드 기준에 맞지 않습니다';
    /* 나머지는 실패가 아니다. 백엔드가 상태를 하나 더 늘려도 여기서 던지지 않는다 —
       모르는 상태는 "실패라고 말할 근거가 없는 상태"이고, 그게 정확히 `null` 이다. */
    default:
      return null;
  }
}

/**
 * 한 그룹이 만드는 후보 수. 넷이면 격자가 2×2 로 떨어진다.
 *
 * 4 는 계약의 상한이고 3 이 하한이다(`candidateCount` 의 `@Min(3) @Max(4)`). 두 값이 다
 * 필요한 이유는 부르는 쪽이 둘이기 때문이다 — 편집은 고르게 하므로 넷을, 발급은 고르게 하지
 * 않으므로 최소인 셋을 만든다.
 */
export const CANDIDATES_PER_GROUP = 4;
/** 계약의 하한. 발급처럼 고르지 않는 쪽이 쓴다. */
export const MIN_CANDIDATES = 3;

/**
 * 여러 종류를 한 번에 요청한다 — 발급이 쓰는 길.
 *
 * `/batch` 는 `{resources: [...]}` 를 받고 항목마다 그룹을 따로 만든다. **같은 종류를 두 번
 * 넣으면 `AI_RESOURCE_TYPE_DUPLICATED` 로 거부되므로** 넘기는 배열은 반드시 서로 다른
 * 종류여야 한다. 202 와 `PENDING` 만 돌아오고 상태는 아래 `GET` 이 나른다.
 *
 * **항목 하나가 후보 여러 개를 만든다.** `candidateCount` 의 최소가 3 이라 "한 종류에 하나만"
 * 은 계약상 불가능하다. 발급은 고르게 하지 않으므로 최소인 3 을 명시한다 — 생략하면 4 다.
 *
 * 프롬프트는 백엔드가 정하도록 비워 둔다. 무엇이 브랜드다운 이미지인지는 카드를 발급하는
 * 쪽이 알 일이고, 프론트가 문장을 지어 보내면 그 판단이 두 곳으로 쪼개진다.
 */
export const requestAiResources = (
  cardId: string,
  types: readonly AiResourceType[],
  /** 어느 승인 디자인의 범위에서 만들 것인가. 발급은 넘기지 않고, 편집은 고른 것을 넘긴다. */
  templateId?: string,
) =>
  request<AiResourceBatch>(`/cards/${cardId}/ai-resources/batch`, {
    method: 'POST',
    body: JSON.stringify({
      resources: types.map((resourceType) => ({
        resourceType,
        candidateCount: MIN_CANDIDATES,
        ...(templateId && { templateId }),
      })),
    }),
  });

/**
 * 카드가 지금까지 만든 것 전부 — **그룹으로 묶여서** 온다.
 *
 * 응답에 그룹이 담기므로 부르는 쪽은 "어느 넷이 한 배치인가"를 추측하지 않는다. 서버가
 * `candidateIndex` 오름차순으로 정렬해 주기까지 한다.
 */
export const fetchAiResources = (cardId: string) =>
  request<AiResourceBatch>(`/cards/${cardId}/ai-resources`);

/**
 * 한 종류의 **후보 넷**을 한 번에 만든다.
 *
 * **단건 `POST` 하나가 그룹 하나다.** `candidateCount` 를 받아 서버가 그만큼의 행을 한
 * `candidateGroupId` 아래 만들고, 각 행에 1-based `candidateIndex` 를 붙인다.
 *
 * 예전에는 이 개념이 서버에 없어서 같은 `resourceType` 을 `/batch` 에 네 번 실어 보내
 * 후보 넷을 흉내 냈다. V8 이후 그 호출은 `AI_RESOURCE_TYPE_DUPLICATED` (400) 로 거부된다 —
 * 흉내가 기능이 되면서 흉내는 오류가 됐다.
 *
 * **`sourceImageUrl` 은 보내지 않는다.** 원본이 필요한 것은 `BACKGROUND` 뿐이고, 그것은
 * 서버가 카드의 상품에서 직접 꺼내 쓴다. 상품 이미지가 없는 카드는 `PRODUCT_IMAGE_REQUIRED`
 * (409) 로 거부되는데, 그건 프론트가 URL 을 실어 보낸다고 달라지지 않는다.
 */
export const requestCandidates = (
  cardId: string,
  type: AiResourceType,
  options: { templateId?: string } = {},
) =>
  request<AiResourceBatch>(`/cards/${cardId}/ai-resources`, {
    method: 'POST',
    body: JSON.stringify({
      resourceType: type,
      candidateCount: CANDIDATES_PER_GROUP,
      ...(options.templateId && { templateId: options.templateId }),
    }),
  });

/**
 * 만들어진 자원들을 한 장의 얼굴로 합친다.
 *
 * 생성이 끝났다고 카드가 바뀌지는 않는다 — 배경과 장식이 따로 있을 뿐이고, 그것을 하나로
 * 얹는 것이 이 호출이다. 응답이 **카드와 커스터마이징을 함께** 돌려주므로 편집 화면은 저장
 * 직후 컬렉션에 무엇을 넣을지 다시 묻지 않아도 된다.
 */
export type ComposeResult = {
  card: unknown;
  customization: {
    id: string;
    status: string;
    generatedFrontImageUrl: string | null;
    generatedBackImageUrl: string | null;
    generatedMessage: string | null;
    createdAt: string;
  } | null;
};

/**
 * 레이어 하나가 서버로 나가는 모양 — `CardLayerRequest`.
 *
 * 도메인의 `CardLayer` 와 두 곳이 다르다: `frame` 이 네 값으로 펼쳐지고, `zIndex` 가 배열
 * 순서에서 계산돼 붙는다. 그 변환은 `toLayerRequest` 하나가 한다.
 */
export type CardLayerRequest = {
  id?: string;
  type: CardLayer['type'];
  slot?: string;
  resourceId?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  zIndex?: number;
  visible?: boolean;
  locked?: boolean;
  text?: string;
  styleData?: Record<string, unknown>;
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * 도메인 레이어를 계약의 모양으로.
 *
 * **`undefined` 인 필드는 키째로 뺀다.** 백엔드가 null 을 어떻게 다루는지는 스펙에 없고,
 * 안 보내는 쪽이 "모른다"를 정확히 표현한다.
 *
 * 마지막 관문에서 값을 접는다 — 회전 −360~360, 투명도 0~1, 좌표 0~1, 글자 2000자. 계약의
 * 범위 안으로 접는 것은 손실이 아니라 반올림이고, 여기서 접지 않으면 서버가 422 로 답한다.
 */
export function toLayerRequest(layer: CardLayer, index: number): CardLayerRequest {
  const { frame } = layer;
  return {
    id: layer.id,
    type: layer.type,
    ...(layer.slot && { slot: layer.slot }),
    ...(layer.resourceId && { resourceId: layer.resourceId }),
    x: clamp(frame.x, 0, 1),
    y: clamp(frame.y, 0, 1),
    width: clamp(frame.width, 0, 1),
    height: clamp(frame.height, 0, 1),
    rotation: clamp(layer.rotation, -360, 360),
    opacity: clamp(layer.opacity, 0, 1),
    zIndex: index,
    visible: layer.visible,
    locked: layer.locked,
    ...(layer.text !== undefined && { text: layer.text.slice(0, 2000) }),
    ...(layer.style && Object.keys(layer.style).length > 0 && { styleData: layer.style }),
  };
}

export type ComposeBody = {
  /** 최대 8. 종류가 여덟이고 종류당 하나만 고르므로 구조적으로 넘을 수 없다. */
  resourceIds: string[];
  message?: string;
  /** 카드 전체에 걸리는 결정 — 캔버스 크기, 템플릿, 팔레트, 배치. */
  layoutData?: Record<string, unknown>;
  layers?: CardLayerRequest[];
};

export const composeAiResources = (cardId: string, body: ComposeBody) =>
  request<ComposeResult | undefined>(`/cards/${cardId}/ai-resources/compose`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
