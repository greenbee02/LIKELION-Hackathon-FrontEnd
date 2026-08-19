import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 온보딩을 이미 봤는가.
 *
 * `curio.auth.*` 와 같은 이름 규칙을 따른다. 세션과 함께 지워지지 않는 것이 요점이다 —
 * 로그아웃은 계정을 떠나는 일이지 이 앱을 처음 보는 일이 아니고, 로그아웃할 때마다 소개가
 * 다시 나오는 앱은 자기가 누구에게 말하고 있는지 모르는 앱이다. **탈퇴에서도 지우지 않는다.**
 *
 * **값이 모듈에 사는 이유.** 이 값을 읽는 것은 스플래시 뒤에서 리다이렉트를 결정하는 게이트인데,
 * 게이트가 자기 `useState` 에만 담아두면 온보딩 화면이 "봤다"고 적은 직후에도 게이트는 여전히
 * 안 본 것으로 알고 로그인 화면에서 다시 온보딩으로 튕겨낸다. 저장소에 적는 일과 그 사실을
 * 아는 일은 분리될 수 없으므로, 값은 모듈이 들고 구독으로 알린다 — `issue-flow.ts` 가 폴링
 * 상태를 다루는 방식과 같다.
 */
const SEEN_KEY = 'curio.onboarding.seen';

/** `null` 은 "아직 저장소를 안 읽었다". 게이트는 이 동안 아무것도 결정하지 않는다. */
let seen: boolean | null = null;

const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

export function subscribeOnboarding(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function onboardingSnapshot(): boolean | null {
  return seen;
}

/** 저장소를 한 번 읽어 캐시를 채운다. 이미 채워져 있으면 아무 일도 하지 않는다. */
export async function primeOnboarding(): Promise<void> {
  if (seen !== null) return;
  try {
    seen = (await AsyncStorage.getItem(SEEN_KEY)) === '1';
  } catch {
    /* 저장소를 못 읽으면 본 것으로 친다. 소개를 한 번 덜 보여주는 쪽이, 볼 때마다 다시
       보여주는 쪽보다 덜 나쁘다. */
    seen = true;
  }
  emit();
}

export async function markOnboardingSeen(): Promise<void> {
  /* 먼저 알리고 나중에 적는다. 화면 전환이 디스크를 기다릴 이유가 없고, 적기에 실패해도
     이번 실행에서 소개가 다시 뜨지는 않는다. */
  seen = true;
  emit();
  try {
    await AsyncStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* 다음 실행에서 한 번 더 보이는 것이 전부다. */
  }
}
