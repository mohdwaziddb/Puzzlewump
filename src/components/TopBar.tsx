/**
 * Top bar used on menus: coins, total stars, hint tokens and a settings button.
 * Subscribes to the store with narrow selectors so it only re-renders on counter changes.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CounterPill, IconButton } from '@/components/ui';
import { BackIcon, GearIcon } from '@/art/ui';
import { useProgress } from '@/store/progressStore';
import { totalStars } from '@/engine/LevelEngine';

export const TopBar = React.memo(function TopBar({
  onBack,
  showSettings = true,
  showHints = false,
}: {
  /** Show a back button on the left. */
  onBack?: () => void;
  showSettings?: boolean;
  showHints?: boolean;
}) {
  const router = useRouter();
  const coins = useProgress((s) => s.save.coins);
  const hints = useProgress((s) => s.save.hints);
  const stars = useProgress((s) => totalStars(s.save));

  return (
    <View style={styles.row}>
      {onBack ? (
        <IconButton onPress={onBack} variant="blue" size={46}>
          <BackIcon size={24} />
        </IconButton>
      ) : null}
      <View style={styles.pills}>
        <CounterPill kind="coin" value={coins} />
        <CounterPill kind="star" value={stars} />
        {showHints && <CounterPill kind="hint" value={hints} />}
      </View>
      {showSettings ? (
        <IconButton onPress={() => router.push('/settings')} variant="cream" size={46}>
          <GearIcon size={30} />
        </IconButton>
      ) : (
        <View style={{ width: 46 }} />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 6, gap: 6 },
  pills: { flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, paddingLeft: 6 },
});
