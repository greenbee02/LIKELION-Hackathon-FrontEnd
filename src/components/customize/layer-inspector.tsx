import { Eye, EyeOff, Lock, LockOpen, Trash2 } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { Panel } from '@/components/ui/panel';
import { Slider } from '@/components/ui/slider';
import { Text } from '@/components/ui/text';
import { RESOURCE_LABELS } from '@/lib/api/ai-resources';
import type { AiResourceType } from '@/lib/api/ai-resources';
import type { CardLayer } from '@/lib/types';
import { space } from '@/theme/spacing';

/**
 * 고른 레이어 하나의 속성.
 *
 * 무대 바로 아래 고정된 자리이고, 시트가 아니다 — 조정한 결과가 카드에서 즉시 보여야 하는데
 * 시트는 카드를 절반쯤 가린다. **투명도를 바꾸면서 카드를 못 보는 것은 투명도를 못 바꾸는
 * 것과 같다.**
 *
 * 고른 것이 없으면 한 줄만 남는다. 빈 슬라이더 두 개를 회색으로 그려두는 것보다, 무엇을 해야
 * 하는지 말하는 편이 짧다.
 */
export function LayerInspector({
  layer,
  onChange,
  onRemove,
}: {
  layer: CardLayer | null;
  onChange: (patch: Partial<CardLayer>) => void;
  onRemove: () => void;
}) {
  if (!layer) {
    return (
      <Panel style={styles.empty}>
        <Text variant="caption" tone="muted">
          카드에서 요소를 눌러 고르세요
        </Text>
      </Panel>
    );
  }

  const locked = layer.locked;

  return (
    <Panel>
      <View style={styles.head}>
        <Text variant="action" numberOfLines={1} style={styles.title}>
          {layerLabel(layer)}
        </Text>

        <IconButton
          icon={layer.visible ? Eye : EyeOff}
          accessibilityLabel={layer.visible ? '숨기기' : '보이기'}
          onPress={() => onChange({ visible: !layer.visible })}
        />
        <IconButton
          icon={locked ? Lock : LockOpen}
          accessibilityLabel={locked ? '잠금 풀기' : '잠그기'}
          onPress={() => onChange({ locked: !locked })}
        />
        {/* 바탕은 카드 그 자체라 지울 수 없다. 지울 수 없는 것에 버튼을 두지 않는다. */}
        {layer.type === 'BASE_CARD' ? null : (
          <IconButton icon={Trash2} accessibilityLabel="삭제" onPress={onRemove} />
        )}
      </View>

      {/* 잠긴 레이어는 값도 바뀌지 않는다 — 잠금이 이동만 막는다면 그건 잠금이 아니다. */}
      {locked ? (
        <Text variant="caption" tone="muted" style={styles.note}>
          잠겨 있습니다. 자물쇠를 풀면 옮기고 바꿀 수 있습니다.
        </Text>
      ) : (
        <>
          {layer.type === 'TEXT' ? (
            <Input
              label="문구"
              value={layer.text ?? ''}
              onChangeText={(text) => onChange({ text })}
              placeholder="예: 첫 서울 여행에서"
              maxLength={2000}
              style={styles.field}
            />
          ) : null}

          <Slider
            label="투명도"
            value={layer.opacity}
            onCommit={(opacity) => onChange({ opacity })}
            format={(v) => `${Math.round(v * 100)}%`}
          />
          <Slider
            label="회전"
            value={layer.rotation}
            min={-180}
            max={180}
            onCommit={(rotation) => onChange({ rotation: Math.round(rotation) })}
            format={(v) => `${Math.round(v)}°`}
          />
        </>
      )}
    </Panel>
  );
}

/**
 * 레이어의 이름.
 *
 * 리소스가 붙은 레이어는 그 리소스의 이름으로 부른다 — 고객이 고른 것이 "배경"이지
 * "BACKGROUND 레이어"가 아니기 때문이다. 글자 레이어는 자기가 담은 문구로 불린다.
 */
export function layerLabel(layer: CardLayer): string {
  if (layer.type === 'TEXT') return layer.text?.trim() || '글자';
  if (layer.type === 'BASE_CARD') return '카드 바탕';
  if (layer.type === 'PRODUCT') return '상품';
  return RESOURCE_LABELS[layer.type as AiResourceType] ?? layer.type;
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  title: { flex: 1 },
  note: { marginTop: space[3] },
  field: { marginTop: space[3], marginBottom: space[2] },
});
