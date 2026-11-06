/**
 * Character collection: big animated preview cycling expressions, 4 hero cards,
 * unlock conditions with progress, and a select button.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { CheckIcon } from '@/art/ui';
import { GameButton, GameText, Panel, ProgressBar } from '@/components/ui';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { AnimatedCharacter, type AnimatedCharacterHandle } from '@/components/AnimatedCharacter';
import { CharacterPortrait, Pedestal } from '@/components/MetaWidgets';
import { useMenuMusic } from '@/components/hooks';
import { CHARACTERS, CHARACTER_BY_ID } from '@/data/characters';
import { totalStars } from '@/engine/LevelEngine';
import { useProgress } from '@/store/progressStore';
import { AudioService } from '@/services/AudioService';
import { colors, radius } from '@/constants/theme';
import type { CharacterId, Expression, SaveData } from '@/types';

const EXPRESSIONS: Expression[] = ['happy', 'think', 'cheer', 'idle'];

function unlockProgress(id: CharacterId, save: SaveData): { current: number; target: number } | null {
  if (id === 'coco') return { current: Math.min(45, totalStars(save)), target: 45 };
  if (id === 'robo') return { current: save.levels['number-30']?.completed ? 1 : 0, target: 1 };
  return null;
}

export default function Characters() {
  const { width, height } = useWindowDimensions();
  const save = useProgress((s) => s.save);
  const selectCharacter = useProgress((s) => s.selectCharacter);
  const [preview, setPreview] = useState<CharacterId>(save.selectedCharacter);
  const [exprIdx, setExprIdx] = useState(0);
  const heroRef = useRef<AnimatedCharacterHandle>(null);
  useMenuMusic();

  useEffect(() => {
    const id = setInterval(() => setExprIdx((i) => (i + 1) % EXPRESSIONS.length), 1500);
    return () => clearInterval(id);
  }, []);

  const info = CHARACTER_BY_ID[preview];
  const unlocked = save.unlockedCharacters.includes(preview);
  const isSelected = save.selectedCharacter === preview;
  const heroSize = Math.min(width * 0.38, height * 0.2, 180);
  const cardW = (Math.min(width, 560) - 32 - 12) / 2;
  const prog = unlockProgress(preview, save);

  return (
    <ScreenScaffold title="Character & Rewards" scroll>
      <Panel style={styles.preview}>
        <Pressable
          onPress={() => {
            if (!unlocked) return;
            AudioService.play('pop');
            heroRef.current?.jump();
          }}
          style={{ alignItems: 'center' }}
        >
          <Animated.View key={preview} entering={ZoomIn.springify().damping(12)} style={{ zIndex: 2, marginBottom: -heroSize * 0.12 }}>
            <AnimatedCharacter
              ref={heroRef}
              id={preview}
              size={heroSize}
              expression={unlocked ? EXPRESSIONS[exprIdx] : 'idle'}
              mode={unlocked ? (EXPRESSIONS[exprIdx] === 'cheer' ? 'cheer' : 'idle') : 'still'}
              locked={!unlocked}
            />
          </Animated.View>
          <Pedestal width={heroSize * 1.3} color={unlocked ? info.color : '#C9CED8'} glow={unlocked} />
        </Pressable>
        <GameText size={26} color={info.color} weight="black" outline align="center">
          {info.name}
        </GameText>
        <GameText size={16} color={colors.ink} weight="bold" align="center">
          {info.title}
        </GameText>
        <GameText size={14} color={colors.inkSoft} weight="medium" align="center">
          {info.description}
        </GameText>
        {unlocked ? (
          isSelected ? (
            <View style={styles.selected}>
              <CheckIcon size={22} />
              <GameText size={18} color="#fff" weight="black">
                Your hero!
              </GameText>
            </View>
          ) : (
            <GameButton
              label={`Play as ${info.name}`}
              variant="green"
              sound="unlock"
              onPress={() => {
                selectCharacter(preview);
                heroRef.current?.jump();
              }}
            />
          )
        ) : (
          <View style={{ gap: 6 }}>
            <GameText size={16} color={colors.redDeep} weight="black" align="center">
              Locked: {info.unlockText}
            </GameText>
            {prog && (
              <ProgressBar
                progress={prog.current / prog.target}
                height={18}
                color={colors.yellow}
                label={prog.target > 1 ? `${prog.current} / ${prog.target}` : 'Not yet'}
              />
            )}
          </View>
        )}
      </Panel>

      <View style={styles.grid}>
        {CHARACTERS.map((c) => {
          const has = save.unlockedCharacters.includes(c.id);
          const active = c.id === preview;
          return (
            <Pressable
              key={c.id}
              onPress={() => {
                AudioService.play('pop');
                setPreview(c.id);
              }}
              style={[styles.card, { width: cardW, borderColor: active ? colors.yellowDeep : has ? c.color : colors.locked }, active && styles.cardActive]}
              accessibilityRole="button"
              accessibilityLabel={`${c.name}${has ? '' : ', locked'}`}
            >
              <CharacterPortrait id={c.id} size={72} locked={!has} selected={save.selectedCharacter === c.id} />
              <GameText size={18} color={colors.ink} weight="black">
                {c.name}
              </GameText>
              <GameText size={12} color={has ? colors.greenDeep : colors.inkSoft} weight="bold" align="center" numberOfLines={2}>
                {has ? (save.selectedCharacter === c.id ? 'Selected' : 'Unlocked') : c.unlockText}
              </GameText>
            </Pressable>
          );
        })}
      </View>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  preview: { alignItems: 'stretch', gap: 6 },
  selected: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.greenDeep,
    borderRadius: radius.pill,
    paddingVertical: 10,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    alignItems: 'center',
    gap: 4,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: radius.lg,
    borderWidth: 3,
  },
  cardActive: { backgroundColor: '#FFF6D6' },
});
