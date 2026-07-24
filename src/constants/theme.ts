/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#111111',
    background: '#FFFFFF',
    backgroundElement: '#F7F7F7',
    backgroundSelected: '#EAEAEA',
    textSecondary: '#666666',
    primary: '#FF5A00',
    primarySoft: 'rgba(255, 90, 0, 0.08)',
    primaryDark: '#E04E00',
    cardBg: '#FFFFFF',
    inputBg: '#F6F6F6',
    border: '#ECECEC',
  },
  dark: {
    text: '#FFFFFF',
    background: '#000000',
    backgroundElement: '#121212',
    backgroundSelected: '#222222',
    textSecondary: '#A0A0A0',
    primary: '#FF5A00',
    primarySoft: 'rgba(255, 90, 0, 0.16)',
    primaryDark: '#FF7C33',
    cardBg: '#1C1C1C',
    inputBg: '#2D2D2D',
    border: '#27272A',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
