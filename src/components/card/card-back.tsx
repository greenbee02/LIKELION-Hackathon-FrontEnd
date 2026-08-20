import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { CARD_ASPECT } from './card-face';
import { Text } from '@/components/ui/text';
import { brandMarkSource, imageSource } from '@/lib/card-art';
import { formatPurchaseDate, formatWarrantyExpiry } from '@/lib/format';
import type { Card } from '@/lib/types';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/**
 * The other side of the card — the same object, turned over.
 *
 * A real product card prints its guarantee on the back, and that is the whole argument for this
 * surface existing: the front is a photograph of what was bought and cannot carry a word more
 * than the city and the date without covering the product to describe it.
 *
 * **It carries the purchase, not the product.** Which serial this card was issued under, the day
 * and the shop it came from, how long it is covered — every line is true of *this card* and of no
 * other, even another card of the same handbag. What the product is made of and how to look after
 * it reads the same on anyone's card, so it lives in the sheet instead (`ProductDetail`). Two
 * gestures, two kinds of fact, and neither surface repeats a row from the other.
 *
 * **Card stock, not a panel.** Gray 1 fill with a step-7 edge, because a printed back is the
 * whitest thing in the room and against a gray-1 page only a real border can say where the card
 * ends; step 6 is the rule *inside* it, which separates without drawing a line the eye stops at.
 *
 * The house's mark is knocked to step 12 here rather than to white as it is on the face. Same
 * signature, opposite ground — on a photograph it is the only light thing, on card stock the only
 * dark one.
 *
 * It keeps the face's 3:4 exactly: a card that changed shape when turned over would stop being
 * one object. Four lines do not fill that, and they are not meant to — the serial and the mark
 * sit at the head, the guarantee sits at the foot, and the middle is left as the card's own
 * material. A guarantee printed edge to edge would be a receipt.
 */
export function CardBack({ card }: { card: Card }) {
  const { product, store, brand } = card;
  const mark = brandMarkSource(brand);

  /* 꾸민 카드는 **발급 당시의 값**을 스냅샷으로 갖고 있다(`back.contentData`). 나중에 매장이
     이름을 바꿔도 이 카드에 적힌 것은 그날의 이름이어야 한다 — 카드가 기록이라는 전제가
     데이터에 들어온 자리이고, 없으면 지금처럼 카드에서 직접 읽는다. 행이 늘지도 줄지도
     않는다: 스냅샷은 값의 출처를 바꿀 뿐 무엇을 적을지는 바꾸지 않는다. */
  const snapshot = card.customization?.back ?? null;
  const serialNumber = snapshot?.serialNumber ?? card.serialNumber;
  const generatedBack = imageSource(card.customization?.backImageUrl);

  /* AI 합성은 서버가 뒷면 전체를 한 장으로 굽는다. 이미지가 있으면 텍스트형 기본 뒷면과
     함께 그리지 않고, 저장된 합성 결과 자체를 카드의 뒷면으로 보여준다. */
  if (generatedBack) {
    return (
      <View style={styles.back}>
        <Image
          source={generatedBack}
          style={styles.generatedBack}
          contentFit="cover"
          transition={200}
          accessibilityLabel="AI로 합성된 카드 뒷면"
        />
      </View>
    );
  }

  /* `warrantyMonths` 는 `GET /products/{id}` 가 주지만 null 일 수 있다. 그때 두 줄은 대시가
     아니라 **아예 그려지지 않는다** — 대시는 카드가 스스로 답하지 못한 질문을 했다고 자백하는
     것이고, 보증이 없는 상품에서는 애초에 질문이 아니다. 뒷면이 짧아질 뿐이다. */
  const entries: { label: string; value?: string | null }[] = [
    { label: '구매일', value: snapshot?.date ?? formatPurchaseDate(card.purchaseDate) },
    { label: '매장', value: snapshot?.store ?? store.name },
    {
      label: '보증 기간',
      value: product.warrantyMonths ? `${product.warrantyMonths}개월` : null,
    },
    {
      label: '보증 만료일',
      value: product.warrantyMonths
        ? formatWarrantyExpiry(card.purchaseDate, product.warrantyMonths)
        : null,
    },
  ];
  const rows = entries.filter((e): e is { label: string; value: string } => Boolean(e.value));

  return (
    <View style={styles.back}>
      {/* The serial is the card's name for itself, so it sits where a name sits: in the corner the
          front keeps for the city. The mark answers from the corner it signs the front from. */}
      <View style={styles.head}>
        <Text variant="caption" numberOfLines={1}>
          {serialNumber}
        </Text>
        {mark ? (
          <Image
            source={mark}
            style={styles.mark}
            contentFit="contain"
            contentPosition="top right"
            tintColor={colors.text}
            accessibilityLabel={brand.name}
          />
        ) : (
          <Text variant="caption" numberOfLines={1} style={styles.brand}>
            {brand.name}
          </Text>
        )}
      </View>

      <View style={styles.rows}>
        {rows.map((row, i) => (
          <View key={row.label} style={[styles.row, i === 0 && styles.rowFirst]}>
            <Text variant="caption" tone="muted">
              {row.label}
            </Text>
            {/* One line: nothing here runs long, and a card's aspect ratio has no give if it did. */}
            <Text variant="label" style={styles.value} numberOfLines={1}>
              {row.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  back: {
    width: '100%',
    aspectRatio: CARD_ASPECT,
    borderRadius: radius.base,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.background,
    /** A card's inner padding, the same 12 the face uses. */
    padding: space[3],
    overflow: 'hidden',
  },
  generatedBack: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space[2],
  },
  /** The same box the face gives the mark, so the signature reads at one size on both sides. */
  mark: { width: 48, height: 18 },
  brand: { letterSpacing: 0.5 },
  /** Pushed to the foot: the guarantee is what the back is for, and it is the card's last word. */
  rows: { marginTop: 'auto' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
    paddingVertical: space[2],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
  },
  /* The first rule is the one that separates the block from the empty middle above it, so it is
     the only one that needs air over it. */
  rowFirst: { marginTop: space[3] },
  /* Right-aligned: the labels are a fixed column and the values are what the eye scans down. */
  value: { flex: 1, textAlign: 'right' },
});
