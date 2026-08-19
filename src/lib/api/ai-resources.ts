import { request } from './client';
import { assertNever } from './parse';
import { parseResourceData, type DataResourceType, type ResourceData } from './resource-data';
import { assetUrl } from '../config';
import type { CardLayer } from '../types';

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
  /**
   * 만들어진 시각.
   *
   * **후보를 묶는 데 쓴다.** 백엔드에 후보 그룹이라는 개념이 없어서(아래 `requestCandidates`
   * 참조) 어느 넷이 한 번에 요청된 것인지 알 방법이 응답에 없다. 요청한 쪽이 id 를 기억하는
   * 것이 1차 근거이고, 앱을 다시 켠 뒤처럼 그 기억이 없을 때 이 값이 2차 근거가 된다.
   */
  createdAt?: string;
};

/**
 * 발급이 요청하는 것들, 보이는 순서대로.
 *
 * 백엔드는 여덟 종류를 정의하지만 나머지 넷(장식·팔레트·텍스트 스타일·조합)은 커스텀 화면의
 * 것이다 — 아무도 요청하지 않은 장식을 기다리느라 카드 발급이 늦어질 이유가 없다.
 *
 * **`PRODUCT_ANGLE` 은 빠져 있고, 그건 결정이다.** 상품 각도 생성만이 원본 이미지를
 * 필요로 하는데(계약서 명시), 그 원본은 외부에서 접근 가능한 HTTP(S) URL 이어야 한다.
 * 지금 상품 사진은 `/images/products/prod_001.png` 라는 상대 경로인 데다 그 경로에 인증이
 * 걸려 있어서(연동 계획 §4-3), 요청해봐야 영원히 실패하는 타일이 하나 늘 뿐이다.
 * `/images/**` 가 열리면 이 배열에 한 줄 되돌리는 것으로 끝난다.
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
 * 발급이 쓰는 셋을 뺀 나머지이고, 그 나눔은 이 파일이 처음부터 갖고 있던 것이다 — 위쪽 주석이
 * "나머지 넷(장식·팔레트·텍스트 스타일·조합)은 커스텀 화면의 것"이라고 적어두었다.
 *
 * **넷이 정확히 상한이다.** `AiResourceBatchGenerationRequest` 의 `resources` 가
 * `minItems: 3, maxItems: 4` 라, 셋 미만은 요청 자체가 거부되고 다섯은 보낼 수 없다.
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

export const isDataResourceType = (type: AiResourceType): type is DataResourceType =>
  (DATA_RESOURCE_TYPES as readonly string[]).includes(type);

type CandidateBase = {
  id: string;
  status: GenerationStatus;
  failureReason: string | null;
  createdAt: string | null;
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
    case 'PENDING':
    case 'COMPLETED':
    case 'ARCHIVED':
      return null;
    default:
      return assertNever(status);
  }
}

/**
 * 여러 종류를 한 번에 요청한다.
 *
 * 단건 `POST /ai-resources` 는 `{resourceType, prompt, …}` 하나만 받으므로, 셋을 보내려면
 * `/batch` 에 `{resources: [...]}` 로 보내야 한다. 202 와 `PENDING` 만 돌아오고 상태는 아래
 * `GET` 이 나른다 — 푸시 채널이 없다는 사실이 이 흐름 전체의 모양을 정한다.
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
  request<AiResource[]>(`/cards/${cardId}/ai-resources/batch`, {
    method: 'POST',
    body: JSON.stringify({
      resources: types.map((resourceType) => ({ resourceType, ...(templateId && { templateId }) })),
    }),
  });

export const fetchAiResources = (cardId: string) =>
  request<AiResource[]>(`/cards/${cardId}/ai-resources`);

/**
 * 한 종류의 **후보 넷**을 한 번에 만든다.
 *
 * **백엔드에 후보 그룹이라는 개념이 없다.** 응답에 `candidateGroupId` 도 `candidateIndex` 도
 * 없고, `/batch` 는 `candidateCount` 를 받지 않는다 — 받는 것은 `resources` 배열이고 그 크기가
 * **최소 3, 최대 4**다. 그래서 "배경 후보 4개"는 같은 `resourceType` 을 네 번 실어 보내서
 * 만든다. 그룹은 `resourceType` 이 되고, 그것이 곧 "같은 그룹에서는 하나만 고른다"의 근거다.
 *
 * 4는 우연이 아니라 계약의 상한이다. 셋 미만은 요청 자체가 거부되므로 "후보 2개"라는 선택지는
 * 존재하지 않고, 넷이면 격자가 2×2 로 떨어진다.
 *
 * **응답의 id 넷이 곧 이번 배치다.** 어느 넷이 한 묶음인지 아는 유일한 확실한 근거이므로,
 * 부르는 쪽이 그대로 기억한다.
 *
 * 프롬프트는 보내지 않는다. 무엇이 브랜드다운 이미지인지는 카드를 발급하는 쪽이 알 일이고,
 * 프론트가 문장을 지어 보내면 그 판단이 두 곳으로 쪼개진다 — 앱 어디에도 프롬프트 입력란이
 * 없는 이유다.
 */
export const CANDIDATES_PER_GROUP = 4;

export const requestCandidates = (
  cardId: string,
  type: AiResourceType,
  options: { templateId?: string; sourceImageUrl?: string } = {},
) =>
  request<AiResource[]>(`/cards/${cardId}/ai-resources/batch`, {
    method: 'POST',
    body: JSON.stringify({
      resources: Array.from({ length: CANDIDATES_PER_GROUP }, () => ({
        resourceType: type,
        ...(options.templateId && { templateId: options.templateId }),
        /* 상품 각도만 원본을 필요로 한다. 계약이 "외부에서 접근 가능한 HTTP(S) URL" 을
           요구하므로 상대 경로가 아니라 절대 주소를 보낸다. */
        ...(type === 'PRODUCT_ANGLE' &&
          options.sourceImageUrl && { sourceImageUrl: options.sourceImageUrl }),
      })),
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
