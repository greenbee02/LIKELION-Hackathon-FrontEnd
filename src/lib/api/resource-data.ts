import { asFinite, asHexColor, asText, asUnit, parseJsonObject, pick } from './parse';
import type { CardLayerType, Frame } from '../types';

/**
 * 이미지가 아닌 AI 리소스가 실어 오는 것 — `generatedData` 를 읽는 곳.
 *
 * **이 파일 전체가 미지수 위에 서 있다.** OpenAPI 는 `generatedData: string` 이라고만 말하고
 * 안쪽 스키마를 적지 않았으며, 지금까지 실제 응답을 한 번도 관찰하지 못했다(연동 계획의 실측
 * 표에 AI 리소스 항목이 한 줄도 없다). 그래서 아래는 *스키마를 맞힌 것*이 아니라 *어떤 모양이
 * 와도 죽지 않고 읽을 수 있는 만큼만 읽는 파서*다.
 *
 * 방어의 규칙:
 *
 * 1. **던지지 않는다.** 무엇이 오든 `ResourceData` 하나가 나온다.
 * 2. **키 철자를 여러 개 시도한다.** `colors` 로 올지 `palette` 로 올지 모른다.
 * 3. **원소 단위로 거른다.** 다섯 색 중 하나가 이상하다고 팔레트 전체를 버리지 않는다.
 * 4. **개수를 자른다.** 서버가 200개를 보내도 화면은 멀쩡해야 한다.
 * 5. **범위를 벗어난 수는 버리지 않고 접는다.** 의도는 알겠고 숫자만 틀렸을 뿐이다.
 * 6. **`UNPARSED` 는 오류가 아니라 상태다.** 아래 참조.
 */

export type PaletteData = {
  kind: 'COLOR_PALETTE';
  name?: string;
  description?: string;
  /** hex 검증을 통과한 것만, 최대 8개. */
  colors: string[];
};

export type TextStyleData = {
  kind: 'TEXT_STYLE';
  name?: string;
  fontWeight?: string;
  fontSize?: number;
  letterSpacing?: number;
  textAlign?: 'left' | 'center' | 'right';
  transform?: 'none' | 'uppercase';
  color?: string;
};

export type CompositionData = {
  kind: 'COMPOSITION';
  name?: string;
  /** 최대 12칸. `type` 을 알아볼 수 없는 칸은 버린다 — 어디에 놓을지 모르는 칸은 칸이 아니다. */
  slots: { slot: string; type: CardLayerType; frame: Frame }[];
};

/**
 * 읽지 못했다.
 *
 * **오류가 아니라 상태다.** 후보 타일은 정상적으로 그려지고 미리보기 자리만 비며, 캡션 한 줄이
 * 그렇게 말한다. **선택은 여전히 가능하다** — 서버는 그 리소스가 무엇인지 알고 있고, 우리가
 * 못 그린다는 사실이 고객이 그걸 못 쓸 이유는 아니다.
 *
 * 딱 하나 예외가 `COMPOSITION` 이다. 그건 우리가 프레임을 읽어 레이어에 깔아야 하는 것이라,
 * 못 읽으면 적용할 것이 없다 — 그래서 그 타일만 '적용' 컨트롤이 없다.
 */
export type UnparsedData = { kind: 'UNPARSED' };

export type ResourceData = PaletteData | TextStyleData | CompositionData | UnparsedData;

export type DataResourceType = 'COLOR_PALETTE' | 'TEXT_STYLE' | 'COMPOSITION';

const UNPARSED: UnparsedData = { kind: 'UNPARSED' };

export function parseResourceData(type: DataResourceType, raw: string | null): ResourceData {
  const data = parseJsonObject(raw);
  if (!data) return UNPARSED;

  switch (type) {
    case 'COLOR_PALETTE':
      return parsePalette(data);
    case 'TEXT_STYLE':
      return parseTextStyle(data);
    case 'COMPOSITION':
      return parseComposition(data);
  }
}

const MAX_COLORS = 8;
const MAX_SLOTS = 12;

function parsePalette(data: Record<string, unknown>): PaletteData | UnparsedData {
  const raw = pick(data, 'colors', 'palette', 'swatches', 'hexCodes');
  const list = Array.isArray(raw) ? raw : [];

  /* 배열이 아니라 `{primary, secondary, …}` 로 올 가능성도 있다. 이름을 알 수 없으므로
     값 중 hex 인 것만 순서대로 줍는다 — 이름 없는 색이라도 칩으로는 온전하다. */
  const fallback = list.length === 0 ? Object.values(data) : [];
  const colors = [...list, ...fallback]
    .map(asHexColor)
    .filter((c): c is string => c !== undefined)
    .slice(0, MAX_COLORS);

  if (colors.length === 0) return UNPARSED;

  return {
    kind: 'COLOR_PALETTE',
    name: asText(pick(data, 'name', 'paletteName', 'title')),
    description: asText(pick(data, 'description', 'note')),
    colors,
  };
}

const ALIGNMENTS = new Set(['left', 'center', 'right']);

function parseTextStyle(data: Record<string, unknown>): TextStyleData | UnparsedData {
  const align = asText(pick(data, 'textAlign', 'align'))?.toLowerCase();
  const transform = asText(pick(data, 'textTransform', 'transform'))?.toLowerCase();

  const style: TextStyleData = {
    kind: 'TEXT_STYLE',
    name: asText(pick(data, 'name', 'fontStyle', 'styleName', 'title')),
    /* 굵기는 숫자로도 단어로도 온다. 문자열로 통일해 두면 RN 의 `fontWeight` 가 둘 다 받는다. */
    fontWeight: asText(pick(data, 'fontWeight', 'weight')) ?? numberAsText(pick(data, 'fontWeight')),
    fontSize: asFinite(pick(data, 'fontSize', 'size')),
    letterSpacing: asFinite(pick(data, 'letterSpacing', 'tracking')),
    textAlign: align && ALIGNMENTS.has(align) ? (align as TextStyleData['textAlign']) : undefined,
    transform: transform === 'uppercase' ? 'uppercase' : transform === 'none' ? 'none' : undefined,
    color: asHexColor(pick(data, 'color', 'textColor')),
  };

  // 이름 말고는 아무것도 못 읽었다면 미리보기를 그릴 수 없다 — 이름만으로는 조판이 안 된다.
  const readable = Object.entries(style).filter(([k, v]) => k !== 'kind' && k !== 'name' && v !== undefined);
  return readable.length > 0 || style.name ? style : UNPARSED;
}

const LAYER_TYPES = new Set<string>([
  'BASE_CARD',
  'BACKGROUND',
  'PRODUCT',
  'BORDER',
  'PATTERN',
  'DECORATION',
  'TEXT',
  'FINISH',
]);

function parseComposition(data: Record<string, unknown>): CompositionData | UnparsedData {
  const raw = pick(data, 'slots', 'layers', 'layout', 'areas');
  if (!Array.isArray(raw)) return UNPARSED;

  const slots: CompositionData['slots'] = [];

  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue;
    const row = entry as Record<string, unknown>;

    const type = asText(pick(row, 'type', 'layerType', 'slot'))?.toUpperCase();
    if (!type || !LAYER_TYPES.has(type)) continue;

    const frame = readFrame(row);
    if (!frame) continue;

    slots.push({
      slot: asText(pick(row, 'slot', 'name')) ?? type.toLowerCase(),
      type: type as CardLayerType,
      frame,
    });
    if (slots.length >= MAX_SLOTS) break;
  }

  return slots.length > 0 ? { kind: 'COMPOSITION', name: asText(pick(data, 'name')), slots } : UNPARSED;
}

/**
 * 칸 하나의 사각형.
 *
 * 네 값이 다 있어야 칸이다 — 셋만 있는 사각형은 그릴 수 없고, 없는 값을 기본값으로 채우면
 * 서버가 말하지 않은 배치를 우리가 지어내는 셈이 된다. 그런 칸은 통째로 버린다.
 */
function readFrame(row: Record<string, unknown>): Frame | null {
  const nested = row.frame;
  const source =
    typeof nested === 'object' && nested !== null ? (nested as Record<string, unknown>) : row;

  const x = asUnit(pick(source, 'x', 'left'));
  const y = asUnit(pick(source, 'y', 'top'));
  const width = asUnit(pick(source, 'width', 'w'));
  const height = asUnit(pick(source, 'height', 'h'));

  if (x === undefined || y === undefined || width === undefined || height === undefined) return null;
  if (width === 0 || height === 0) return null;
  return { x, y, width, height };
}

const numberAsText = (value: unknown): string | undefined => {
  const n = asFinite(value);
  return n === undefined ? undefined : String(n);
};
