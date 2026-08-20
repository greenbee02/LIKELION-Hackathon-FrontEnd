/**
 * 배포 웹의 백엔드 프록시 — **`Origin` 을 떼기 위해 존재한다.**
 *
 * `vercel.json` 의 리라이트만으로도 경로는 백엔드에 닿는다. 문제는 리라이트가 요청 헤더를
 * 그대로 넘긴다는 것이다: 브라우저는 same-origin 이어도 POST 에 `Origin` 을 붙이고, 백엔드의
 * `CORS_ALLOWED_ORIGINS` 는 기본값(`localhost:3000,localhost:8081`) 그대로라 Vercel 오리진을
 * 모른다. 그래서 로그인 POST 가 **403 `Invalid CORS request`** 로 잘렸다 — GET 은 `Origin` 이
 * 붙지 않아 통과했으므로, 증상은 "카드는 보이는데 로그인만 안 됨"이었다.
 *
 * 실측 (2026-08-20, `curio-xi-lovat.vercel.app`):
 *
 * ```
 * POST /api/v1/auth/login              Origin 없음 → 200 · Origin 있음 → 403
 * GET  /images/products/prod_001.png   Origin 없음 → 200 · Origin 있음 → 403
 * ```
 *
 * **이것은 우회이지 해결이 아니다.** 백엔드가 `CORS_ALLOWED_ORIGINS` 에 배포 오리진을 넣으면
 * 이 파일은 지워도 된다 (`backend-open-items.md` §1). 그때까지 프론트 혼자 풀 수 있는 길이
 * 이것뿐이다 — 리라이트는 헤더를 지우지 못한다.
 *
 * **백엔드 주소가 여기서는 한 곳이다.** `vercel.json` 은 정적 JSON 이라 환경변수를 읽지 못해
 * 주소를 두 번 적어야 했지만, 함수는 읽는다. 그래서 이 함수가 나르는 경로에 한해 주소는
 * `EXPO_PUBLIC_API_URL` 하나로 정해진다.
 */

const FALLBACK_ORIGIN = 'http://1.201.117.14';

/** `http://host/api/v1` → `http://host`. 값이 이상하면 폴백 — 프록시가 죽는 것보다 낫다. */
function backendOrigin() {
  try {
    return new URL(process.env.EXPO_PUBLIC_API_URL ?? FALLBACK_ORIGIN).origin;
  } catch {
    return FALLBACK_ORIGIN;
  }
}

/**
 * 어느 경로를 대신 부를 것인가.
 *
 * **`vercel.json` 이 `?upstream=` 으로 알려준다.** 리라이트를 지나면 `req.url` 은 재작성된
 * 뒤의 주소(`/api/proxy`)라서 원래 경로가 사라지므로, 그 값을 쿼리로 실어 보낸다.
 *
 * 파일 이름이 `[...path].mjs` 가 아닌 이유가 여기 있다. Vercel 의 `functions` 키는 glob 으로
 * 읽히는데 `[...path]` 의 대괄호는 문자 클래스가 되어 자기 파일과 매칭되지 않고, 그러면 함수가
 * **조용히 빠진 채로 배포가 성공한다** — `/api/**` 가 전부 SPA 의 `index.html` 로 떨어져
 * `GET` 은 200 (HTML!), `POST` 는 405 가 됐다. 이름에 특수문자가 없으면 그 함정이 없다.
 *
 * `/images/**` 와 `/generated/**` 도 같은 길을 지난다. Vercel 함수는 `api/` 아래에만 놓을 수
 * 있어서 경로로는 구분할 수 없고, 구분할 필요도 없다 — 하는 일이 같다.
 *
 * 이미지까지 태우는 이유는 위 실측 그대로다: `<img src>` 는 `Origin` 을 붙이지 않지만
 * `fetch` 로 받는 순간 붙고, 그때 403 이 된다.
 */
function upstreamTarget(req) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const path = url.searchParams.get('upstream');
  if (!path || !path.startsWith('/')) return null;

  /* 원본 쿼리는 Vercel 이 `upstream` 옆에 그대로 붙여 준다. 우리 것만 빼고 되돌려 놓는다 —
     `?qrToken=…` 같은 값이 여기서 사라지면 그 엔드포인트는 영영 답을 못 한다. */
  url.searchParams.delete('upstream');
  const rest = url.searchParams.toString();
  return rest ? `${path}?${rest}` : path;
}

/**
 * 위로 올려보내지 않는 요청 헤더.
 *
 * `origin` 이 이 파일의 이유고, 나머지는 홉 단위 헤더다 — `host` 를 그대로 넘기면 백엔드가
 * 우리 도메인을 자기 이름으로 착각하고, `content-length` 는 body 를 다시 만들었으므로 값이
 * 맞지 않는다.
 */
const DROP_REQUEST = new Set([
  'origin',
  'referer',
  'host',
  'connection',
  'content-length',
  'accept-encoding',
]);

/**
 * 아래로 내려보내지 않는 응답 헤더.
 *
 * `fetch` 가 이미 압축을 풀었으므로 `content-encoding` 을 그대로 전달하면 브라우저가 두 번
 * 풀려다 깨진다. 길이도 같은 이유로 다시 센다.
 */
const DROP_RESPONSE = new Set([
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
  'keep-alive',
]);

/**
 * 파싱된 body 를 바이트로 되돌린다.
 *
 * Vercel 의 Node 런타임은 요청을 먼저 읽어 `req.body` 에 담으므로 원본 스트림은 이미 비어
 * 있다. 다시 만드는 수밖에 없고, 그래서 **JSON 은 재직렬화한다** — 이 앱이 보내는 body 는
 * 전부 JSON 이고 파일 업로드 같은 것은 없다.
 */
function requestBody(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;
  const body = req.body;
  if (body === undefined || body === null) return undefined;
  if (typeof body === 'string' || Buffer.isBuffer(body)) return body;
  return JSON.stringify(body);
}

export default async function handler(req, res) {
  const path = upstreamTarget(req);
  if (!path) {
    /* 리라이트를 거치지 않고 이 함수를 직접 부른 경우다. 백엔드의 루트를 대신 부르는 것보다
       여기서 끝내는 편이 정확하다 — 무엇을 원하는지 적히지 않은 요청이다. */
    res.status(400).json({ code: 'PROXY_NO_TARGET', message: '요청 경로를 찾지 못했습니다.' });
    return;
  }
  const target = backendOrigin() + path;

  const headers = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (DROP_REQUEST.has(key.toLowerCase())) continue;
    if (value !== undefined) headers[key] = Array.isArray(value) ? value.join(', ') : value;
  }

  const body = requestBody(req);
  if (body !== undefined && headers['content-type'] === undefined) {
    headers['content-type'] = 'application/json';
  }

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body,
      /* 백엔드의 리다이렉트는 백엔드의 것이다. 여기서 따라가면 브라우저는 그 사실을 모른 채
         다른 주소의 응답을 이 주소의 응답으로 받는다 — OAuth 왕복이 특히 그렇다. */
      redirect: 'manual',
    });

    for (const [key, value] of upstream.headers.entries()) {
      if (!DROP_RESPONSE.has(key.toLowerCase())) res.setHeader(key, value);
    }

    res.status(upstream.status);
    /* 텍스트로 읽으면 PNG 가 깨진다. 이 함수는 JSON 과 이미지를 함께 나르므로 바이트로 다룬다. */
    res.end(Buffer.from(await upstream.arrayBuffer()));
  } catch (e) {
    /* 백엔드에 닿지 못한 것과 백엔드가 거절한 것은 다르다. 502 가 그 구분이고, 본문은 앱의
       `failureCopy()` 가 읽을 수 있도록 다른 오류와 같은 모양으로 맞춘다. */
    res.status(502).json({
      code: 'UPSTREAM_UNREACHABLE',
      message: '서버에 연결하지 못했습니다.',
      detail: String(e?.message ?? e),
    });
  }
}
