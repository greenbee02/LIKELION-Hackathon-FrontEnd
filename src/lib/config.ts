import { Platform } from 'react-native';

/**
 * 앱이 어디에 붙어 있는지, 그리고 실제로 붙기는 하는지.
 *
 * **목 스위치가 여기 하나뿐인 것이 요점이다.** 이전에는 `auth-store` · `cards-store` ·
 * `issue-flow` 세 파일이 각자 `USE_MOCK` 상수를 들고 있었고, 그러면 전환할 때 반드시 하나를
 * 빠뜨린다 — 로그인은 실서버인데 카드는 목인 상태가 조용히 만들어진다. 스위치가 하나면
 * 그런 중간 상태 자체가 존재할 수 없다.
 */

/** `EXPO_PUBLIC_*` 는 빌드 시점에 문자열로 치환된다. 불리언 변환은 여기서 한 번만. */
export const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK !== 'false';

const CONFIGURED_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

/**
 * 브라우저에서는 언제나 상대 경로를 쓴다.
 *
 * 백엔드에 CORS 설정이 없어서 브라우저가 교차 출처 요청을 막는다. 우회할 수 있는 조건은
 * "다른 출처"라는 사실 하나뿐이므로, **앞단이 같은 출처에서 대신 요청을 보내준다.** 주소를
 * `/api/v1` 로 줄이면 그쪽으로 간다.
 *
 * 대신 보내주는 주체가 개발과 배포에서 다를 뿐, 하는 일은 같다:
 *
 * - 개발 — `metro.config.js` 의 개발 서버 미들웨어
 * - 배포 — `vercel.json` 의 rewrite
 *
 * 둘 다 `/api/` · `/images/` · `/generated/` 를 `EXPO_PUBLIC_API_URL` 이 가리키는 서버로
 * 넘긴다. 그래서 백엔드 주소는 여전히 `.env` 한 곳에만 있고, **브라우저가 그 주소로 요청을
 * 보내는 일은 없다.** (주소 문자열 자체는 번들에 남는다 — 아래 계산이 런타임에 일어나기
 * 때문이고, 어차피 시크릿이 아니라 주소일 뿐이다.)
 *
 * 이것이 `__DEV__` 로 막혀 있지 않은 이유다. 예전에는 배포에 프록시가 없어서 익스포트가
 * 절대 주소로 나갔고 CORS 에 막혔다. 이제는 양쪽 다 있으므로 웹은 한 가지로 동작한다.
 *
 * 네이티브는 CORS 를 적용하지 않으므로 언제나 실제 주소로 직접 간다.
 */
const useProxy = Platform.OS === 'web';

export const API_BASE_URL = useProxy
  ? new URL(CONFIGURED_URL, 'http://placeholder').pathname.replace(/\/$/, '')
  : CONFIGURED_URL;

/**
 * `/api/v1` 을 뗀 서버 원점.
 *
 * 이미지가 API 바깥에 있기 때문에 필요하다 — 백엔드는 상품 사진을 `/images/products/prod_001.png`
 * 처럼 **상대 경로**로 주는데, 이 경로는 `/api/v1` 아래가 아니라 서버 루트에 있다. 그래서
 * base URL 을 그대로 붙이면 `/api/v1/images/...` 라는 없는 주소가 된다.
 */
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/v\d+\/?$/, '');

/**
 * 백엔드가 준 경로를 화면이 실제로 부를 수 있는 주소로 바꾼다.
 *
 * 이미 절대 URL 이면 그대로 둔다 — AI 가 생성한 이미지는 외부 스토리지 URL 로 올 수 있고,
 * 그것까지 서버 원점에 붙이면 망가진다. `null` 은 그대로 통과시켜서, 호출부가 "주소가 없다"와
 * "주소가 틀렸다"를 구분할 필요가 없게 한다.
 */
export function assetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
}
