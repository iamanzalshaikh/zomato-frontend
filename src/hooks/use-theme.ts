import { useThemeContext } from '@/context/ThemeContext';

export function useTheme() {
  const { colors } = useThemeContext();
  return colors;
}
