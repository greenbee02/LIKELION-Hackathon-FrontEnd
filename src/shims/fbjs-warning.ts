/**
 * Compatibility implementation for the legacy `fbjs/lib/warning` import used by
 * react-native-web. It preserves the development warning without depending on a
 * file that recent fbjs packages no longer publish.
 */
export default function warning(
  condition: boolean,
  format?: string,
  ...args: unknown[]
): void {
  if (!condition && format) {
    console.warn(`[react-native-web] ${format}`, ...args);
  }
}
