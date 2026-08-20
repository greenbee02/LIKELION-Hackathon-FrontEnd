import { useRouter } from 'expo-router';
import { ChevronDown, ChevronRight } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Dropdown, type DropdownOption } from '@/components/ui/dropdown';
import { NavBar } from '@/components/ui/nav-bar';
import { Panel } from '@/components/ui/panel';
import { Screen } from '@/components/ui/screen';
import { SkeletonText } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useCards } from '@/lib/cards-store';
import { useCollections } from '@/lib/collections-store';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/**
 * 사이트맵 — 앱의 모든 경로가 한 화면에.
 *
 * **제품 화면이 아니라 개발용 임시 화면이다.** 탭 바 어디에도 걸려 있지 않고, 주소로만
 * 들어온다(`/sitemap`). 목적은 데모 전에 "이 앱에 지금 무엇이 있는가"를 한 번에 보고 아무
 * 화면이나 두 번 안에 열어보는 것 하나다.
 *
 * **동적 경로는 패턴만 적고 대상을 고르게 한다.** 카드가 열 장이면 카드 관련 경로만 오십 줄이
 * 되어 "한 눈에"가 무너진다. 그래서 `/card/[id]` 는 다섯 줄이 아니라 한 줄이고, 어느 카드로
 * 열지는 그 위의 메뉴가 정한다 — 경로의 종류는 고정이고 대상은 데이터라는 사실이 그대로
 * 화면 구조가 된다.
 *
 * 대상이 없으면(카드가 없다, 만든 컬렉션이 없다) 그 줄을 지우지 않고 눌리지 않게 둔다. 여기서
 * 값이 없는 줄은 빈 줄이 아니라 "이 경로는 있는데 지금 열 수 없다"는 사실이고, 그것이야말로
 * 이 화면이 알려야 하는 것이다.
 */

export default function SitemapScreen() {
  const router = useRouter();
  const { status: cardsStatus, cards, rewards } = useCards();
  const { status: collectionsStatus, collections } = useCollections();

  const [cardId, setCardId] = useState('');
  const [collectionId, setCollectionId] = useState('');
  const [rewardId, setRewardId] = useState('');

  /* 고른 것이 없으면 첫 번째. 메뉴를 한 번도 안 건드린 사람도 바로 눌러볼 수 있어야 한다. */
  const card = cards.find((c) => c.id === cardId) ?? cards[0] ?? null;
  const collection = collections.find((c) => c.id === collectionId) ?? collections[0] ?? null;
  const reward = rewards.find((r) => r.id === rewardId) ?? rewards[0] ?? null;

  const cardsLoading = cardsStatus === 'loading';
  const collectionsLoading = collectionsStatus === 'loading';

  return (
    <Screen scroll header={<NavBar title="사이트맵" fallback="/" />} contentContainerStyle={styles.content}>
      <Text variant="body" tone="muted" style={styles.intro}>
        개발용 임시 화면입니다. 앱의 모든 경로를 여기서 열 수 있습니다.
      </Text>

      <Section
        title="시작"
        note="로그인한 상태에서 열면 곧바로 내 컬렉션으로 되돌아옵니다. 확인하려면 프로필에서 로그아웃하세요."
      >
        <RouteRow path="/onboarding" title="서비스 소개" onPress={() => router.push('/onboarding')} />
        <RouteRow path="/sign-in" title="로그인" onPress={() => router.push('/sign-in')} />
        <RouteRow
          path="/sign-in/email"
          title="이메일 로그인"
          onPress={() => router.push('/sign-in/email')}
        />
        <RouteRow path="/sign-up" title="이메일 가입" onPress={() => router.push('/sign-up')} />
      </Section>

      <Section title="탭">
        <RouteRow path="/" title="내 컬렉션" onPress={() => router.push('/')} />
        <RouteRow path="/scan" title="QR 스캔" onPress={() => router.push('/scan')} />
        <RouteRow path="/rewards" title="리워드" onPress={() => router.push('/rewards')} />
        <RouteRow path="/profile" title="프로필" onPress={() => router.push('/profile')} />
      </Section>

      <Section title="상품 탐색" note="브랜드 상품·공식 컬렉션·카드 템플릿">
        <RouteRow path="/catalog" title="제품 탐색" onPress={() => router.push('/catalog')} />
        <RouteRow path="/catalog/products" title="상품 목록" onPress={() => router.push('/catalog/products')} />
        <RouteRow path="/catalog/products/[id]" title="상품 상세" note="상품 목록에서 선택" />
        <RouteRow path="/catalog/collections" title="공식 컬렉션 목록" onPress={() => router.push('/catalog/collections')} />
        <RouteRow path="/catalog/collections/[id]" title="공식 컬렉션 상세" note="공식 컬렉션 목록에서 선택" />
        <RouteRow path="/catalog/templates" title="카드 템플릿 목록" onPress={() => router.push('/catalog/templates')} />
      </Section>

      <Section
        title="카드 발급"
        note="영수증에 인쇄된 실제 코드가 필요합니다. 토큰 하나는 한 번만 쓸 수 있어, 이미 쓴 코드로 들어가면 오류 화면이 나옵니다."
      >
        <RouteRow
          path="/issue/[token]"
          title="카드 발급 진행"
          note="QR 을 스캔하면 이 경로로 들어옵니다."
        />
      </Section>

      <Section
        title="카드"
        note={cardsLoading ? undefined : `보유 ${cards.length}장`}
        picker={
          card ? (
            <TargetPicker
              label="카드 선택"
              value={card.id}
              options={cards.map((c) => ({
                value: c.id,
                label: c.product.name,
                hint: c.brand.name,
              }))}
              onChange={setCardId}
            />
          ) : null
        }
      >
        {cardsLoading ? (
          <SkeletonText lines={4} />
        ) : (
          <>
            <RouteRow
              path="/card/[id]"
              title="카드 상세"
              note={card?.product.name}
              onPress={card ? () => router.push({ pathname: '/card/[id]', params: { id: card.id } }) : undefined}
            />
            <RouteRow
              path="/card/[id]/design"
              title="카드 꾸미기"
              note="승인된 디자인"
              onPress={
                card
                  ? () => router.push({ pathname: '/card/[id]/design', params: { id: card.id } })
                  : undefined
              }
            />
            <RouteRow
              path="/card/[id]/edit"
              title="카드 꾸미기"
              note="AI"
              onPress={
                card
                  ? () => router.push({ pathname: '/card/[id]/edit', params: { id: card.id } })
                  : undefined
              }
            />
            <RouteRow
              path="/card/[id]/customizations"
              title="꾸민 기록"
              onPress={
                card
                  ? () =>
                      router.push({
                        pathname: '/card/[id]/customizations',
                        params: { id: card.id },
                      })
                  : undefined
              }
            />
            <RouteRow
              path="/card/[id]/ai-result"
              title="AI 합성 결과"
              onPress={
                card
                  ? () => router.push({ pathname: '/card/[id]/ai-result', params: { id: card.id } })
                  : undefined
              }
            />
            {card ? null : <Note text="보유한 카드가 없어 열 수 없습니다. 먼저 카드를 발급하세요." />}
          </>
        )}
      </Section>

      <Section
        title="컬렉션"
        note={collectionsLoading ? undefined : `만든 컬렉션 ${collections.length}개`}
        picker={
          collection ? (
            <TargetPicker
              label="컬렉션 선택"
              value={collection.id}
              options={collections.map((c) => ({
                value: c.id,
                label: c.name,
                hint: `${c.cardCount}장`,
              }))}
              onChange={setCollectionId}
            />
          ) : null
        }
      >
        <RouteRow path="/collection" title="컬렉션 관리" onPress={() => router.push('/collection')} />
        <RouteRow path="/collection/new" title="새 컬렉션" onPress={() => router.push('/collection/new')} />
        {collectionsLoading ? (
          <SkeletonText lines={2} />
        ) : (
          <>
            <RouteRow
              path="/collection/[id]"
              title="컬렉션 상세"
              note={collection?.name}
              onPress={
                collection
                  ? () => router.push({ pathname: '/collection/[id]', params: { id: collection.id } })
                  : undefined
              }
            />
            <RouteRow
              path="/collection/[id]/edit"
              title="컬렉션 편집"
              onPress={
                collection
                  ? () =>
                      router.push({ pathname: '/collection/[id]/edit', params: { id: collection.id } })
                  : undefined
              }
            />
            {collection ? null : <Note text="만든 컬렉션이 없어 열 수 없습니다." />}
          </>
        )}
      </Section>

      <Section
        title="리워드"
        picker={
          reward ? (
            <TargetPicker
              label="리워드 선택"
              value={reward.id}
              options={rewards.map((r) => ({
                value: r.id,
                label: r.title,
                hint: r.brand.name,
              }))}
              onChange={setRewardId}
            />
          ) : null
        }
      >
        {cardsLoading ? (
          <SkeletonText lines={2} />
        ) : (
          <>
            <RouteRow
              path="/reward/[id]"
              title="리워드 상세"
              note={reward?.title}
              onPress={
                reward
                  ? () => router.push({ pathname: '/reward/[id]', params: { id: reward.id } })
                  : undefined
              }
            />
            {reward ? null : <Note text="받을 수 있는 리워드가 아직 없습니다." />}
          </>
        )}
      </Section>

      <Section title="그 밖">
        <RouteRow path="/sitemap" title="사이트맵" note="지금 보고 있는 화면입니다." />
      </Section>
    </Screen>
  );
}

/** 제목 · 설명 · 대상 선택 메뉴 · 경로들. 섹션 하나가 경로의 한 갈래다. */
function Section({
  title,
  note,
  picker,
  children,
}: {
  title: string;
  note?: string;
  picker?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text variant="heading">{title}</Text>
      {note ? (
        <Text variant="caption" tone="muted" style={styles.sectionNote}>
          {note}
        </Text>
      ) : null}
      {picker ? <View style={styles.pickerRow}>{picker}</View> : null}
      <Panel style={styles.panel}>{children}</Panel>
    </View>
  );
}

/**
 * 경로 한 줄. 위에 화면 이름, 아래에 주소.
 *
 * `onPress` 가 없으면 눌리지 않는다 — 대상이 없어서 지금은 열 수 없는 경로다. 지우지 않는
 * 이유는 위 주석에 있다.
 */
function RouteRow({
  path,
  title,
  note,
  onPress,
}: {
  path: string;
  title: string;
  note?: string;
  onPress?: () => void;
}) {
  const disabled = !onPress;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${title}, ${path}`}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rowText}>
        <Text variant="label" tone={disabled ? 'muted' : 'default'}>
          {title}
        </Text>
        <Text variant="caption" tone="muted">
          {path}
        </Text>
        {note ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {note}
          </Text>
        ) : null}
      </View>
      {disabled ? null : <ChevronRight size={16} color={colors.textMuted} />}
    </Pressable>
  );
}

/** 경로가 왜 잠겨 있는지 한 줄. */
function Note({ text }: { text: string }) {
  return (
    <Text variant="caption" tone="muted" style={styles.note}>
      {text}
    </Text>
  );
}

/** 동적 경로가 어느 대상으로 열릴지 정하는 메뉴. */
function TargetPicker({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
}) {
  const current = options.find((o) => o.value === value) ?? options[0];
  return (
    <Dropdown value={value} onValueChange={onChange} options={options} accessibilityLabel={label}>
      <View style={styles.picker}>
        <Text variant="label" tone="muted" numberOfLines={1} style={styles.pickerLabel}>
          {current?.label ?? label}
        </Text>
        <ChevronDown size={16} color={colors.textMuted} />
      </View>
    </Dropdown>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: space[7] },
  intro: { marginTop: space[4] },
  section: { marginTop: space[6] },
  sectionNote: { marginTop: space[1] },
  pickerRow: { marginTop: space[3], flexDirection: 'row' },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    maxWidth: '100%',
    paddingVertical: space[2],
    paddingHorizontal: space[3],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pickerLabel: { flexShrink: 1 },
  panel: { marginTop: space[3], paddingVertical: space[1] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
    paddingVertical: space[3],
    borderRadius: radius.base,
  },
  rowPressed: { backgroundColor: colors.surface },
  rowText: { flexShrink: 1 },
  note: { paddingVertical: space[3] },
});
