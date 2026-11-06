/**
 * Settings: big toggles (music, sound, vibration), two-step reset, and About.
 */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { MusicIcon, SoundIcon, VibrateIcon } from '@/art/ui';
import { BrainMascot } from '@/art/ui';
import { GameButton, GameText, Panel } from '@/components/ui';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { BigSwitch } from '@/components/MetaWidgets';
import { GameModal, Ribbon } from '@/components/GameModal';
import { useMenuMusic } from '@/components/hooks';
import { useSettings, vibrate } from '@/store/settingsStore';
import { useProgress } from '@/store/progressStore';
import { colors } from '@/constants/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const music = useSettings((s) => s.music);
  const sfx = useSettings((s) => s.sfx);
  const vibration = useSettings((s) => s.vibration);
  const setSettings = useSettings((s) => s.set);
  const resetProgress = useProgress((s) => s.resetProgress);
  const [resetStep, setResetStep] = useState<0 | 1 | 2>(0);
  const [busy, setBusy] = useState(false);
  useMenuMusic();

  const version = Constants.expoConfig?.version ?? '1.0.0';

  const doReset = async () => {
    if (busy) return;
    setBusy(true);
    await resetProgress();
    setResetStep(0);
    setBusy(false);
    if (router.canDismiss()) router.dismissAll();
    router.replace('/');
  };

  return (
    <ScreenScaffold title="Settings" scroll showSettings={false}>
      <Panel style={styles.section}>
        <BigSwitch label="Music" value={music} onChange={(v) => setSettings({ music: v })} icon={<MusicIcon size={26} />} />
        <BigSwitch label="Sound effects" value={sfx} onChange={(v) => setSettings({ sfx: v })} icon={<SoundIcon size={26} />} />
        <BigSwitch
          label="Vibration"
          value={vibration}
          onChange={(v) => {
            setSettings({ vibration: v });
            if (v) vibrate('success');
          }}
          icon={<VibrateIcon size={26} />}
        />
      </Panel>

      <Panel style={styles.section}>
        <GameText size={19} color={colors.ink} weight="black">
          Grown-ups only
        </GameText>
        <GameText size={14} color={colors.inkSoft} weight="medium">
          Start over from the very beginning. All stars, coins, badges and heroes will be erased.
        </GameText>
        <GameButton label="Reset progress" variant="red" size="md" onPress={() => setResetStep(1)} />
      </Panel>

      <Panel style={[styles.section, { alignItems: 'center' }]}>
        <BrainMascot size={64} mood="happy" />
        <GameText size={20} color={colors.ink} weight="black" align="center">
          Brain Quest – The Ultimate Mind Adventure
        </GameText>
        <GameText size={14} color={colors.inkSoft} weight="bold">
          Version {version}
        </GameText>
        <GameText size={15} color={colors.greenDeep} weight="black" align="center">
          100% offline, no ads, no data collection
        </GameText>
        <GameText size={13} color={colors.inkSoft} weight="medium" align="center">
          Everything is saved only on this device. No accounts, no internet, no tracking — just puzzles and fun.
        </GameText>
      </Panel>

      <GameModal visible={resetStep > 0} onClose={() => !busy && setResetStep(0)}>
        {resetStep === 1 ? (
          <>
            <Ribbon title="Reset progress?" color={colors.orange} deep={colors.orangeDeep} size={22} />
            <GameText size={17} color={colors.ink} weight="bold" align="center">
              This will erase all levels, stars, coins, badges and unlocked heroes.
            </GameText>
            <GameButton label="Keep my progress" variant="green" onPress={() => setResetStep(0)} style={{ alignSelf: 'stretch' }} />
            <GameButton label="Continue" variant="grey" size="sm" onPress={() => setResetStep(2)} style={{ alignSelf: 'stretch' }} />
          </>
        ) : (
          <>
            <Ribbon title="Are you really sure?" size={22} />
            <GameText size={17} color={colors.ink} weight="bold" align="center">
              Last check! This cannot be undone.
            </GameText>
            <View style={styles.confirmRow}>
              <GameButton label="Erase all" variant="red" size="md" onPress={doReset} disabled={busy} style={{ flex: 1 }} />
              <GameButton label="Cancel" variant="green" size="md" onPress={() => setResetStep(0)} disabled={busy} style={{ flex: 1 }} />
            </View>
          </>
        )}
      </GameModal>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  confirmRow: { flexDirection: 'row', gap: 12, alignSelf: 'stretch' },
});
