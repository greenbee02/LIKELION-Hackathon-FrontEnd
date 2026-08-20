import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { collectionAccent } from '@/components/brand-marks/collection-accents';
import { venueMarkFor } from '@/components/brand-marks/venues';
import { colors } from '@/theme/colors';

/** 표식이 서는 폭. 줄마다 표식이 달라도 제목의 왼쪽 끝은 한 줄로 맞아야 한다. */
const SLOT = 40;
/** 라인 아이콘은 자기 획이 곧 크기고, 글리프는 획 사이가 비어 있어 조금 커야 같은 무게로 읽힌다. */
const ICON = 30;
const GLYPH = 34;

/**
 * 리워드 한 건의 표식 — 색 면 위에 흰색으로 직접 앉는다.
 *
 * **매장이 먼저, 없으면 테마.** 제목이 매장을 부르면(롯데백화점 …) 그 매장의 마크가 서고,
 * 부르지 않으면 컬렉션 테마의 아이콘이 선다. 순서에 뜻이 있다: 리워드를 받으러 가는 곳이
 * 있다면 그것이 이 줄에서 가장 구체적인 사실이고, 없을 때 다음으로 구체적인 것이 어느
 * 세트의 리워드인가다.
 *
 * **흰 칩을 한 번 거쳐 왔고, 그것이 틀렸다.** 앱 아이콘을 파일 그대로 흰 칩에 담았더니 면 위에
 * 스티커를 붙인 것처럼 보였다 — 흰 사각형이 패널에서 떠올랐고, 아이콘의 토프색이 패널의
 * 색과 나란히 놓여 둘 다 탁해졌다. 색 면 위에 남의 색을 얹을 자리를 만들려던 것인데, 애초에
 * 그 자리가 필요 없었다.
 *
 * **마크는 흰색으로 눕힌다 — 카드 얼굴이 하우스 마크를 다루는 방식 그대로다.** 그러면 표식이
 * 패널 위에 놓인 물건이 아니라 패널에 찍힌 잉크가 되고, 테마 아이콘과 같은 무게로 읽힌다.
 * 한 줄에 흰색 하나만 있으면 그 줄은 하나의 것으로 보인다.
 *
 * 눕히는 일은 런타임의 틴트가 아니라 **에셋에서 끝내 두었다.** 롯데의 마크는 토프색 스퀘어클
 * 안에 흰 글리프라, 파일 전체를 흰색으로 칠하면 글리프가 사라지고 흰 덩어리만 남는다. 그래서
 * 밝은 획만 뽑아 흰색으로 저장했다 — `assets/brand-marks/lotte.png` 는 이미 흰 글리프다.
 *
 * **종류(EVENT·BENEFIT) 아이콘이 있던 자리다.** 그 아이콘은 두 종류뿐이라 여섯 줄에 두
 * 그림만 돌아가고 있었고 — 목록을 훑을 때 아무것도 갈라주지 못했다 — 종류가 무엇인지는
 * 아래 버튼이 이름으로 이미 말한다("초대 확인하기" · "혜택 사용하기").
 */
export function RewardMark({ title, theme }: { title: string; theme?: string | null }) {
  const venue = venueMarkFor(title);

  if (venue) {
    return (
      <View style={styles.slot}>
        <Image
          source={venue.mark}
          style={styles.glyph}
          contentFit="contain"
          accessibilityLabel={venue.label}
        />
      </View>
    );
  }

  const Icon = collectionAccent(theme).icon;
  return (
    <View style={styles.slot}>
      <Icon size={ICON} color={colors.textInverted} strokeWidth={2} />
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { width: SLOT, alignItems: 'center', justifyContent: 'center' },
  glyph: { width: GLYPH, height: GLYPH },
});
