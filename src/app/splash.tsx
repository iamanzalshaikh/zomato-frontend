import React, { useEffect, useState } from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';

import {
  SD_LOGO,
  SD_LOGO_BLACK,
  SD_SPLASH_BG_DARK,
  SD_SPLASH_BG_WHITE,
} from '@/constants/splashAssets';
import { useThemeContext } from '@/context/ThemeContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const FULL_TITLE = 'Scoots Delivery Services';

export default function SplashScreen() {
  const { activeScheme } = useThemeContext();
  const [spelledTitle, setSpelledTitle] = useState('');
  const isDark = activeScheme === 'dark';

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setSpelledTitle(FULL_TITLE.slice(0, i));
      if (i >= FULL_TITLE.length) clearInterval(timer);
    }, 40);
    return () => clearInterval(timer);
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
      <SafeAreaView style={styles.safe}>
        {/* Top Header & Branding */}
        <Animated.View entering={FadeInDown.duration(450)} style={styles.topHeader}>
          {/* SD Services Main Logo */}
          <Animated.View entering={ZoomIn.delay(80).duration(400)} style={styles.logoWrap}>
            <Image
              source={isDark ? SD_LOGO : SD_LOGO_BLACK}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Glowing Horizontal Streak Line */}
          <Animated.View entering={FadeIn.delay(120).duration(400)} style={styles.glowStreak} />

          {/* Animated Spelling Text */}
          <Animated.View entering={FadeInDown.delay(180).duration(400)} style={styles.textWrap}>
            <Text style={[styles.brandTitle, { color: isDark ? '#FFFFFF' : '#111111' }]}>
              {spelledTitle}<Text style={styles.cursor}>|</Text>
            </Text>
            <Text style={[styles.tagline, { color: isDark ? '#A0A0A0' : '#666666' }]}>
              Anything, Anytime, Delivered with{' '}
              <Text style={[styles.careHighlight, { color: isDark ? '#FFFFFF' : '#FF5A00' }]}>
                Care
              </Text>
            </Text>
          </Animated.View>
        </Animated.View>
      </SafeAreaView>

      {/* Bottom Graphic touching bottom and corners of screen */}
      <Animated.View entering={FadeIn.delay(280).duration(500)} style={styles.bottomGraphicWrap}>
        <Image
          source={isDark ? SD_SPLASH_BG_DARK : SD_SPLASH_BG_WHITE}
          style={styles.bottomGraphicImage}
          resizeMode="cover"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safe: {
    flex: 1,
    alignItems: 'center',
    zIndex: 10,
  },
  topHeader: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: SCREEN_H * 0.08,
  },
  logoWrap: {
    width: 140,
    height: 140,
    marginBottom: 10,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  glowStreak: {
    width: 180,
    height: 3,
    backgroundColor: '#FF5A00',
    borderRadius: 2,
    shadowColor: '#FF5A00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 14,
    elevation: 8,
    marginBottom: 20,
  },
  textWrap: {
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 23,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  cursor: {
    color: '#FF5A00',
    opacity: 0.9,
  },
  tagline: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_500Medium',
    textAlign: 'center',
    lineHeight: 20,
  },
  careHighlight: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  bottomGraphicWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: SCREEN_W,
    height: SCREEN_H * 0.46,
    overflow: 'hidden',
  },
  bottomGraphicImage: {
    width: '100%',
    height: '100%',
  },
});
