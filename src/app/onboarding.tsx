import { useRouter } from 'expo-router';
import { Gift, Layers, ScanLine } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextLink } from '@/components/ui/text-link';
import { markOnboardingSeen } from '@/lib/onboarding';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/**
 * 처음 열었을 때, 로그인을 요구하기 전에.
 *
 * 로그인 화면이 첫 화면인 앱은 "누구세요"부터 묻는다. 이 제품은 구매 영수증의 QR 을 찍어야
 * 무언가가 시작되므로, 아직 아무것도 사지 않은 사람에게 계정부터 요구하면 무엇을 위한
 * 계정인지 알 수 없다. 세 장이 그 답이고, 그 뒤에 문이 있다.
 *
 * **하우스 이름은 한 번도 나오지 않는다.** 이건 플랫폼의 소개이지 어느 브랜드의 소개가
 * 아니고, MCM 이 여기 적히는 순간 다음 브랜드를 태울 때 이 화면부터 고쳐야 한다.
 *
 * 데이터를 읽지 않으므로 세 상태 규칙이 걸리지 않는다 — 스켈레톤을 그릴 대상이 없다.
 *
 * 그림은 아직 없다. 아이콘 하나를 크게 놓아 자리를 잡아두었고, 일러스트가 생기면 그 자리를
 * 그대로 물려받는다. 빈 사각형을 놓아 "여기 무언가 올 것"이라고 말하는 것보다, 지금 상태로도
 * 완성된 화면인 편이 낫다.
 */

type Slide = {
  key: string;
  icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  title: string;
  note: string;
};

const SLIDES: Slide[] = [
  {
    key: 'scan',
    icon: ScanLine,
    title: '구매가 카드가 됩니다',
    note: '매장에서 받은 영수증의 QR 을 스캔하면\n그 자리에서 카드 한 장이 발급됩니다.',
  },
  {
    key: 'collect',
    icon: Layers,
    title: '카드가 모여 기록이 됩니다',
    note: '어디서 언제 무엇을 샀는지, 보증과 관리 방법까지\n카드 한 장에 담겨 남습니다.',
  },
  {
    key: 'reward',
    icon: Gift,
    title: '모을수록 열립니다',
    note: '컬렉션이 채워지면 하우스가 준비한\n혜택과 초대가 열립니다.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const scroller = useRef<ScrollView>(null);

  /* 화면 폭에서 좌우 거터를 뺀 것이 한 장의 폭이다. `Screen gutter={false}` 를 쓰고 거터를
     각 장이 스스로 지는 이유 — 페이징은 화면 폭 단위로 끊겨야 하고, 거터가 바깥에 있으면
     한 장의 폭이 화면 폭보다 좁아져 페이지가 어긋난다. */
  const page = Math.max(1, width);

  const leave = async () => {
    await markOnboardingSeen();
    router.replace('/sign-in');
  };

  const next = () => {
    if (index >= SLIDES.length - 1) return void leave();
    const to = index + 1;
    setIndex(to);
    scroller.current?.scrollTo({ x: to * page, animated: true });
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const at = Math.round(e.nativeEvent.contentOffset.x / page);
    if (at !== index) setIndex(at);
  };

  const last = index === SLIDES.length - 1;

  return (
    <Screen gutter={false}>
      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={styles.pager}
      >
        {SLIDES.map((slide) => (
          <View key={slide.key} style={[styles.slide, { width: page }]}>
            <View style={styles.art}>
              <slide.icon size={64} color={colors.borderStrong} strokeWidth={1.25} />
            </View>
            <Text variant="title" style={styles.title}>
              {slide.title}
            </Text>
            <Text variant="body" tone="muted" style={styles.note}>
              {slide.note}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* 몇 장 중 몇 번째인지. 누를 수 없다 — 점을 조작으로 만들면 24pt 안에 손가락을 넣게
          되고, 그건 옆으로 미는 동작이 이미 하고 있는 일이다. */}
      <View style={styles.dots}>
        {SLIDES.map((slide, i) => (
          <View key={slide.key} style={[styles.dot, i === index && styles.dotOn]} />
        ))}
      </View>

      <View style={styles.foot}>
        <Button label={last ? '시작하기' : '다음'} onPress={next} />
        {/* 마지막 장에서는 사라진다. 같은 곳으로 가는 길이 두 개 있을 이유가 없다. */}
        {last ? null : <TextLink label="건너뛰기" onPress={() => void leave()} />}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pager: { flex: 1 },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[4],
  },
  /** 아이콘이 놓일 자리. 일러스트가 생기면 이 상자가 그대로 그림틀이 된다. */
  art: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.base,
    backgroundColor: colors.backgroundSubtle,
    marginBottom: space[6],
  },
  title: { textAlign: 'center' },
  note: { textAlign: 'center', marginTop: space[3] },

  dots: { flexDirection: 'row', justifyContent: 'center', gap: space[2] },
  dot: { width: 6, height: 6, borderRadius: radius.full, backgroundColor: colors.border },
  dotOn: { backgroundColor: colors.solid },

  /* 24 아래 컨트롤, 그 아래로는 화면 바닥. 버튼과 링크 사이는 12 — 둘은 같은 결정의 두 답이라
     떨어뜨리면 서로 상관없는 것이 된다. */
  foot: { paddingHorizontal: space[4], paddingTop: space[5], paddingBottom: space[4], gap: space[3] },
});
