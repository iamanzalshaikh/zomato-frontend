import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Colors } from '@/constants/theme';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ActiveScheme = 'light' | 'dark';

type ThemeContextType = {
  themePreference: ThemePreference;
  activeScheme: ActiveScheme;
  colors: typeof Colors.light | typeof Colors.dark;
  setThemePreference: (pref: ThemePreference) => Promise<void>;
};

const STORAGE_KEY = '@sd_theme_preference';

const ThemeContext = createContext<ThemeContextType>({
  themePreference: 'system',
  activeScheme: 'light',
  colors: Colors.light,
  setThemePreference: async () => {},
});

export function ThemeProviderCustom({ children }: { children: React.ReactNode }) {
  const deviceScheme = useDeviceColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setThemePreferenceState(saved as ThemePreference);
        }
      } catch (err) {
        console.error('Failed to load theme preference', err);
      }
    })();
  }, []);

  const setThemePreference = useCallback(async (pref: ThemePreference) => {
    setThemePreferenceState(pref);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, pref);
    } catch (err) {
      console.error('Failed to save theme preference', err);
    }
  }, []);

  const activeScheme: ActiveScheme =
    themePreference === 'system'
      ? deviceScheme === 'dark'
        ? 'dark'
        : 'light'
      : themePreference;

  const colors = Colors[activeScheme];

  const value = useMemo(
    () => ({
      themePreference,
      activeScheme,
      colors,
      setThemePreference,
    }),
    [themePreference, activeScheme, colors, setThemePreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
  return useContext(ThemeContext);
}
