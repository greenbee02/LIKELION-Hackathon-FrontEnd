import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { allowPressOverflow } from './press-scale';
import { colors } from '@/theme/colors';
import { space } from '@/theme/spacing';

type ScreenProps = {
  children: ReactNode;
  /**
   * 스크롤 밖에 서는 줄 — `NavBar`, 또는 탭의 24pt 제목.
   *
   * **여기 있는 것만 고정된다.** `children` 의 첫 줄로 넣으면 스크롤 콘텐츠의 일부라 같이
   * 떠내려간다.
   */
  header?: ReactNode;
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
 * The page frame: safe area, the app background, the 16pt screen gutter — and the one line that
 * does not scroll.
 *
 * It exists so no screen re-decides those. `gutter={false}` is the escape hatch for content that
 * has to touch the edge, and it stays a boolean rather than a number — a screen with its own
 * gutter value is a screen that has drifted off the scale.
 *
 * **헤더가 고정인 것은 규칙이지 우연이 아니다.** 한동안 모든 화면이 `NavBar` 를 `children` 의
 * 첫 줄로 넣었고, 그러면 스크롤하는 화면에서는 뒤로 가기가 위로 떠내려가 사라졌다. 고정처럼
 * 보이던 화면들은 고정시켜서가 아니라 **스크롤을 안 해서** 그랬을 뿐이라, 화면이 길어지는
 * 순간(포스터 한 장이 화면 높이를 넘는 리워드 상세) 규칙이 없다는 사실이 드러났다.
 *
 * 그래서 그 줄은 `children` 이 아니라 `header` 로 받는다 — 스크롤 뷰 **밖**이라 정의상 움직일
 * 수가 없다.
 *
 * **덮지 않고 자리를 차지한다.** 유리판을 띄워 그 밑으로 글이 지나가게 할 수도 있지만, 그러면
 * 스크롤하는 화면마다 52pt 위 여백을 따로 챙겨야 하고 사진 위에서는 대비가 흔들린다. 자기
 * 띠를 갖고 그 아래에서 콘텐츠가 시작하면 챙길 것이 없다.
 */
export function Screen({
  children,
  header,
  scroll = false,
  gutter = true,
  edges = ['top', 'left', 'right'],
  style,
  contentContainerStyle,
}: ScreenProps) {
  const padding = gutter ? { paddingHorizontal: space[4] } : null;

  return (
    <SafeAreaView style={[styles.safe, style]} edges={edges}>
      {/* 여백은 `gutter` 와 무관하게 늘 준다 — 뒤로 가기 버튼은 `gutter={false}` 인 화면에서도
          본문과 같은 선에 서야 하고, 지금까지 모든 화면이 각자 그 16 을 적고 있었다. */}
      {header ? <View style={styles.header}>{header}</View> : null}

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
  /* 배경도 테두리도 없다. 안쪽 배경은 이미 이 프레임의 것이고, 콘텐츠가 이 띠 밑을 지나가지
     않으므로 경계를 그릴 상대가 없다 — 헤어라인을 넣으면 이 앱에서 유일하게 여백이 아닌
     방법으로 나뉘는 줄이 된다.

     `allowPressOverflow` 는 헤더 안의 컨트롤(뒤로 가기, 스캔 버튼, 필터 드롭다운)이 눌리면
     자라기 때문이다. */
  header: { paddingHorizontal: space[4], paddingTop: space[2], ...allowPressOverflow },
});
