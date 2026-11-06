/**
 * Common menu screen frame: background (world scene or sky), safe area,
 * optional top bar with back button, wooden title sign, and content area
 * (optionally scrollable so nothing overflows on small phones).
 */
import React from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { WorldScene } from '@/art/worlds';
import { WoodSign } from '@/components/ui';
import { SkyBackground } from '@/components/AnimatedBackground';
import { TopBar } from '@/components/TopBar';
import type { WorldId } from '@/types';

export function goBackOr(router: ReturnType<typeof useRouter>, fallback: '/home' | '/worlds' = '/home') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}

export function ScreenBackground({ worldId }: { worldId?: WorldId }) {
  const { width, height } = useWindowDimensions();
  if (!worldId) return <SkyBackground />;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <WorldScene worldId={worldId} width={width} height={height} />
    </View>
  );
}

export function ScreenScaffold({
  title,
  worldId,
  back = true,
  onBack,
  topBar = true,
  showSettings = true,
  showHints = false,
  scroll = false,
  children,
  footer,
  contentStyle,
  background,
}: {
  title?: string;
  /** Use this world's scene as background. Default: animated sky. */
  worldId?: WorldId;
  back?: boolean;
  onBack?: () => void;
  topBar?: boolean;
  showSettings?: boolean;
  showHints?: boolean;
  scroll?: boolean;
  children: React.ReactNode;
  /** Pinned at the bottom (outside the scroll area). */
  footer?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  /** Replace the default background entirely. */
  background?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const handleBack = onBack ?? (() => goBackOr(router));

  const header = (
    <>
      {topBar && <TopBar onBack={back ? handleBack : undefined} showSettings={showSettings} showHints={showHints} />}
      {title ? <WoodSign title={title} size="lg" style={styles.sign} /> : null}
    </>
  );

  return (
    <View style={styles.root}>
      {background ?? <ScreenBackground worldId={worldId} />}
      <View style={[styles.safe, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
        {header}
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: (footer ? 12 : insets.bottom + 24) }, contentStyle]}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, contentStyle]}>{children}</View>
        )}
        {footer ? <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>{footer}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  sign: { marginTop: 10, marginBottom: 6, paddingHorizontal: 12 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, gap: 14, width: '100%', maxWidth: 560, alignSelf: 'center' },
  footer: { paddingHorizontal: 16, paddingTop: 8, width: '100%', maxWidth: 560, alignSelf: 'center' },
});
