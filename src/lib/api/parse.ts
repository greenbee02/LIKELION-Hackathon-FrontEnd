/**
 * 백엔드가 **문자열 안에 담아 보낸 JSON** 을 읽는 도구들.
 *
 * 두 곳이 그렇게 온다: 템플릿의 `resourceData` 와 AI 리소스의 `generatedData`. 둘 다
 * OpenAPI 가 `string` 이라고만 말하고 **안쪽 스키마는 어디에도 없다.** 관찰된 것은 템플릿
 * 시드 세 건뿐이고, AI 쪽은 한 번도 관찰된 적이 없다.
 *
 * 그래서 여기 있는 함수들은 전부 같은 성격을 갖는다: **던지지 않고, 모르는 것은 버리고,
 * 아는 것만 남긴다.** 스키마를 맞히려 들지 않는다 — 맞히면 다음 배포에서 틀린다.
 */

/** `JSON.parse` 하되 절대 던지지 않는다. 객체가 아니면 `null`. */
export function parseJsonObject(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/**
 * 색 문자열인가.
 *
 * **이 정규식 한 줄이 "이상한 시드"와 "앱이 죽는다"를 가른다.** 네이티브의
 * `backgroundColor` 에 파싱할 수 없는 문자열을 넣으면 예외가 아니라 크래시다. 서버가 준 색을
 * 검증 없이 쓰는 것은 남의 데이터로 우리 앱을 넘어뜨리는 일이다.
 *
 * `#RGB` 도 받는다 — CSS 가 받는 축약형이고, 실제로 온 적은 없지만 거절할 이유도 없다.
 */
export const isHexColor = (value: unknown): value is string =>
  typeof value === 'string' && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());

export const asHexColor = (value: unknown): string | undefined =>
  isHexColor(value) ? value.trim() : undefined;

/** 비어 있지 않은 문자열만. 빈 문자열은 "값이 없다"와 같이 취급한다 — 빈 행은 그리지 않는다. */
export const asText = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

/** 유한한 수만. `NaN` 과 `Infinity` 는 레이아웃을 조용히 망가뜨리므로 없는 값으로 친다. */
export const asFinite = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

/** 0~1 로 접는다. 범위를 벗어난 값은 버리지 않고 접는다 — 의도는 알겠고 숫자만 틀렸으므로. */
export const asUnit = (value: unknown): number | undefined => {
  const n = asFinite(value);
  return n === undefined ? undefined : Math.min(1, Math.max(0, n));
};

/**
 * 여러 철자 중 처음 걸리는 키를 집는다.
 *
 * 팔레트가 `colors` 로 올지 `palette` 로 올지 `swatches` 로 올지 모른다. 하나를 골라 걸면
 * 나머지 둘에서 화면이 빈다.
 */
export function pick(source: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) return source[key];
  }
  return undefined;
}

/**
 * switch 가 모든 경우를 덮었는지 컴파일러에게 묻는다.
 *
 * 테스트 러너가 없는 저장소라 **tsc 가 유일한 러너**다. 리소스 종류가 아홉 번째로 늘어나는
 * 날, 이 호출이 있는 switch 는 빌드를 깨뜨려서 알려준다 — 런타임에 빈 타일로 알려주는 대신.
 */
export function assertNever(value: never): never {
  throw new Error(`처리하지 않은 값: ${JSON.stringify(value)}`);
}
