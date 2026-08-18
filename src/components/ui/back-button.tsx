import { useRouter } from 'expo-router';
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
 */
export function BackButton({ fallback = '/sign-in' }: { fallback?: '/sign-in' | '/' }) {
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
