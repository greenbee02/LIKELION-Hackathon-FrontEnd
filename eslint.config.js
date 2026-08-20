// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    /**
     * `api/` 는 앱이 아니라 Vercel 의 Node 함수다.
     *
     * 저장소의 나머지는 React Native 환경이라 `Buffer` 도 `process` 도 없는 것이 맞지만,
     * 이 한 디렉터리만은 서버에서 돌기 때문에 있다. 파일에 `eslint-disable` 을 다는 대신
     * 여기서 환경을 밝히는 이유는, 그 주석이 "이 줄은 예외"라고 말하게 되기 때문이다 —
     * 예외가 아니라 **다른 런타임**이라는 것이 정확하다.
     */
    files: ['api/**'],
    languageOptions: {
      globals: {
        Buffer: 'readonly',
        URL: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        process: 'readonly',
      },
    },
  },
  {
    rules: {
      /**
       * Reanimated 의 shared value 는 이 규칙이 다루는 값이 아니다.
       *
       * `react-hooks/immutability` 는 훅이 돌려준 값을 고치는 것을 막는다 — 리액트의 상태를
       * 두고 하는 말이고, 옳은 규칙이다. 그런데 `useSharedValue()` 가 돌려주는 것은 상태가
       * 아니라 **UI 스레드와 공유하는 가변 상자**이고, `.value` 에 값을 넣는 것이 그것을 쓰는
       * 유일한 방법이다(Reanimated 4 문서의 모든 예제가 그렇다). 이 저장소에서 이 규칙이
       * 지적한 여덟 곳은 전부 그 idiom 이고, 상태를 잘못 고친 곳은 하나도 없었다.
       *
       * 파일마다 `eslint-disable` 을 뿌리는 대신 여기서 한 번 끄는 이유는, 그 주석들이
       * "이 줄은 예외"라고 말하게 되기 때문이다 — 예외가 아니라 **이 규칙이 볼 수 없는 종류의
       * 값**이라는 것이 정확하다. 리액트 상태를 렌더 중에 고치는 실수는 이 규칙이 아니라
       * `react-hooks/exhaustive-deps` 와 `set-state-in-effect` 가 여전히 잡는다.
       */
      'react-hooks/immutability': 'off',
    },
  },
]);
