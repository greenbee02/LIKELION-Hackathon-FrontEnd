/**
 * 앱 설정. `app.json` 이 아니라 JS 인 이유는 하나다 — **백엔드 주소가 두 곳에 적히는 것을
 * 막기 위해서**다.
 *
 * iOS 는 평문 HTTP 를 ATS 로 기본 차단하므로 서버 도메인마다 예외를 적어줘야 하는데, 정적
 * JSON 은 환경변수를 읽지 못해 IP 를 한 번 더 손으로 써야 했다. 그러면 서버가 옮겨갈 때
 * `.env` 만 고치고 여기를 잊게 되고, 증상은 **iOS 개발 빌드에서만 조용히 안 붙는 것**으로
 * 나타난다 — 찾기 가장 어려운 종류다. 이제 주소는 `.env` 한 곳에만 있고, 아래가 거기서
 * 호스트를 뽑아 쓴다.
 *
 * HTTPS 가 붙으면 예외 블록은 저절로 사라진다: 아래 두 함수가 `http:` 일 때만 무언가를
 * 돌려주므로, `.env` 의 주소를 `https://` 로 바꾸는 것만으로 정리가 끝난다.
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

/** 평문 HTTP 일 때의 호스트. HTTPS 이거나 주소가 망가졌으면 `null` — 예외가 필요 없다. */
function cleartextHost() {
  try {
    const { protocol, hostname } = new URL(API_URL);
    return protocol === 'http:' ? hostname : null;
  } catch {
    // 주소를 못 읽는다고 설정 로딩을 실패시키지 않는다. 예외를 안 넣을 뿐이다.
    return null;
  }
}

const host = cleartextHost();

/**
 * ATS 예외. 도메인 단위로만 열고 `NSAllowsArbitraryLoads` 는 쓰지 않는다 — 서버 하나 때문에
 * 앱 전체의 평문 통신을 여는 것은 필요한 것보다 훨씬 넓고, App Store 심사에서 사유를 요구받는
 * 설정이기도 하다.
 */
const ios = {
  icon: './assets/expo.icon',
  /* 번들 ID 를 여기 못 박는 이유: 비워두면 prebuild 가 `com.anonymous.curio` 를 쓰는데,
     무료 Apple ID 는 남이 먼저 등록한 ID 를 서명하지 못한다. 흔한 기본값일수록 이미
     누군가 갖고 있어서, 증상은 빌드 막바지의 provisioning 실패로만 나타난다. */
  bundleIdentifier: 'com.ddongyun.curio',
  ...(host && {
    infoPlist: {
      NSAppTransportSecurity: {
        NSExceptionDomains: {
          [host]: {
            NSExceptionAllowsInsecureHTTPLoads: true,
            NSIncludesSubdomains: true,
          },
        },
      },
    },
  }),
};

/** 안드로이드에는 도메인 단위 설정이 없어 평문 허용은 전역이다. HTTP 일 때만 켠다. */
const android = {
  adaptiveIcon: {
    backgroundColor: '#E6F4FE',
    foregroundImage: './assets/images/android-icon-foreground.png',
    backgroundImage: './assets/images/android-icon-background.png',
    monochromeImage: './assets/images/android-icon-monochrome.png',
  },
  predictiveBackGestureEnabled: false,
  ...(host && { usesCleartextTraffic: true }),
};

module.exports = {
  expo: {
    name: 'Curio',
    slug: 'curio',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'curio',
    userInterfaceStyle: 'light',
    ios,
    android,
    web: {
      // SPA 단일 출력. 'static' 은 라우트마다 HTML 을 만들지만 동적 세그먼트가
      // `card/[id].html` 처럼 대괄호가 그대로 박힌 파일명이 되고, 정적 호스팅은 그걸
      // 동적 라우트로 읽지 못한다 — `/card/abc` 를 새로고침하면 catch-all 이 걸려
      // 엉뚱한 화면의 HTML 위에 하이드레이션이 얹힌다. 이 앱은 로그인 게이트 뒤의
      // 클라이언트 라우팅이라 사전 렌더링으로 얻는 것도 없다.
      output: 'single',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          backgroundColor: '#208AEF',
          image: './assets/images/splash-icon.png',
          imageWidth: 76,
        },
      ],
      [
        'expo-camera',
        {
          cameraPermission: '영수증 QR을 스캔해 카드를 발급하기 위해 카메라를 사용합니다.',
          microphonePermission: false,
          recordAudioAndroid: false,
        },
      ],
      'expo-sharing',
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  },
};
