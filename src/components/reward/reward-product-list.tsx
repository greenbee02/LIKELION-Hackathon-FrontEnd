import { Image } from 'expo-image';
import { Check } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { assetUrl } from '@/lib/config';
import type { RewardProduct } from '@/lib/types';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/**
 * 72 — 한 번 56 이었고, 작았다.
 *
 * 이 그림들은 매장에서 “이거요” 하고 가리킬 물건이라 무엇인지 알아볼 수 있어야 한다. 그런데
 * 사진 자체가 제 캔버스 안에서 여백을 크게 쓴다 — 재 보니 물건이 가로·세로의 57–76% 만
 * 차지한다. 칸이 56 이면 실제 물건은 40 도 못 되게 찍히고, 그 크기에서 가방과 파우치는 같은
 * 갈색 덩어리다.
 */
const TILE = 72;

/**
 * 후보 상품들, 이름까지 — 상세 화면의 것.
 *
 * **목록의 작은 칸(`RewardProducts`)과 같은 데이터를 다른 크기로 말한다.** 카드에서는 그림만
 * 늘어놓아 "무엇을 향해 모으는 중인가"를 한눈에 보이면 되지만, 이 화면에 온 사람은 이미
 * 그것을 보고 눌러 들어온 사람이다. 다음 질문은 "그래서 무엇을 사면 되는가"이고, 그 답에는
 * 이름이 있어야 한다 — 그림만으로는 매장에서 물어볼 수가 없다.
 *
 * **가진 것에는 체크가 붙는다.** 목록에서는 옅기와 또렷함만으로 갈랐는데, 그것은 여섯 칸이
 * 나란히 있을 때 통하는 구분이다. 한 줄씩 떨어져 서면 옆에 비교할 것이 없어 옅은지 아닌지를
 * 알 수 없으므로, 상태를 말하는 표시가 따로 필요하다.
 *
 * 아직 없는 것을 지우거나 흑백으로 만들지 않는 이유는 작은 칸 쪽과 같다: 그것은 **사고
 * 싶어져야 하는 물건**이고, 지워진 자리는 갖고 싶어지지 않는다.
 */
export function RewardProductList({
  products,
  ownedIds,
}: {
  products: RewardProduct[];
  ownedIds: ReadonlySet<string>;
}) {
  return (
    <View style={styles.list}>
      {products.map((product) => {
        const owned = ownedIds.has(product.id);
        const source = assetUrl(product.imageUrl);

        return (
          <View key={product.id} style={styles.row}>
            <View style={styles.tile}>
              {source ? (
                <Image source={{ uri: source }} style={styles.art} contentFit="cover" transition={200} />
              ) : null}
            </View>

            <Text variant="body" numberOfLines={2} style={styles.name}>
              {product.name}
            </Text>

            {/* 가진 것만 표시가 붙는다 — 없는 것에 "미보유"를 적으면 목록의 대부분이 부정문이
                되고, 이 화면은 아직 없는 것을 사러 가라는 화면이다. */}
            {owned ? <Check size={20} color={colors.text} strokeWidth={2.5} /> : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: space[4] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingVertical: space[3],
  },
  /*
   * 그림이 없는 상품도 칸은 갖는다 — 세트의 크기는 그림이 있든 없든 같은 사실이다.
   *
   * **테두리 한 겹이 있는 이유.** 상품 사진의 배경은 거의 흰색(#F7F7F7)이고 페이지도 거의
   * 흰색이라, 테두리가 없으면 사진이 어디서 시작해 어디서 끝나는지를 물건의 실루엣이 정한다 —
   * 세 칸이 같은 크기인데도 제각각으로 보이던 이유다. 6단계 실선 한 겹이 세 칸에 같은
   * 사각형을 그려주면, 안에 든 물건의 크기가 달라도 목록은 하나의 세트로 읽힌다.
   *
   * 반지름은 `base` 다. `small`(4)은 28pt 아래의 것에 쓰는 값이라, 72 짜리 칸에 두르면
   * 모서리가 둥근 것이 아니라 깎인 것처럼 보인다.
   */
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: radius.base,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
  },
  art: { width: '100%', height: '100%' },
  name: { flex: 1 },
});
