import { useRouter, type Href } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

import { IconButton } from './icon-button';

/**
 * A way back, for screens that run outside a header.
 *
 * `back()` rather than a fixed route: these screens are reachable from more than one place, and a
 * back button that always lands somewhere specific is a navigation bug waiting for the second
 * entry point. `fallback` covers a cold start straight into a deep link, where there is no history.
 *
 * It is an `IconButton` on glass, the same object as the scan button in the collection header —
 * there is one icon-only control in this app and it looks the same wherever it appears. That also
 * loses the negative margin the bare arrow used to carry: an arrow with no box could be pulled
 * into the gutter to line its glyph up with the text below, but a box has an edge, and the edge
 * belongs on the gutter like every other edge on the screen.
 *
 * `fallback` 은 두 경로의 리터럴 유니온이었다. 화면이 열 개 늘면서 돌아갈 곳도 늘었고 — 컬렉션
 * 편집은 그 컬렉션으로, 행사 신청 완료는 리워드로 — 유니온을 그때마다 넓히는 것은 타입이
 * 라우트 목록을 두 번 적는 일이다. `Href` 는 `typedRoutes` 가 생성한 그 목록 자체라,
 * 존재하지 않는 경로는 여전히 컴파일에서 걸린다.
 */
export function BackButton({ fallback = '/sign-in' }: { fallback?: Href }) {
  const router = useRouter();

  return (
    <IconButton
      icon={ChevronLeft}
      variant="glass"
      accessibilityLabel="뒤로"
      onPress={() => (router.canGoBack() ? router.back() : router.replace(fallback))}
    />
  );
}
