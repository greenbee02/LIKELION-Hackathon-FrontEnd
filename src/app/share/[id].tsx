import * as Sharing from 'expo-sharing';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FileQuestionMark } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { CARD_ASPECT, CardFace } from '@/components/card/card-face';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { useCard, useCards } from '@/lib/cards-store';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/**
 * 공유 — the card, as something that leaves the app. Reached from the 공유하기 button under the
 * card on its detail screen.
 *
 * The one screen here that needs no backend at all: the image is made on the device out of the
 * same `CardFace` the grid draws, so this is the only feature in the product that is complete
 * rather than waiting on an endpoint.
 *
 * **Only the front goes.** That is not a simplification, it is the feature: the back carries the
 * serial this card was issued under and the shop it came from, which is a purchase record and
 * belongs to nobody but its owner. The screen says so in a line rather than assuming anyone
 * would work it out — the customer has already seen the back by now, and "왜 앞면만?" is exactly
 * the question a share sheet should answer before it is asked.
 *
 * What is captured is what is on screen, framed and all. Sharing something the customer did not
 * see first is how a share feature ends up leaking a field nobody remembered was there.
 */
export default function ShareScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { card, status } = useCard(id);
  const { error } = useCards();
  const router = useRouter();
  const toast = useToast();
  const frame = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  const nav = (
    <View style={styles.nav}>
      <BackButton fallback="/" />
    </View>
  );

  const share = async () => {
    if (!frame.current) return;
    setSharing(true);
    try {
      const uri = await captureRef(frame, { format: 'png', quality: 1 });
      /* Web has no share sheet to hand a file to. The capture still works there, so this is a
         platform limit rather than an unbuilt feature — which is why the screen says which one
         it is instead of failing quietly. */
      if (!(await Sharing.isAvailableAsync())) {
        toast('이 브라우저에서는 이미지 공유를 지원하지 않습니다');
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: '카드 공유' });
    } catch {
      toast('이미지를 만들지 못했습니다');
    } finally {
      setSharing(false);
    }
  };

  if (status === 'loading') {
    return (
      <Screen contentContainerStyle={styles.content}>
        {nav}
        <View style={styles.frame}>
          <Skeleton style={styles.faceSkeleton} />
        </View>
      </Screen>
    );
  }

  if (!card) {
    return (
      <Screen contentContainerStyle={styles.content}>
        {nav}
        <EmptyState
          icon={FileQuestionMark}
          title={status === 'error' ? '카드를 불러오지 못했습니다' : '카드를 찾을 수 없습니다'}
          note={status === 'error' ? (error ?? '잠시 후 다시 시도해 주세요.') : '삭제되었거나 잘못된 주소입니다.'}
          action={{ label: '컬렉션으로 가기', onPress: () => router.replace('/') }}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      {nav}

      {/* The capture target, and the preview, and the same node — there is no second layout for
          the exported image, so what is shared cannot drift from what was approved. */}
      <View ref={frame} collapsable={false} style={styles.frame}>
        <CardFace card={card} />
        <View style={styles.meta}>
          <Text variant="label" numberOfLines={2}>
            {card.product.name}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1} style={styles.store}>
            {card.store.city}
          </Text>
        </View>
      </View>

      <View style={styles.notice}>
        <Text variant="label" tone="muted">
          공유되는 것
        </Text>
        <Text variant="body" style={styles.noticeBody}>
          카드 앞면과 상품명, 도시만 담깁니다. 시리얼 넘버와 구매 매장이 적힌 뒷면은 포함되지 않습니다.
        </Text>
      </View>

      <Button label="이미지 공유하기" onPress={share} loading={sharing} style={styles.action} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space[2], paddingBottom: space[7] },
  nav: { flexDirection: 'row' },
  /* Gray 1 rather than transparent: a captured image carries whatever was behind it, and
     "whatever was behind it" on a screen with no explicit ground is undefined. */
  frame: {
    width: '100%',
    maxWidth: 236,
    alignSelf: 'center',
    marginTop: space[5],
    padding: space[4],
    borderRadius: radius.base,
    backgroundColor: colors.background,
  },
  faceSkeleton: { width: '100%', aspectRatio: CARD_ASPECT, borderRadius: radius.base },
  meta: { marginTop: space[3] },
  store: { marginTop: space[1] },
  /** 32 — the notice is about the picture above it, not part of it. */
  notice: { marginTop: space[6] },
  noticeBody: { marginTop: space[2] },
  action: { marginTop: space[5] },
});
