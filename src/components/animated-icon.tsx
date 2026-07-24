import { useEffect, useState } from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';

const SPLASH_MS = 1400;
const DOTS_COLS = 10;
const DOTS_ROWS = 18;

export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <View style={styles.splashRoot} pointerEvents="none">
      <View style={styles.pattern}>
        {Array.from({ length: DOTS_COLS * DOTS_ROWS }).map((_, idx) => (
          <View key={idx} style={styles.patternDot} />
        ))}
      </View>

      <View style={styles.center}>
        <View style={styles.logoCard}>
          <Image
            source={require('@/assets/flowimages/stitch_quickbite_food_delivery_app_user_panel/stitch_quickbite_food_delivery_app_user_panel/quickbite_fork_and_flame_logo/screen.png')}
            style={styles.logoImg}
            resizeMode="contain"
          />
        </View>

        <View style={styles.tagline}>
          <Text style={styles.brandText}>QuickBite</Text>
          <Text style={styles.subText}>Delivered Fresh, Delivered Fast</Text>
        </View>
      </View>

      <View style={styles.dotsRow}>
        <View style={[styles.dot, { opacity: 1 }]} />
        <View style={[styles.dot, { opacity: 0.85 }]} />
        <View style={[styles.dot, { opacity: 0.7 }]} />
      </View>

      <View style={styles.bottomGlow} />
    </View>
  );
}

export function AnimatedIcon() {
  return (
    <View style={styles.iconContainer}>
      <Image style={styles.image} source={require('@/assets/images/expo-logo.png')} />
    </View>
  );
}

const styles = StyleSheet.create({
  splashRoot: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#ff5a00',
    zIndex: 1000,
    overflow: 'hidden',
  },
  pattern: {
    ...StyleSheet.absoluteFill,
    opacity: 0.22,
    paddingTop: 44,
    paddingHorizontal: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
  },
  patternDot: {
    width: 3,
    height: 3,
    borderRadius: 99,
    backgroundColor: '#ffffff',
    opacity: 0.25,
    marginBottom: 26,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoCard: {
    width: 120,
    height: 120,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginBottom: 22,
  },
  logoImg: { width: '100%', height: '100%' },
  tagline: { alignItems: 'center' },
  brandText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 28,
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  subText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    marginTop: 6,
    fontSize: 16,
    color: 'rgba(255,255,255,0.92)',
    maxWidth: 260,
    textAlign: 'center',
    lineHeight: 22,
  },
  dotsRow: {
    position: 'absolute',
    bottom: 56,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: '#ffffff',
  },
  bottomGlow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 128,
    height: 128,
    zIndex: 100,
  },
  image: {
    width: 76,
    height: 71,
  },
});
