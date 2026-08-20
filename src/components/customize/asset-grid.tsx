import { Image } from 'expo-image';
import { Check } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { CARD_ASPECT } from '@/components/card/card-face';
import { allowPressOverflow, raiseWhilePressed, usePressScale } from '@/components/ui/press-scale';
import { imageSource } from '@/lib/card-art';
import type { DesignAsset } from '@/lib/api/card-design-assets';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/** 시드가 배경 셋·테두리 셋을 주므로 한 줄에 다 놓인다 — 고르는 일이 곧 비교가 된다. */
const COLUMNS = 3;

/**
 * 브랜드가 승인해 둔 그림들, 카드 모양 그대로.
 *
 * **AI 후보 격자와 일부러 다르게 생겼다.** 저쪽 타일이 정사각형인 것은 색 네 개나 도면처럼
 * 카드가 아닌 것도 담기 때문인데, 여기 오는 것은 전부 1024×1536, 즉 카드 그 자체다. 카드
 * 비율로 그려야 고른 것이 어떻게 보일지가 타일 안에서 이미 답이 된다.
 *
 * **테두리는 배경 위에 얹어 보여준다.** 알파 PNG 한 장을 밝은 바닥에 놓으면 샴페인 골드
 * 실선은 거의 보이지 않고, 무엇보다 그것은 고객이 만들 카드의 모습이 아니다. 고른 배경을
 * 밑에 깔면 타일이 곧 미리보기가 된다.
 *
 * 기다림이 없으므로 스켈레톤 칸도, 실패한 칸도 없다 — 이 목록은 이미 서버에 있던 것이다.
 */
export function AssetGrid({
  assets,
  selectedId,
  onSelect,
  underlayUrl,
}: {
  assets: DesignAsset[];
  selectedId?: string | null;
  onSelect: (asset: DesignAsset) => void;
  /** 테두리 격자에서 밑에 깔 배경. 배경 격자는 넘기지 않는다. */
  underlayUrl?: string | null;
}) {
  const rows: DesignAsset[][] = [];
  for (let i = 0; i < assets.length; i += COLUMNS) rows.push(assets.slice(i, i + COLUMNS));

  return (
    <View style={styles.grid}>
      {rows.map((row, rowIndex) => (
        <View key={row[0]?.id ?? `row-${rowIndex}`} style={styles.row}>
          {row.map((asset) => (
            <AssetTile
              key={asset.id}
              asset={asset}
              selected={asset.id === selectedId}
              underlayUrl={underlayUrl}
              onPress={() => onSelect(asset)}
            />
          ))}
          {/* 마지막 줄이 덜 찼을 때 남은 칸을 비워 둔다. 없으면 두 장짜리 줄에서 타일이
              늘어나 앞줄과 크기가 달라진다. */}
          {Array.from({ length: COLUMNS - row.length }, (_, i) => (
            <View key={`filler-${rowIndex}-${i}`} style={styles.cell} />
          ))}
        </View>
      ))}
    </View>
  );
}

function AssetTile({
  asset,
  selected,
  underlayUrl,
  onPress,
}: {
  asset: DesignAsset;
  selected: boolean;
  underlayUrl?: string | null;
  onPress: () => void;
}) {
  const press = usePressScale();
  const under = imageSource(underlayUrl);
  const source = imageSource(asset.imageUrl);

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`디자인 ${asset.variantCode}`}
      onPress={onPress}
      {...press.handlers}
      style={({ pressed }) => [styles.cell, pressed && raiseWhilePressed]}
    >
      <Animated.View style={[styles.tile, selected && styles.selected, press.style]}>
        {under ? <Image source={under} style={styles.fill} contentFit="cover" /> : null}
        {source ? (
          <Image source={source} style={styles.fill} contentFit="cover" transition={200} />
        ) : null}
        {selected ? (
          <View style={styles.tick}>
            <Check size={12} color={colors.textInverted} strokeWidth={3} />
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: { gap: space[2], ...allowPressOverflow },
  row: { flexDirection: 'row', gap: space[2], ...allowPressOverflow },
  cell: { flex: 1, ...allowPressOverflow },
  tile: {
    width: '100%',
    aspectRatio: CARD_ASPECT,
    borderRadius: radius.base,
    backgroundColor: colors.backgroundSubtle,
    overflow: 'hidden',
  },
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  selected: { borderWidth: 2, borderColor: colors.borderStrong },
  tick: {
    position: 'absolute',
    top: space[1],
    right: space[1],
    width: 20,
    height: 20,
    borderRadius: radius.full,
    backgroundColor: colors.solidStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
