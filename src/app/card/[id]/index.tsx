import { useLocalSearchParams, useRouter } from 'expo-router';
import { FileQuestionMark, Palette } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CARD_ASPECT } from '@/components/card/card-face';
import { CardFlip } from '@/components/card/card-flip';
import { ProductDetail, hasProductDetail } from '@/components/card/product-detail';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { NavBar } from '@/components/ui/nav-bar';
import { Screen } from '@/components/ui/screen';
import { Sheet, useSheetSpace } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { TextLink } from '@/components/ui/text-link';
import { allowPressOverflow } from '@/components/ui/press-scale';
import { useCard, useCards } from '@/lib/cards-store';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/**
 * 카드 상세 — one card, and two ways of asking it a question.
 *
 * The card is not the illustration at the top of a page of information; it is the information.
 * Nothing on this screen scrolls past it to reach detail — the detail comes to the card.
 *
 * **Tap turns it over.** The back is about *this card*: the serial it was issued under, the day
 * and shop it came from, how long it is covered.
 *
 * **Swipe up opens the sheet.** That is about the *product*: what it is made of, where it came
 * from, how to look after it — lines that would read the same on anyone else's card of the same
 * thing. The two reveals divide by whose fact it is, which is what lets a customer guess which
 * gesture holds what, and it is why neither surface repeats a row from the other.
 *
 * The hero is the same `CardFace` the grid drew, not a larger variant of it — the customer tapped
 * a specific object and has to land on that object rather than on a page about it. The detail
 * view uses the real card proportion (`1000 × 1586`) and expands to a generous 360px ceiling so
 * the image is large enough to inspect without making the card wider than a phone-sized layout.
 *
 * Only the product's name stays off both — it is the screen's title, and it has to be readable
 * while the front is showing and the sheet is closed.
 *
 * `Screen gutter={false}` with the gutter carried by the scroll content, because the sheet is a
 * sibling of the list rather than a row in it: absolutely positioned inside a ScrollView it would
 * scroll away with the page, which is the one thing a floating panel must not do.
 *
 * Sharing is the screen's one action and sits under the card as a named button; customising is
 * the icon at the right of the bar, close to the card because that is what it changes. What is
 * still absent is §9's repair and care links, which have no endpoint behind them — a control
 * that raises a toast explaining why it does nothing is a control this screen cannot honour.
 */
export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { card, status } = useCard(id);
  const { error } = useCards();
  const router = useRouter();
  /* The sheet floats over the page, so the page buys its own clearance — as it does for the tab
     bar on every scrolling tab screen. */
  const bottomSpace = useSheetSpace();

  /* 줄의 오른쪽 끝을 편집이 쓴다. 카드에 하는 일이라 카드 가까이 있어야 하고, 아이콘이라
     화면의 마지막 말인 공유하기와 무게를 다투지 않는다.

     이름은 '카드'다. 제품 이름이 아니라 — 그건 카드 아래 제 자리에서 24pt 로 읽히고 있고,
     같은 말을 줄 위에서 18pt 로 한 번 더 자르는 것은 이름을 두 번 적는 일이다. */
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

  if (status === 'loading') {
    return (
      <Screen contentContainerStyle={styles.head}>
        {nav}
        <View style={styles.hero}>
          <Skeleton style={styles.heroFace} />
        </View>
        <View style={styles.title}>
          <Skeleton style={styles.titleLine} />
          <Skeleton style={[styles.titleLine, styles.titleLineShort]} />
        </View>
      </Screen>
    );
  }

  /* A card that is not in the collection and a collection that failed to load are the same blank
     screen but not the same sentence — one is nothing to show, the other is nothing loaded. */
  if (!card) {
    return (
      <Screen contentContainerStyle={styles.head}>
        {nav}
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

  const { product } = card;
  /* Every field the sheet holds is one the DTO does not expose yet, so against the live backend
     it would open onto nothing. A gesture that reveals an empty panel is worse than no gesture. */
  const detailed = hasProductDetail(product);

  return (
    <Screen gutter={false}>
      <ScrollView
        contentContainerStyle={[
          styles.gutter,
          allowPressOverflow,
          { paddingBottom: detailed ? bottomSpace : space[7] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {nav}

        <View style={styles.hero}>
          <CardFlip card={card} />
        </View>

        <View style={styles.title}>
          {product.limited ? <Badge label="한정판" /> : null}
          <Text variant="title" style={product.limited ? styles.titleUnderBadge : undefined}>
            {product.name}
          </Text>
        </View>

        {/* The screen's one action, and its last element — a screen's final word should be the
            thing it wants you to do. `outline` rather than `solid`: the subject here is the card,
            and a filled control directly under it would be the darkest thing on the page and pull
            the eye off the object it is about. */}
        <Button
          label="공유하기"
          variant="outline"
          onPress={() => router.push({ pathname: '/share/[id]', params: { id: card.id } })}
          style={styles.share}
        />

        {/* 꾸민 적이 있을 때만 나온다. 기록이 없는 카드에 기록으로 가는 길을 두면 그 길은
            빈 화면으로만 이어지고, 값 없는 행을 그리지 않는다는 규칙이 컨트롤에도 적용된다. */}
        {card.customization ? (
          <TextLink
            label="꾸민 기록"
            onPress={() =>
              router.push({ pathname: '/card/[id]/customizations', params: { id: card.id } })
            }
          />
        ) : null}
      </ScrollView>

      {detailed ? (
        <Sheet title="제품 상세">
          <ProductDetail product={product} />
        </Sheet>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  /* The screen's 16pt gutter, carried by the scroll content rather than by the screen around it,
     so the sheet can sit outside it and float at its own 24. The states that have no sheet keep
     `Screen`'s own gutter instead and take `head` alone — applying both would pad them twice. */
  gutter: { paddingHorizontal: space[4], paddingTop: space[2] },
  head: { paddingTop: space[2] },
  hero: { width: '100%', maxWidth: 360, alignSelf: 'center', marginTop: space[5] },
  heroFace: { width: '100%', aspectRatio: CARD_ASPECT, borderRadius: radius.base },
  title: { marginTop: space[5] },
  /** 32 — the control is a separate subject from the name above it. */
  share: { marginTop: space[6] },
  /** The badge is a caption-sized object, so it sits closer to the name than a line of text would. */
  titleUnderBadge: { marginTop: space[2] },
  titleLine: { height: 30, borderRadius: radius.small },
  titleLineShort: { width: '60%', marginTop: space[2] },
});
