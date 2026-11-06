import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter, Redirect } from 'expo-router';
import GameHost from '@/games/GameHost';
import { getLevel, isLevelUnlocked } from '@/engine/LevelEngine';
import { useProgress } from '@/store/progressStore';
import { AudioService } from '@/services/AudioService';

export default function GameScreen() {
  const { levelId } = useLocalSearchParams<{ levelId: string }>();
  const router = useRouter();
  const save = useProgress((s) => s.save);
  const completeLevel = useProgress((s) => s.completeLevel);
  const failLevel = useProgress((s) => s.failLevel);
  const [attempt, setAttempt] = useState(0);
  const level = levelId ? getLevel(levelId) : undefined;

  useEffect(() => {
    if (level) AudioService.playMusic(level.worldId);
  }, [level]);

  if (!level) return <Redirect href="/worlds" />;
  // Locked levels can never be opened, even via deep link.
  if (!isLevelUnlocked(save, level)) return <Redirect href={`/levels/${level.worldId}`} />;

  const exit = () => {
    if (level.id.startsWith('daily-')) router.replace('/home');
    else router.replace(`/levels/${level.worldId}`);
  };

  return (
    <GameHost
      key={`${level.id}-${attempt}`}
      level={level}
      onWin={(stats) => {
        completeLevel(level, stats);
        router.replace('/result');
      }}
      onLose={(stats) => failLevel(stats)}
      onExit={exit}
      onRestart={() => setAttempt((a) => a + 1)}
    />
  );
}
