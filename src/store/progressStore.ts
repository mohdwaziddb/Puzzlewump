import { create } from 'zustand';
import type { CharacterId, LevelConfig, LevelResult, SaveData, WorldId } from '@/types';
import { defaultSave, clearAll, loadSave, writeSave } from '@/services/StorageService';
import * as GP from '@/services/GameProgressService';
import { todayKey } from '@/engine/LevelEngine';
import type { PlayStats } from '@/engine/ScoringEngine';

interface ProgressState {
  save: SaveData;
  loaded: boolean;
  /** Result of the last finished level, read by the result screen. */
  lastResult: LevelResult | null;
  load: () => Promise<void>;
  completeLevel: (level: LevelConfig, stats: PlayStats) => LevelResult;
  failLevel: (stats: PlayStats) => void;
  spendHint: () => 'token' | 'coins' | null;
  selectCharacter: (id: CharacterId) => void;
  setOnboarded: () => void;
  setLastWorld: (w: WorldId) => void;
  claimLoginReward: () => { coins: number; hints: number; day: number } | null;
  claimWorldChest: (w: WorldId) => boolean;
  /** Re-check achievements and character unlocks (e.g. after coins change). */
  refreshUnlocks: () => string[];
  resetProgress: () => Promise<void>;
}

export const useProgress = create<ProgressState>((set, get) => {
  /** Commit a new save to state and disk (immediate: rewards must never be lost). */
  const commit = (save: SaveData) => {
    set({ save });
    void writeSave(save);
  };

  return {
    save: defaultSave(),
    loaded: false,
    lastResult: null,

    load: async () => {
      const loaded = await loadSave();
      const save = GP.registerLogin(loaded, todayKey());
      set({ save, loaded: true });
      void writeSave(save);
    },

    completeLevel: (level, stats) => {
      const { save, result } = GP.completeLevel(get().save, level, stats, todayKey());
      commit(save);
      set({ lastResult: result });
      return result;
    },

    failLevel: (stats) => commit(GP.recordFailedAttempt(get().save, stats)),

    spendHint: () => {
      const r = GP.spendHint(get().save);
      if (!r) return null;
      commit(r.save);
      return r.paidWith;
    },

    selectCharacter: (id) => {
      const s = get().save;
      if (!s.unlockedCharacters.includes(id)) return;
      commit({ ...s, selectedCharacter: id });
    },

    setOnboarded: () => commit({ ...get().save, onboarded: true }),

    setLastWorld: (w) => {
      if (get().save.lastWorld !== w) commit({ ...get().save, lastWorld: w });
    },

    claimLoginReward: () => {
      const r = GP.claimLoginReward(get().save, todayKey());
      if (!r) return null;
      commit(r.save);
      return r.reward;
    },

    claimWorldChest: (w) => {
      const s = GP.claimWorldChest(get().save, w);
      if (!s) return false;
      commit(s);
      return true;
    },

    refreshUnlocks: () => {
      const ch = GP.applyCharacterUnlocks(get().save);
      const ach = GP.applyAchievements(ch.save);
      if (ch.unlocked.length || ach.unlocked.length) commit(ach.save);
      return ach.unlocked;
    },

    resetProgress: async () => {
      await clearAll();
      const fresh = GP.registerLogin(defaultSave(), todayKey());
      set({ save: fresh, lastResult: null });
      await writeSave(fresh);
    },
  };
});
