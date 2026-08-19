import { request } from './client';

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
  /** 실패한 타일이 왜 실패했는지. 고객에게 보여주진 않지만 로그에는 남길 값이다. */
  failureReason?: string | null;
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

/** What each one is called on screen. The backend's enum never reaches the customer. */
export const RESOURCE_LABELS: Record<IssueResourceType, string> = {
  BACKGROUND: '배경',
  BORDER: '테두리',
  PATTERN: '패턴',
};

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
export const requestAiResources = (cardId: string, types: readonly AiResourceType[]) =>
  request<AiResource[]>(`/cards/${cardId}/ai-resources/batch`, {
    method: 'POST',
    body: JSON.stringify({ resources: types.map((resourceType) => ({ resourceType })) }),
  });

export const fetchAiResources = (cardId: string) =>
  request<AiResource[]>(`/cards/${cardId}/ai-resources`);
