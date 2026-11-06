/**
 * GameHost — the common shell around every mechanic:
 * world background, header (pause, hearts, level sign, timer), instructions, progress,
 * hint button, pause menu, boss stages, friendly feedback and fail handling.
 * Mechanics only implement PuzzleProps (see src/types).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LevelConfig } from '@/types';
import { colors, worldThemes } from '@/constants/theme';
import { WorldScene, BossArt } from '@/art/worlds';
import { CharacterArt } from '@/art/characters';
import { BulbIcon, ClockIcon, PauseIcon, RetryIcon, HomeIcon, PlayIcon, MusicIcon, SoundIcon } from '@/art/ui';
import { GameButton, GameText, Hearts, IconButton, Panel, Parchment, ProgressBar, WoodSign } from '@/components/ui';
import { AudioService } from '@/services/AudioService';
import { useProgress } from '@/store/progressStore';
import { useSettings, vibrate } from '@/store/settingsStore';
import { HINT_PRICE } from '@/engine/RewardEngine';
import type { PlayStats } from '@/engine/ScoringEngine';
import { getPuzzleComponent } from './registry';

export interface GameHostProps {
  level: LevelConfig;
  onWin: (stats: PlayStats) => void;
  onLose: (stats: PlayStats) => void;
  onExit: () => void;
  onRestart: () => void;
}

const ENCOURAGE = ['Almost!', 'Try again!', 'Oops, so close!', 'You can do it!', 'Keep going!'];
const PRAISE = ['Great!', 'Awesome!', 'Super!', 'Brilliant!', 'Nice one!'];

function fmt(sec: number) {
  const s = Math.max(0, Math.ceil(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export default function GameHost({ level, onWin, onLose, onExit, onRestart }: GameHostProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const theme = worldThemes[level.worldId];
  const character = useProgress((s) => s.save.selectedCharacter);
  const hintsOwned = useProgress((s) => s.save.hints);
  const coins = useProgress((s) => s.save.coins);
  const spendHint = useProgress((s) => s.spendHint);
  const settings = useSettings();

  const [stage, setStage] = useState(0);
  const [stageIntro, setStageIntro] = useState(level.stages.length > 1);
  const [mistakes, setMistakes] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintSignal, setHintSignal] = useState(0);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState(0);
  const [finished, setFinished] = useState<null | 'won' | 'lost'>(null);
  const [lostReason, setLostReason] = useState<'lives' | 'time'>('lives');
  const [toast, setToast] = useState<{ text: string; good: boolean; id: number } | null>(null);
  const [area, setArea] = useState({ w: width - 32, h: height * 0.55 });

  const stats = useRef<PlayStats>({ mistakes: 0, hintsUsed: 0, timeSec: 0 });
  stats.current = { mistakes, hintsUsed, timeSec: elapsed };
  const lives = level.lives !== undefined ? Math.max(0, level.lives - mistakes) : undefined;
  const timeLeft = level.timeLimitSec !== undefined ? level.timeLimitSec - elapsed : undefined;
  const Puzzle = getPuzzleComponent(level.stages[stage].gameType);
  const running = !paused && !finished && !stageIntro;

  /* timer (pause-aware, stops when app is backgrounded) */
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') setPaused(true);
    });
    return () => sub.remove();
  }, []);

  /* Android back -> pause menu (or close it) */
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (finished) return false;
      setPaused((p) => !p);
      return true;
    });
    return () => sub.remove();
  }, [finished]);

  /* stage intro banner for bosses */
  useEffect(() => {
    if (!stageIntro) return;
    const t = setTimeout(() => setStageIntro(false), 1600);
    return () => clearTimeout(t);
  }, [stageIntro]);

  const showToast = useCallback((good: boolean) => {
    const list = good ? PRAISE : ENCOURAGE;
    setToast({ text: list[Math.floor(Math.random() * list.length)], good, id: Date.now() });
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1100);
    return () => clearTimeout(t);
  }, [toast]);

  /* lose conditions */
  useEffect(() => {
    if (finished) return;
    if (lives !== undefined && lives <= 0) {
      setLostReason('lives');
      setFinished('lost');
    } else if (timeLeft !== undefined && timeLeft <= 0) {
      setLostReason('time');
      setFinished('lost');
    }
  }, [lives, timeLeft, finished]);

  useEffect(() => {
    if (finished === 'lost') onLose(stats.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  const onMistake = useCallback(() => {
    if (finished) return;
    AudioService.play('wrong');
    vibrate('error');
    setMistakes((m) => m + 1);
    showToast(false);
  }, [finished, showToast]);

  const onCorrect = useCallback(() => {
    AudioService.play('correct');
  }, []);

  const onSolved = useCallback(
    (report?: { extraMistakes?: number }) => {
      if (finished) return;
      if (report?.extraMistakes) setMistakes((m) => m + report.extraMistakes!);
      AudioService.play('correct');
      vibrate('success');
      if (stage < level.stages.length - 1) {
        showToast(true);
        setProgress(0);
        setStage((s) => s + 1);
        setStageIntro(true);
        return;
      }
      setFinished('won');
      const st = { ...stats.current, mistakes: stats.current.mistakes + (report?.extraMistakes ?? 0) };
      setTimeout(() => onWin(st), 500);
    },
    [finished, stage, level.stages.length, onWin, showToast],
  );

  const onHintPress = () => {
    if (hintsUsed >= level.maxHints || paused || finished) return;
    const paid = spendHint();
    if (!paid) {
      setToast({ text: `Need ${HINT_PRICE} coins for a hint`, good: false, id: Date.now() });
      return;
    }
    AudioService.play('pop');
    setHintsUsed((h) => h + 1);
    setHintSignal((s) => s + 1);
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (Math.abs(w - area.w) > 1 || Math.abs(h - area.h) > 1) setArea({ w, h });
  };

  const hintsLeft = level.maxHints - hintsUsed;
  const canHint = hintsLeft > 0 && (hintsOwned > 0 || coins >= HINT_PRICE);
  const stageCfg = level.stages[stage];

  return (
    <View style={{ flex: 1, backgroundColor: theme.skyTop }}>
      <View style={StyleSheet.absoluteFill}>
        <WorldScene worldId={level.worldId} width={width} height={height + insets.top + insets.bottom} />
      </View>

      {/* header */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <IconButton size={46} variant="yellow" onPress={() => setPaused(true)}>
          <PauseIcon size={22} color="#7A4300" />
        </IconButton>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <WoodSign title={level.id.startsWith('daily-') ? 'Daily Challenge' : level.tier === 'boss' ? 'Boss Level' : `Level ${level.number}`} size="sm" />
          {lives !== undefined && level.lives !== undefined && (
            <View style={{ marginTop: 4 }}>
              <Hearts lives={lives} max={level.lives} size={22} />
            </View>
          )}
        </View>
        <View style={[styles.timer, timeLeft !== undefined && timeLeft <= 15 && { backgroundColor: colors.redDeep }]}>
          <ClockIcon size={22} />
          <GameText size={16} color="#fff" weight="black">
            {fmt(timeLeft ?? elapsed)}
          </GameText>
        </View>
      </View>

      {/* instructions + progress */}
      <View style={styles.instrWrap}>
        <Parchment style={{ alignSelf: 'center', maxWidth: width - 32 }}>
          <GameText size={17} weight="bold" align="center">
            {stageCfg.instructions}
          </GameText>
        </Parchment>
        <View style={{ marginTop: 8, paddingHorizontal: 24 }}>
          <ProgressBar
            progress={(stage + progress) / level.stages.length}
            height={12}
            color={theme.accent}
          />
        </View>
      </View>

      {/* puzzle */}
      <View style={styles.area} onLayout={onLayout}>
        {Puzzle && !stageIntro ? (
          <Puzzle
            key={`${level.id}-${stage}`}
            params={stageCfg.params}
            seed={level.seed + stage * 101}
            onSolved={onSolved}
            onMistake={onMistake}
            onCorrect={onCorrect}
            hintSignal={hintSignal}
            paused={paused || !!finished}
            onProgress={setProgress}
            width={area.w}
            height={area.h}
          />
        ) : null}
      </View>

      {/* footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
        <IconButton size={58} variant="yellow" onPress={onHintPress} disabled={!canHint} badge={hintsLeft} sound={null}>
          <BulbIcon size={36} />
        </IconButton>
        <View style={styles.charBubble}>
          <CharacterArt id={character} expression={toast ? (toast.good ? 'cheer' : 'think') : 'idle'} size={54} />
        </View>
        <IconButton size={58} variant="orange" onPress={onRestart}>
          <RetryIcon size={30} />
        </IconButton>
      </View>

      {/* toast */}
      {toast && (
        <Animated.View key={toast.id} entering={ZoomIn.springify()} exiting={FadeOut} style={styles.toastWrap} pointerEvents="none">
          <View style={[styles.toast, { backgroundColor: toast.good ? colors.greenDeep : colors.orangeDeep }]}>
            <GameText size={22} color="#fff" weight="black" outline>
              {toast.text}
            </GameText>
          </View>
        </Animated.View>
      )}

      {/* boss stage intro */}
      {stageIntro && (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.overlay}>
          <Animated.View entering={ZoomIn.springify()} style={{ alignItems: 'center', gap: 12 }}>
            <BossArt worldId={level.worldId} size={170} />
            <WoodSign title={`Stage ${stage + 1} of ${level.stages.length}`} size="lg" />
          </Animated.View>
        </Animated.View>
      )}

      {/* pause */}
      {paused && !finished && (
        <Animated.View entering={FadeIn.duration(150)} style={styles.overlay}>
          <Animated.View entering={FadeInDown.springify()}>
            <Panel style={styles.modal}>
              <WoodSign title="Paused" size="lg" style={{ marginTop: -42, marginBottom: 12 }} />
              <GameButton label="Resume" variant="green" size="lg" onPress={() => setPaused(false)} icon={<PlayIcon size={24} />} />
              <GameButton label="Restart" variant="orange" onPress={onRestart} icon={<RetryIcon size={22} />} />
              <GameButton label="Level Map" variant="purple" onPress={onExit} icon={<HomeIcon size={22} />} />
              <View style={styles.toggles}>
                <IconButton size={52} variant={settings.music ? 'blue' : 'grey'} onPress={() => settings.set({ music: !settings.music })}>
                  <MusicIcon size={26} />
                </IconButton>
                <IconButton size={52} variant={settings.sfx ? 'blue' : 'grey'} onPress={() => settings.set({ sfx: !settings.sfx })}>
                  <SoundIcon size={26} />
                </IconButton>
              </View>
            </Panel>
          </Animated.View>
        </Animated.View>
      )}

      {/* lost */}
      {finished === 'lost' && (
        <Animated.View entering={FadeIn} style={styles.overlay}>
          <Animated.View entering={ZoomIn.springify()}>
            <Panel style={styles.modal}>
              <View style={{ alignItems: 'center', marginTop: -70 }}>
                <CharacterArt id={character} expression="sad" size={110} />
              </View>
              <GameText size={28} weight="black" align="center" color={colors.purpleDeep}>
                {lostReason === 'time' ? "Time's up!" : 'Out of hearts!'}
              </GameText>
              <GameText size={17} align="center" color={colors.inkSoft}>
                Every champion practices. Let's try again!
              </GameText>
              <GameButton label="Try Again" variant="green" size="lg" onPress={onRestart} icon={<RetryIcon size={24} />} />
              <GameButton label="Level Map" variant="purple" onPress={onExit} icon={<HomeIcon size={22} />} />
            </Panel>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 14, gap: 8 },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(30,40,80,0.6)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  instrWrap: { marginTop: 10 },
  area: { flex: 1, marginHorizontal: 16, marginVertical: 10, justifyContent: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 20 },
  charBubble: { marginBottom: -6 },
  toastWrap: { position: 'absolute', top: '42%', left: 0, right: 0, alignItems: 'center' },
  toast: { paddingHorizontal: 22, paddingVertical: 10, borderRadius: 24, borderWidth: 3, borderColor: '#fff' },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: 24 },
  modal: { width: 300, gap: 14, paddingTop: 30 },
  toggles: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 4 },
});
