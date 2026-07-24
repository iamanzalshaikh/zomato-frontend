import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';

import { ToastHost } from '@/components/toast-host';
import { SpellingLoader } from '@/components/spelling-loader';
import { queryClient } from '@/lib/queryClient';
import { ThemeProviderCustom, useThemeContext } from '@/context/ThemeContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

function InnerRootLayout() {
  const { colors } = useThemeContext();

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ToastHost />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function RootContent() {
  const { colors } = useThemeContext();
  return <View style={{ flex: 1, backgroundColor: colors.background }} />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  return (
    <ThemeProviderCustom>
      <GestureHandlerRootView style={{ flex: 1 }}>
        {!fontsLoaded ? <RootContent /> : <InnerRootLayout />}
      </GestureHandlerRootView>
    </ThemeProviderCustom>
  );
}
