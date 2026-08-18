import { AlertCircle, Check } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { RESOURCE_LABELS } from '@/lib/api/ai-resources';
import type { ResourceState } from '@/lib/issue-flow';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/**
 * ⚠️ LOCAL — four rows that turn a wait into something to read.
 *
 * A single spinner would say "wait" and nothing else, when in fact four separate things are being
 * made and they finish at different times. Naming them, and letting each one settle on its own,
 * is what makes the delay legible: the customer can see it moving. Promote to `src/components/ui/`
 * only if a second screen ever needs the same shape — the customisation screen probably will.
 *
 * A failed row carries no colour, per the convention in `Input`: an icon appears and the status
 * text sits at step 12 instead of the muted 11.
 */
export function ResourceChecklist({ resources }: { resources: ResourceState[] }) {
  return (
    <View>
      {resources.map((resource) => {
        const done = resource.status === 'COMPLETED';
        const failed = resource.status === 'FAILED';

        return (
          <View key={resource.type} style={styles.row}>
            <View style={styles.slot}>
              {done ? <Check size={16} color={colors.text} strokeWidth={2.5} /> : null}
              {failed ? <AlertCircle size={16} color={colors.text} /> : null}
              {!done && !failed ? <Skeleton style={styles.dot} /> : null}
            </View>

            <Text variant="body" tone={done || failed ? 'default' : 'muted'} style={styles.label}>
              {RESOURCE_LABELS[resource.type]}
            </Text>

            <Text variant="caption" tone={failed ? 'default' : 'muted'}>
              {done ? '완료' : failed ? '실패' : '생성 중'}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  slot: { width: 20, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: radius.full, backgroundColor: colors.borderStrong },
  label: { flex: 1, marginLeft: space[3] },
});
