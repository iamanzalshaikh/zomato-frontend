import { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ONBOARDING_LOGO, ONBOARDING_SLIDE_IMAGES } from '@/constants/onboardingAssets';
import { PressableScale } from '@/components/pressable-scale';

const BRAND = '#ff5a00';
const BRAND_DARK = '#c94400';
const INK = '#1a120c';

const SLIDES: Array<{
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  image: ImageSourcePropType;
  accent: string;
}> = [
  {
    title: 'Discover nearby food',
    subtitle: 'Explore top restaurants, trending dishes, and cuisines curated for you.',
    icon: 'restaurant',
    image: ONBOARDING_SLIDE_IMAGES[0],
    accent: '#ff8a3d',
  },
  {
    title: 'Track every order live',
    subtitle: 'Watch your meal move from kitchen to doorstep with real-time updates.',
    icon: 'bicycle',
    image: ONBOARDING_SLIDE_IMAGES[1],
    accent: '#ffb347',
  },
  {
    title: 'Fast & secure checkout',
    subtitle: 'Pay with COD or online — smooth, safe, and ready in seconds.',
    icon: 'shield-checkmark',
    image: ONBOARDING_SLIDE_IMAGES[2],
    accent: '#ff6b35',
  },
];

function goToLogin(router: ReturnType<typeof useRouter>) {
  router.replace('/(auth)/login');
}

export default function OnboardingCarouselScreen() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);
  const { width, height } = Dimensions.get('window');

  const isLast = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(i);
  }

  return (
    <View style={styles.root}>
      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        bounces={false}
        style={StyleSheet.absoluteFill}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => `slide-${i}`}
        onMomentumScrollEnd={onScrollEnd}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => (
          <View style={{ width, height }}>
            <ImageBackground source={item.image} style={styles.heroBg} resizeMode="cover">
              <LinearGradient
                colors={['rgba(0,0,0,0.08)', 'rgba(26,18,12,0.25)', INK]}
                locations={[0, 0.55, 1]}
                style={StyleSheet.absoluteFill}
              />
            </ImageBackground>
          </View>
        )}
      />

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topBar}>
          <View style={styles.brandChip}>
            <Image source={ONBOARDING_LOGO} style={styles.logo} resizeMode="contain" />
            <View>
              <Text style={styles.brandName}>QuickBite</Text>
              <Text style={styles.brandSub}>Delivered fresh, delivered fast</Text>
            </View>
          </View>
          {!isLast ? (
            <PressableScale onPress={() => goToLogin(router)} hitSlop={12} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip</Text>
            </PressableScale>
          ) : (
            <View style={{ width: 52 }} />
          )}
        </View>

        <View style={styles.bottomPanel}>
          <Animated.View key={`slide-content-${index}`} entering={FadeIn.duration(280)}>
            <View style={[styles.iconRing, { borderColor: slide.accent }]}>
              <Ionicons name={slide.icon} size={22} color={slide.accent} />
            </View>

            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.subtitle}>{slide.subtitle}</Text>
          </Animated.View>

          <View style={styles.dots}>
            {SLIDES.map((s, i) => (
              <View
                key={s.title}
                style={[
                  styles.dot,
                  i === index ? styles.dotActive : styles.dotIdle,
                  i === index && { backgroundColor: s.accent },
                ]}
              />
            ))}
          </View>

          <PressableScale
            onPress={() => {
              if (isLast) {
                goToLogin(router);
                return;
              }
              listRef.current?.scrollToIndex({ index: index + 1, animated: true });
            }}
            style={styles.cta}
          >
            <LinearGradient
              colors={[BRAND, BRAND_DARK]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaText}>{isLast ? 'Get started' : 'Continue'}</Text>
              <Ionicons name={isLast ? 'arrow-forward' : 'chevron-forward'} size={20} color="#fff" />
            </LinearGradient>
          </PressableScale>

          <Text style={styles.stepHint}>
            {index + 1} of {SLIDES.length}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: INK,
  },
  heroBg: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  brandChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  brandName: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    letterSpacing: -0.3,
  },
  brandSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_500Medium',
    marginTop: 1,
  },
  skipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  skipText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  bottomPanel: {
    paddingHorizontal: 24,
    paddingBottom: 12,
    paddingTop: 22,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: INK,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  iconRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,90,0,0.14)',
    marginBottom: 14,
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_500Medium',
    lineHeight: 22,
    marginTop: 8,
    maxWidth: 340,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    marginBottom: 18,
  },
  dot: {
    height: 8,
    borderRadius: 99,
  },
  dotIdle: {
    width: 8,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  dotActive: {
    width: 28,
  },
  cta: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: BRAND,
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  stepHint: {
    textAlign: 'center',
    marginTop: 14,
    color: 'rgba(255,255,255,0.38)',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    letterSpacing: 0.5,
  },
});
