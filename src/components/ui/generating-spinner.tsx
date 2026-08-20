import { LoaderCircle } from 'lucide-react-native';
import { useEffect } from 'react';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/theme/colors';

/** 생성 작업이 실제로 진행 중임을 보여주는 UI 스레드 회전 표시. */
export function GeneratingSpinner({
  size = 18,
  color = colors.borderStrong,
}: {
  size?: number;
  color?: string;
}) {
  const rotation = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      rotation.set(0);
      return;
    }

    rotation.set(
      withRepeat(
        withTiming(360, { duration: 900, easing: Easing.linear }),
        -1,
        false,
      ),
    );

    return () => cancelAnimation(rotation);
  }, [reducedMotion, rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.get()}deg` }],
  }));

  return (
    <Animated.View
      accessibilityLabel="생성 중"
      accessibilityRole="progressbar"
      style={animatedStyle}
    >
      <LoaderCircle size={size} color={color} strokeWidth={2} />
    </Animated.View>
  );
}
