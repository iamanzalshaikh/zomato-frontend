import { useThemeContext } from '@/context/ThemeContext';

export function useColorScheme() {
  const { activeScheme } = useThemeContext();
  return activeScheme;
}
