import { useEffect, useState } from 'react';
import { Palette } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { TemplateTile } from '@/components/card/template-tile';
import { EmptyState } from '@/components/ui/empty-state';
import { NavBar } from '@/components/ui/nav-bar';
import { Panel } from '@/components/ui/panel';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { failureCopy } from '@/lib/api/errors';
import { fetchCardTemplates } from '@/lib/api/card-templates';
import type { CardTemplate } from '@/lib/types';
import { space } from '@/theme/spacing';

const COLUMNS = 2;

export default function TemplatesScreen() {
  const [templates, setTemplates] = useState<CardTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setStatus('loading');
      try {
        const next = await fetchCardTemplates();
        if (!alive) return;
        setTemplates(next);
        setSelectedId(next[0]?.id ?? null);
        setStatus('ready');
      } catch (e) {
        if (!alive) return;
        setError(failureCopy(e).note);
        setStatus('error');
      }
    };
    void load();
    return () => { alive = false; };
  }, []);

  const selected = templates.find((template) => template.id === selectedId) ?? null;
  const rows: (CardTemplate | null)[][] = [];
  for (let i = 0; i < templates.length; i += COLUMNS) {
    const row: (CardTemplate | null)[] = templates.slice(i, i + COLUMNS);
    while (row.length < COLUMNS) row.push(null);
    rows.push(row);
  }

  return (
    <Screen scroll header={<NavBar title="카드 템플릿" fallback="/catalog" />} contentContainerStyle={styles.content}>
      <Text variant="body" tone="muted" style={styles.intro}>
        카드 꾸미기에 사용할 수 있는 브랜드 승인 디자인입니다. 템플릿을 누르면 설명을 확인할 수 있습니다.
      </Text>
      {status === 'loading' ? <View style={styles.grid}><Skeleton style={styles.skeleton} /><Skeleton style={styles.skeleton} /></View> : null}
      {status === 'error' ? <EmptyState icon={Palette} title="템플릿을 불러오지 못했습니다" note={error ?? '잠시 후 다시 시도해 주세요.'} /> : null}
      {status === 'ready' && templates.length === 0 ? <EmptyState icon={Palette} title="사용할 수 있는 템플릿이 없습니다" /> : null}
      {status === 'ready' && templates.length > 0 ? (
        <>
          <View style={styles.grid}>
            {rows.map((row, rowIndex) => (
              <View key={row[0]?.id ?? `row-${rowIndex}`} style={styles.row}>
                {row.map((template, index) => template ? (
                  <TemplateTile key={template.id} template={template} selected={selectedId === template.id} onPress={() => setSelectedId(template.id)} />
                ) : <View key={`blank-${index}`} style={styles.blank} />)}
              </View>
            ))}
          </View>
          {selected ? (
            <Panel style={styles.detail}>
              <Text variant="caption" tone="muted">{selected.brandName}</Text>
              <Text variant="heading" style={styles.detailTitle}>{selected.name}</Text>
              <Text variant="body" tone="muted" style={styles.detailText}>{selected.description ?? '이 템플릿은 카드 꾸미기에서 선택할 수 있습니다.'}</Text>
            </Panel>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: space[7] },
  intro: { marginTop: space[2] },
  grid: { marginTop: space[6] },
  row: { flexDirection: 'row', gap: space[3], marginBottom: space[6] },
  blank: { flex: 1 },
  skeleton: { flex: 1, aspectRatio: 0.67, borderRadius: 12 },
  detail: { marginTop: space[1] },
  detailTitle: { marginTop: space[1] },
  detailText: { marginTop: space[2] },
});
