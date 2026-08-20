import { StyleSheet, View } from 'react-native';
import Svg, { G, Line, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme/colors';

/**
 * 소개 화면의 그림.
 *
 * 아이콘 하나를 회색 사각형에 담아두었던 자리를 대신한다. 아이콘은 **버튼 안에서 뜻을 보태는**
 * 물건이라 혼자 크게 놓이면 커진 아이콘일 뿐이고, 배경 상자는 "여기 그림이 올 것"이라는 표시로
 * 읽힌다. 세 장 다 실제로 그린 장면으로 바꾼다.
 *
 * **선화이고 색이 없다.** 팔레트가 회색 한 벌이므로 명암만으로 구성한다 — 종이는 배경과 같은
 * 1, 면은 3, 부속 선은 6·8, 윤곽은 9. 그래서 그림이 페이지 위에 얹힌 그래픽이 아니라 페이지에
 * 그려진 것처럼 보인다.
 *
 * **하우스 이름은 나오지 않는다.** 카드는 해부학만 그린다 — 얼굴을 채우는 상품, 왼쪽 위 두
 * 줄, 오른쪽 위 마크 한 점. `CardFace` 가 그리는 순서 그대로이고, 어느 브랜드의 카드도 아니어야
 * 하므로 상품은 형태만 남는다.
 *
 * 카드는 앞의 두 장에만 나온다. 세 번째가 말하는 것은 카드가 아니라 **카드를 모아서 얻는 것**
 * 이므로, 거기서까지 카드를 그리면 세 장이 같은 말을 세 번 하게 된다.
 *
 * 그림은 뜻을 지고 있으므로 `accessibilityLabel` 을 각자 들고 다닌다. 옆의 제목이 같은 말을
 * 하지만, 제목은 그림 밖에 있고 스크린 리더는 이 상자에 먼저 닿는다.
 */

const VIEW = { width: 240, height: 200 } as const;

/**
 * 종이의 윤곽.
 *
 * 9다. 12로 그렸더니 그림이 검정 선화가 되어 제목보다 무거웠다 — 소개 화면에서 가장 진한 것은
 * 읽으라고 쓴 제목이어야 하고, 그림은 그보다 뒤에 있어야 한다. 9는 스케일에서 면을 채우는
 * 단계이고, 이건 글자가 아니라 그림이므로 "글자는 11·12" 규칙에 걸리지 않는다.
 */
const INK = colors.solid;
/** 면. 카드처럼 "물건"인 것에만 칠한다 — 종이는 페이지와 같은 1로 두어 윤곽만 남는다. */
const FILL = colors.backgroundSubtle;
const PAPER = colors.background;
/** 그림 안의 부속 — 카드 위의 글자 자리, 광선. */
const DETAIL = colors.borderStrong;
const FAINT = colors.borderSubtle;

const OUTLINE = 2;

export type SceneName = 'scan' | 'collect' | 'reward';

const LABELS: Record<SceneName, string> = {
  scan: '영수증의 QR 을 스캔하면 카드가 발급되는 모습',
  collect: '카드 여러 장이 겹쳐 모여 있는 모습',
  reward: '티켓 두 장이 겹쳐 있는 모습',
};

export function OnboardingScene({ name }: { name: SceneName }) {
  return (
    <View style={styles.frame} accessible accessibilityRole="image" accessibilityLabel={LABELS[name]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}>
        {name === 'scan' ? <Scan /> : name === 'collect' ? <Collect /> : <Reward />}
      </Svg>
    </View>
  );
}

/** 소수점을 한 자리로. `d` 문자열이 읽히게 하려는 것이고 그림에는 영향이 없다. */
const r1 = (v: number) => Math.round(v * 10) / 10;

type Pt = readonly [number, number];

/**
 * 다각형의 꼭짓점을 둥글려 닫힌 윤곽으로.
 *
 * 각 꼭짓점에서 양옆으로 `radius` 만큼 물러난 두 점을 잡고, 꼭짓점 자신을 제어점으로 삼아
 * 2차 곡선으로 잇는다. `rx` 로는 사다리꼴을 둥글릴 수 없어서 — 그건 직사각형에만 있는 속성이다.
 */
function roundedPoly(points: readonly Pt[], radius: number) {
  const n = points.length;
  const toward = (from: Pt, to: Pt): Pt => {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const t = Math.min(0.5, radius / (Math.hypot(dx, dy) || 1));
    return [from[0] + dx * t, from[1] + dy * t];
  };
  let d = '';
  for (let i = 0; i < n; i += 1) {
    const prev = points[(i - 1 + n) % n] as Pt;
    const cur = points[i] as Pt;
    const next = points[(i + 1) % n] as Pt;
    const enter = toward(cur, prev);
    const exit = toward(cur, next);
    d += `${i === 0 ? 'M' : 'L'}${r1(enter[0])} ${r1(enter[1])} `;
    d += `Q${r1(cur[0])} ${r1(cur[1])} ${r1(exit[0])} ${r1(exit[1])} `;
  }
  return `${d}Z`;
}

/**
 * 카드 한 장. 세 장면이 같은 함수로 그린다 — 소개 내내 같은 물건이 나온다는 것이 요점이라,
 * 장면마다 다시 그리면 그 사실이 흐려진다. 비율은 `CARD_ASPECT`(0.63)를 따른다.
 *
 * **얼굴은 상품이 채운다.** `CardFace` 가 실제로 그러하다 — 사진이 얼굴을 가득 채우고 그 위에
 * 글자가 얹힌다. 가운데를 비워두고 줄만 그으면 아직 안 불러온 화면으로 읽힌다.
 *
 * **가방을 가방으로 만드는 것은 세 가지 비율이다.** 세 번 틀리고 얻은 것이라 적어둔다.
 *
 * 1. **몸통은 세로보다 가로가 길다** (0.72). 세로로 길면 종이백이나 양동이가 된다.
 * 2. **아래가 위보다 넓다.** 위가 넓으면 담는 통이 되고, 아래가 넓어야 물건이 든 가방이 된다.
 * 3. **손잡이는 몸통 폭의 42% 를 잡고 반원보다 높이 선다.** 몸통만큼 벌리고 반원으로 두면
 *    손잡이가 아니라 뚜껑이 되어, 아랫배가 둥글면 그릇에 얹힌 덮개로 읽힌다.
 *
 * 어느 하우스의 것도 아니어야 하므로 형태만 남는다. 카테고리를 하나 고른 셈이지만, 아무것도
 * 아닌 물건을 그릴 수는 없다.
 *
 * **모든 치수가 카드 폭에서 나온다.** 세 장면이 66·68·76 세 가지 폭을 쓰는데, 좌표를 손으로
 * 적으면 그중 하나에만 맞는다.
 */
function CardShape({ x, y, w, fill }: { x: number; y: number; w: number; fill: string }) {
  const h = Math.round(w / 0.63);

  const cx = x + w / 2;
  const bagW = w * 0.68;
  const bagH = bagW * 0.72;
  const bottom = y + h * 0.82;
  const top = bottom - bagH;
  /* 윗변은 아랫변의 88%. 이 6% 씩의 기울기가 통과 가방을 가른다. */
  const halfTop = (bagW * 0.88) / 2;
  const halfBottom = bagW / 2;

  const body = roundedPoly(
    [
      [cx - halfTop, top],
      [cx + halfTop, top],
      [cx + halfBottom, bottom],
      [cx - halfBottom, bottom],
    ],
    bagW * 0.15,
  );

  /* 손잡이. 반원보다 높으므로 큰 호 플래그가 1 이다 — 0 이면 눌린 반원이 되어 뚜껑이 된다. */
  const grip = bagW * 0.42;
  const rise = bagH * 0.42;
  const gripR = (grip * grip) / 4 / (2 * rise) + rise / 2;
  const handle = [
    `M${r1(cx - grip / 2)} ${r1(top)}`,
    `a${r1(gripR)} ${r1(gripR)} 0 1 1 ${r1(grip)} 0`,
  ].join(' ');

  /* 덮개의 이음선. 위쪽 28% 에 있어야 한다 — 한가운데를 가로지르면 서류가방의 걸쇠가 된다. */
  const seam = top + bagH * 0.28;
  const seamHalf = halfTop + (halfBottom - halfTop) * 0.28;

  return (
    <G>
      <Rect x={x} y={y} width={w} height={h} rx={6} fill={fill} stroke={INK} strokeWidth={OUTLINE} />

      {/* 도시 한 줄. 카드 위의 글자는 이것뿐이고, 나머지는 상품이 말한다. */}
      <Line
        x1={x + 10}
        y1={y + 16}
        x2={x + 10 + w * 0.42}
        y2={y + 16}
        stroke={DETAIL}
        strokeWidth={3.5}
        strokeLinecap="round"
      />

      {/* 손잡이가 먼저 — 두 다리 끝을 몸통이 덮어야 손잡이가 몸통에 달린 것으로 보인다. */}
      <Path d={handle} fill="none" stroke={INK} strokeWidth={1.75} strokeLinecap="round" />
      <Path d={body} fill={PAPER} stroke={INK} strokeWidth={1.75} strokeLinejoin="round" />
      <Line
        x1={r1(cx - seamHalf)}
        y1={r1(seam)}
        x2={r1(cx + seamHalf)}
        y2={r1(seam)}
        stroke={DETAIL}
        strokeWidth={2}
      />
    </G>
  );
}

/** 1 — 구매가 카드가 된다. 영수증이 앞에 있고 카드가 그 뒤에서 나온다. */
function Scan() {
  return (
    <G>
      {/* 회전은 SVG 표준 문자열로. `rotation` + `originX/originY` prop 은 웹에서 중심이
          `transform-origin` DOM 속성으로 나가고 React DOM 이 그것을 거부해, 카드가 원점을
          기준으로 돌아버린다. 문자열 3인자 형태는 웹에서 속성 그대로 나가고 네이티브에서도
          파서가 받는다. */}
      <G transform="rotate(10 159 92.5)">
        <CardShape x={126} y={40} w={66} fill={FILL} />
      </G>

      {/* 영수증. 아래가 톱니인 것 하나로 종이라는 것이 정해진다. */}
      <Path
        d="M60 26 h72 a8 8 0 0 1 8 8 v116 l-11 8 l-11 -8 l-11 8 l-11 -8 l-11 8 l-11 -8 l-11 8 l-11 -8 V34 a8 8 0 0 1 8 -8 Z"
        fill={PAPER}
        stroke={INK}
        strokeWidth={OUTLINE}
        strokeLinejoin="round"
      />
      <Line x1={66} y1={44} x2={118} y2={44} stroke={FAINT} strokeWidth={3} strokeLinecap="round" />
      <Line x1={66} y1={54} x2={104} y2={54} stroke={FAINT} strokeWidth={3} strokeLinecap="round" />

      {/* QR — 모서리 세 개가 QR 을 QR 로 읽히게 하는 전부다. */}
      <Rect x={78} y={78} width={11} height={11} rx={1.5} fill={INK} />
      <Rect x={103} y={78} width={11} height={11} rx={1.5} fill={INK} />
      <Rect x={78} y={103} width={11} height={11} rx={1.5} fill={INK} />
      <Rect x={104} y={104} width={9} height={9} rx={1.5} fill={DETAIL} />
      <Rect x={94} y={94} width={6} height={6} rx={1} fill={DETAIL} />

      {/* 네 귀의 괄호. 스캔한다는 말을 그림이 하는 방법이고, QR 위를 지나가지 않는다. */}
      <G stroke={INK} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <Path d="M70 82 V74 a4 4 0 0 1 4 -4 h8" />
        <Path d="M122 82 V74 a4 4 0 0 0 -4 -4 h-8" />
        <Path d="M70 110 v8 a4 4 0 0 0 4 4 h8" />
        <Path d="M122 110 v8 a4 4 0 0 1 -4 4 h-8" />
      </G>
    </G>
  );
}

/**
 * 2 — 카드가 모여 기록이 된다. 세 장이 부채꼴로, 가운데 한 장만 정면.
 *
 * **가운데가 양옆보다 위로 올라온다.** 겹친 카드에서 앞에 있는 것은 손에 가까운 것이고, 손에
 * 가까운 것은 위로 온다 — 앞에 있으면서 아래로 내려가 있으면 부채가 아니라 뒤로 밀려난 카드가
 * 위를 덮은 모양이 되어, 어느 것이 앞인지 눈이 두 번 판단하게 된다. 다만 조금만 — 많이 올리면
 * 세 장이 한 뭉치가 아니라 앞의 한 장과 뒤의 두 장으로 갈라진다.
 *
 * **가운데가 양옆보다 크다.** 셋을 같은 폭으로 그리면 가운데가 작아 보인다 — 착시가 아니라
 * 기울어진 사각형은 대각선이 높이로 읽히기 때문이고, 13도만 돌려도 양옆이 12% 더 길어 보인다.
 * 그만큼 가운데를 키워 되돌린다. 가까운 것이 크다는 원근과도 같은 방향이라, 어느 쪽으로든
 * 틀릴 거면 큰 쪽으로 틀리는 게 맞다.
 */
function Collect() {
  return (
    <G>
      <G transform="rotate(-13 72 104)">
        <CardShape x={38} y={50} w={68} fill={PAPER} />
      </G>
      <G transform="rotate(13 168 104)">
        <CardShape x={134} y={50} w={68} fill={PAPER} />
      </G>
      <CardShape x={82} y={36} w={76} fill={FILL} />
    </G>
  );
}

/**
 * 티켓의 윤곽 한 줄.
 *
 * 티켓인 것은 **옆구리의 홈과 뜯는 자리** 둘이 정한다 — 모서리 둥근 사각형은 카드도 되고
 * 영수증도 되지만, 뜯어내는 자리가 있는 종이는 티켓뿐이다. 그래서 홈은 윤곽선 자체에 파여
 * 있다. 사각형 위에 배경색 원을 얹어 가리는 방법을 쓰지 않은 이유는, 그렇게 하면 원의 나머지
 * 절반이 티켓 안쪽에 선으로 남기 때문이다.
 *
 * 좌표를 손으로 적지 않고 계산해 잇는다 — 홈의 위·아래가 같은 x 위에 있어야 한 장으로 읽히고,
 * 그 사실을 두 곳에 나눠 적으면 언젠가 한쪽만 고쳐진다.
 */
function ticketPath(x: number, y: number, w: number, h: number, tear: number) {
  /** 모서리와 홈. 홈이 모서리보다 작으면 티켓이 아니라 그냥 눌린 사각형으로 보인다. */
  const r = 10;
  const n = 9;
  const tx = x + tear;
  return [
    `M${x + r} ${y}`,
    `H${tx - n}`,
    `a${n} ${n} 0 0 0 ${n * 2} 0`,
    `H${x + w - r}`,
    `a${r} ${r} 0 0 1 ${r} ${r}`,
    `V${y + h - r}`,
    `a${r} ${r} 0 0 1 ${-r} ${r}`,
    `H${tx + n}`,
    `a${n} ${n} 0 0 0 ${-n * 2} 0`,
    `H${x + r}`,
    `a${r} ${r} 0 0 1 ${-r} ${-r}`,
    `V${y + r}`,
    `a${r} ${r} 0 0 1 ${r} ${-r}`,
    'Z',
  ].join(' ');
}

/**
 * 3 — 모을수록 열린다. 티켓 두 장.
 *
 * **뜯긴 티켓은 그리지 않는다.** 반쪽이 떨어져 나간 그림은 이미 쓴 티켓으로 읽히는데, 여기서
 * 말하는 것은 받는 쪽이다. 온전한 두 장이 겹쳐 있는 것으로 충분하고, 두 장인 것은 이게 한 번
 * 주고 끝나는 게 아니라는 뜻이다.
 *
 * 2번 장면도 겹친 그림이지만 헷갈리지 않는다 — 그쪽은 세로 카드 세 장이 좌우 대칭으로 펼쳐지고,
 * 이쪽은 가로 티켓 두 장이 한 방향으로 어긋나 있다.
 */
function Reward() {
  return (
    <G>
      {/* 뒷장은 윤곽만. 두 장이 다 무늬를 가지면 앞장이 앞장으로 안 보인다. */}
      <G transform="rotate(-7 122 87)">
        <Path d={ticketPath(40, 52, 164, 70, 116)} fill={PAPER} stroke={INK} strokeWidth={OUTLINE} />
      </G>

      <Path d={ticketPath(32, 84, 176, 74, 124)} fill={FILL} stroke={INK} strokeWidth={OUTLINE} />

      {/* 뜯는 자리. 홈과 같은 x 위에 있어야 하므로 32 + 124 = 156 을 그대로 쓴다. */}
      <Line
        x1={156}
        y1={102}
        x2={156}
        y2={140}
        stroke={DETAIL}
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray="4 7"
      />

      {/* 본권 — 카드와 같은 두 줄과 마크. 티켓도 하우스가 발행한다. */}
      <Line x1={48} y1={114} x2={112} y2={114} stroke={DETAIL} strokeWidth={3.5} strokeLinecap="round" />
      <Line x1={48} y1={126} x2={92} y2={126} stroke={FAINT} strokeWidth={3} strokeLinecap="round" />
      <Rect x={122} y={108} width={12} height={12} rx={2} fill={DETAIL} />

      {/* 뜯어 가는 쪽. 두 줄이면 충분하다 — 여기 무엇이 적히는지는 이 그림이 답할 일이 아니다. */}
      <Line x1={170} y1={114} x2={198} y2={114} stroke={FAINT} strokeWidth={3} strokeLinecap="round" />
      <Line x1={170} y1={126} x2={188} y2={126} stroke={FAINT} strokeWidth={3} strokeLinecap="round" />
    </G>
  );
}

const styles = StyleSheet.create({
  /* 폭을 다 쓰되 한 장의 그림이 지나치게 커지지 않게 막는다. 비율이 고정이므로 높이는 따라온다. */
  frame: { width: '100%', maxWidth: 300, aspectRatio: VIEW.width / VIEW.height },
});
