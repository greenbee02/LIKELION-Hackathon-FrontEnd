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
 * **It carries both kinds of fact in a compact form.** The purchase rows identify this card, while
 * the product rows fill the reverse side with the information customers most often look up.
 * Longer product descriptions still belong to the full product detail screen.
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
 * one object. Values are clipped to short rows so the reverse side feels like a card, not a
 * product receipt.
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

  /* 제품 상세에 표시하던 핵심 값을 카드 뒷면에도 요약한다. 값이 없는 행은 만들지 않아
     빈 라벨이나 대시가 제품 정보처럼 보이지 않게 한다. */
  const entries: { label: string; value?: string | null }[] = [
    { label: '제품', value: product.name },
    { label: '컬렉션', value: product.collection?.name },
    { label: '카테고리', value: product.category },
    { label: '소재', value: product.material },
    { label: '색상', value: product.color },
    { label: '원산지', value: product.origin },
    { label: '시즌', value: product.season },
    { label: '제품 번호', value: product.code },
    { label: '구매일', value: snapshot?.date ?? formatPurchaseDate(card.purchaseDate) },
    { label: '매장', value: snapshot?.store ?? store.name },
    {
      label: '보증 기간',
      value: product.warrantyMonths ? `${product.warrantyMonths}개월` : null,
    },
    { label: '보증 내용', value: product.warrantyInfo },
    { label: '케어', value: product.careInfo },
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
            <Text variant="label" style={styles.value} numberOfLines={2}>
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
  /** The product summary follows the card header instead of leaving the reverse side empty. */
  rows: { marginTop: space[4] },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space[3],
    paddingVertical: space[1],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
  },
  /* The first rule is the one that separates the block from the empty middle above it, so it is
     the only one that needs air over it. */
  rowFirst: { marginTop: space[3] },
  /* Right-aligned: the labels are a fixed column and the values are what the eye scans down. */
  value: { flex: 1, textAlign: 'right' },
});
