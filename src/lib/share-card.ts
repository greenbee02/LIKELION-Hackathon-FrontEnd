import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import type { View } from 'react-native';
import type { RefObject } from 'react';
import { captureRef } from 'react-native-view-shot';

/**
 * 카드 그림을 만들어 기기에 넘긴다 — 그리고 거기서부터는 기기의 일이다.
 *
 * **앱은 공유 화면을 갖지 않는다.** 인스타그램 스토리, X, 카카오톡, 그리고 이미지 저장까지 —
 * 고객이 이미 고른 목록은 OS 가 들고 있고, 그 목록을 앱이 다시 그리면 언제나 실제보다 적게
 * 그린다. 설치된 앱이 무엇인지 우리는 모르고, 알아낼 이유도 없다. 우리가 할 일은 PNG 한 장을
 * 만들어 시스템 공유 시트에 얹는 것까지다.
 *
 * 세 플랫폼이 하는 일이 서로 다르고, 다르다는 사실을 부르는 쪽이 알아야 하므로 결과를 돌려준다:
 * 네이티브는 시트를 띄우고, 웹은 브라우저가 지원하면 같은 시트를 띄우고 아니면 파일을 내려받는다.
 * 내려받기는 실패가 아니라 다른 결말이고, 화면은 그 둘에 다른 말을 해야 한다.
 */
export type ShareOutcome = 'shared' | 'downloaded' | 'failed';

export async function shareCardImage(
  target: RefObject<View | null>,
  fileName: string,
): Promise<ShareOutcome> {
  try {
    if (Platform.OS === 'web') return await shareOnWeb(target, fileName);

    const uri = await captureRef(target, { format: 'png', quality: 1, fileName });
    if (!(await Sharing.isAvailableAsync())) return 'failed';
    await Sharing.shareAsync(uri, {
      mimeType: 'image/png',
      dialogTitle: '카드 공유',
      /* iOS 는 이것으로 항목의 종류를 판단한다. 없으면 파일 하나로만 읽혀서 시트에 이미지
         앱들과 '이미지 저장' 이 나오지 않는다 — 공유는 되는데 갈 곳이 없는 상태가 된다. */
      UTI: 'public.png',
    });
    return 'shared';
  } catch {
    return 'failed';
  }
}

/**
 * 웹에는 두 단계가 있다.
 *
 * `navigator.share` 에 파일을 실을 수 있는 브라우저 — 모바일 사파리와 크롬 — 는 네이티브와
 * 똑같은 시스템 시트를 연다. 못 하는 브라우저에서는 내려받기가 남고, 그것도 결말이다: 파일이
 * 손에 들어오면 어디에 올릴지는 다시 고객의 몫이 된다.
 */
async function shareOnWeb(
  target: RefObject<View | null>,
  fileName: string,
): Promise<ShareOutcome> {
  const dataUri = await captureRef(target, { format: 'png', quality: 1, result: 'data-uri' });

  try {
    const blob = await (await fetch(dataUri)).blob();
    const file = new File([blob], fileName, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] });
      return 'shared';
    }
  } catch (e) {
    /* 시트를 열어놓고 닫은 것은 실패가 아니다. 그 외의 사고만 내려받기로 넘어간다. */
    if (e instanceof Error && e.name === 'AbortError') return 'shared';
  }

  const link = document.createElement('a');
  link.href = dataUri;
  link.download = fileName;
  link.click();
  return 'downloaded';
}
