import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import type { Product } from '@/lib/types';
import { colors } from '@/theme/colors';
import { space } from '@/theme/spacing';

/**
 * What the sheet on the card's detail screen carries: the product, not the purchase.
 *
 * The card has two reveals and they divide by whose fact it is. The back of the card is about
 * *this card* — the serial it was issued under, the day and the shop it came from, how long it is
 * covered. This is about the *product*, and every line of it would read the same on anyone else's
 * card of the same thing. That is the reason a customer can guess which gesture holds what, and
 * it is why neither surface repeats a row from the other.
 *
 * The clearest case is the pair of numbers. `Card.serialNumber` names this one card and is
 * stamped on its back; `product.code` names the model and every unit of it shares the value, so
 * it belongs here. The brief lists both (§4), and printing them together would suggest they are
 * two spellings of one thing.
 *
 * Set at page sizes rather than the back's `caption`, because this is a panel on the screen and
 * not a stamp on an object.
 */
export function ProductDetail({ product }: { product: Product }) {
  const blocks = productBlocks(product);

  return (
    <View>
      {blocks.map((block, i) => {
        const last = i === blocks.length - 1;

        return block.kind === 'row' ? (
          <View key={block.label} style={[styles.row, last && styles.last]}>
            <Text variant="label" tone="muted">
              {block.label}
            </Text>
            <Text variant="body" style={styles.value}>
              {block.value}
            </Text>
          </View>
        ) : (
          /* Prose takes the full width with its label above rather than beside — a sentence set
             in a right-hand column wraps into a block its label no longer lines up with. */
          <View key={block.label} style={[styles.note, last && styles.last]}>
            <Text variant="label" tone="muted">
              {block.label}
            </Text>
            <Text variant="body" style={styles.noteBody}>
              {block.value}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/**
 * Whether there is anything to show at all.
 *
 * Every field here is one the DTO does not expose yet (scope §2), so against the live backend
 * this panel would be an empty sheet with a grabber on it. The screen asks first and leaves the
 * sheet off entirely rather than offering a gesture that opens onto nothing.
 */
export function hasProductDetail(product: Product): boolean {
  return productBlocks(product).length > 0;
}

type Block = { kind: 'row' | 'note'; label: string; value: string };

/*
 * The order is what a reader wants in the order they want it: which set this belongs to first,
 * because that is the one line that says the card is part of something; then what the thing is;
 * then the model number, which nobody reads but everybody needs when they call a service centre.
 * The two paragraphs come last because they are the only things here that are read rather than
 * scanned.
 *
 * A block with no value is dropped rather than printed with a dash. A dash is the panel admitting
 * it asked a question it could not answer, and there is nothing the customer can do about it.
 */
function productBlocks(product: Product): Block[] {
  const candidates: { kind: Block['kind']; label: string; value?: string }[] = [
    { kind: 'row', label: '컬렉션', value: product.collection?.name },
    { kind: 'row', label: '카테고리', value: product.category },
    { kind: 'row', label: '소재', value: product.material },
    { kind: 'row', label: '원산지', value: product.origin },
    { kind: 'row', label: '시즌', value: product.season },
    { kind: 'row', label: '제품 번호', value: product.code },
    /* Beside the back's 보증 기간 rather than instead of it: the back says how long this card is
       covered, and this says what "covered" means. The duration belongs to the purchase and the
       terms belong to the product, which is the same line every other field here is sorted on. */
    { kind: 'note', label: '보증 내용', value: product.warrantyInfo },
    { kind: 'note', label: '케어', value: product.careInfo },
  ];

  return candidates.filter((b): b is Block => Boolean(b.value));
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space[4],
    paddingVertical: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  note: {
    paddingVertical: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  /** The last block has nothing under it to be separated from. */
  last: { borderBottomWidth: 0 },
  /* Right-aligned and free to wrap into its own column: the labels are short and known, the
     values are neither, and a value that grows should take the space its column already has
     rather than push the label out of line with the rows above it. */
  value: { flex: 1, textAlign: 'right' },
  noteBody: { marginTop: space[1] },
});
