import { Platform } from 'react-native';

const SYSTEM_FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const SUPPORTED_FONTS = new Set(['Jost_300Light', 'CormorantGaramond_600SemiBold']);

/** 서버가 알 수 없는 글꼴을 보내도 텍스트가 사라지지 않도록 안전한 기본 글꼴을 사용한다. */
export function resolveCardFontFamily(value: unknown): string | undefined {
  if (typeof value === 'string' && SUPPORTED_FONTS.has(value)) return value;
  return Platform.OS === 'web' ? SYSTEM_FONT : undefined;
}
