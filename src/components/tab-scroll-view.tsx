import type { ReactNode } from 'react';
import { ScrollView, type ScrollViewProps, StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTabBarHeight } from '@/hooks/use-tab-bar-height';

type Props = ScrollViewProps & {
  children: ReactNode;
  /** Extra space below content, above tab bar */
  bottomGap?: number;
};

/** ScrollView with bottom padding that clears the fixed tab bar on all devices */
export function TabScrollView({
  children,
  bottomGap = Spacing.four,
  contentContainerStyle,
  showsVerticalScrollIndicator = false,
  ...rest
}: Props) {
  const tabBarHeight = useTabBarHeight();

  return (
    <ScrollView
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: tabBarHeight + bottomGap },
        contentContainerStyle,
      ]}
      {...rest}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
});
