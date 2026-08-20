import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { allowPressOverflow } from './press-scale';
import { colors } from '@/theme/colors';
import { space } from '@/theme/spacing';

type ScreenProps = {
  children: ReactNode;
  /** Wrap the content in a ScrollView. Off by default — a screen that fits should not scroll. */
  scroll?: boolean;
  /** Drop the 16pt gutter when a child needs to run edge to edge (a card carousel, a camera view). */
  gutter?: boolean;
  /** Bottom is excluded by default so a tab bar can own it. */
  edges?: Edge[];
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
};

/**
 * The page frame: safe area, the app background, and the 16pt screen gutter.
 *
 * It exists so no screen re-decides those three. `gutter={false}` is the escape hatch for content
 * that has to touch the edge, and it stays a boolean rather than a number — a screen with its own
 * gutter value is a screen that has drifted off the scale.
 */
export function Screen({
  children,
  scroll = false,
  gutter = true,
  edges = ['top', 'left', 'right'],
  style,
  contentContainerStyle,
}: ScreenProps) {
  const padding = gutter ? { paddingHorizontal: space[4] } : null;

  return (
    <SafeAreaView style={[styles.safe, style]} edges={edges}>
      {scroll ? (
        <ScrollView
          style={styles.fill}
          contentContainerStyle={[allowPressOverflow, padding, contentContainerStyle]}
          keyboardShouldPersistTaps="handled"
          /* 키보드가 올라오면 스크롤 뷰가 스스로 아래를 비운다. 폼 화면들이 각자
             `KeyboardAvoidingView` 를 두르던 것을 여기로 모은 것이고, 그쪽은 스크롤 뷰
             **안쪽**에 있어서 높이 제약이 없었다 — 즉 아무 일도 하지 않고 있었다.
             iOS 전용 prop 이라 나머지 플랫폼에서는 무시된다. */
          automaticallyAdjustKeyboardInsets
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, allowPressOverflow, padding, contentContainerStyle]}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
});
