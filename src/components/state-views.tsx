import { Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';

import { CaseUi } from '@/constants/caseUi';
import { PressableScale } from '@/components/pressable-scale';

type StateProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'neutral' | 'danger' | 'success';
};

const TONE_COLORS = {
  neutral: { bg: CaseUi.orangeSoft, fg: CaseUi.orange },
  danger: { bg: '#FEE2E2', fg: CaseUi.danger },
  success: { bg: CaseUi.successSoft, fg: CaseUi.success },
} as const;

function StateView({ icon, title, subtitle, actionLabel, onAction, tone = 'neutral' }: StateProps) {
  const colors = TONE_COLORS[tone];
  return (
    <View style={styles.container}>
      <Animated.View entering={ZoomIn.springify().damping(14)} style={[styles.iconWrap, { backgroundColor: colors.bg }]}>
        <Ionicons name={icon} size={40} color={colors.fg} />
      </Animated.View>
      <Animated.Text entering={FadeInDown.delay(80).duration(300)} style={styles.title}>
        {title}
      </Animated.Text>
      {subtitle ? (
        <Animated.Text entering={FadeInDown.delay(140).duration(300)} style={styles.subtitle}>
          {subtitle}
        </Animated.Text>
      ) : null}
      {actionLabel && onAction ? (
        <Animated.View entering={FadeInDown.delay(200).duration(300)}>
          <PressableScale onPress={onAction} style={[styles.actionBtn, { backgroundColor: colors.fg }]}>
            <Text style={styles.actionText}>{actionLabel}</Text>
          </PressableScale>
        </Animated.View>
      ) : null}
    </View>
  );
}

export function EmptyState(props: Omit<StateProps, 'tone'>) {
  return <StateView {...props} tone="neutral" />;
}

export function ErrorState(props: Omit<StateProps, 'tone' | 'icon'> & { icon?: StateProps['icon'] }) {
  return <StateView icon="alert-circle" {...props} tone="danger" />;
}

export function SuccessState(props: Omit<StateProps, 'tone' | 'icon'> & { icon?: StateProps['icon'] }) {
  return <StateView icon="checkmark-circle" {...props} tone="success" />;
}

/** Full-bleed success screen moment (order placed, payment confirmed, etc). */
export function SuccessMoment({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.momentContainer}>
      <Animated.View
        entering={ZoomIn.springify().damping(11).stiffness(120)}
        style={styles.momentIconRing}
      >
        <View style={styles.momentIconCircle}>
          <Ionicons name="checkmark" size={44} color="#FFFFFF" />
        </View>
      </Animated.View>
      <Animated.Text entering={FadeIn.delay(150).duration(350)} style={styles.momentTitle}>
        {title}
      </Animated.Text>
      {subtitle ? (
        <Animated.Text entering={FadeIn.delay(250).duration(350)} style={styles.momentSubtitle}>
          {subtitle}
        </Animated.Text>
      ) : null}
      {children ? (
        <Animated.View entering={FadeInDown.delay(350).duration(350)} style={{ width: '100%' }}>
          {children}
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
    gap: 6,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 17,
    color: CaseUi.ink,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    color: CaseUi.muted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 19,
  },
  actionBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 999,
  },
  actionText: {
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
  },
  momentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 6,
  },
  momentIconRing: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: CaseUi.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  momentIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: CaseUi.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  momentTitle: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 22,
    color: CaseUi.ink,
    textAlign: 'center',
  },
  momentSubtitle: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 14,
    color: CaseUi.muted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 20,
    marginBottom: 8,
  },
});
