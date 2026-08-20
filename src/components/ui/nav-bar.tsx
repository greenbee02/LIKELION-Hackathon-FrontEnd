import type { ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';
import type { Href } from 'expo-router';

import { BackButton } from './back-button';
import { IconButton } from './icon-button';
import { allowPressOverflow } from './press-scale';
import { Text } from './text';
import { space } from '@/theme/spacing';

/**
 * 화면 밖으로 나가는 문과, 그 문이 열려 있는 화면의 이름.
 *
 * **뒤로 가기가 있는 화면은 전부 이 줄을 쓴다.** 뒤로 가기만 있던 줄은 이름 없는 줄이라,
 * 딥링크로 들어왔거나 여러 경로에서 도달할 수 있는 화면에서 "여기가 어디인지"를 본문의 첫
 * 단락이 대신 말해야 했다. 이제 그 답은 언제나 같은 자리에 있다 — 스캔 화면이 쓰던 모양
 * 그대로다.
 *
 * 제목은 **줄의 가운데가 아니라 화면의 가운데**에 선다. 그래서 뒤로 가기와 오른쪽 조작은
 * 레이아웃에 참여하지 않고 절대 위치로 양끝에 붙는다 — 조작이 있고 없고에 따라 이름이
 * 좌우로 떠다니면 화면을 오갈 때 같은 자리에서 읽히지 않는다.
 *
 * 높이 52 는 이 앱의 컨트롤 높이이고, 그 안의 `IconButton` 은 40 이라 세로 중심이 맞는다.
 * 양옆 48 의 여백은 제목이 아무리 길어도 버튼 위로 올라타지 못하게 하는 벽이다 — 넘치면
 * 가운데를 지킨 채 한 줄로 잘린다.
 *
 * **`PageHeader` 와는 쓰임이 다르다.** 저쪽은 탭처럼 뒤로 갈 데가 없는 화면의 24pt 큰
 * 제목이고, 여기는 한 겹 안쪽으로 들어온 화면의 이름표다. 한 화면이 둘 다 쓰면 이름이 두 번
 * 적힌다.
 */
export function NavBar({
  title,
  fallback,
  action,
}: {
  title: string;
  /** 히스토리가 없는 콜드 스타트에서 돌아갈 곳. `BackButton` 이 그대로 받는다. */
  fallback?: Href;
  action?: {
    icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
    onPress: () => void;
    accessibilityLabel: string;
  };
}) {
  return (
    <View style={styles.bar}>
      <View style={styles.left}>
        <BackButton fallback={fallback} />
      </View>

      <Text variant="heading" numberOfLines={1} style={styles.title}>
        {title}
      </Text>

      {action ? (
        <View style={styles.right}>
          <IconButton
            icon={action.icon}
            onPress={action.onPress}
            variant="glass"
            accessibilityLabel={action.accessibilityLabel}
          />
        </View>
      ) : null}
    </View>
  );
}

/** 40pt 버튼이 서는 자리 — 제목이 여기까지만 온다. */
const CLEAR = space[7];

const styles = StyleSheet.create({
  bar: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    ...allowPressOverflow,
  },
  left: { position: 'absolute', left: 0 },
  right: { position: 'absolute', right: 0 },
  title: { marginHorizontal: CLEAR, textAlign: 'center' },
});
