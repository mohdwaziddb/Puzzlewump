import { create } from 'zustand';
import * as Haptics from 'expo-haptics';
import type { Settings } from '@/types';
import { defaultSettings, loadSettings, writeSettings } from '@/services/StorageService';
import { AudioService } from '@/services/AudioService';

interface SettingsState extends Settings {
  loaded: boolean;
  load: () => Promise<void>;
  set: (patch: Partial<Settings>) => void;
}

export const useSettings = create<SettingsState>((set, get) => ({
  ...defaultSettings(),
  loaded: false,
  load: async () => {
    const s = await loadSettings();
    AudioService.setSfxEnabled(s.sfx);
    AudioService.setMusicEnabled(s.music);
    set({ ...s, loaded: true });
  },
  set: (patch) => {
    set(patch);
    const { music, sfx, vibration } = get();
    if (patch.sfx !== undefined) AudioService.setSfxEnabled(sfx);
    if (patch.music !== undefined) AudioService.setMusicEnabled(music);
    void writeSettings({ music, sfx, vibration });
  },
}));

/** Light tap feedback — only when the player turned vibration on (off by default). */
export function vibrate(kind: 'light' | 'success' | 'error' = 'light') {
  if (!useSettings.getState().vibration) return;
  try {
    if (kind === 'success') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (kind === 'error') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    else void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // haptics unavailable
  }
}
