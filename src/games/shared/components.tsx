/**
 * Shared game-board building blocks. All mechanics should compose these so every
 * world feels like the same polished game.
 *
 *  - Tile          tappable rounded tile with idle/selected/correct/wrong/hint/disabled states
 *  - FlipTile      memory card (face-down purple star -> face-up content) with 3D flip
 *  - ChoiceGrid    multiple-choice answers (numbers, text or custom nodes) with validation feedback
 *  - QuestionCard  big wooden-framed question board ("2, 4, 6, 8, ?")
 *  - NumberPad     kid-friendly keypad for typed answers
 *  - Board         lays out a rows x cols grid of square cells that fits the area
 */
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { GameText, BUTTON_COLORS, type ButtonVariant } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { AudioService } from '@/services/AudioService';
import { CheckIcon } from '@/art/ui';
import { useShake, usePop, cellSize } from './hooks';

export type TileState = 'idle' | 'selected' | 'correct' | 'wrong' | 'hint' | 'disabled';

const TILE_STYLE: Record<TileState, { top: string; bottom: string; edge: string }> = {
  idle: { top: '#FFFFFF', bottom: '#EEF3FF', edge: '#B7C3E0' },
  selected: { top: '#FFF6C9', bottom: '#FFE27A', edge: '#D9A400' },
  correct: { top: '#C9FFB0', bottom: '#7FE05A', edge: '#3E9E1E' },
  wrong: { top: '#FFD0D2', bottom: '#FF9A9F', edge: '#D0454D' },
  hint: { top: '#FFF9D6', bottom: '#FFEFA0', edge: '#F2B400' },
  disabled: { top: '#ECEFF4', bottom: '#D8DDE6', edge: '#AEB6C4' },
};

/**
 * Generic tappable tile. Shakes automatically when state becomes 'wrong',
 * pops when it becomes 'correct', glows when 'hint'.
 */
export function Tile({
  size,
  width,
  height,
  state = 'idle',
  onPress,
  children,
  style,
  palette,
}: {
  size?: number;
  width?: number;
  height?: number;
  state?: TileState;
  onPress?: () => void;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** override idle colours (e.g. purple tiles) */
  palette?: { top: string; bottom: string; edge: string };
}) {
  const w = width ?? size ?? 64;
  const h = height ?? size ?? 64;
  const { shake, shakeStyle } = useShake();
  const { pop, popStyle } = usePop();
  const glow = useSharedValue(0);
  useEffect(() => {
    if (state === 'wrong') shake();
    if (state === 'correct') pop();
    glow.value = state === 'hint' ? withTiming(1, { duration: 300 }) : withTiming(0, { duration: 200 });
  }, [state, shake, pop, glow]);
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));
  const c = state === 'idle' && palette ? palette : TILE_STYLE[state];
  const r = Math.min(radius.md, Math.min(w, h) * 0.22);
  return (
    <Animated.View style={[shakeStyle, style]}>
      <Animated.View style={popStyle}>
        <Pressable
          disabled={!onPress || state === 'disabled'}
          onPress={onPress}
          style={({ pressed }) => [{ width: w, height: h + 4, transform: [{ translateY: pressed ? 2 : 0 }] }]}
        >
          <View style={[StyleSheet.absoluteFill, { top: 4, borderRadius: r, backgroundColor: c.edge }]} />
          <LinearGradient
            colors={[c.top, c.bottom]}
            style={{ width: w, height: h, borderRadius: r, borderWidth: 2, borderColor: c.edge, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
          >
            {children}
          </LinearGradient>
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { borderRadius: r + 3, borderWidth: 4, borderColor: '#FFD23F', margin: -3, height: h + 6 }, glowStyle]}
          />
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const CARD_BACK = { top: '#B58CFF', bottom: '#8456E8', edge: '#5B33B5' };
const STAR = 'M50 12 L60 38 L88 39 L66 56 L74 84 L50 68 L26 84 L34 56 L12 39 L40 38 Z';

/** Memory card that flips between a purple star back and `children` face. */
export function FlipTile({
  size,
  faceUp,
  matched,
  onPress,
  children,
  hinted,
}: {
  size: number;
  faceUp: boolean;
  matched?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
  hinted?: boolean;
}) {
  const rot = useSharedValue(faceUp ? 1 : 0);
  useEffect(() => {
    rot.value = withTiming(faceUp ? 1 : 0, { duration: 280 });
  }, [faceUp, rot]);
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 600 }, { rotateY: `${interpolate(rot.value, [0, 1], [0, 180])}deg` }],
    opacity: rot.value < 0.5 ? 1 : 0,
  }));
  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 600 }, { rotateY: `${interpolate(rot.value, [0, 1], [180, 360])}deg` }],
    opacity: rot.value >= 0.5 ? 1 : 0,
  }));
  return (
    <Pressable
      onPress={() => {
        if (!faceUp && onPress) {
          AudioService.play('flip');
          onPress();
        }
      }}
      style={{ width: size, height: size + 4 }}
    >
      <Animated.View style={[StyleSheet.absoluteFill, backStyle]}>
        <Tile size={size} palette={CARD_BACK} state={hinted ? 'hint' : 'idle'}>
          <Svg width={size * 0.55} height={size * 0.55} viewBox="0 0 100 100">
            <Path d={STAR} fill="#C9AEFF" stroke="#7446D9" strokeWidth={4} strokeLinejoin="round" />
          </Svg>
        </Tile>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, frontStyle]}>
        <Tile size={size} state={matched ? 'correct' : 'idle'}>
          {children}
        </Tile>
      </Animated.View>
    </Pressable>
  );
}

export interface Choice {
  key: string;
  /** plain text/number label, or a custom node via render */
  label?: string | number;
  render?: (size: number) => React.ReactNode;
}

/**
 * Multiple-choice answers. Validates against `correctKey`, shows green/red feedback,
 * calls onCorrect/onWrong. Wrong choices stay disabled; the round locks after correct.
 * Change `roundKey` to reset for a new question.
 */
export function ChoiceGrid({
  choices,
  correctKey,
  onCorrect,
  onWrong,
  columns = 2,
  width,
  itemHeight = 64,
  roundKey,
  hintKey,
  variant = 'cream',
  disabled,
}: {
  choices: Choice[];
  correctKey: string;
  onCorrect: () => void;
  onWrong: (key: string) => void;
  columns?: number;
  width: number;
  itemHeight?: number;
  roundKey: string | number;
  /** a wrong choice to eliminate / the correct one to glow when hint used */
  hintKey?: string | null;
  variant?: ButtonVariant;
  disabled?: boolean;
}) {
  const [wrong, setWrong] = useState<Set<string>>(new Set());
  const [done, setDone] = useState(false);
  useEffect(() => {
    setWrong(new Set());
    setDone(false);
  }, [roundKey]);
  const gap = 12;
  const w = (width - gap * (columns - 1)) / columns;
  const palette = BUTTON_COLORS[variant];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap, width, justifyContent: 'center' }}>
      {choices.map((c) => {
        const isCorrect = c.key === correctKey;
        const state: TileState =
          done && isCorrect ? 'correct' : wrong.has(c.key) ? 'wrong' : hintKey === c.key ? 'hint' : 'idle';
        return (
          <Tile
            key={c.key}
            width={w}
            height={itemHeight}
            state={state}
            palette={{ top: palette.top, bottom: palette.bottom, edge: palette.edge }}
            onPress={
              disabled || done || wrong.has(c.key)
                ? undefined
                : () => {
                    if (isCorrect) {
                      setDone(true);
                      onCorrect();
                    } else {
                      setWrong((s) => new Set(s).add(c.key));
                      onWrong(c.key);
                    }
                  }
            }
          >
            {c.render ? (
              c.render(Math.min(w, itemHeight) * 0.75)
            ) : (
              <GameText size={Math.min(34, itemHeight * 0.5)} weight="black" color={palette.text === '#FFFFFF' ? '#fff' : colors.ink} outline={palette.text === '#FFFFFF'}>
                {c.label}
              </GameText>
            )}
            {done && isCorrect && (
              <View style={styles.check}>
                <CheckIcon size={18} />
              </View>
            )}
          </Tile>
        );
      })}
    </View>
  );
}

/** Wooden-framed board showing the question in big text (or custom children). */
export function QuestionCard({
  text,
  children,
  width,
  fontSize = 40,
}: {
  text?: string;
  children?: React.ReactNode;
  width: number;
  fontSize?: number;
}) {
  return (
    <View style={[styles.qOuter, { width }]}>
      <View style={styles.qInner}>
        {children ?? (
          <GameText size={fontSize} weight="black" color={colors.ink} align="center" numberOfLines={2}>
            {text}
          </GameText>
        )}
      </View>
    </View>
  );
}

/** 3x4 keypad: digits, delete, OK. Displays the typed value above. */
export function NumberPad({
  value,
  onChange,
  onSubmit,
  width,
  maxLength = 6,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  width: number;
  maxLength?: number;
  disabled?: boolean;
}) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'];
  const gap = 8;
  const w = (width - gap * 2) / 3;
  const h = Math.min(56, w * 0.7);
  return (
    <View style={{ width, gap: 10 }}>
      <View style={styles.padDisplay}>
        <GameText size={32} weight="black" color={colors.ink}>
          {value || ' '}
        </GameText>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
        {keys.map((k) => (
          <Tile
            key={k}
            width={w}
            height={h}
            palette={k === 'ok' ? { top: '#8AF05E', bottom: '#45C21E', edge: '#24800E' } : k === 'del' ? { top: '#FFB3B6', bottom: '#FF7A80', edge: '#C23F45' } : undefined}
            onPress={
              disabled
                ? undefined
                : () => {
                    AudioService.play('pop');
                    if (k === 'del') onChange(value.slice(0, -1));
                    else if (k === 'ok') {
                      if (value.length) onSubmit();
                    } else if (value.length < maxLength) onChange(value + k);
                  }
            }
          >
            <GameText size={k.length > 1 ? 18 : 26} weight="black" color={k === 'ok' || k === 'del' ? '#fff' : colors.ink} outline={k === 'ok' || k === 'del'}>
              {k === 'del' ? 'DEL' : k === 'ok' ? 'OK' : k}
            </GameText>
          </Tile>
        ))}
      </View>
    </View>
  );
}

/** Square grid layout that fits the given area; renders renderCell(index, row, col, size). */
export function Board({
  rows,
  cols,
  width,
  height,
  gap = 8,
  maxCell = 110,
  renderCell,
}: {
  rows: number;
  cols: number;
  width: number;
  height: number;
  gap?: number;
  maxCell?: number;
  renderCell: (index: number, row: number, col: number, size: number) => React.ReactNode;
}) {
  const s = cellSize(width, height, rows, cols, gap, maxCell);
  return (
    <View style={{ gap, alignSelf: 'center' }}>
      {Array.from({ length: rows }, (_, r) => (
        <View key={r} style={{ flexDirection: 'row', gap }}>
          {Array.from({ length: cols }, (_, c) => (
            <View key={c} style={{ width: s, height: s + 4 }}>
              {renderCell(r * cols + c, r, c, s)}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/** Small banner shown during a "memorize" phase with a draining bar. */
export function MemorizeBar({ durationMs, running, label = 'Remember!' }: { durationMs: number; running: boolean; label?: string }) {
  const p = useSharedValue(1);
  useEffect(() => {
    if (running) {
      p.value = 1;
      p.value = withTiming(0, { duration: durationMs });
    }
  }, [running, durationMs, p]);
  const st = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  if (!running) return null;
  return (
    <View style={styles.memo}>
      <GameText size={18} color="#fff" weight="black" outline>
        {label}
      </GameText>
      <View style={styles.memoTrack}>
        <Animated.View style={[styles.memoFill, st]} />
      </View>
    </View>
  );
}

/** Spring-in wrapper for content that appears each round. */
export function PopIn({ children, delay = 0, k }: { children: React.ReactNode; delay?: number; k?: string | number }) {
  const s = useSharedValue(0);
  useEffect(() => {
    s.value = 0;
    const t = setTimeout(() => (s.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.back(1.7)) })), delay);
    return () => clearTimeout(t);
  }, [k, delay, s]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }], opacity: Math.min(1, s.value * 1.5) }));
  return <Animated.View style={st}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  check: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.greenDeep,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  qOuter: {
    alignSelf: 'center',
    padding: 8,
    borderRadius: radius.lg,
    backgroundColor: colors.wood,
    borderWidth: 3,
    borderColor: colors.woodDeep,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  qInner: {
    minHeight: 90,
    borderRadius: radius.md,
    backgroundColor: colors.parchment,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  padDisplay: {
    height: 58,
    borderRadius: radius.md,
    backgroundColor: colors.parchment,
    borderWidth: 3,
    borderColor: colors.parchmentDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memo: {
    alignSelf: 'center',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(90,50,200,0.75)',
    width: 200,
  },
  memoTrack: { height: 8, width: '100%', borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' },
  memoFill: { height: 8, borderRadius: 4, backgroundColor: '#FFD23F' },
});

export { cellSize };
