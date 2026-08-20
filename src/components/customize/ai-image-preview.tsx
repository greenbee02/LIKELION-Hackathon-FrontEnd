import { Image } from 'expo-image';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View, type ImageStyle } from 'react-native';

import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Text } from '@/components/ui/text';
import { imageSource } from '@/lib/card-art';
import { saveOrShareAiImage } from '@/lib/ai-media';
import { colors } from '@/theme/colors';
import { space } from '@/theme/spacing';

export function AiImagePreview({
  url,
  label = 'AI 이미지',
  style,
}: {
  url: string;
  label?: string;
  style?: ImageStyle;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    setSaving(true);
    setError(null);
    void saveOrShareAiImage(url, `${label.replace(/\s+/g, '-')}.png`)
      .catch(() => setError('이미지를 저장하지 못했습니다.'))
      .finally(() => setSaving(false));
  };

  const source = imageSource(url);
  if (!source) return null;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} 크게 보기`}
        onPress={() => setOpen(true)}
        style={styles.previewPress}
      >
        <Image source={source} style={[styles.preview, style]} contentFit="contain" transition={200} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text variant="heading" tone="inverted">
              {label}
            </Text>
            <IconButton
              icon={X}
              variant="glass"
              accessibilityLabel="이미지 크게 보기 닫기"
              onPress={() => setOpen(false)}
            />
          </View>
          <Image source={source} style={styles.fullImage} contentFit="contain" transition={200} />
          <View style={styles.actions}>
            <Button label="이미지 저장" variant="outline" loading={saving} onPress={save} />
            {error ? (
              <Text variant="caption" tone="inverted" style={styles.error}>
                {error}
              </Text>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  previewPress: { width: '100%', height: '100%' },
  preview: { width: '100%', height: '100%', backgroundColor: colors.backgroundSubtle },
  modal: { flex: 1, backgroundColor: colors.scrimInk, padding: space[4] },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: space[5],
  },
  fullImage: { flex: 1, width: '100%', marginVertical: space[4] },
  actions: { gap: space[2], paddingBottom: space[4] },
  error: { textAlign: 'center' },
});
