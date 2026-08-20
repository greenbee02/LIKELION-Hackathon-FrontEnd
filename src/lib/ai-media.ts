import { Platform, Share } from 'react-native';

/** 브라우저에서는 다운로드하고, 네이티브에서는 저장 가능한 공유 시트를 연다. */
export async function saveOrShareAiImage(url: string, filename: string): Promise<void> {
  if (Platform.OS === 'web') {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    return;
  }

  await Share.share({
    title: 'AI 카드 이미지',
    message: url,
    url,
  });
}
