import { ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { layerLabel } from './layer-inspector';
import { IconButton } from '@/components/ui/icon-button';
import { Text } from '@/components/ui/text';
import type { CardLayer } from '@/lib/types';
import { colors } from '@/theme/colors';
import { space } from '@/theme/spacing';

/**
 * 카드에 무엇이 몇 겹으로 올라가 있는지, 그리고 그 순서.
 *
 * **위가 앞이다.** 배열은 아래에서 위로 쌓이지만 목록은 뒤집어 보여준다 — 사람이 겹친 것을
 * 볼 때 맨 위에 있는 것이 목록의 첫 줄이라고 기대하기 때문이고, 포토샵부터 피그마까지 전부
 * 그렇게 한다.
 *
 * **순서는 드래그가 아니라 화살표로 바꾼다.** 목록 안의 드래그 정렬은 무대의 드래그와 같은
 * 제스처를 두 가지 뜻으로 쓰게 만들고, 웹의 마우스와 스크린리더에서는 아예 동작하지 않는다.
 * 화살표 둘은 양쪽에서 똑같이 눌린다.
 */
export function LayerList({
  layers,
  activeId,
  onSelect,
  onToggleVisible,
  onMove,
}: {
  layers: CardLayer[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onToggleVisible: (id: string) => void;
  onMove: (id: string, delta: -1 | 1) => void;
}) {
  /* 뒤집어 보여주되 원래 위치를 같이 들고 다닌다 — 화살표가 배열 기준으로 움직여야 하므로. */
  const rows = layers.map((layer, index) => ({ layer, index })).reverse();

  return (
    <View>
      {rows.map(({ layer, index }) => (
        <Pressable
          key={layer.id}
          accessibilityRole="button"
          accessibilityState={{ selected: layer.id === activeId }}
          onPress={() => onSelect(layer.id)}
          style={[styles.row, layer.id === activeId && styles.active]}
        >
          <IconButton
            icon={layer.visible ? Eye : EyeOff}
            accessibilityLabel={`${layerLabel(layer)} ${layer.visible ? '숨기기' : '보이기'}`}
            onPress={() => onToggleVisible(layer.id)}
          />

          <Text
            variant="body"
            tone={layer.visible ? 'default' : 'muted'}
            numberOfLines={1}
            style={styles.label}
          >
            {layerLabel(layer)}
          </Text>

          {/* 끝에서는 버튼이 사라진다. 눌러도 아무 일이 없는 컨트롤을 남겨두면 고객은 그것이
              고장 났다고 생각한다. */}
          {index < layers.length - 1 ? (
            <IconButton
              icon={ChevronUp}
              accessibilityLabel="앞으로"
              onPress={() => onMove(layer.id, 1)}
            />
          ) : (
            <View style={styles.slot} />
          )}
          {index > 0 ? (
            <IconButton
              icon={ChevronDown}
              accessibilityLabel="뒤로"
              onPress={() => onMove(layer.id, -1)}
            />
          ) : (
            <View style={styles.slot} />
          )}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    paddingRight: space[1],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  /** 고른 줄은 3단계 채움 — 컨트롤이 눌린 상태를 말하는 것과 같은 단계다. */
  active: { backgroundColor: colors.surface },
  label: { flex: 1, marginLeft: space[1] },
  /** 사라진 버튼 자리. 비워두면 남은 버튼들이 줄마다 다른 위치에 선다. */
  slot: { width: 40, height: 40 },
});
