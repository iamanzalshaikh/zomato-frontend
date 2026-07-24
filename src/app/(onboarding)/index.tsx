import { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ONBOARDING_GRAPHICS } from '@/constants/onboardingAssets';
import { PressableScale } from '@/components/pressable-scale';
import { CaseUi } from '@/constants/caseUi';
import { useThemeContext } from '@/context/ThemeContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const SLIDES = [
  {
    id: 'stores',
    titlePrefix: 'Your Favorite Stores, ',
    titleHighlight: 'Delivered',
    subtitle: 'Order from your favorite restaurants, groceries, pharmacies and more.',
    graphic: ONBOARDING_GRAPHICS[0],
    ctaLabel: 'Next',
  },
  {
    id: 'speed',
    titlePrefix: 'Lightning Fast ',
    titleHighlight: 'Delivery',
    subtitle: 'We deliver in minutes with real-time tracking every step of the way.',
    graphic: ONBOARDING_GRAPHICS[1],
    ctaLabel: 'Next',
  },
  {
    id: 'security',
    titlePrefix: 'Safe, Secure ',
    titleHighlight: '& Reliable',
    subtitle: 'Secure payments, verified partners and 24/7 support for you.',
    graphic: ONBOARDING_GRAPHICS[2],
    ctaLabel: 'Get Started',
  },
];

function goToLogin(router: ReturnType<typeof useRouter>) {
  router.replace('/(auth)/login');
}

export default function OnboardingCarouselScreen() {
  const router = useRouter();
  const { colors, activeScheme } = useThemeContext();
  const isDark = activeScheme === 'dark';
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const isLast = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (i >= 0 && i < SLIDES.length) {
      setIndex(i);
    }
  }

  function handleNext() {
    if (isLast) {
      goToLogin(router);
    } else {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe}>
        {/* Top bar with Skip button */}
        <View style={styles.topBar}>
          <View style={{ flex: 1 }} />
          {!isLast ? (
            <PressableScale onPress={() => goToLogin(router)} hitSlop={12} style={styles.skipBtn}>
              <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip</Text>
            </PressableScale>
          ) : (
            <View style={{ height: 32 }} />
          )}
        </View>

        {/* Dynamic header text */}
        <Animated.View key={`slide-head-${index}`} entering={FadeInDown.duration(280)} style={styles.headerBlock}>
          <Text style={[styles.title, { color: colors.text }]}>
            {slide.titlePrefix}
            <Text style={styles.titleHighlight}>{slide.titleHighlight}</Text>
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{slide.subtitle}</Text>
        </Animated.View>

        {/* Central 3D graphic carousel */}
        <View style={styles.carouselWrap}>
          <FlatList
            ref={listRef}
            data={SLIDES}
            horizontal
            pagingEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            onMomentumScrollEnd={onScrollEnd}
            getItemLayout={(_, i) => ({ length: SCREEN_W, offset: SCREEN_W * i, index: i })}
            renderItem={({ item }) => (
              <View style={styles.slideGraphicItem}>
                <Image
                  source={item.graphic}
                  style={styles.graphicImage}
                  resizeMode="contain"
                />
              </View>
            )}
          />
        </View>

        {/* Bottom controls: Pagination dots & CTA button */}
        <View style={styles.bottomBar}>
          <View style={styles.dotsRow}>
            {SLIDES.map((_, i) => (
              <View
                key={`dot-${i}`}
                style={[
                  styles.dot,
                  i === index ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>

          <PressableScale onPress={handleNext} style={styles.ctaButton}>
            <Text style={styles.ctaText}>{slide.ctaLabel}</Text>
          </PressableScale>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  safe: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  skipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  skipText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: '#8C827A',
  },
  headerBlock: {
    paddingHorizontal: 28,
    marginTop: 8,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: CaseUi.ink,
    textAlign: 'center',
    letterSpacing: -0.4,
    lineHeight: 34,
  },
  titleHighlight: {
    color: CaseUi.orange,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: '#7A726A',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 10,
    maxWidth: 320,
  },
  carouselWrap: {
    flex: 1,
    justifyContent: 'center',
    marginVertical: 10,
  },
  slideGraphicItem: {
    width: SCREEN_W,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  graphicImage: {
    width: SCREEN_W * 0.85,
    height: SCREEN_H * 0.38,
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: CaseUi.orange,
  },
  dotInactive: {
    width: 8,
    backgroundColor: '#E6E0D8',
  },
  ctaButton: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    backgroundColor: CaseUi.orange,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: CaseUi.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#FFFFFF',
  },
});
