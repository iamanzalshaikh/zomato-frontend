import React, { useEffect, useState } from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';

import {
  SD_LOGO,
  SD_LOGO_BLACK,
  SD_SPLASH_BG_DARK,
  SD_SPLASH_BG_WHITE,
} from '@/constants/splashAssets';
import { useThemeContext } from '@/context/ThemeContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const FULL_TEXT = 'Scoots Delivery Services';

export function SpellingLoader() {
  const { activeScheme } = useThemeContext();
  const [displayedText, setDisplayedText] = useState('');
  const isDark = activeScheme === 'dark';

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      index++;
      setDisplayedText(FULL_TEXT.slice(0, index));
      if (index >= FULL_TEXT.length) {
        clearInterval(interval);
      }
    }, 45);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
      <View style={styles.topHeader}>
        {/* SD Services Main Logo */}
        <Animated.View entering={ZoomIn.duration(450)} style={styles.logoWrap}>
          <Image
            source={isDark ? SD_LOGO : SD_LOGO_BLACK}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Glowing Orange Streak Line */}
        <Animated.View entering={FadeIn.delay(120).duration(400)} style={styles.glowStreak} />

        {/* Animated Spelling Text */}
        <Animated.View entering={FadeInDown.delay(180).duration(400)} style={styles.textWrap}>
          <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#111111' }]}>
            {displayedText}<Text style={styles.cursor}>|</Text>
          </Text>
          <Text style={[styles.tagline, { color: isDark ? '#A0A0A0' : '#666666' }]}>
            Delivered with Care
          </Text>
        </Animated.View>
      </View>

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
  container: {
    flex: 1,
    alignItems: 'center',
  },
  topHeader: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: SCREEN_H * 0.14,
    zIndex: 10,
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
  title: {
    fontSize: 22,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  cursor: {
    color: '#FF5A00',
    opacity: 0.9,
  },
  tagline: {
    marginTop: 8,
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_500Medium',
    letterSpacing: 0.5,
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
