import { Image } from 'expo-image';
import { ImageOff } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { CARD_ASPECT } from '@/components/card/card-face';
import { Text } from '@/components/ui/text';
import { imageSource } from '@/lib/card-art';
import { assertNever } from '@/lib/api/parse';
import type { Candidate, DataCandidate, ImageCandidate } from '@/lib/api/ai-resources';
import type { CompositionData, PaletteData, TextStyleData } from '@/lib/api/resource-data';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/**
 * 후보 하나의 속. 껍데기(선택·실패·대기)는 `CandidateTile` 이 그린다.
 *
 * **여덟 종류가 두 부류로 갈리는 것이 이 파일의 전부다.** 다섯은 그림이 오고 셋은 JSON 이
 * 오는데, 그림이 없는 것을 그림 타일로 그리면 빈 사각형 넷이 나란히 서고 고객은 무엇을
 * 고르는 것인지 알 수 없다. 색은 칩으로, 조판은 실제로 조판된 견본으로, 배치는 도면으로
 * 보여야 고르는 행위가 성립한다.
 *
 * 그 구분은 규율이 아니라 **타입**이다. 아래 세 컴포넌트는 각각 좁혀진 데이터만 받으므로,
 * 팔레트를 이미지 타일에 넘기면 컴파일이 깨진다. 그리고 `switch` 는 `assertNever` 로 끝나서
 * 아홉 번째 종류가 생기는 날 빌드가 먼저 알려준다.
 */
export function CandidateContent({ candidate }: { candidate: Candidate }) {
  return candidate.kind === 'image' ? (
    <ImageBody candidate={candidate} />
  ) : (
    <DataBody candidate={candidate} />
  );
}

/** 그림이 오는 다섯. */
function ImageBody({ candidate }: { candidate: ImageCandidate }) {
  const source = imageSource(candidate.imageUrl);

  /* 상품 각도와 장식·테두리는 카드를 채우지 않는 물건이라 잘라내면 안 되고, 배경과 무늬는
     채우는 것이라 여백이 남으면 안 된다. 같은 타일 안에서 둘을 가르는 것은 종류뿐이다. */
  const fit =
    candidate.type === 'BACKGROUND' || candidate.type === 'PATTERN' ? 'cover' : 'contain';

  if (!source) {
    return (
      <View style={styles.blank}>
        <ImageOff size={20} color={colors.borderStrong} strokeWidth={1.5} />
      </View>
    );
  }

  return <Image source={source} style={StyleSheet.absoluteFill} contentFit={fit} transition={200} />;
}

/** JSON 이 오는 셋. */
function DataBody({ candidate }: { candidate: DataCandidate }) {
  const { data } = candidate;

  switch (data.kind) {
    case 'COLOR_PALETTE':
      return <PaletteBody data={data} />;
    case 'TEXT_STYLE':
      return <TextStyleBody data={data} />;
    case 'COMPOSITION':
      return <CompositionBody data={data} />;
    case 'UNPARSED':
      return (
        <View style={styles.blank}>
          <Text variant="caption" tone="muted" style={styles.center}>
            미리보기를 만들 수 없습니다
          </Text>
        </View>
      );
    default:
      return assertNever(data);
  }
}

/**
 * 색 조합 — 칩이 맞닿아 하나의 띠가 된다.
 *
 * hex 문자열은 적지 않는다. `#B89A6A` 는 고객의 언어가 아니고, 색은 이미 보이고 있다.
 * 이름이 있으면 그것만 아래에 둔다 — 없으면 그 줄이 없다.
 */
function PaletteBody({ data }: { data: PaletteData }) {
  return (
    <View style={styles.palette}>
      <View style={styles.chips}>
        {data.colors.map((color, i) => (
          <View key={`${color}-${i}`} style={[styles.chip, { backgroundColor: color }]} />
        ))}
      </View>
      {data.name ? (
        <Text variant="caption" numberOfLines={1} style={styles.paletteName}>
          {data.name}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * 글자 모양 — **말로 적지 않고 그 모양으로 조판해 보여준다.**
 *
 * 견본은 카드 앞면이 실제로 싣는 두 줄이다. "굵기 600, 자간 0.5" 라고 적으면 고객은 그것이
 * 어떻게 보이는지 상상해야 하고, 상상은 고르기의 근거가 되지 못한다.
 *
 * **`fontFamily` 는 존중하지 않는다.** 플랫폼 폰트의 예외는 wordmark 와 engraving 둘뿐이고
 * 세 번째를 만들 수 없다. 서버가 말한 서체 이름은 아래 캡션에 적어 무엇을 고른 것인지
 * 말해준다 — 실제로 그 서체로 조판하는 것은 어차피 백엔드다.
 */
function TextStyleBody({ data }: { data: TextStyleData }) {
  const sample = {
    ...(data.fontWeight && { fontWeight: data.fontWeight as never }),
    ...(data.letterSpacing !== undefined && { letterSpacing: data.letterSpacing }),
    ...(data.textAlign && { textAlign: data.textAlign }),
    ...(data.color && { color: data.color }),
  };

  return (
    <View style={styles.textStyle}>
      <Text variant="engraving" style={[styles.sample, sample]} numberOfLines={1}>
        {data.transform === 'uppercase' ? 'SEOUL' : 'Seoul'}
      </Text>
      <Text variant="caption" tone="muted" style={sample} numberOfLines={1}>
        2026.07.14
      </Text>
      {data.name ? (
        <Text variant="caption" tone="muted" numberOfLines={1} style={styles.styleName}>
          {data.name}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * 배치 — 그림이 아니라 **도면**이다.
 *
 * 카드 비율 안에 칸의 자리만 선으로 그린다. 안에 아무것도 넣지 않는 이유는, 넣는 순간 그것이
 * 배경인지 상품인지 고객이 판단해야 하는데 이 후보가 말하는 것은 "무엇"이 아니라 "어디"이기
 * 때문이다. 칸 이름은 이 크기에서 읽히지 않으므로 적지 않는다.
 */
function CompositionBody({ data }: { data: CompositionData }) {
  return (
    <View style={styles.composition}>
      <View style={styles.plan}>
        {data.slots.map((slot, i) => (
          <View
            key={`${slot.slot}-${i}`}
            style={[
              styles.slot,
              {
                left: `${slot.frame.x * 100}%`,
                top: `${slot.frame.y * 100}%`,
                width: `${slot.frame.width * 100}%`,
                height: `${slot.frame.height * 100}%`,
              },
            ]}
          />
        ))}
      </View>
      <Text variant="caption" tone="muted" numberOfLines={1} style={styles.styleName}>
        {data.name ?? `영역 ${data.slots.length}개`}
      </Text>
    </View>
  );
}

/** `StyleSheet.absoluteFillObject` 의 타입이 이 버전에 없어서 직접 적는다. */
const fill = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

const styles = StyleSheet.create({
  blank: {
    ...fill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space[2],
  },
  center: { textAlign: 'center' },

  palette: { ...fill, padding: space[2], justifyContent: 'center' },
  chips: { flexDirection: 'row', height: 44, borderRadius: radius.small, overflow: 'hidden' },
  chip: { flex: 1, height: '100%' },
  paletteName: { marginTop: space[2] },

  textStyle: {
    ...fill,
    padding: space[3],
    justifyContent: 'center',
    gap: space[1],
  },
  sample: { color: colors.text },
  styleName: { marginTop: space[2] },

  composition: { ...fill, padding: space[3], alignItems: 'center' },
  /* 정사각 타일 안의 카드 비율 도면 — 높이를 채우고 폭이 따라온다. 반대로 하면 세로로 길어져
     타일 밖으로 나간다. */
  plan: {
    height: '100%',
    aspectRatio: CARD_ASPECT,
    borderRadius: radius.small,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
  },
  slot: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.small,
  },
});
