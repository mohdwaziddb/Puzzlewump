/**
 * CharacterArt with life: idle breathing/bobbing, waving sway, or cheering jumps.
 * Imperative handle: ref.current.jump() for a one-off happy hop.
 */
import React, { forwardRef, useEffect, useImperativeHandle } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { CharacterArt } from '@/art/characters';
import type { CharacterId, Expression } from '@/types';

export type CharacterMode = 'idle' | 'wave' | 'cheer' | 'still';

export interface AnimatedCharacterHandle {
  jump: () => void;
}

interface Props {
  id: CharacterId;
  size: number;
  expression?: Expression;
  mode?: CharacterMode;
  locked?: boolean;
}

export const AnimatedCharacter = React.memo(
  forwardRef<AnimatedCharacterHandle, Props>(function AnimatedCharacter(
    { id, size, expression, mode = 'idle', locked },
    ref,
  ) {
    const breathe = useSharedValue(0);
    const y = useSharedValue(0);
    const rot = useSharedValue(0);
    const hop = useSharedValue(0);

    useEffect(() => {
      cancelAnimation(breathe);
      cancelAnimation(y);
      cancelAnimation(rot);
      breathe.value = 0;
      y.value = 0;
      rot.value = 0;
      if (mode === 'still') return;
      const ease = Easing.inOut(Easing.sin);
      breathe.value = withRepeat(withTiming(1, { duration: 1300, easing: ease }), -1, true);
      if (mode === 'idle') {
        y.value = withRepeat(withTiming(-size * 0.03, { duration: 1300, easing: ease }), -1, true);
      } else if (mode === 'wave') {
        y.value = withRepeat(withTiming(-size * 0.02, { duration: 1300, easing: ease }), -1, true);
        rot.value = withRepeat(
          withSequence(withTiming(-5, { duration: 380, easing: ease }), withTiming(5, { duration: 380, easing: ease })),
          -1,
          true,
        );
      } else if (mode === 'cheer') {
        y.value = withRepeat(
          withSequence(
            withTiming(-size * 0.14, { duration: 260, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: 240, easing: Easing.in(Easing.quad) }),
            withTiming(0, { duration: 260 }),
          ),
          -1,
          false,
        );
        rot.value = withRepeat(
          withSequence(withTiming(-6, { duration: 380 }), withTiming(6, { duration: 380 })),
          -1,
          true,
        );
      }
      return () => {
        cancelAnimation(breathe);
        cancelAnimation(y);
        cancelAnimation(rot);
      };
    }, [mode, size, breathe, y, rot]);

    useEffect(() => () => cancelAnimation(hop), [hop]);

    useImperativeHandle(
      ref,
      () => ({
        jump: () => {
          hop.value = withSequence(
            withTiming(-size * 0.2, { duration: 220, easing: Easing.out(Easing.quad) }),
            withSpring(0, { damping: 7, stiffness: 220 }),
          );
        },
      }),
      [hop, size],
    );

    const style = useAnimatedStyle(() => ({
      transform: [
        { translateY: y.value + hop.value },
        { rotate: `${rot.value}deg` },
        { scaleY: 1 + breathe.value * 0.025 },
        { scaleX: 1 - breathe.value * 0.012 },
      ],
    }));

    return (
      <Animated.View style={[{ width: size, height: size * 1.25, transformOrigin: 'bottom' }, style]}>
        <CharacterArt id={id} size={size} expression={expression} locked={locked} />
      </Animated.View>
    );
  }),
);
