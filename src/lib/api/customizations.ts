import { request } from './client';
import { assetUrl } from '../config';
import type { CardBackSnapshot, CardCustomization, CardFaceLayer, CardFaceLayerType } from '../types';

/**
 * 카드 커스터마이징 — `POST/GET /cards/{cardId}/customizations`,
 * `POST .../{customizationId}/select`, `POST /cards/{cardId}/restore-original`.
 *
 * 한 벌의 커스텀은 **템플릿 하나와 AI 가 만든 자원 몇 개의 합성 결과**다. 만드는 것과 고르는
 * 것이 나뉘어 있는 이유는 여러 벌을 만들어두고 그중 하나를 얼굴로 삼을 수 있기 때문이고,
 * 그래서 되돌리기(`restore-original`)가 삭제가 아니라 선택 해제로 존재한다.
 *
 * **여기에 두 번째 길이 붙었다** — `POST .../customizations/layers`. 브랜드가 승인해 둔 정적
 * 에셋 세 겹을 고르는 것이라 AI 를 태우지 않고, 그래서 202 도 폴링도 없이 201 한 번으로
 * 끝나며 저장과 동시에 그 커스텀이 선택된다. 돌아오는 것은 이미지가 아니라 레이어 목록이고,
 * 앞면을 합성하는 일은 `CardLayerStack` 이 화면에서 한다.
 */

/**
 * 레이어 한 줄. `CardCustomizationResponse.frontLayers` 와
 * `LayeredCustomizationResponse.frontLayers` 가 **같은 모양**이라 변환기도 하나면 된다.
 */
type FaceLayerResponse = {
  type: string;
  assetId: string | null;
  imageUrl: string | null;
  textContent: string | null;
  layerOrder: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  styleData: Record<string, unknown> | null;
};

type BackResponse = {
  layoutId: string;
  baseImageUrl: string | null;
  /** 뒷면 글자의 좌표·폰트·색. **읽지 않는다** — 뒷면은 `CardBack` 이 우리 토큰으로 그린다. */
  layoutData: Record<string, unknown> | null;
  contentData: Record<string, unknown> | null;
};

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
  /** `b5f9690` 이후에만 온다. 그 전 서버는 아예 보내지 않으므로 optional 이어야 한다. */
  frontLayers?: FaceLayerResponse[] | null;
  back?: BackResponse | null;
  createdAt: string;
};

/** 201 로 돌아오는 레이어 저장 결과. 이미지 필드가 애초에 없다. */
type LayeredCustomizationResponse = {
  id: string;
  cardId: string;
  status: string;
  frontLayers: FaceLayerResponse[];
  back: BackResponse | null;
  createdAt: string;
};

const FACE_LAYER_TYPES: readonly CardFaceLayerType[] = ['PRODUCT_BACKGROUND', 'BORDER', 'TEXT'];

/**
 * 레이어 한 줄을 화면이 쓰는 모양으로.
 *
 * **모르는 `type` 은 버린다.** 네트워크가 주는 값에 `assertNever` 를 쓰지 않는다는 규칙의
 * 이 자리 버전이다 — 백엔드가 네 번째 종류를 더하는 날, 그것을 못 그리는 것은 괜찮지만
 * 카드 전체가 안 그려지는 것은 괜찮지 않다.
 */
function toFaceLayer(res: FaceLayerResponse): CardFaceLayer | null {
  const type = FACE_LAYER_TYPES.find((t) => t === res.type);
  if (!type) return null;
  return {
    type,
    assetId: res.assetId,
    imageUrl: assetUrl(res.imageUrl),
    text: res.textContent,
    frame: { x: res.x, y: res.y, width: res.width, height: res.height },
    rotation: res.rotation,
    opacity: res.opacity,
    zIndex: res.zIndex,
    style: res.styleData ?? {},
  };
}

/** 레이어 목록. 순서는 `zIndex` 가 정하므로 여기서 정렬해 두면 그리는 쪽이 다시 안 정렬한다. */
export function toFaceLayers(list: FaceLayerResponse[] | null | undefined): CardFaceLayer[] {
  if (!list?.length) return [];
  return list
    .map(toFaceLayer)
    .filter((layer): layer is CardFaceLayer => layer !== null)
    .sort((a, b) => a.zIndex - b.zIndex);
}

/**
 * AI compose 는 승인 에셋 저장 API 와 달리 `frontLayers` 테이블 행을 만들지 않고,
 * `customizationData.layers` JSON 안에 레이어를 저장한다. 카드 상세에서도 같은 얼굴을
 * 그릴 수 있도록 그 JSON을 화면 레이어로 복원한다.
 */
function compositionLayers(value: string | null): CardFaceLayer[] {
  if (!value) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return [];
  }

  if (!parsed || typeof parsed !== 'object') return [];
  const composition = parsed as { layers?: unknown };
  if (!Array.isArray(composition.layers)) return [];

  const layers = composition.layers as unknown[];
  return layers
    .map((raw: unknown, index: number): CardFaceLayer | null => {
      if (!raw || typeof raw !== 'object') return null;
      const layer = raw as Record<string, unknown>;
      const rawType = typeof layer.type === 'string' ? layer.type : '';
      const type = rawType === 'BACKGROUND' ? 'PRODUCT_BACKGROUND' : rawType;
      if (type !== 'PRODUCT_BACKGROUND' && type !== 'BORDER' && type !== 'TEXT') return null;

      const numberOf = (key: string, fallback: number) =>
        typeof layer[key] === 'number' && Number.isFinite(layer[key])
          ? layer[key] as number
          : fallback;

      return {
        type,
        assetId: typeof layer.resourceId === 'string' ? layer.resourceId : null,
        imageUrl: typeof layer.assetUrl === 'string' ? assetUrl(layer.assetUrl) : null,
        text: typeof layer.text === 'string' ? layer.text : null,
        frame: {
          x: numberOf('x', 0),
          y: numberOf('y', 0),
          width: numberOf('width', 1),
          height: numberOf('height', 1),
        },
        rotation: numberOf('rotation', 0),
        opacity: numberOf('opacity', 1),
        zIndex: numberOf('zIndex', index),
        style: layer.styleData && typeof layer.styleData === 'object'
          ? layer.styleData as Record<string, unknown>
          : {},
      };
    })
    .filter((layer): layer is CardFaceLayer => layer !== null)
    .sort((a, b) => a.zIndex - b.zIndex);
}

/** `contentData` 는 자유 JSON 이라 값 하나하나가 문자열인지 확인하고 지난다. */
function text(source: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = source?.[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function toBackSnapshot(res: BackResponse | null | undefined): CardBackSnapshot | null {
  const content = res?.contentData;
  if (!content) return null;
  const snapshot: CardBackSnapshot = {
    store: text(content, 'store'),
    date: text(content, 'date'),
    location: text(content, 'location'),
    product: text(content, 'product'),
    serialNumber: text(content, 'serialNumber'),
  };
  /* 빈 객체(`{}`)가 오는 경우가 있다 — 그때는 스냅샷이 없는 것과 같으므로 `null` 로 접는다.
     그러지 않으면 `CardBack` 이 다섯 칸 전부 비어 있는 스냅샷을 카드보다 우선해 읽는다. */
  return Object.values(snapshot).some((v) => v !== null) ? snapshot : null;
}

/** 서버 쪽 이름을 화면 쪽 이름으로. `generated*` 의 "생성된"은 화면에서 뜻이 없다. */
export function toCustomization(res: CardCustomizationResponse): CardCustomization {
  const layers = toFaceLayers(res.frontLayers);
  return {
    id: res.id,
    status: res.status,
    frontImageUrl: assetUrl(res.generatedFrontImageUrl),
    backImageUrl: assetUrl(res.generatedBackImageUrl),
    message: res.generatedMessage,
    createdAt: res.createdAt,
    layers: layers.length > 0 ? layers : compositionLayers(res.customizationData),
    back: toBackSnapshot(res.back),
  };
}

/** 201 응답을 같은 도메인 타입으로. 이미지 셋은 이 경로에 존재하지 않으므로 `null` 이다. */
function toLayeredCustomization(res: LayeredCustomizationResponse): CardCustomization {
  return {
    id: res.id,
    status: res.status,
    frontImageUrl: null,
    backImageUrl: null,
    message: null,
    createdAt: res.createdAt,
    layers: toFaceLayers(res.frontLayers),
    back: toBackSnapshot(res.back),
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

/**
 * 승인 에셋 세 겹으로 카드를 꾸민다. `POST /cards/{cardId}/customizations/layers`.
 *
 * 배경과 테두리는 **id 만** 보낸다 — 서버가 좌표를 받지 않고 `{0,0,1,1}` 로 굳혀 저장하므로
 * 보낼 것이 없다. 고객이 배치하는 것은 문구 하나뿐이고, 그래서 이 요청에서 좌표를 갖는 것도
 * 문구 하나뿐이다.
 */
export type LayeredCustomizationInput = {
  productBackgroundAssetId: string;
  borderAssetId: string;
  backLayoutId: string;
  text: {
    content: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    opacity: number;
    zIndex: number;
    style?: Record<string, unknown>;
  };
};

export async function createLayeredCustomization(
  cardId: string,
  body: LayeredCustomizationInput,
): Promise<CardCustomization> {
  return toLayeredCustomization(
    await request<LayeredCustomizationResponse>(`/cards/${cardId}/customizations/layers`, {
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
