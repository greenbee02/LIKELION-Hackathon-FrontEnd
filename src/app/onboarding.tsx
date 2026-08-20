import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { OnboardingScene, type SceneName } from '@/components/onboarding/scene';
import { useFrameWidth } from '@/components/ui/app-frame';
import { IconButton } from '@/components/ui/icon-button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextLink } from '@/components/ui/text-link';
import { allowPressOverflow } from '@/components/ui/press-scale';
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
 * **문구는 읽는 사람에게 건다.** 세 제목이 서로 다른 꼴이어야 세 가지 이야기로 들리고, 설명은
 * 제목이 한 말을 되풀이하지 않는다. 그리고 **없는 기능을 약속하지 않는다** — 여기 적힌 보증과
 * 케어는 카드 뒷면과 제품 상세에 실제로 있는 행이고, 정품 인증은 화면이 없으므로 적지 않는다.
 *
 * **제목은 해요체, 설명은 합니다체.** 제목은 말을 거는 자리이고 설명은 사실을 적는 자리다.
 * 섞인 것이 아니라 나뉜 것이므로, 한쪽을 고칠 때 다른 쪽을 따라 고치지 않는다.
 *
 * **종이를 버리라고 하지 않는다.** 영수증과 보증서가 흩어져 어디 뒀는지 모르게 되는 것이 원래의
 * 문제이고, 이 앱은 그 문제를 푼다 — 버리라는 말은 해결이 아니라 포기를 시키는 말이다.
 *
 * **"하우스"는 여기서 쓰지 않는다.** 우리끼리 브랜드를 부르는 말이고, 가입도 하지 않은 사람이
 * 처음 보는 화면에서 배워야 할 단어가 아니다.
 *
 * **하우스 이름은 한 번도 나오지 않는다.** 이건 플랫폼의 소개이지 어느 브랜드의 소개가
 * 아니고, MCM 이 여기 적히는 순간 다음 브랜드를 태울 때 이 화면부터 고쳐야 한다.
 *
 * 데이터를 읽지 않으므로 세 상태 규칙이 걸리지 않는다 — 스켈레톤을 그릴 대상이 없다.
 *
 * 그림은 `components/onboarding/scene.tsx` 가 그린다. 앞의 두 장에 나오는 카드는 같은 함수가
 * 그린다 — 소개가 끝나고 앱에 들어갔을 때 처음 보는 것과 같은 물건이어야 한다. 세 번째만
 * 다른데, 거기서 말하는 것이 카드가 아니라 카드를 모아서 얻는 것이기 때문이다.
 */

type Slide = {
  key: string;
  scene: SceneName;
  title: string;
  note: string;
};

const SLIDES: Slide[] = [
  {
    key: 'scan',
    scene: 'scan',
    title: '매장에서 바로 등록하세요',
    note: '영수증의 QR 코드를 스캔하면\n즉시 카드가 발급됩니다.',
  },
  {
    key: 'collect',
    scene: 'collect',
    title: '흩어진 기록이 한곳에 모여요',
    note: '구매일과 매장, 보증 기간과 케어까지\n카드에서 관리합니다.',
  },
  {
    key: 'reward',
    scene: 'reward',
    title: '카드가 쌓일수록 혜택이 생겨요',
    note: '컬렉션이 채워지면 브랜드가 준비한\n리워드와 초대가 열립니다.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const width = useFrameWidth();
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

  /* 앞뒤 이동이 한 함수다. 범위를 여기서 한 번만 막으면 화살표는 자기가 몇 번째인지 몰라도 된다. */
  const goTo = (to: number) => {
    const at = Math.min(Math.max(to, 0), SLIDES.length - 1);
    if (at === index) return;
    setIndex(at);
    scroller.current?.scrollTo({ x: at * page, animated: true });
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const at = Math.round(e.nativeEvent.contentOffset.x / page);
    if (at !== index) setIndex(at);
  };

  const last = index === SLIDES.length - 1;

  return (
    <Screen gutter={false}>
      {/* 그림과 글이 화면 가운데에 서고, 넘기는 조작은 그 **양옆**에 붙는다. 가운데 아래에 두면
          손가락이 글을 지나 내려가야 하고, 바닥에 두면 한 손으로 쥔 폰에서 제일 먼 곳이 된다.
          엄지가 닿는 곳은 화면의 옆이다. */}
      <View style={styles.body}>
        <View style={styles.stage}>
          <ScrollView
            ref={scroller}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            /* 높이를 내용이 정하게 둔다. `flex: 1` 이면 남은 공간을 다 먹어, 화살표가 맞춰야 할
               상자가 화면 전체가 되어 버린다. */
            style={styles.pager}
          >
            {SLIDES.map((slide) => (
              <View key={slide.key} style={[styles.slide, { width: page }]}>
                <View style={styles.art}>
                  <OnboardingScene name={slide.scene} />
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

          {/* 크고 옅게. 일러스트의 윤곽선과 **같은 회색**이라 화면에 얹힌 조작이 아니라 그림에
              딸린 표시로 읽히고, 눌러도 뒤에 원이 깔리지 않는다 — 커지는 것만으로 말한다.

              **오른쪽 화살표는 마지막 장에서도 남고, 거기서는 소개를 끝낸다.** 세 장을 다 본
              사람에게 "다음"과 "시작하기"를 따로 내밀 이유가 없다 — 계속 눌러온 자리에서 한 번
              더 누르면 들어간다. 왼쪽은 첫 장에 갈 데가 없으므로 그리지 않는다. */}
          <View style={[styles.side, styles.sideLeft]} pointerEvents="box-none">
            {index > 0 ? (
              <IconButton
                icon={ChevronLeft}
                onPress={() => goTo(index - 1)}
                size="large"
                tone="muted"
                accessibilityLabel="이전"
              />
            ) : null}
          </View>
          <View style={[styles.side, styles.sideRight]} pointerEvents="box-none">
            <IconButton
              icon={ChevronRight}
              onPress={last ? () => void leave() : () => goTo(index + 1)}
              size="large"
              tone="muted"
              accessibilityLabel={last ? '시작하기' : '다음'}
            />
          </View>
        </View>
      </View>

      {/* 몇 번째인지와, 여기서 나가는 길.

          **건너뛰기는 첫 장에만 있다.** 두 장째까지 온 사람은 이미 넘기는 법을 알고 있고, 남은
          것은 한 장뿐이라 건너뛸 것이 없다. 첫 장에서만 필요한 이유도 같다 — 소개를 볼 생각이
          없는 사람은 첫 장에서 그렇게 정한다.

          링크가 사라져도 줄의 높이는 남는다. 점이 위아래로 움직이면 장을 넘길 때마다 눈이
          점을 다시 찾아야 한다. */}
      <View style={styles.foot}>
        <View style={styles.dots}>
          {SLIDES.map((slide, i) => (
            <View key={slide.key} style={[styles.dot, i === index && styles.dotOn]} />
          ))}
        </View>
        <View style={styles.exit}>
          {index === 0 ? <TextLink label="건너뛰기" onPress={() => void leave()} /> : null}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  /* 남은 공간 전부를 받아 안의 묶음을 가운데 세운다. 아래 여백을 조금 더 줘서 묶음이 정중앙보다
     살짝 위에 선다 — 눈은 화면의 기하학적 중심보다 위를 중심으로 읽는다. */
  body: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: space[6],
    ...allowPressOverflow,
  },

  /* 화살표가 맞춰 설 상자. 높이가 내용만큼이므로 화살표는 그림과 글 묶음의 세로 가운데에 선다. */
  stage: { ...allowPressOverflow },
  /** 높이를 내용이 정한다. `flex` 를 주면 안 된다 — 위의 주석과 같은 이유다. */
  pager: { flexGrow: 0 },
  slide: { alignItems: 'center', paddingHorizontal: space[7] },
  /* 그림은 스스로 비율과 최대 폭을 안다. 여기가 정하는 것은 글과 얼마나 떨어지는지뿐이다. */
  art: { width: '100%', alignItems: 'center', marginBottom: space[6] },
  title: { textAlign: 'center' },
  note: { textAlign: 'center', marginTop: space[3] },

  /* 세로로 꽉 채우고 안에서 가운데 정렬 — 그래야 그림 높이가 달라져도 화살표가 따라 선다.
     상자 자체는 터치를 받지 않는다(`box-none`). 양끝 40pt 가 스와이프를 먹으면 안 된다. */
  side: { position: 'absolute', top: 0, bottom: 0, justifyContent: 'center' },
  /* 화면 끝에 붙인다. 56 짜리 상자 안에서 32 짜리 글자가 가운데 서므로 화살표 자체는 가장자리
     에서 12 떨어지고, 글이 시작하는 48 선을 넘지 않는다. */
  sideLeft: { left: 0 },
  sideRight: { right: 0 },

  /* 점과 나가는 길이 한 묶음. 바닥에서 16 띄운다. */
  foot: {
    alignItems: 'center',
    gap: space[3],
    paddingBottom: space[4],
    ...allowPressOverflow,
  },
  dots: { flexDirection: 'row', gap: space[2] },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  dotOn: { backgroundColor: colors.solid },

  /** 52 는 이 앱의 컨트롤 높이. 링크가 있든 없든 이 줄은 이 높이다. */
  exit: { height: 52, justifyContent: 'center', ...allowPressOverflow },
});
