import type { ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';

import { IconButton } from './icon-button';
import { allowPressOverflow } from './press-scale';
import { Text } from './text';
import { space } from '@/theme/spacing';

/**
 * 화면의 이름과, 그 화면에서 할 수 있는 한 가지.
 *
 * 컬렉션 탭이 쓰던 모양 그대로다 — 제목은 왼쪽에서 시작하고 조작은 오른쪽 끝에 서며, 둘은
 * 같은 줄에 있다. 제목이 24pt 이고 `IconButton` 이 40pt 라 세로 중심이 맞고, 그래서 이 줄은
 * 제목 아래로 본문이 시작하는 선을 흔들지 않는다.
 *
 * **뒤로 가기는 여기 없다.** 이 저장소의 화면들은 뒤로 가기를 제목 위 별도의 줄
 * (`styles.nav`)에 두고, 제목은 그 아래에서 시작한다 — 뒤로 가기는 화면의 이름과 나란한
 * 것이 아니라 화면 바깥으로 나가는 문이기 때문이다. 그 관행을 바꾸지 않는다.
 *
 * `action` 이 없으면 오른쪽은 비고, 제목은 여전히 왼쪽에서 시작한다. 가운데 정렬로 바뀌지
 * 않는다 — 조작이 있고 없고에 따라 제목이 움직이면 화면 사이를 오갈 때 이름이 떠다닌다.
 */
export function PageHeader({
  title,
  action,
}: {
  title: string;
  action?: {
    icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
    onPress: () => void;
    accessibilityLabel: string;
  };
}) {
  return (
    <View style={styles.header}>
      <Text variant="title" style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {action ? (
        <IconButton
          icon={action.icon}
          onPress={action.onPress}
          variant="glass"
          accessibilityLabel={action.accessibilityLabel}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: space[2],
    ...allowPressOverflow,
  },
  /* 긴 컬렉션 이름이 아이콘을 밀어내지 않도록 제목만 줄어든다. */
  title: { flex: 1, marginRight: space[3] },
});
