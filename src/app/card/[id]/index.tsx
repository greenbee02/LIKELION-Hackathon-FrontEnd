import { useLocalSearchParams, useRouter } from 'expo-router';
import { FileQuestionMark, Palette } from 'lucide-react-native';
import { useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { CARD_ASPECT } from '@/components/card/card-face';
import { CARD_FLIP_HINT, CardFlip } from '@/components/card/card-flip';
import { ShareFrame, offstage } from '@/components/card/share-frame';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { NavBar } from '@/components/ui/nav-bar';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { allowPressOverflow } from '@/components/ui/press-scale';
import { useCard, useCards } from '@/lib/cards-store';
import { shareCardImage } from '@/lib/share-card';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/** 카드가 아무리 넓은 화면에서도 넘지 않는 폭. 손에 든 물건의 크기다. */
const HERO_MAX = 360;

/**
 * 카드 상세 — 카드 한 장, 그리고 그것으로 할 수 있는 한 가지.
 *
 * The card is not the illustration at the top of a page of information; it is the information.
 *
 * **화면은 스크롤하지 않는다.** 카드 한 장이 이 화면의 전부이고, 물건 하나를 손에 들고 보는
 * 자리에서 손가락을 위로 밀어 무언가를 더 찾아야 한다면 그건 이미 물건이 아니라 물건에 관한
 * 페이지다. 그래서 카드는 남은 높이에 맞춰 폭이 정해진다 — 큰 화면에서는 360 에서 멈추고,
 * 작은 화면에서는 스스로 작아진다. 자리를 재고 나서 그리는 이유가 이것이다.
 *
 * **Tap turns it over.** 뒷면이 이 카드에 관한 사실을 전부 들고 있다 — 시리얼과 구매일과 매장,
 * 그리고 제품명·소재·케어까지. 그래서 카드 아래에는 이름을 다시 적지 않는다. 얼굴이 이미
 * 무엇인지 말하고 뒷면이 그 이름을 적고 있는데 그 사이에 한 번 더 적으면 화면의 주인공이
 * 둘이 된다.
 *
 * The hero is the same `CardFace` the grid drew, not a larger variant of it — the customer tapped
 * a specific object and has to land on that object rather than on a page about it.
 *
 * `Screen gutter={false}` 로 두고 여백은 본문이 들고 있다. 줄은 본문 밖에 있어서 스크롤이 아니라
 * 화면에 붙는다 — 뒤로 가기와 꾸미기는 카드가 어떻게 놓여 있든 같은 자리에 있어야 하는 조작이다.
 *
 * **공유는 화면이 아니라 동작이다.** 누르면 그림이 만들어지고 기기의 공유 시트가 열린다.
 * 커스터마이징은 줄 오른쪽의 아이콘이고, 카드에 하는 일이라 카드 가까이 있다.
 */
export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { card, status } = useCard(id);
  const { error } = useCards();
  const router = useRouter();
  const toast = useToast();
  const shareFrame = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  /* 카드가 들어갈 자리의 실제 크기. 스켈레톤도 같은 자리를 쓰므로 이른 반환보다 위에 있다 —
     훅은 어차피 조건 없이 불려야 하고, 두 상태가 같은 값을 쓰면 로딩이 끝날 때 카드가 뛰지
     않는다. */
  const [slot, setSlot] = useState({ width: 0, height: 0 });

  /* 힌트 한 줄을 뺀 나머지가 카드 얼굴에 쓸 수 있는 높이이고, 거기에 카드 비율을 곱한 값이
     높이로부터 허용되는 폭이다. 셋 중 가장 작은 값 — 자리의 폭, 화면의 상한, 높이가 허락하는
     폭 — 이 답이다. */
  const heroWidth = Math.min(
    slot.width,
    HERO_MAX,
    Math.max(0, slot.height - CARD_FLIP_HINT) * CARD_ASPECT,
  );

  /* 줄의 오른쪽 끝을 편집이 쓴다. 카드에 하는 일이라 카드 가까이 있어야 하고, 아이콘이라
     화면의 마지막 말인 공유하기와 무게를 다투지 않는다.

     이름은 '카드'다. 제품 이름이 아니라 — 그건 카드가 스스로 들고 있고, 같은 말을 줄 위에서
     18pt 로 한 번 더 자르는 것은 이름을 두 번 적는 일이다. */
  const nav = (
    <NavBar
      title="카드"
      fallback="/"
      action={
        card
          ? {
              icon: Palette,
              /* 꾸미기의 입구는 하나다. 어느 방법으로 꾸밀지는 그 안에서 고른다 —
                 카드 상세의 액션 두 개는 이 화면이 무엇에 관한 것인지를 흐린다. */
              onPress: () =>
                router.push({ pathname: '/card/[id]/design', params: { id: card.id } }),
              accessibilityLabel: '카드 꾸미기',
            }
          : undefined
      }
    />
  );

  /* 카드가 서는 자리. 스켈레톤과 카드가 같은 상자를 쓰기 때문에 측정도 한 번만 적는다. */
  const stage = (children: ReactNode) => (
    <View
      style={styles.stage}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setSlot((prev) =>
          prev.width === width && prev.height === height ? prev : { width, height },
        );
      }}
    >
      {heroWidth > 0 ? <View style={{ width: heroWidth }}>{children}</View> : null}
    </View>
  );

  if (status === 'loading') {
    return (
      <Screen gutter={false} header={nav}>
        <View style={styles.body}>{stage(<Skeleton style={styles.heroFace} />)}</View>
      </Screen>
    );
  }

  /* A card that is not in the collection and a collection that failed to load are the same blank
     screen but not the same sentence — one is nothing to show, the other is nothing loaded. */
  if (!card) {
    return (
      <Screen header={nav}>
        <EmptyState
          icon={FileQuestionMark}
          title={status === 'error' ? '카드를 불러오지 못했습니다' : '카드를 찾을 수 없습니다'}
          note={
            status === 'error'
              ? (error ?? '잠시 후 다시 시도해 주세요.')
              : '삭제되었거나 잘못된 주소입니다.'
          }
          action={{ label: '컬렉션으로 가기', onPress: () => router.replace('/') }}
        />
      </Screen>
    );
  }

  /* 인스타그램 스토리도 X 도 카카오톡도 이미지 저장도 전부 OS 공유 시트가 이미 들고 있는
     목록이다. 그 앞에 미리보기 화면을 한 장 두면 고객은 이미 본 카드를 한 번 더 보고 버튼을
     한 번 더 누를 뿐이라, 이 버튼은 화면으로 가지 않고 곧장 시트를 연다. */
  const onShare = async () => {
    setSharing(true);
    const outcome = await shareCardImage(shareFrame, `curio-${card.id}.png`);
    setSharing(false);
    if (outcome === 'downloaded') toast('이미지를 저장했습니다');
    else if (outcome === 'failed') toast('이미지를 만들지 못했습니다');
  };

  return (
    <Screen gutter={false} header={nav}>
      <View style={styles.body}>
        {stage(<CardFlip card={card} />)}

        {/* The screen's one action, and its last element — a screen's final word should be the
            thing it wants you to do. `outline` rather than `solid`: the subject here is the card,
            and a filled control directly under it would be the darkest thing on the page and pull
            the eye off the object it is about. */}
        <Button
          label="공유하기"
          variant="outline"
          onPress={onShare}
          loading={sharing}
          style={styles.share}
        />
      </View>

      {/* 찍히는 것. 화면 밖에 서 있고, 카드가 뒤집혀 있든 말든 언제나 앞면이다. */}
      <View
        style={offstage}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <ShareFrame card={card} ref={shareFrame} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  /** 화면의 16pt 여백을 본문이 든다. 48 은 마지막 컨트롤이 화면 바닥에 붙지 않을 만큼. */
  body: {
    flex: 1,
    paddingHorizontal: space[4],
    paddingBottom: space[7],
    ...allowPressOverflow,
  },
  /** 남는 높이를 전부 가져가고, 그 안에서 카드를 가운데 세운다. */
  stage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: space[5],
    ...allowPressOverflow,
  },
  /** 32 — the control is a separate subject from the card above it. */
  share: { marginTop: space[6] },
  heroFace: { width: '100%', aspectRatio: CARD_ASPECT, borderRadius: radius.base },
});
