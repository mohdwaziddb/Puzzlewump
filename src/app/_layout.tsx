import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { AppState, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Fredoka_400Regular,
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
} from '@expo-google-fonts/fredoka';
import { useProgress } from '@/store/progressStore';
import { useSettings } from '@/store/settingsStore';
import { AudioService } from '@/services/AudioService';
import { colors } from '@/constants/theme';

void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Fredoka_400Regular, Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold });
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      await Promise.all([useSettings.getState().load(), useProgress.getState().load()]);
      await AudioService.init();
      setDataLoaded(true);
    })();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') AudioService.resumeAll();
      else AudioService.pauseAll();
    });
    return () => sub.remove();
  }, []);

  const ready = fontsLoaded && dataLoaded;
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.sky }} />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade_from_bottom',
            contentStyle: { backgroundColor: colors.sky },
          }}
        >
          <Stack.Screen name="index" options={{ animation: 'fade' }} />
          <Stack.Screen name="home" options={{ animation: 'fade' }} />
          <Stack.Screen name="character-select" options={{ animation: 'fade' }} />
          <Stack.Screen name="game/[levelId]" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="result" options={{ animation: 'fade', gestureEnabled: false }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
