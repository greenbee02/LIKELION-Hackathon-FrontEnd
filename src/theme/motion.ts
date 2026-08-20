import { Easing } from 'react-native-reanimated';

/**
 * Motion, in one place, for the same reason colour and type are.
 *
 * There is exactly one gesture defined here — what a control does under a finger — and every
 * pressable in the app runs it. Durations and curves picked per component are how an interface
 * ends up feeling like several interfaces: the tab bar snappier than the buttons, the cards
 * slower than both, none of it decided.
 */
export const motion = {
  /**
   * How far a control grows while held.
   *
   * Big enough to be unmistakable rather than merely felt — the demo is watched from across a
   * room, and 4% was a movement only the person holding the phone could see.
   *
   * At 16% a grid tile is wider than the 12pt gutter beside it and laps over the card next to it.
   * That is why anything that grows also raises itself while held — without that, the card being
   * pressed would slide *under* its neighbour, which is the one way this effect can look broken
   * rather than lively.
   */
  pressScale: 1.16,

  /** Fast on the way in — the response has to feel simultaneous with the touch. */
  pressInDuration: 90,
  /** Slower on the way out, so releasing settles rather than snaps back. */
  pressOutDuration: 160,

  /** Decelerating, both directions: motion that starts fast and eases to rest reads as physical. */
  easing: Easing.out(Easing.quad),

  /**
   * How long a card takes to turn over.
   *
   * The second gesture in the app, and the only one that is not a response to a finger already
   * moving. A press has to feel simultaneous with the touch, so it is fast and decelerating; a
   * flip is the object itself rotating after the finger has let go, and it starts and ends at
   * rest. That is why it gets its own curve rather than borrowing `easing` — the same argument
   * this file makes for keeping durations out of components applies to keeping two genuinely
   * different motions from being spelled the same way.
   *
   * 420 is long enough that the turn is legible as a rotation from across a room, which is where
   * the demo is watched from, and short enough that nobody waits for it. Under about 300 the card
   * reads as swapping rather than turning, which loses the only thing the gesture is for.
   */
  flipDuration: 420,

  /** Starts and ends at rest, because the object it moves was not moving and will stop. */
  flipEasing: Easing.inOut(Easing.cubic),

  /**
   * How far away the eye is from the card being turned.
   *
   * Without it the rotation is an orthographic squeeze — the card gets narrower and springs back,
   * which reads as a horizontal scale rather than a turn. 900 is close enough that the leading
   * edge visibly swings toward the viewer and far enough that the card does not distort into a
   * wedge halfway through.
   */
  flipPerspective: 900,

  /**
   * How long a panel takes to settle after the finger lets go of it.
   *
   * It borrows `easing` rather than the flip's curve, and the reason is the same one that gave
   * the flip its own: a sheet dragged upward is already moving when the finger leaves, so it has
   * to decelerate out of a motion in progress rather than start from rest. Only the duration is
   * its own — 260, longer than a press because it covers real distance and shorter than a flip
   * because it is finishing a movement the customer already made rather than performing one.
   *
   * Opening by tap starts from rest and so is the one case this curve is not written for. It is
   * the minority gesture on a control whose whole affordance is a grabber, and giving the same
   * control two curves depending on how it was reached would be worse than the mismatch.
   */
  sheetDuration: 260,

  /**
   * 화면 하나가 나타나는 데 걸리는 시간.
   *
   * 네 번째이자 마지막 동작이고, 앞의 셋과 다른 점은 **손가락이 관여하지 않는다**는 것이다.
   * 누름은 손가락에 대한 응답, 뒤집기와 시트는 손가락이 놓고 간 물건의 관성인데, 이건 화면이
   * 바뀌었다는 사실 자체를 말한다. 그래서 시작도 끝도 정지 상태이지만 `flipEasing` 을 빌리지
   * 않는다 — 뒤집기는 물체가 도는 것이라 가속과 감속이 대칭이어야 하고, 나타나는 것은 도착하는
   * 일이라 감속만 있으면 된다. `easing` 을 쓴다.
   *
   * 600 은 이 파일에서 가장 긴 시간이고, **여기서만 길어도 되는 이유가 있다.** 나머지 셋은 전부
   * 사람이 결과를 기다리는 동작이다 — 눌렀는데 반응이 늦으면 고장이고, 카드가 늦게 뒤집히면
   * 뒷면을 못 읽고, 시트가 늦게 서면 그 안의 것을 못 만진다. 화면이 나타나는 것만은 기다리는
   * 대상이 아니라 **이미 도착한 것을 보는 일**이라, 느릴수록 도착이 아니라 안착으로 읽힌다.
   *
   * 25pt 를 600 에 걸쳐 오르므로 눈에 보이는 속도는 초당 40pt 남짓 — 의도적으로 느리다. 소개를
   * 지나 앱의 문 앞에 서는 한 번뿐인 전환이라, 여기서는 부드러움이 속도보다 값이 나간다.
   * **다만 이건 상한에 가깝다.** 더 늘리면 감속 구간의 끝이 길어져 화면이 멈춘 것처럼 보이고,
   * 그때부터는 안착이 아니라 로딩으로 읽힌다.
   *
   * **웹에서도 도는 것이 요점이다.** expo-router 의 웹용 스택은 화면 전환을 아예 그리지 않아
   * (`react-navigation/native-stack/views/NativeStackView.js` 가 View 만 렌더한다) `animation`
   * 옵션이 브라우저에서는 없는 것과 같다. 그래서 전환은 스택이 아니라 화면 자신이 한다.
   */
  enterDuration: 600,
} as const;
