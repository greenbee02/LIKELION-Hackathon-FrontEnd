import { Layers } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CardSelectTile } from '@/components/card/card-select-tile';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { NavBar } from '@/components/ui/nav-bar';
import { allowPressOverflow } from '@/components/ui/press-scale';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import type { Card } from '@/lib/types';
import { space } from '@/theme/spacing';

const COLUMNS = 2;

/**
 * 컬렉션을 만들거나 고치는 화면의 본체.
 *
 * 만들기와 고치기는 같은 화면이다 — 이름을 정하고 카드를 고른다. 다른 것은 처음 값과 버튼에
 * 적힌 말뿐이라, 두 라우트가 이것을 감싸는 얇은 껍데기로 존재한다.
 *
 * **저장은 이름만 요구한다.** 카드 0장으로도 만들 수 있다 — 이름을 먼저 정해두고 사면서
 * 채우는 것이 이 제품에서 자연스러운 순서이고, 빈 컬렉션을 막으면 "살 것을 미리 정해둔다"는
 * 쓰임이 사라진다. 빈 컬렉션은 목록에는 보이고 탭의 필터 메뉴에는 안 보인다.
 */
export function CollectionEditor({
  title,
  cards,
  initialName = '',
  initialCardIds = [],
  submitLabel,
  pending,
  onSubmit,
}: {
  title: string;
  cards: Card[];
  initialName?: string;
  initialCardIds?: string[];
  submitLabel: string;
  pending?: boolean;
  onSubmit: (name: string, cardIds: string[]) => void;
}) {
  const [name, setName] = useState(initialName);
  const [picked, setPicked] = useState<string[]>(initialCardIds);
  const [touched, setTouched] = useState(false);

  const trimmed = name.trim();
  /* 비었다는 말은 저장을 눌러본 뒤에만 한다. 아직 아무것도 안 한 사람에게 틀렸다고 먼저
     말하는 화면은 무례하다. */
  const error = touched && !trimmed ? '이름을 입력해 주세요.' : null;

  const toggle = (id: string) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));

  const submit = () => {
    setTouched(true);
    if (!trimmed) return;
    onSubmit(trimmed, picked);
  };

  /* 줄 단위로 직접 묶는다. `flexWrap` 과 `flex: 1` 은 같이 쓸 수 없고 — 감싸기 컨테이너에서
     `flex: 1` 은 한 줄을 통째로 먹는다 — 스크롤 뷰 안에 `FlatList` 를 중첩할 수도 없다.
     홀수 마지막 줄은 빈 칸으로 채워, 한 장이 폭을 다 먹고 카드처럼 보이기를 그만두는 일을
     막는다. 컬렉션 그리드와 같은 처리이고 같은 이유다. */
  const rows: (Card | null)[][] = [];
  for (let i = 0; i < cards.length; i += COLUMNS) {
    const row: (Card | null)[] = cards.slice(i, i + COLUMNS);
    while (row.length < COLUMNS) row.push(null);
    rows.push(row);
  }

  return (
    <Screen scroll gutter={false} contentContainerStyle={styles.content}>
      <NavBar title={title} fallback="/collection" />

      <Input
        label="컬렉션 이름"
        required
        value={name}
        onChangeText={setName}
        placeholder="예: 서울에서"
        error={error}
        style={styles.field}
      />

      <Text variant="label" tone="muted" style={styles.pickLabel}>
        {picked.length > 0 ? `담을 카드 ${picked.length}장` : '담을 카드'}
      </Text>

      {cards.length === 0 ? (
        <View style={styles.emptyBox}>
          <EmptyState
            icon={Layers}
            title="아직 카드가 없습니다"
            note={'카드를 발급받으면 여기서 골라\n컬렉션에 담을 수 있습니다.'}
          />
        </View>
      ) : (
        <View style={styles.grid}>
          {rows.map((row, rowIndex) => (
            <View key={row[0]?.id ?? `row-${rowIndex}`} style={styles.row}>
              {row.map((card, index) =>
                card ? (
                  <CardSelectTile
                    key={card.id}
                    card={card}
                    selected={picked.includes(card.id)}
                    onToggle={() => toggle(card.id)}
                  />
                ) : (
                  <View key={`blank-${index}`} style={styles.blank} />
                ),
              )}
            </View>
          ))}
        </View>
      )}

      <Button label={submitLabel} onPress={submit} loading={pending} style={styles.submit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  /* 거터를 내용이 진다 — 타일이 눌리면 자라는데, 스크롤 뷰는 자기 가장자리에서 자르므로
     가장자리에 붙은 타일은 자랄 곳이 없다. `Screen gutter={false}` 가 이것을 위해 있다. */
  content: { paddingHorizontal: space[4], paddingTop: space[2], paddingBottom: space[7] },
  field: { marginTop: space[5] },
  pickLabel: { marginTop: space[6] },
  /** 줄 사이 24, 줄 안 12 — 한 줄은 하나의 선반이고 줄끼리는 다른 선반이다. */
  grid: { marginTop: space[3], gap: space[5], ...allowPressOverflow },
  row: { flexDirection: 'row', gap: space[3], ...allowPressOverflow },
  blank: { flex: 1 },
  /** 빈 상태는 `flex: 1` 부모를 요구하므로 높이를 가진 상자 안에 넣는다. */
  emptyBox: { height: 220, marginTop: space[3] },
  submit: { marginTop: space[6] },
});
