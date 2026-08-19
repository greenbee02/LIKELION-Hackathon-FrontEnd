import { ApiError } from './api/client';
import { toLayerRequest, type Candidate, type ComposeBody } from './api/ai-resources';
import type { PaletteData, TextStyleData } from './api/resource-data';
import type { CardLayer, TemplateResource, Uuid } from './types';

/**
 * 편집 상태를 `POST /ai-resources/compose` 의 바디로 바꾸는 곳, 그리고 그 바디가 계약을
 * 지키는지 마지막으로 확인하는 곳.
 *
 * **관문은 셋이고, 서로 다른 통화로 값을 치른다.**
 *
 * 1. **UI 가 애초에 불가능하게 만든다** — 끝나지 않은 후보는 누를 수 없고, 고른 것은
 *    `Partial<Record<타입, id>>` 라는 자료구조에 들어간다. 그 자료구조는 같은 그룹에서 둘을
 *    담을 수 없고, 종류가 여덟이므로 여덟 개를 넘을 수도 없다. **"그룹 중복 금지"와
 *    "최대 8개"가 검사가 아니라 타입의 성질이 되는 지점이다.**
 * 2. **`buildComposeBody` 가 이유를 붙여 거절한다** — 왕복 전에, 저장 버튼 옆에서.
 * 3. **`validateComposeBody` 가 던진다** — 실서버든 목이든 같은 함수를 통과한다. 목이
 *    실서버보다 관대해지는 구멍이 여기서 막힌다.
 */

/** 계약의 상한. 종류가 여덟이므로 실제로는 도달할 수 없지만, 적어두지 않으면 근거가 사라진다. */
const MAX_RESOURCES = 8;
const MAX_MESSAGE = 1000;

/** 정규화 좌표가 무엇에 대한 것인지. 서버가 읽는지는 미지수이고, 적어두는 편이 무해하다. */
export const CANVAS = { width: 1000, height: 1586 } as const;

export type ComposeInput = {
  templateId: Uuid | null;
  templateResource: TemplateResource | null;
  /** 종류 → 고른 후보의 id. 슬롯이 하나뿐인 것이 곧 그룹 유일성이다. */
  selected: Partial<Record<string, Uuid>>;
  /** 지금 화면에 있는 후보 전부. 고른 것이 정말 `COMPLETED` 인지 여기서 확인한다. */
  candidates: Candidate[];
  layers: CardLayer[];
  message?: string;
};

export type BuildResult = { ok: true; body: ComposeBody } | { ok: false; reason: string };

export function buildComposeBody(input: ComposeInput): BuildResult {
  const { selected, candidates, layers, message, templateId, templateResource } = input;

  const resourceIds = Object.values(selected).filter((id): id is Uuid => Boolean(id));

  /* 고른 것이 그사이 사라졌거나(재생성) 아직 안 끝났을 수 있다. UI 가 막고 있지만, 막는 쪽과
     보내는 쪽이 다른 순간을 보고 있을 수 있으므로 보내는 쪽에서 한 번 더 본다. */
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const unfinished = resourceIds.filter((id) => byId.get(id)?.status !== 'COMPLETED');
  if (unfinished.length > 0) {
    return { ok: false, reason: '아직 만들어지지 않은 것이 있습니다.' };
  }

  if (layers.length === 0) {
    return { ok: false, reason: '카드에 올린 것이 없습니다.' };
  }

  const palette = pickData<PaletteData>(byId, selected.COLOR_PALETTE, 'COLOR_PALETTE');
  const textStyle = pickData<TextStyleData>(byId, selected.TEXT_STYLE, 'TEXT_STYLE');

  return {
    ok: true,
    body: {
      resourceIds,
      ...(message?.trim() && { message: message.trim().slice(0, MAX_MESSAGE) }),
      layoutData: buildLayoutData({ templateId, templateResource, palette }),
      layers: withTextStyle(layers, textStyle, palette).map(toLayerRequest),
    },
  };
}

/**
 * 카드 전체에 걸리는 결정들.
 *
 * `COLOR_PALETTE` 는 여기 들어간다 — 어느 한 레이어의 속성이 아니라 카드가 쓰는 색 전부이기
 * 때문이다. `TEXT_STYLE` 은 반대로 레이어의 속성이라 `styleData` 로 내려간다.
 *
 * 템플릿의 `pattern`·`graphicStyle`·`frontLayout` 처럼 **우리가 뜻을 모르는 값은 그대로 되돌려
 * 준다.** `VISETOS_MONOGRAM` 이 무엇인지 프론트는 알 수 없고 알 필요도 없다. 해석하지 않고
 * 돌려주는 것이 미지수를 다루는 가장 안전한 방법이고, 서버는 자기가 쓴 값을 알아본다.
 *
 * **`COMPOSITION` 은 여기 없다.** 그건 좌표라서 이미 각 레이어의 `frame` 에 반영돼 있고,
 * 배치를 배치 위에 한 번 더 얹을 이유가 없다.
 */
function buildLayoutData({
  templateId,
  templateResource,
  palette,
}: {
  templateId: Uuid | null;
  templateResource: TemplateResource | null;
  palette: PaletteData | null;
}): Record<string, unknown> {
  return {
    version: 1,
    canvas: CANVAS,
    ...(templateId && { templateId }),
    ...(templateResource && { template: templateResource }),
    ...(palette && { palette: palette.colors }),
  };
}

/**
 * 글자 레이어에 조판 규칙과 색을 얹는다.
 *
 * 팔레트를 골랐으면 그 첫 색이 글자색이 된다 — 다만 `TEXT_STYLE` 이 자기 색을 말했으면 그쪽이
 * 이긴다. 더 구체적인 것이 이긴다는 흔한 규칙이고, 그러지 않으면 글자 스타일을 고른 보람이
 * 없어진다.
 */
function withTextStyle(
  layers: CardLayer[],
  textStyle: TextStyleData | null,
  palette: PaletteData | null,
): CardLayer[] {
  if (!textStyle && !palette) return layers;

  return layers.map((layer) => {
    if (layer.type !== 'TEXT') return layer;
    const style: Record<string, unknown> = { ...layer.style };

    if (palette?.colors[0]) style.color = palette.colors[0];
    if (textStyle) {
      if (textStyle.name) style.fontStyle = textStyle.name;
      if (textStyle.fontWeight) style.fontWeight = textStyle.fontWeight;
      if (textStyle.fontSize !== undefined) style.fontSize = textStyle.fontSize;
      if (textStyle.letterSpacing !== undefined) style.letterSpacing = textStyle.letterSpacing;
      if (textStyle.textAlign) style.textAlign = textStyle.textAlign;
      if (textStyle.transform) style.textTransform = textStyle.transform;
      if (textStyle.color) style.color = textStyle.color;
    }

    return { ...layer, style };
  });
}

function pickData<T extends { kind: string }>(
  byId: Map<string, Candidate>,
  id: Uuid | undefined,
  kind: T['kind'],
): T | null {
  if (!id) return null;
  const candidate = byId.get(id);
  if (candidate?.kind !== 'data') return null;
  return candidate.data.kind === kind ? (candidate.data as T) : null;
}

/**
 * 계약을 지키는지 마지막으로 본다. 네트워크 직전, 그리고 목도 같은 함수를 통과한다.
 *
 * **좌표가 이상하면 그 레이어를 조용히 버리지 않고 던진다.** 버리면 고객이 배치한 것이 말없이
 * 사라지고, 그건 실패보다 나쁘다. 반대로 회전·투명도·길이는 `toLayerRequest` 가 이미 범위 안으로
 * 접었다 — 접는 것은 손실이 아니라 반올림이므로 던질 일이 아니다.
 *
 * `httpStatus: 0` 은 "네트워크를 타지 않았다"는 기존 규약 그대로다.
 */
export function validateComposeBody(body: ComposeBody): void {
  if (body.resourceIds.length > MAX_RESOURCES) {
    throw new ApiError('COMPOSE_TOO_MANY_RESOURCES', '고른 요소가 너무 많습니다.');
  }
  if (new Set(body.resourceIds).size !== body.resourceIds.length) {
    throw new ApiError('COMPOSE_DUPLICATE_RESOURCE', '같은 요소를 두 번 골랐습니다.');
  }
  if (!body.layers || body.layers.length === 0) {
    throw new ApiError('COMPOSE_EMPTY', '카드에 올린 것이 없습니다.');
  }
  for (const layer of body.layers) {
    const values = [layer.x, layer.y, layer.width, layer.height];
    if (values.some((v) => !Number.isFinite(v))) {
      throw new ApiError('COMPOSE_BAD_FRAME', '레이어 위치를 계산하지 못했습니다.');
    }
  }
}
