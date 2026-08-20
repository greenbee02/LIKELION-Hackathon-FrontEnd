import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { collectionAccent } from '@/components/brand-marks/collection-accents';
import { RewardMark } from '@/components/reward/reward-mark';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DashedRule } from '@/components/ui/dashed-rule';
import { Panel } from '@/components/ui/panel';
import { Text } from '@/components/ui/text';
import { TextLink } from '@/components/ui/text-link';
import { TicketProgress } from '@/components/ui/ticket-progress';
import { formatPurchaseDate } from '@/lib/format';
import type { Reward, RewardKind } from '@/lib/types';
import { colors } from '@/theme/colors';
import { space } from '@/theme/spacing';

/**
 * What the control says depends on what kind of thing the reward is.
 *
 * The brief's own examples do not agree with each other: an invitation has nothing to hand over,
 * a benefit is used rather than collected, and goods are picked up in a shop. One label cannot
 * cover all three without going vague — "확인하기" says nothing about what happens next, and the
 * whole point of this screen is that a reward is a reason to walk back into a store.
 */
const CLAIM_LABEL: Record<RewardKind, string> = {
  EVENT: '초대 확인하기',
  BENEFIT: '혜택 사용하기',
  GOODS: '매장에서 받기',
};

/**
 * 무엇을 받는 것인가, 한 단어로.
 *
 * **잠긴 리워드에는 이 사실을 말하는 것이 아무것도 없었다.** 종류는 아래 버튼의 이름이
 * 말하는데(`CLAIM_LABEL`), 그 버튼은 열린 리워드에만 선다 — 목록의 대부분을 차지하는 잠긴
 * 것들은 무엇을 향해 카드를 모으는 중인지 화면에서 읽을 수 없었다. 초대인지 혜택인지는
 * "세 장 남았다"만큼이나 살지 말지를 정하는 사실이다.
 */
const KIND_LABEL: Record<RewardKind, string> = {
  EVENT: '초대',
  BENEFIT: '혜택',
  GOODS: '굿즈',
};

/**
 * 리워드 한 건, 한 장의 카드로.
 *
 * **한 줄에서 한 장으로.** 표식·이름·값이 가로로 서 있을 때 이름은 남는 폭만 가졌고, 여섯
 * 줄 중 넷이 두 줄로 접혔다 — 제목이 접히는 것은 길어서가 아니라 표가 오른쪽을 먹고 있어서
 * 였다. 세로로 쌓으면 이름이 폭을 전부 갖고, 같은 글자가 더 큰 활자로 한 줄에 들어간다.
 * 카드가 커진 것은 여백을 채워 넣어서가 아니라 **내용이 제 폭을 갖게 해서**다.
 *
 * **위: 표식과 값. 아래: 이름과 컬렉션.** 위 줄은 이 리워드가 무엇이고 얼마나 왔는지를,
 * 아래는 그것이 무엇인지를 말한다. 눈이 카드를 훑는 순서가 그것이고, 목록을 스크롤할 때
 * 왼쪽 끝의 표식과 오른쪽 끝의 표가 세로로 각각 한 줄을 이룬다.
 *
 * **종류를 한 단어로 적는다.** 잠긴 리워드에는 그 사실을 말하는 것이 화면에 없었다 —
 * `KIND_LABEL` 참조. 내용을 지어낸 것이 아니라 이미 있던 데이터가 자리를 얻은 것이다.
 *
 * **색은 컬렉션이 갖고 온다.** 여섯 건이 전부 흰 상자에 회색 테두리였을 때 목록은 한 덩어리로
 * 읽혔다 — 서로 다른 여섯 개의 것이라는 사실을 화면이 말하지 않았기 때문이다. 이제 면 전체가
 * 그 리워드가 세어지는 컬렉션의 테마 색이다. 색은 `collection-accents.ts` 에서 오고 그 파일
 * 하나에만 있다.
 *
 * **면을 채우고 테두리를 지운다 — `Panel` 의 원칙을 뒤집는 자리다.** 그 상자는 "면이 아니라
 * 테두리로 떼어놓는다"고 적혀 있고, 이유는 *회색으로* 채우면 페이지가 어두워지고 목록이
 * 잿빛 덩어리가 되기 때문이었다. 채우는 것이 색이면 그 결과가 오지 않는다: 여섯 면이 서로
 * 다른 색이므로 덩어리가 될 수 없고, 면이 이미 경계이므로 테두리는 같은 말을 두 번 하는 선이
 * 된다. 뒤집은 것은 규칙이 아니라 그 규칙이 막으려던 결과다.
 *
 * **잠긴 리워드를 보여주는 것이 이 화면의 목적이다.** 이미 받은 것은 영수증이고, 두 장 남은
 * 것이 세 번째 카드를 살 이유다. 그래서 잠긴 것도 같은 카드에 서고, 열린 것만 아래에 버튼을
 * 하나 더 갖는다.
 *
 * 패널은 눌리지 않는다. 앱의 모든 pressable 은 눌리는 동안 16% 자라는데, 타일에는 맞고 폭을
 * 다 쓰는 패널에는 틀리다 — 양쪽 여백을 넘어 부풀고 웹 익스포트에서는 스크롤 뷰가 그 모서리를
 * 잘라낸다. 게다가 리워드의 조작은 종류마다 이름이 다르고, 그 이름은 이름을 가진 버튼만이
 * 말할 수 있다.
 */
export function RewardEntry({ reward }: { reward: Reward }) {
  const router = useRouter();
  const accent = collectionAccent(reward.collection.theme);
  const settled = reward.status === 'CLAIMED' || reward.status === 'EXPIRED';

  return (
    <Panel style={[styles.panel, { backgroundColor: accent.fill }]}>
      <View style={styles.top}>
        <View style={styles.identity}>
          <RewardMark title={reward.title} theme={reward.collection.theme} />
          <Text variant="label" tone="inverted">
            {KIND_LABEL[reward.kind]}
          </Text>
        </View>

        {/* 값의 자리. 끝난 리워드에는 셀 것이 없고 언제 끝났는지가 값이 된다. */}
        {settled ? (
          <Badge label={reward.status === 'CLAIMED' ? '수령 완료' : '기간 만료'} />
        ) : (
          <TicketProgress progress={reward.progress} total={reward.total} tone="inverted" />
        )}
      </View>

      <Text variant="heading" tone="inverted" numberOfLines={3} style={styles.title}>
        {reward.title}
      </Text>
      {/* 어느 세트를 모아야 하는지. 이름 아래 한 줄로, 이름과 다투지 않는다 — 크기가 그 일을
          하므로(18 아래 12) 흰색을 옅게 할 필요가 없다. */}
      <Text variant="caption" tone="inverted" numberOfLines={1} style={styles.collection}>
        {reward.collection.name}
      </Text>

      {/*
        **카드마다 조작은 하나이고, 둘의 무게가 다르다.**
        
        열린 리워드의 다음 행동은 수령 — 지금 당장 할 수 있는 일이므로 이름을 가진 버튼이
        선다. 잠긴 것의 다음 행동은 알아보는 것이고, 그것은 **버튼일 이유가 없다**: 목록의
        거의 전부가 잠겨 있어서 카드마다 버튼이 하나씩 서면 여섯 개의 같은 버튼이 세로로
        쌓이고, 그러면 그중 진짜 할 수 있는 일이 어느 것인지 알 수 없게 된다.

        같은 목적지(`/reward/[id]`)로 가면서 생김새가 다른 것은 그 화면이 상태에 따라 다른
        화면이기 때문이다: 열린 것에는 카운터에서 내미는 코드가 있고, 잠긴 것에는 무엇을 더
        사야 하는지가 있다.
      */}
      {reward.status === 'UNLOCKED' ? (
        <Button
          label={CLAIM_LABEL[reward.kind]}
          onPress={() => router.push({ pathname: '/reward/[id]', params: { id: reward.id } })}
          style={styles.action}
        />
      ) : null}

      {/*
        **선이 필요한 것은 글자 쪽뿐이다.**

        아래의 `자세히 보기` 는 생김새가 글자라, 바로 위의 컬렉션 이름과 같은 종류로 읽힐
        위험이 있다 — 카드의 내용이 한 줄 더 있는 것처럼 보이고, 그러면 누를 수 있다는 사실이
        늦게 도착한다. 선 하나가 "여기부터는 내용이 아니라 길"이라고 먼저 말한다.

        열린 리워드의 버튼에는 긋지 않는다. 그쪽은 채워진 면이라 자기가 이미 경계이고, 그
        위에 선을 하나 더 그으면 같은 말을 두 번 하는 것이 된다.

        선은 카드의 양 끝까지 간다. 패딩 안쪽에서 멈추면 문단 사이의 구분처럼 보이는데,
        여기서 갈라야 하는 것은 문단이 아니라 **본문과 바닥**이다.

        **점선인 것에도 뜻이 있다.** 실선은 두 개의 다른 것을 가르지만(카드와 카드), 점선은
        하나의 것을 접는다 — 영수증의 절취선이 그렇다. 아래는 다른 내용이 아니라 같은
        리워드의 뒷면이다.
      */}
      {reward.status === 'LOCKED' ? (
        <DashedRule color={colors.ruleOnColor} style={styles.rule} />
      ) : null}

      {reward.status === 'LOCKED' ? (
        <TextLink
          label="자세히 보기"
          tone="inverted"
          variant="caption"
          chevron
          onPress={() => router.push({ pathname: '/reward/[id]', params: { id: reward.id } })}
          style={styles.more}
        />
      ) : null}

      {settled ? (
        <Text variant="caption" tone="inverted" style={styles.foot}>
          {footnote(reward)}
        </Text>
      ) : null}
    </Panel>
  );
}

/**
 * 끝난 리워드의 마지막 줄.
 *
 * 수령한 것에는 날짜를 말한다 — 쓴 혜택에 대해 사람이 묻는 것은 언제 썼는지 하나뿐이다.
 * 잠긴 것에는 아무 줄도 붙지 않는다: 오른쪽 표가 이미 몇 장이 남았는지 말했고, 같은 말을
 * 문장으로 한 번 더 적으면 그것이 이 패널을 네 줄로 만들던 각주다.
 *
 * 수령 매장은 적지 않는다. 어느 매장에서 받았는지는 **스키마 어디에도 열이 없고**, 직원
 * 도메인이 생기기 전까지는 생기지도 않는다(백엔드 운영 정책).
 */
function footnote(reward: Reward): string {
  if (reward.status === 'CLAIMED') {
    return reward.claimedAt ? `${formatPurchaseDate(reward.claimedAt)} 수령` : '수령이 완료되었습니다';
  }
  return reward.expiresAt ? `${formatPurchaseDate(reward.expiresAt)} 만료` : '기간이 지났습니다';
}

const styles = StyleSheet.create({
  /* 면이 경계를 대신하므로 `Panel` 의 6단계 테두리는 지운다. 패딩은 기본 16 이 아니라 24 —
     한 장으로 서는 카드의 안쪽 여백이고, 절과 절 사이에 쓰는 값과 같다. */
  panel: { borderWidth: 0, padding: space[5] },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3] },
  /* 표식과 종류는 한 덩어리 — 무엇을 받는가를 그림과 단어가 함께 말한다. */
  identity: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  /* 이름이 폭을 전부 갖는다. 세 줄까지 두는 것은 24pt 활자에서도 잘리지 않게 하기 위해서다. */
  title: { marginTop: space[5] },
  collection: { marginTop: space[2] },
  /*
   * 카드 바닥 가운데. 목록을 훑는 눈이 카드마다 같은 자리에서 같은 것을 만나야 그것이
   * 장식이 아니라 길로 읽힌다.
   *
   * **흰색을 물려서 회색으로 읽히게 한다.** 색 면 위에는 11단계에 해당하는 잉크가 없다 —
   * 회색 단계는 전부 얼룩이 되고, `Text` 에 네 번째 tone 을 만드는 것은 금지돼 있다
   * (`AGENTS.md`). 남는 방법은 흰색 자체를 물리는 것이고, 그러면 어느 색 위에서든 그 색이
   * 비쳐 회색조로 앉는다. 부차적인 길이라는 사실을 무게로 말하는 같은 일이다.
   */
  /*
   * **점선에서 글자까지와 글자에서 카드 끝까지가 같아야 한다.**
   *
   * 그 둘은 같은 값으로 적히지 않는다 — 위쪽은 링크의 패딩이 통째로 만들지만, 아래쪽에는
   * 카드 자신의 패딩(24)이 더 얹히기 때문이다. 위아래에 같은 숫자를 쓰면 아래만 24 만큼
   * 커진다. 앞서 위 8 · 아래 24 로 어긋나 있던 것이 정확히 그 이유였다.
   *
   * 그래서 아래쪽 여백을 카드 패딩만큼(-24) 되돌려 상쇄한다. 그러면 남는 것은 링크의 패딩
   * 하나뿐이라 위아래가 자동으로 같아지고, 그 값(16)을 바꾸면 양쪽이 함께 움직인다.
   *
   * 16 인 것은 손가락이 닿는 높이를 48 로 남기기 위해서다 — 12pt 글자 한 줄에 위아래 16.
   */
  more: {
    marginTop: 0,
    marginBottom: -space[5],
    paddingVertical: space[4],
    opacity: 0.7,
  },
  /* 카드의 양 끝까지 — 패딩(24)을 음수 여백으로 되돌려 뺀다. */
  rule: { marginTop: space[4], marginHorizontal: -space[5] },
  action: { marginTop: space[5] },
  foot: { marginTop: space[3] },
});
