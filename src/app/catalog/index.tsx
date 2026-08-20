import { useRouter } from 'expo-router';
import { ArrowRight, BookOpen, Grid2X2, Layers3 } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { NavBar } from '@/components/ui/nav-bar';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

export default function CatalogScreen() {
  const router = useRouter();

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <NavBar title="둘러보기" fallback="/" />
      <Text variant="body" tone="muted" style={styles.intro}>
        브랜드의 상품과 공식 컬렉션, 카드 디자인을 한곳에서 확인해 보세요.
      </Text>

      <View style={styles.list}>
        <CatalogEntry
          icon={Grid2X2}
          title="상품"
          note="상품과 경험을 카테고리별로 살펴보기"
          onPress={() => router.push('/catalog/products')}
        />
        <CatalogEntry
          icon={Layers3}
          title="공식 컬렉션"
          note="브랜드가 선별한 상품 묶음과 수집 진행 보기"
          onPress={() => router.push('/catalog/collections')}
        />
        <CatalogEntry
          icon={BookOpen}
          title="카드 템플릿"
          note="카드에 적용할 수 있는 승인 디자인 보기"
          onPress={() => router.push('/catalog/templates')}
        />
      </View>
    </Screen>
  );
}

function CatalogEntry({
  icon: Icon,
  title,
  note,
  onPress,
}: {
  icon: typeof Grid2X2;
  title: string;
  note: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.entry, pressed && styles.pressed]}
    >
      <View style={styles.icon}><Icon size={22} color={colors.text} strokeWidth={1.5} /></View>
      <View style={styles.copy}>
        <Text variant="heading">{title}</Text>
        <Text variant="caption" tone="muted" style={styles.note}>{note}</Text>
      </View>
      <ArrowRight size={20} color={colors.textMuted} strokeWidth={1.5} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: space[7] },
  intro: { marginTop: space[2], maxWidth: 420 },
  list: { marginTop: space[6], gap: space[3] },
  entry: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    padding: space[4],
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.base,
  },
  pressed: { backgroundColor: colors.surface },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1 },
  note: { marginTop: space[1] },
});
