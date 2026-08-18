import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { CardFace } from './card-face';
import {
  allowPressOverflow,
  raiseWhilePressed,
  usePressScale,
} from '@/components/ui/press-scale';
import { Text } from '@/components/ui/text';
import type { Card } from '@/lib/types';
import { space } from '@/theme/spacing';

/**
 * One entry in the collection grid: the card, and the two things the card cannot say itself.
 *
 * The face carries the city, the date and the house — everything about the occasion. What it
 * cannot carry is what was actually bought: a photograph of a cardigan shows a cardigan, not
 * *this* cardigan, and a wall of pictures with no words on it stops being a collection and
 * becomes a gallery. So the product's name goes underneath, and the store under that, because
 * "명동점" is the part of a purchase people actually remember.
 *
 * Underneath rather than on the face, because the face is the object and the caption is the
 * label beside it in the cabinet. Printing the name over the artwork would cover the product to
 * describe it.
 *
 * A press grows the tile — the card and its caption together, since they are one entry and
 * splitting them would let the label slide out from under its own card.
 */
export function CardTile({ card, onPress }: { card: Card; onPress?: () => void }) {
  const press = usePressScale();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${card.brand.name} ${card.product.name}`}
      {...press.handlers}
      style={({ pressed }) => [styles.tile, pressed && raiseWhilePressed]}
    >
      <Animated.View style={press.style}>
        <CardFace card={card} />
        <View style={styles.meta}>
          <Text variant="label" numberOfLines={2}>
            {card.product.name}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1} style={styles.store}>
            {card.store.name}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, ...allowPressOverflow },
  meta: { marginTop: space[2] },
  store: { marginTop: space[1] },
});
