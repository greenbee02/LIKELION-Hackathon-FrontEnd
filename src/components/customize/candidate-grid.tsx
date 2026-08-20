import { AlertCircle, Check } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { CandidateContent } from './candidate-content';
import { GeneratingSpinner } from '@/components/ui/generating-spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { allowPressOverflow, raiseWhilePressed, usePressScale } from '@/components/ui/press-scale';
import { failureLabel, isPending, isSelectable, type Candidate } from '@/lib/api/ai-resources';
import { CANDIDATE_SLOTS } from '@/lib/card-layers';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/**
 * 한 그룹의 후보들, 2×2 로.
 *
 * 넷인 것은 디자인이 아니라 계약이다 — `/batch` 의 `resources` 가 최대 4라서 한 번에 만들 수
 * 있는 후보가 넷이고, 넷은 마침 격자로 떨어진다.
 *
 * **아직 오지 않은 자리도 칸을 차지한다.** 도착한 만큼만 그리면 격자가 넷이 될 때까지 자라고,
 * 그러면 고르려던 칸이 손 밑에서 움직인다. 빈 칸은 스켈레톤이다 — 스피너가 아니라, 그 자리에
 * 무엇이 올지 이미 알고 있기 때문이다.
 */
export function CandidateGrid({
  candidates,
  selectedId,
  onSelect,
  candidateCount = CANDIDATE_SLOTS,
}: {
  candidates: Candidate[];
  selectedId?: string;
  onSelect: (candidate: Candidate) => void;
  candidateCount?: number;
}) {
  /* 아직 안 온 자리를 채운다. `null` 은 "이 칸은 곧 채워진다"는 뜻이다. */
  const slots: (Candidate | null)[] = [...candidates];
  while (slots.length < candidateCount) slots.push(null);

  const rows: (Candidate | null)[][] = [];
  for (let i = 0; i < slots.length; i += 2) rows.push(slots.slice(i, i + 2));

  return (
    <View style={styles.grid}>
      {rows.map((row, rowIndex) => (
        <View key={row[0]?.id ?? `row-${rowIndex}`} style={styles.row}>
          {row.map((candidate, index) =>
            candidate ? (
              <CandidateTile
                key={candidate.id}
                candidate={candidate}
                selected={candidate.id === selectedId}
                onPress={() => onSelect(candidate)}
              />
            ) : (
              <View key={`slot-${rowIndex}-${index}`} style={styles.cell}>
                <Skeleton style={styles.tile} />
              </View>
            ),
          )}
        </View>
      ))}
    </View>
  );
}

/**
 * 후보 하나의 껍데기 — 누를 수 있는지, 골랐는지, 왜 못 고르는지.
 *
 * **고를 수 없는 후보는 `Pressable` 이 아니다.** 비활성 컨트롤로 그려두면 눌러보고 나서야
 * 안 된다는 것을 알게 되고, 그 사이에 왜 안 되는지 설명할 자리가 필요해진다. 실패한 타일은
 * 아이콘과 한 줄로 이미 말하고 있다.
 *
 * 골랐다는 표시는 테두리 8단계 + 틱이다 — 색이 없는 팔레트에서 선택을 말하는 방법이고,
 * `Dropdown` 이 현재 값을 틱으로 말하는 것과 같은 규약이다.
 */
function CandidateTile({
  candidate,
  selected,
  onPress,
}: {
  candidate: Candidate;
  selected: boolean;
  onPress: () => void;
}) {
  const pending = isPending(candidate.status);
  const failed = failureLabel(candidate.status);
  const press = usePressScale(!isSelectable(candidate));

  if (pending) {
    return (
      <View style={styles.cell}>
        <View style={styles.tile}>
          <Skeleton style={fill} />
          <View style={styles.pendingOverlay}>
            <GeneratingSpinner size={24} color={colors.text} />
            <Text variant="caption" tone="muted">
              생성 중
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (failed) {
    return (
      <View style={styles.cell}>
        <View style={[styles.tile, styles.failed]}>
          <AlertCircle size={18} color={colors.text} />
          <Text variant="caption" style={styles.failedText}>
            {failed}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      {...press.handlers}
      style={({ pressed }) => [styles.cell, pressed && raiseWhilePressed]}
    >
      <Animated.View style={[styles.tile, selected && styles.selected, press.style]}>
        <CandidateContent candidate={candidate} />
        {selected ? (
          <View style={styles.tick}>
            <Check size={14} color={colors.textInverted} strokeWidth={3} />
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

const fill = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

const styles = StyleSheet.create({
  grid: { gap: space[3], ...allowPressOverflow },
  row: { flexDirection: 'row', gap: space[3], ...allowPressOverflow },
  cell: { flex: 1, ...allowPressOverflow },
  /** 정사각형. 테두리 한 장이나 색 네 개는 카드가 아니므로 카드 비율로 그리지 않는다. */
  tile: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.base,
    backgroundColor: colors.backgroundSubtle,
    overflow: 'hidden',
  },
  selected: { borderWidth: 2, borderColor: colors.borderStrong },
  pendingOverlay: {
    ...fill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
  },
  failed: { alignItems: 'center', justifyContent: 'center', gap: space[1], padding: space[2] },
  failedText: { textAlign: 'center' },
  tick: {
    position: 'absolute',
    top: space[2],
    right: space[2],
    width: 22,
    height: 22,
    borderRadius: radius.full,
    backgroundColor: colors.solidStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
