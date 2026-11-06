/**
 * Lavender 3D pill button with an illustration on the left (home screen menu).
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { MenuArt, type MenuArtName } from '@/art/ui';
import { GameText } from '@/components/ui';
import { AudioService } from '@/services/AudioService';
import { vibrate } from '@/store/settingsStore';
import { radius } from '@/constants/theme';

const EDGE = 5;

export const MenuButton = React.memo(function MenuButton({
  art,
  label,
  subtitle,
  badge,
  onPress,
}: {
  art: MenuArtName;
  label: string;
  subtitle?: string;
  /** Small red dot text (e.g. "!" when something is waiting). */
  badge?: string;
  onPress: () => void;
}) {
  const press = useSharedValue(0);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ translateY: press.value * (EDGE - 1) }] }));
  return (
    <Pressable
      onPressIn={() => (press.value = withTiming(1, { duration: 60 }))}
      onPressOut={() => (press.value = withSpring(0))}
      onPress={() => {
        AudioService.play('click');
        vibrate('light');
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ minHeight: 70 + EDGE }}
    >
      <View style={[styles.edge, { top: EDGE }]} />
      <Animated.View style={aStyle}>
        <LinearGradient colors={['#EFE6FF', '#C9B2FF']} style={styles.face}>
          <View style={styles.gloss} />
          <View style={styles.artWrap}>
            <MenuArt name={art} size={52} />
          </View>
          <View style={{ flex: 1 }}>
            <GameText size={21} color="#4B2A93" weight="black" numberOfLines={1}>
              {label}
            </GameText>
            {subtitle ? (
              <GameText size={14} color="#6E55A8" weight="medium" numberOfLines={1}>
                {subtitle}
              </GameText>
            ) : null}
          </View>
          {badge ? (
            <View style={styles.badge}>
              <GameText size={14} color="#fff" weight="black">
                {badge}
              </GameText>
            </View>
          ) : null}
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  edge: { position: 'absolute', left: 0, right: 0, bottom: 0, borderRadius: radius.xl, backgroundColor: '#7B5BC9' },
  face: {
    minHeight: 70,
    borderRadius: radius.xl,
    borderWidth: 2.5,
    borderColor: '#7B5BC9',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 12,
    overflow: 'hidden',
  },
  gloss: { position: 'absolute', top: 3, left: 16, right: 16, height: '36%', borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.45)' },
  artWrap: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  badge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF5A5F',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
});
