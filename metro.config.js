const { getDefaultConfig } = require('expo/metro-config');
const http = require('node:http');
const https = require('node:https');
const path = require('node:path');

/**
 * 개발 서버에 API 프록시를 붙인다.
 *
 * **브라우저에서만 필요하고, 개발 중에만 동작한다.** 백엔드에 CORS 설정이 없어서
 * (`SecurityConfig` 에 `.cors(...)` 가 없고 프리플라이트가 403) 브라우저가 요청 자체를 막는다.
 * CORS 는 브라우저가 강제하는 규칙이라 프론트 코드로 우회할 방법이 없다 — 우회할 수 있는
 * 것은 "다른 출처"라는 조건뿐이고, 그래서 개발 서버가 같은 출처인 척 요청을 대신 보낸다.
 *
 * 네이티브는 CORS 를 적용하지 않으므로 이 경로를 타지 않고 백엔드로 직접 간다.
 *
 * **이것은 해법이 아니라 우회다.** 웹 익스포트(`expo export`)에는 개발 서버가 없으므로
 * 배포된 웹에서는 여전히 막힌다. 백엔드가 CORS 를 열어야 진짜로 끝난다 —
 * `dev/active/backend-integration-plan.md` §4-1. 열리면 이 파일은 통째로 지운다.
 */
const TARGET = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

/**
 * 어디로 대신 보낼지. 주소를 못 읽으면 `null`.
 *
 * 상대 경로(`/api/v1`)가 오는 경우가 실제로 있고, 그건 **앞단에서 이미 누가 프록시하고 있다**는
 * 뜻이다 — 배포에서는 `vercel.json` 의 rewrite 가 그 역할을 한다. 그때 개발 서버가 대신 나설
 * 일은 없으므로 미들웨어를 붙이지 않는다. 여기서 `new URL` 이 그냥 터지면 웹 익스포트 빌드가
 * 통째로 실패한다.
 */
function resolveUpstream(target) {
  try {
    const { protocol, hostname, port } = new URL(target);
    return {
      protocol,
      hostname,
      port: port || (protocol === 'https:' ? 443 : 80),
      agent: protocol === 'https:' ? https : http,
    };
  } catch {
    return null;
  }
}

const upstream = resolveUpstream(TARGET);

/** 대신 보내줄 경로. API 와, API 바깥 루트에 있는 이미지. */
const PROXIED = ['/api/', '/images/', '/generated/'];

/**
 * 위로 올려보내지 않는 요청 헤더.
 *
 * `origin` 이 핵심이다. 브라우저는 same-origin 이어도 JSON POST 에 `Origin` 을 붙이고, 백엔드의
 * `CORS_ALLOWED_ORIGINS` 는 기본값(`localhost:3000,localhost:8081`)이라 그 밖의 포트를 모른다.
 * 그대로 넘기면 개발 서버를 8081 이 아닌 포트로 띄운 순간 로그인이 **403 `Invalid CORS request`**
 * 로 잘린다 — GET 은 `Origin` 이 붙지 않아 통과하므로, 증상은 "화면은 뜨는데 로그인만 안 됨"이다.
 *
 * 헤더를 떼는 것이 프록시가 하는 일의 전부다. 배포 쪽 `api/proxy.mjs` 의 `DROP_REQUEST` 와
 * 같은 이유이고, 백엔드가 오리진을 열면 (`backend-open-items.md` §1) 양쪽 다 지운다.
 *
 * `host` 는 아래에서 대상 서버의 것으로 바꿔 넣는다. 여기 스트림을 그대로 흘려보내므로
 * `content-length` 는 값이 맞아 손대지 않는다.
 */
const DROP_REQUEST = ['origin', 'referer'];

/** `Origin` 을 떼고 `Host` 를 대상 서버의 것으로 바꾼 헤더. */
function forwardHeaders(headers, hostname) {
  const out = { ...headers, host: hostname };
  for (const key of Object.keys(out)) {
    if (DROP_REQUEST.includes(key.toLowerCase())) delete out[key];
  }
  return out;
}

const config = getDefaultConfig(__dirname);

/* react-native-web 0.21 imports this legacy module, but fbjs 3 no longer ships it.
   Keep the compatibility shim in our source tree instead of modifying node_modules. */
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'fbjs/lib/warning') {
    return {
      filePath: path.resolve(__dirname, 'src/shims/fbjs-warning.ts'),
      type: 'sourceFile',
    };
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

if (upstream) {
  const { protocol, hostname, port, agent } = upstream;
  const base = config.server?.enhanceMiddleware;

  config.server = {
    ...config.server,
    enhanceMiddleware: (middleware, server) => {
      const next = base ? base(middleware, server) : middleware;

      return (req, res, nextHandler) => {
        if (!PROXIED.some((p) => req.url?.startsWith(p))) return next(req, res, nextHandler);

        const proxied = agent.request(
          {
            protocol,
            hostname,
            port,
            path: req.url,
            method: req.method,
            headers: forwardHeaders(req.headers, hostname),
          },
          (res2) => {
            res.writeHead(res2.statusCode ?? 502, res2.headers);
            res2.pipe(res);
          },
        );

        // 백엔드가 죽어 있을 때 개발 서버까지 같이 죽지 않도록 한다.
        proxied.on('error', () => {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ code: 'PROXY_ERROR', message: '백엔드에 연결할 수 없습니다.' }));
        });

        req.pipe(proxied);
      };
    },
  };
}

module.exports = config;
