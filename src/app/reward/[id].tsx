import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Gift } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { RewardBenefits } from '@/components/reward/reward-benefits';
import { RewardProductList } from '@/components/reward/reward-product-list';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { MetaRows } from '@/components/ui/meta-rows';
import { NavBar } from '@/components/ui/nav-bar';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { useCards, useReward } from '@/lib/cards-store';
import { formatPurchaseDate } from '@/lib/format';
import { rewardArticle } from '@/lib/mock/reward-articles';
import type { Reward } from '@/lib/types';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/**
 * 리워드 한 건 — **한 편의 글로 읽힌다.**
 *
 * 이 화면은 절이 여럿이다: 무엇인지, 언제 어디인지, 무슨 내용인지, 무엇을 받는지, 어떻게
 * 여는지. 한동안 그 절들이 각자 다른 옷을 입고 있었다 — 하나는 색 면, 하나는 회색 판에 가운데
 * 정렬, 하나는 테두리 상자, 하나는 줄 표. **다섯 개가 다 다르게 생기면 다섯 개가 서로 관계가
 * 없다는 뜻이 되고**, 사실 이것들은 한 리워드에 대한 다섯 문단이다.
 *
 * 그래서 규칙을 하나로 줄였다. 전부 왼쪽 한 줄에 붙고, 절 사이는 32, 제목과 본문 사이는 16,
 * 문단 사이는 12. **상자는 화면에 하나뿐이다 — 수령 코드.** 하나뿐이어야 그 하나가 이
 * 화면에서 유일하게 손으로 내미는 것이라는 뜻이 된다.
 *
 * 색도 여기서는 쓰지 않는다. 목록의 줄이 컬렉션 색으로 꽉 차 있는 것은 여섯 건을 갈라 보여야
 * 하기 때문인데, 상세는 한 건뿐이라 가를 상대가 없다. 가를 것이 없는 화면의 색은 장식이고,
 * 이 화면은 읽는 화면이다.
 *
 * **글의 본문은 서버에 없다.** `UnlockTarget` 이 주는 것은 이름과 조건 퍼센트와 해금 여부뿐
 * 이라, 기간·장소·본문·혜택은 `src/lib/mock/reward-articles.ts` 에서 온다 — 데모를 위해
 * 지어낸 글이며, 백엔드가 설명을 내보내는 날 그 파일 하나가 사라진다.
 *
 * **코드는 이 화면에서 만들어진다.** `user_rewards.claim_code` 는 해금 시점에 비어 있고
 * `POST /rewards/{id}/claim` 이 채우므로, 열렸지만 아직 발급받지 않은 리워드에는 코드 자리에
 * 코드가 아니라 버튼이 선다. 대시를 찍어두고 기다리게 하는 것보다 정확하다 — 없는 것은
 * 아직 요청하지 않았기 때문이지 오류가 아니고, 그렇다면 화면은 요청할 방법을 줘야 한다.
 */
export default function RewardClaimScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { reward, status } = useReward(id);
  const { error, claim, cards } = useCards();
  const router = useRouter();
  const toast = useToast();
  const [issuing, setIssuing] = useState(false);
  /* 어느 상품을 이미 갖고 있는가 — 카드 한 장이 상품 하나다. */
  const ownedIds = useMemo(() => new Set(cards.map((card) => card.product.id)), [cards]);

  /* 이름은 '리워드'다. 리워드의 제목이 아니라 — 그건 본문 첫 줄에서 24pt 로 읽히고 있다. */
  const nav = <NavBar title="리워드" fallback="/" />;

  if (status === 'loading') {
    return (
      <Screen header={nav} contentContainerStyle={styles.content}>
        <Skeleton style={styles.coverSkeleton} />
        <View style={styles.head}>
          <Skeleton style={styles.line} />
          <Skeleton style={[styles.line, styles.lineShort]} />
        </View>
        <Skeleton style={styles.codeSkeleton} />
      </Screen>
    );
  }

  if (!reward) {
    return (
      <Screen header={nav} contentContainerStyle={styles.content}>
        <EmptyState
          icon={Gift}
          title={status === 'error' ? '리워드를 불러오지 못했습니다' : '리워드를 찾을 수 없습니다'}
          note={status === 'error' ? (error ?? '잠시 후 다시 시도해 주세요.') : '만료되었거나 잘못된 주소입니다.'}
          action={{ label: '리워드로 가기', onPress: () => router.replace('/rewards') }}
        />
      </Screen>
    );
  }

  const article = rewardArticle(reward.title);
  /* 서버가 먼저다 — `rewards.description` 이 DTO 에 실리는 날 지어낸 글은 쓰이지 않는다. */
  const lead = reward.note ?? article?.summary;

  /*
   * 리워드의 포스터 — 제목보다 먼저 오고, 잘리지 않는다.
   *
   * 비율은 그림이 들고 온다(`coverAspect`). 화면이 비율을 정해 두면 그와 다른 포스터가 오는
   * 날 그 그림이 잘리고, 이 그림은 하우스가 이 행사를 위해 만든 한 장이라 잘리면 안 된다.
   * 그래서 폭만 화면이 정하고 높이는 그림이 정한다.
   */
  const cover = article ? (
    <Image
      source={article.cover}
      style={[styles.cover, { aspectRatio: article.coverAspect }]}
      contentFit="cover"
      transition={200}
    />
  ) : null;

  /* 글의 머리 — 어느 하우스의 어느 컬렉션인지, 무엇인지, 한 줄 요약. 상자도 면도 없다. */
  const head = (
    <View style={styles.head}>
      <Text variant="caption" tone="muted">
        {[reward.brand.name, reward.collection.name].filter(Boolean).join(' · ')}
      </Text>
      <Text variant="title" style={styles.title}>
        {reward.title}
      </Text>
      {lead ? (
        <Text variant="body" tone="muted" style={styles.lead}>
          {lead}
        </Text>
      ) : null}
    </View>
  );

  /* 발신 정보 — 기간과 장소. 제목 바로 아래에 붙어 있어야 “이 글이 말하는 행사”의 것으로
     읽히고, 아래로 내려가면 부록이 된다. 그래서 절 간격(32)이 아니라 그보다 좁게 붙인다. */
  const schedule = article ? (
    <View style={styles.dateline}>
      <MetaRows rows={article.schedule} />
    </View>
  ) : null;

  const body = article ? (
    <View style={styles.section}>
      {article.body.map((paragraph, i) => (
        <Text key={paragraph} variant="body" style={i > 0 ? styles.paragraph : undefined}>
          {paragraph}
        </Text>
      ))}
    </View>
  ) : null;

  /* 조건을 말하는 절들 사이에 결과를 말하는 절 하나 — 잠겼을 때는 계속 모을 이유이고,
     열렸을 때는 카운터에서 무엇을 달라고 해야 하는지다. 그래서 두 갈래 모두에 선다. */
  const benefits = article ? (
    <View style={styles.section}>
      <Text variant="heading">받게 되는 것</Text>
      <View style={styles.sectionBody}>
        <RewardBenefits items={article.benefits} />
      </View>
    </View>
  ) : null;

  /*
   * **잠긴 리워드에도 화면이 있다 — 없는 것이 이 앱의 결함이었다.**
   *
   * 목록이 존재하는 이유가 잠긴 것을 보여주는 데 있는데(두 장 남은 것이 세 번째 카드를 살
   * 이유다) 정작 그것을 눌러 들어오면 "아직 열리지 않았습니다" 한 줄과 돌아가라는 버튼뿐이
   * 었다. 알아보러 들어온 사람에게 알아볼 것이 없다고 답하던 셈이다.
   *
   * **진행도와 상품 목록은 한 절이다.** 따로 두었을 때 회색 판 하나와 목록 하나가 같은 말을
   * 두 번 하고 있었다 — 몇 장이 필요한지와 그 몇 장이 무엇인지는 한 문장의 앞뒤다.
   *
   * **티켓 그림은 여기에 없다.** 목록에서는 그것이 진행도를 말하는 유일한 수단이지만(줄
   * 하나에 숫자를 적을 자리가 없다) 이 화면에는 “2개 중 0개”가 이미 적혀 있다. 같은 사실을
   * 숫자로 한 번 그림으로 한 번 말하면, 두 번째 것은 정보가 아니라 무늬다. 그래서 이 절의
   * 말에도 티켓이 없다 — 가리킬 그림이 사라진 비유는 설명이 아니라 사투리가 된다.
   */
  if (reward.status === 'LOCKED') {
    /*
     * **설명이 필요한 경우에만 설명한다.**
     *
     * 필요한 개수와 나열된 개수가 같으면 목록이 곧 조건이라 덧붙일 말이 없다 — "아래 상품을
     * 모두 모으면 열립니다"는 바로 위 "3개 중 0개"와 아래 세 줄이 이미 말한 것을 한 번 더
     * 적은 문장이었다. 반대로 다섯 개를 늘어놓고 세 개만 필요할 때는 **어느 세 개인지 고르는
     * 쪽이 고객**이라는 사실이 어디에도 적혀 있지 않았다. 그 한 가지만 말한다.
     */
    const choice =
      reward.total < reward.products.length
        ? `이 중 어느 ${reward.total}개를 구매하셔도 열립니다`
        : null;

    return (
      <Screen scroll header={nav} contentContainerStyle={styles.content}>
        {cover}
        {head}
        {schedule}
        {body}
        {benefits}

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            {/* 하우스의 포스터가 "필수 상품"이라고 부르는 것과 같은 것을 가리킨다. 앞서
                "티켓을 채우는 상품"이라고 적어 두었는데, 티켓 그림을 이 화면에서 뺀 뒤로는
                가리킬 티켓이 없는 말이 되어 있었다. */}
            <Text variant="heading">필요한 상품</Text>
            <Text variant="label" tone="muted">
              {reward.total}개 중 {reward.progress}개
            </Text>
          </View>
          {choice ? (
            <Text variant="body" tone="muted" style={styles.sectionNote}>
              {choice}
            </Text>
          ) : null}
          {reward.products.length > 0 ? (
            <RewardProductList products={reward.products} ownedIds={ownedIds} />
          ) : (
            <Text variant="body" tone="muted" style={styles.sectionBody}>
              상품 목록을 불러오지 못했습니다.
            </Text>
          )}
        </View>

        <Text variant="caption" tone="muted" style={styles.foot}>
          상품을 구매하고 영수증 QR을 스캔하면 카드가 발급됩니다.
        </Text>
      </Screen>
    );
  }

  const spent = reward.status !== 'UNLOCKED';

  return (
    <Screen scroll header={nav} contentContainerStyle={styles.content}>
      {cover}
      {head}
      {schedule}

      {/* 열린 리워드에서 이 화면을 여는 순간은 카운터 앞이다. 그래서 글보다 코드가 먼저다. */}
      <View style={styles.codePanel}>
        <Text variant="label" tone="muted">
          수령 코드
        </Text>

        {reward.claimCode ? (
          <>
            <Text variant="title" style={[styles.code, spent && styles.codeSpent]}>
              {reward.claimCode}
            </Text>
            <Text variant="caption" tone="muted" style={styles.codeNote}>
              {spent ? '이미 사용된 코드입니다' : '매장 직원에게 이 코드를 보여주세요'}
            </Text>
          </>
        ) : (
          <>
            <Button
              label={issuing ? '발급 중…' : '수령 코드 발급받기'}
              disabled={issuing}
              onPress={async () => {
                setIssuing(true);
                const ok = await claim(reward);
                setIssuing(false);
                if (!ok) toast('코드를 발급하지 못했습니다. 잠시 후 다시 시도해 주세요.');
              }}
              style={styles.issue}
            />
            <Text variant="caption" tone="muted" style={styles.codeNote}>
              매장에 도착하신 뒤 발급받으세요
            </Text>
          </>
        )}
      </View>

      {body}
      {benefits}

      <View style={styles.section}>
        <MetaRows rows={detailRows(reward)} />
      </View>

      <Text variant="caption" tone="muted" style={styles.foot}>
        수령 관련 문의는 방문하실 매장으로 연락해 주세요.
      </Text>
    </Screen>
  );
}

/**
 * 글이 아니라 기록 — 이 리워드가 언제 열렸고 언제 쓰였는지.
 *
 * **컬렉션 이름과 진행도는 여기 없다.** 둘 다 화면이 이미 말했다(머리의 캡션, 그리고 잠긴
 * 갈래의 진행 절). 표에 한 번 더 적으면 정보가 아니라 반복이고, 표가 길어질수록 정작 여기서만
 * 알 수 있는 두 줄 — 해금과 수령의 시각 — 이 묻힌다.
 */
function detailRows(reward: Reward): { label: string; value?: string }[] {
  return [
    { label: '상태', value: STATUS_LABEL[reward.status] },
    { label: '해금 일시', value: reward.unlockedAt ? formatPurchaseDate(reward.unlockedAt) : undefined },
    { label: '수령 일시', value: reward.claimedAt ? formatPurchaseDate(reward.claimedAt) : undefined },
    {
      label: '사용 기한',
      value: reward.expiresAt ? `${formatPurchaseDate(reward.expiresAt)}까지` : undefined,
    },
  ];
}

const STATUS_LABEL: Record<Reward['status'], string> = {
  LOCKED: '잠김',
  UNLOCKED: '수령 가능',
  CLAIMED: '수령 완료',
  EXPIRED: '기간 만료',
};

const styles = StyleSheet.create({
  content: { paddingBottom: space[7] },
  /* 비율은 사진마다 다르고 `coverAspect` 가 들고 온다 — 여기서 하나로 고정하면 그 순간
     어느 사진인가는 잘린다. */
  cover: {
    marginTop: space[3],
    width: '100%',
    borderRadius: radius.base,
    backgroundColor: colors.surface,
  },
  head: { marginTop: space[5] },
  title: { marginTop: space[2] },
  lead: { marginTop: space[3] },
  /* 머리에 붙는 표라 절 간격(32)의 절반만 띄운다 — 떨어지면 제목의 것이 아니게 된다. */
  dateline: { marginTop: space[5] },
  /* 절 하나의 간격. 화면의 모든 절이 이 하나를 쓴다. */
  section: { marginTop: space[6] },
  /* 절 제목 옆에 그 절의 숫자 하나가 설 때. 오른쪽 끝은 이미 정해진 선이다. */
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space[3] },
  sectionNote: { marginTop: space[2] },
  sectionBody: { marginTop: space[4] },
  paragraph: { marginTop: space[3] },
  /* 화면에서 테두리를 두르는 단 하나 — 카운터에서 내미는 것. */
  codePanel: {
    marginTop: space[6],
    padding: space[5],
    borderRadius: radius.base,
    /* 3단계 회색은 코드를 받쳐 드는 판이다(`AGENTS.md` 의 claim-code plate). */
    backgroundColor: colors.backgroundSubtle,
    alignItems: 'center',
  },
  /* Tracked open, which is the one place in the app a call site touches letter spacing: this is
     not type set to be read as words but characters to be told apart one at a time. */
  code: { marginTop: space[2], letterSpacing: 2 },
  /** Spent, so it is held back to the muted step — still legible, no longer the instruction. */
  codeSpent: { color: colors.textMuted },
  codeNote: { marginTop: space[2], textAlign: 'center' },
  /* 코드가 앉을 자리에 버튼이 서므로, 코드가 라벨에서 떨어져 있던 만큼 떨어진다. */
  issue: { marginTop: space[4], alignSelf: 'stretch' },
  foot: { marginTop: space[6] },
  line: { height: 24, borderRadius: radius.small },
  lineShort: { width: '60%', marginTop: space[2] },
  codeSkeleton: { height: 140, borderRadius: radius.base, marginTop: space[6] },
  /* 아직 어느 리워드인지 모르므로 포스터의 비율도 모른다. 지금 여섯 장이 모두 세로 2:3 이라
     그 값을 세워 둔다 — 다른 비율이 오면 로딩에서 실제 그림으로 넘어갈 때 높이가 한 번 튄다. */
  coverSkeleton: { marginTop: space[3], width: '100%', aspectRatio: 1024 / 1536, borderRadius: radius.base },
});
