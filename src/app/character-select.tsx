/**
 * Onboarding hero picker: big character on a glowing pedestal with arrows,
 * round portraits below, Continue -> home.
 */
import React, { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { BackIcon, NextIcon } from '@/art/ui';
import { GameButton, GameText, IconButton, Parchment } from '@/components/ui';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { AnimatedCharacter } from '@/components/AnimatedCharacter';
import { CharacterPortrait, Pedestal } from '@/components/MetaWidgets';
import { useMenuMusic } from '@/components/hooks';
import { CHARACTERS } from '@/data/characters';
import { useProgress } from '@/store/progressStore';
import { colors } from '@/constants/theme';

export default function CharacterSelect() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const unlocked = useProgress((s) => s.save.unlockedCharacters);
  const selected = useProgress((s) => s.save.selectedCharacter);
  const selectCharacter = useProgress((s) => s.selectCharacter);
  const setOnboarded = useProgress((s) => s.setOnboarded);
  const [index, setIndex] = useState(() => Math.max(0, CHARACTERS.findIndex((c) => c.id === selected)));
  useMenuMusic();

  const ch = CHARACTERS[index];
  const locked = !unlocked.includes(ch.id);
  const heroSize = Math.min(width * 0.42, height * 0.22, 200);
  const step = (d: number) => setIndex((i) => (i + d + CHARACTERS.length) % CHARACTERS.length);

  const confirm = () => {
    if (locked) return;
    selectCharacter(ch.id);
    setOnboarded();
    router.replace('/home');
  };

  return (
    <ScreenScaffold
      title="Choose Your Hero"
      topBar={false}
      back={false}
      scroll
      footer={
        <GameButton
          label={locked ? 'Locked' : 'Continue'}
          variant="green"
          size="lg"
          disabled={locked}
          onPress={confirm}
          sound="whoosh"
        />
      }
    >
      <View style={styles.stage}>
        <IconButton onPress={() => step(-1)} variant="blue" size={52}>
          <BackIcon size={26} />
        </IconButton>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Animated.View key={ch.id} entering={ZoomIn.duration(320)} style={{ zIndex: 2, marginBottom: -heroSize * 0.2 }}>
            <AnimatedCharacter id={ch.id} size={heroSize} expression={locked ? 'idle' : 'happy'} mode={locked ? 'still' : 'wave'} locked={locked} />
          </Animated.View>
          <Pedestal width={heroSize * 1.3} color={locked ? '#C9CED8' : ch.color} glow={!locked} />
        </View>
        <IconButton onPress={() => step(1)} variant="blue" size={52}>
          <NextIcon size={26} />
        </IconButton>
      </View>

      <Parchment style={styles.info}>
        <GameText size={28} color={ch.color} weight="black" align="center" outline>
          {ch.name}
        </GameText>
        <GameText size={17} color={colors.ink} weight="bold" align="center">
          {ch.title}
        </GameText>
        <GameText size={15} color={colors.inkSoft} weight="medium" align="center">
          {locked ? `Locked — ${ch.unlockText} to unlock!` : ch.description}
        </GameText>
      </Parchment>

      <View style={styles.portraits}>
        {CHARACTERS.map((c, i) => (
          <CharacterPortrait
            key={c.id}
            id={c.id}
            size={Math.min(64, (width - 80) / 4)}
            locked={!unlocked.includes(c.id)}
            selected={i === index}
            onPress={() => setIndex(i)}
          />
        ))}
      </View>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  stage: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  info: { alignItems: 'center', gap: 4 },
  portraits: { flexDirection: 'row', justifyContent: 'center', gap: 12, flexWrap: 'wrap' },
});
