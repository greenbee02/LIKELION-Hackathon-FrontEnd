import { CANDIDATES_PER_GROUP } from './api/ai-resources';
import type { CompositionData } from './api/resource-data';
import type { CardLayer, CardLayerType, Frame, TemplateResource } from './types';

/**
 * 레이어가 어디에 있고 어떻게 쌓이는가 — 순수 함수만.
 *
 * 상태도 훅도 없다. 편집 상태를 들고 있는 `card-design.ts` 가 이 함수들을 부르고, 이 파일은 무엇도 기억하지
 * 않는다. 테스트 러너가 없는 저장소에서 **가장 틀리기 쉬운 계산을 가장 검증하기 쉬운 모양으로
 * 떼어 놓는 것**이 요점이다 — 좌표 변환이 틀리면 화면에서 알아채기 전에 서버로 나간다.
 */

/* ────────────────────────────────────────────────────────────────────────────
 * 좌표
 * ──────────────────────────────────────────────────────────────────────────── */

export type Size = { width: number; height: number };
export type Rect = { left: number; top: number; width: number; height: number };

/**
 * 5% 아래로는 줄일 수 없다.
 *
 * 손가락으로 다시 집을 수 없는 크기까지 줄어들면 그 레이어는 목록에서만 지울 수 있는 것이
 * 되고, 그건 되돌릴 수 없는 실수가 된다.
 */
export const MIN_SIDE = 0.05;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * 정규화 → 픽셀. 무대가 그리기 직전에만 부른다.
 *
 * **워클릿이다.** 드래그 중에는 UI 스레드에서 불려야 하고, JS 스레드로 건너가면 손가락을
 * 따라가지 못한다.
 */
export function toRect(frame: Frame, size: Size): Rect {
  'worklet';
  return {
    left: frame.x * size.width,
    top: frame.y * size.height,
    width: frame.width * size.width,
    height: frame.height * size.height,
  };
}

/** 픽셀 → 정규화. 제스처가 끝날 때 한 번. */
export function toFrame(rect: Rect, size: Size): Frame {
  'worklet';
  if (size.width <= 0 || size.height <= 0) return { x: 0, y: 0, width: 1, height: 1 };
  return {
    x: rect.left / size.width,
    y: rect.top / size.height,
    width: rect.width / size.width,
    height: rect.height / size.height,
  };
}

/**
 * 카드 밖으로 나가지 않게, 그리고 너무 작아지지 않게.
 *
 * 폭을 먼저 접고 그다음 위치를 접는다 — 순서가 반대면 오른쪽 끝에서 넓힌 레이어가 폭을 잃는
 * 대신 왼쪽으로 밀려난다. 잡고 있는 모서리가 움직이는 것이 제일 이상하게 느껴진다.
 */
export function clampFrame(frame: Frame): Frame {
  'worklet';
  const width = clamp(frame.width, MIN_SIDE, 1);
  const height = clamp(frame.height, MIN_SIDE, 1);
  return {
    width,
    height,
    x: clamp(frame.x, 0, 1 - width),
    y: clamp(frame.y, 0, 1 - height),
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * 기본값
 * ──────────────────────────────────────────────────────────────────────────── */

/** 카드를 꽉 채우는 칸. 바탕·테두리·무늬·마감이 전부 이것이다. */
const FULL: Frame = { x: 0, y: 0, width: 1, height: 1 };

/**
 * 각 종류가 처음 놓이는 자리.
 *
 * **씨앗이지 규칙이 아니다.** 놓자마자 옮길 수 있고, `COMPOSITION` 리소스를 적용하면 통째로
 * 덮인다. 여기 있는 숫자는 "아무것도 정해지지 않았을 때 가장 덜 틀린 자리"일 뿐이다.
 */
export const DEFAULT_FRAMES: Record<CardLayerType, Frame> = {
  BASE_CARD: FULL,
  BACKGROUND: FULL,
  BORDER: FULL,
  PATTERN: FULL,
  FINISH: FULL,
  /* 상품은 카드의 주인공이라 가운데 위쪽, 아래에 이름이 들어갈 자리를 남긴다. */
  PRODUCT: { x: 0.15, y: 0.22, width: 0.7, height: 0.44 },
  DECORATION: { x: 0.58, y: 0.68, width: 0.3, height: 0.18 },
  TEXT: { x: 0.08, y: 0.06, width: 0.62, height: 0.08 },
};

/** 카드를 꽉 채우는 종류들. 편집기에서 크기 조절 핸들을 띄울지 정할 때도 쓴다. */
export const isFullBleed = (type: CardLayerType) =>
  type === 'BASE_CARD' || type === 'BACKGROUND' || type === 'BORDER' || type === 'PATTERN' || type === 'FINISH';

let counter = 0;
/** 로컬 레이어 id. 서버가 만든 것이 아니므로 uuid 인 척하지 않는다. */
export const nextLayerId = (type: CardLayerType) => `layer-${type.toLowerCase()}-${++counter}`;

export function makeLayer(type: CardLayerType, patch: Partial<CardLayer> = {}): CardLayer {
  return {
    id: nextLayerId(type),
    type,
    slot: type.toLowerCase(),
    frame: DEFAULT_FRAMES[type],
    rotation: 0,
    opacity: 1,
    visible: true,
    /* 바탕은 잠긴 채로 태어난다. 카드 그 자체라 옮기거나 지울 것이 아니고, 잠겨 있지 않으면
       빈 곳을 눌렀을 때 배경 대신 바탕이 잡혀서 아무것도 선택 해제할 수 없다. */
    locked: type === 'BASE_CARD',
    ...patch,
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * 처음 쌓기
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * 아래에서 위로. 배열 순서가 곧 `zIndex` 이므로 이 순서가 그대로 쌓임 순서가 된다.
 *
 * **`BASE_CARD` 는 여기 없다.** 백엔드가 그 레이어를 폐지했고(`CARD_BASE_LAYER_DEPRECATED`,
 * 400), 카드 바탕은 이제 레이어가 아니라 합성의 밑바닥이다 — 템플릿 위에 올리는 것이지
 * 템플릿을 레이어로 다시 놓는 것이 아니다. `CardLayerType` 에는 남아 있는데, 서버 enum 이
 * 아직 갖고 있고 지난 커스텀 이력이 그 값을 달고 올라올 수 있기 때문이다.
 */
const STACK_ORDER: CardLayerType[] = [
  'BACKGROUND',
  'PATTERN',
  'PRODUCT',
  'BORDER',
  'DECORATION',
  'TEXT',
  'FINISH',
];

/**
 * 고른 후보와 템플릿으로 첫 배치를 만든다.
 *
 * **고르지 않은 종류는 레이어가 되지 않는다.** 빈 칸을 미리 깔아두면 고객은 자기가 놓지 않은
 * 것이 왜 거기 있는지 알 수 없고, 그 칸은 서버로도 나간다.
 *
 * `PRODUCT` 만 예외로 늘 놓는다 — 카드의 주인공이고, AI 리소스 없이 상품 사진만으로 성립한다.
 * 예전에는 `PRODUCT_ANGLE` 을 골랐으면 그 그림이 대신 들어갔는데, 그 종류가 폐지되면서
 * 상품 레이어는 언제나 상품 기본 이미지다 — 백엔드도 `PRODUCT` 레이어에 리소스를 붙이는 것을
 * 거부한다.
 */
export function initialLayers(
  selected: Partial<Record<string, string>>,
  template: TemplateResource | null,
): CardLayer[] {
  const layers: CardLayer[] = [];

  for (const type of STACK_ORDER) {
    if (type === 'PRODUCT') {
      layers.push(makeLayer('PRODUCT'));
      continue;
    }

    if (type === 'TEXT') continue; // 글자는 고객이 직접 얹는다. 빈 글자를 미리 놓지 않는다.

    const resourceId = selected[type];
    if (resourceId) layers.push(makeLayer(type, { resourceId }));
  }

  /* 템플릿이 글자색을 말해두었으면 앞으로 만들 TEXT 레이어가 그것을 물려받는다. 색을 지어내지
     않고 하우스가 정한 것을 쓰는 유일한 경로다. */
  if (template?.textColor) {
    for (const layer of layers) layer.style = { color: template.textColor };
  }

  return layers;
}

/**
 * `COMPOSITION` 후보를 배치에 반영한다.
 *
 * 슬롯 이름이나 종류가 맞는 레이어의 자리만 바꾼다. **없는 레이어를 만들어내지 않는다** —
 * 배치는 "무엇을 놓을지"가 아니라 "어디에 놓을지"를 말하는 것이고, 고르지도 않은 장식을
 * 배치가 데려오면 고객이 놓지 않은 것이 카드에 생긴다.
 */
export function applyComposition(layers: CardLayer[], composition: CompositionData): CardLayer[] {
  return layers.map((layer) => {
    const slot =
      composition.slots.find((s) => s.slot === layer.slot) ??
      composition.slots.find((s) => s.type === layer.type);
    return slot ? { ...layer, frame: clampFrame(slot.frame), slot: slot.slot } : layer;
  });
}

/* ────────────────────────────────────────────────────────────────────────────
 * 목록 조작
 * ──────────────────────────────────────────────────────────────────────────── */

export const replaceLayer = (layers: CardLayer[], id: string, patch: Partial<CardLayer>) =>
  layers.map((l) => (l.id === id ? { ...l, ...patch } : l));

export const removeLayer = (layers: CardLayer[], id: string) => layers.filter((l) => l.id !== id);

/** 한 칸 위/아래로. 끝에서는 아무 일도 일어나지 않는다 — 순환시키면 순서가 뒤집힌 것처럼 보인다. */
export function moveLayer(layers: CardLayer[], id: string, delta: -1 | 1): CardLayer[] {
  const at = layers.findIndex((l) => l.id === id);
  const to = at + delta;
  if (at < 0 || to < 0 || to >= layers.length) return layers;
  const next = [...layers];
  [next[at], next[to]] = [next[to], next[at]];
  return next;
}

/**
 * 고른 후보가 바뀌었을 때 레이어를 맞춘다.
 *
 * 이미 놓인 레이어는 **자리를 지킨다** — 배경 후보를 바꿨다고 고객이 옮겨둔 장식이 처음
 * 자리로 돌아가면 그건 고르기가 아니라 초기화다. 그림만 갈린다.
 */
export function syncSelection(
  layers: CardLayer[],
  type: CardLayerType,
  resourceId: string | undefined,
): CardLayer[] {
  const existing = layers.find((l) => l.type === type);

  if (!resourceId) return existing ? removeLayer(layers, existing.id) : layers;
  if (existing) return replaceLayer(layers, existing.id, { resourceId });

  /* 없던 종류를 새로 고르면 쌓임 순서의 제자리에 끼워 넣는다. 끝에 붙이면 배경이 장식 위에
     올라가고, 고객은 순서를 손으로 되돌려야 한다. */
  const rank = (t: CardLayerType) => STACK_ORDER.indexOf(t);
  const layer = makeLayer(type, { resourceId });
  const at = layers.findIndex((l) => rank(l.type) > rank(type));
  if (at < 0) return [...layers, layer];
  return [...layers.slice(0, at), layer, ...layers.slice(at)];
}

/** 후보 격자가 몇 칸인지. 격자 컴포넌트와 스켈레톤이 같은 수를 봐야 한다. */
export const CANDIDATE_SLOTS = CANDIDATES_PER_GROUP;
