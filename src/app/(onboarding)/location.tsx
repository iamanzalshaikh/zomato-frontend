import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ImageBackground,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  Text,
  Platform,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedView } from '@/components/themed-view';
import { addAddress } from '@/services/users';
import { useTheme } from '@/hooks/use-theme';
import { ensureForegroundPermission, getCurrentCoords, reverseGeocode } from '@/lib/location';
import { getAccessToken } from '@/lib/storage';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { profileKeys, useProfileQuery } from '@/hooks/queries/profile';

type SavedAddress = { id: string; label: string; fullAddress: string };

export default function LocationSetupScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const profileQ = useProfileQuery();

  const [busy, setBusy] = useState(false);
  const [fullAddress, setFullAddress] = useState('');
  const [label, setLabel] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locBusy, setLocBusy] = useState(false);
  const [permissionChecked, setPermissionChecked] = useState(true); // true on mount — avoids effect-driven setState
  const [city, setCity] = useState('New Delhi');
  const qc = useQueryClient();
  const addAddressMutation = useMutation({
    mutationFn: addAddress,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: profileKeys.me });
    },
  });

  // Dynamic address list from user profile with fallbacks
  const savedAddresses = useMemo(() => {
    const fromProfile = (profileQ.data?.addresses ?? [])
      .filter((a: any) => a.fullAddress && a.fullAddress.trim().toLowerCase() !== 'current location')
      .map((a: any) => ({
        id: a._id,
        label: a.label || 'Saved',
        fullAddress: a.fullAddress,
      }));
    if (fromProfile.length > 0) return fromProfile;
    return [
      { id: 'recent-1', label: 'Recent', fullAddress: 'Block 4, Vasant Kunj, New Delhi' },
      { id: 'recent-2', label: 'Recent', fullAddress: 'Connaught Place, New Delhi' },
    ];
  }, [profileQ.data?.addresses]);

  // Keep label user-driven only (no effect-driven setState).

  useEffect(() => {
    let alive = true;
    void (async () => {
      const token = await getAccessToken();
      if (!alive) return;
      if (!token) router.replace('/(auth)/login');
    })();
    return () => {
      alive = false;
    };
  }, [router]);

  // permissionChecked is initialized to true — no effect needed

  function formatReverseGeocode(parts: Record<string, unknown>): string {
    const segs = [
      parts.name,
      parts.street,
      parts.district,
      parts.subregion,
      parts.city,
      parts.region,
      parts.postalCode,
      parts.country,
    ]
      .map((s) => (typeof s === 'string' ? s.trim() : ''))
      .filter(Boolean);
    return segs.join(', ');
  }

  async function useCurrentLocation() {
    try {
      setLocBusy(true);
      if (__DEV__) console.log('📍 [LOCATION] requesting permission');
      const status = await ensureForegroundPermission();
      if (status !== 'granted') {
        if (status === 'unavailable') {
          Alert.alert(
            'Location not available',
            "Your current app build doesn't include location native modules. Rebuild the Android app (dev build) and try again."
          );
          return;
        }
        Alert.alert('Permission needed', 'Please allow location access to use current location.');
        return;
      }

      if (__DEV__) console.log('📍 [LOCATION] getting coords');
      const nextCoords = await getCurrentCoords();
      if (!nextCoords) throw new Error('Location unavailable');
      setCoords(nextCoords);

      if (__DEV__) console.log('📍 [LOCATION] reverse geocoding', nextCoords);
      const rev = await reverseGeocode(nextCoords);
      const nice = formatReverseGeocode(rev ?? {});
      setFullAddress(nice || `Lat ${nextCoords.latitude.toFixed(5)}, Lng ${nextCoords.longitude.toFixed(5)}`);
      
      const cityName = (rev as any)?.city || (rev as any)?.subregion || (rev as any)?.district || 'New Delhi';
      setCity(cityName);
      setLabel('Home');
    } catch (e: any) {
      const msg = e?.message ?? 'Failed to get location';
      Alert.alert('Location error', String(msg));
    } finally {
      setLocBusy(false);
    }
  }

  async function onConfirm() {
    try {
      setBusy(true);
      await addAddressMutation.mutateAsync({
        label,
        fullAddress: fullAddress.trim() || 'Current location',
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        isDefault: true,
      });
      router.replace('/(tabs)');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Transparent Header Section */}
      <View style={[styles.header, { top: Math.max(insets.top, Platform.OS === 'ios' ? 8 : 12) }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: theme.backgroundElement }]}
        >
          <Text style={[styles.backText, { color: theme.text }]}>←</Text>
        </Pressable>

        <View style={[styles.locationBadge, { backgroundColor: theme.backgroundElement }]}>
          <Text style={[styles.locationBadgeIcon, { color: theme.primary }]}>📍</Text>
          <Text style={[styles.locationBadgeText, { color: theme.text }]}>{city}</Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      {/* Map Background (Top 45%) */}
      <View style={[styles.mapContainer, { height: height * 0.45 }]}>
        <ImageBackground
          source={require('@/assets/flowimages/stitch_quickbite_food_delivery_app_user_panel/stitch_quickbite_food_delivery_app_user_panel/a_clean_stylized_map_preview_for_a_mobile_app_showing_minimalist_city_streets/screen.png')}
          style={styles.map}
          resizeMode="cover"
        >
          {/* Central Location Pin */}
          <View style={styles.pinWrap}>
            <View style={styles.pinContainer}>
              <View style={[styles.pinCircle, { backgroundColor: theme.primary }]}>
                <View style={styles.pinInnerDot} />
              </View>
              <View style={[styles.pinPointer, { backgroundColor: theme.primary }]} />
              <View style={styles.pinShadow} />
            </View>
          </View>

          {/* Move map to adjust overlay */}
          <View style={styles.mapHint}>
            <Text style={styles.mapHintText}>Move map to adjust</Text>
          </View>
        </ImageBackground>
      </View>

      {/* Bottom Sheet Panel (Bottom 55%) */}
      <ThemedView type="backgroundElement" style={styles.sheet}>
        {/* Handlebar */}
        <View style={styles.handle} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          style={styles.sheetScroll}
        >
          {/* Heading */}
          <View style={styles.heading}>
            <Text style={[styles.title, { color: theme.text }]}>
              Set Your Delivery Location
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              We&apos;ll show restaurants near you
            </Text>
          </View>

          {/* Search Bar */}
          <View style={[styles.searchWrap, { backgroundColor: theme.backgroundSelected }]}>
            <Ionicons name="search" size={18} color={theme.textSecondary} style={styles.searchIcon} />
            <TextInput
              value={fullAddress}
              onChangeText={(t) => {
                setFullAddress(t);
                setCoords(null);
              }}
              placeholder="Search your area..."
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text }]}
              multiline={false}
              numberOfLines={1}
            />
          </View>

          {/* Quick Select Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
            style={styles.chipsScroll}
          >
              <Pressable
                disabled={locBusy || !permissionChecked}
                onPress={useCurrentLocation}
                style={[
                  styles.chip,
                  styles.chipPrimary,
                  { borderColor: theme.primary },
                  (locBusy || !permissionChecked) && { opacity: 0.75 }
                ]}
              >
                <Text style={[styles.chipPrimaryText, { color: theme.primary }]}>
                  {!permissionChecked
                    ? 'Checking permission…'
                    : locBusy
                    ? 'Getting location…'
                    : 'Use Current Location 📍'}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setLabel('Home')}
                style={[
                  styles.chip,
                  { borderColor: 'rgba(127,127,127,0.2)' },
                  label === 'Home' && { backgroundColor: theme.primarySoft, borderColor: theme.primary },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: theme.textSecondary },
                    label === 'Home' && { color: theme.primary, fontFamily: 'PlusJakartaSans_700Bold' },
                  ]}
                >
                  ⌂ Home
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setLabel('Work')}
                style={[
                  styles.chip,
                  { borderColor: 'rgba(127,127,127,0.2)' },
                  label === 'Work' && { backgroundColor: theme.primarySoft, borderColor: theme.primary },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: theme.textSecondary },
                    label === 'Work' && { color: theme.primary, fontFamily: 'PlusJakartaSans_700Bold' },
                  ]}
                >
                  💼 Work
                </Text>
              </Pressable>
          </ScrollView>

          {/* Recent Addresses List */}
          <View style={styles.recents}>
            <Text style={[styles.recentsTitle, { color: theme.textSecondary }]}>
              Recent Searches
            </Text>
            {savedAddresses.map((a: SavedAddress) => (
              <Pressable
                key={a.id}
                onPress={() => {
                  setFullAddress(a.fullAddress);
                  setCoords(null);
                  setLabel(a.label === 'Home' || a.label === 'Work' || a.label === 'Other' ? (a.label as any) : 'Other');
                  const parts = a.fullAddress.split(',');
                  let cityPart = parts[parts.length - 2]?.trim() || parts[parts.length - 1]?.trim() || 'New Delhi';
                  if (cityPart.toLowerCase() === 'current location') {
                    cityPart = 'New Delhi';
                  }
                  setCity(cityPart);
                }}
                style={styles.recentRow}
              >
                <View style={[styles.recentIcon, { backgroundColor: theme.backgroundSelected }]}>
                  <Text style={{ fontSize: 16, color: theme.textSecondary }}>📍</Text>
                </View>
                <View style={[styles.recentBody, { borderBottomColor: 'rgba(127,127,127,0.1)' }]}>
                  <Text style={[styles.recentMain, { color: theme.text }]}>
                    {a.fullAddress.split(',')[0]}
                  </Text>
                  <Text style={[styles.recentSub, { color: theme.textSecondary }]}>
                    {a.fullAddress.split(',').slice(1).join(',').trim() || 'New Delhi'}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Footer / Confirm Location Button */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          <Pressable
            disabled={busy || !fullAddress.trim()}
            onPress={onConfirm}
            style={[
              styles.primaryBtn,
              { backgroundColor: theme.primary },
              (busy || !fullAddress.trim()) && { opacity: 0.6 },
            ]}
          >
            <Text style={styles.primaryBtnText}>
              {busy ? 'Saving…' : 'Confirm Location'}
            </Text>
          </Pressable>
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 50,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backText: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 22,
    marginTop: -2,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    gap: 6,
  },
  locationBadgeIcon: {
    fontSize: 14,
  },
  locationBadgeText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  mapContainer: {
    width: '100%',
  },
  map: {
    flex: 1,
    width: '100%',
  },
  pinWrap: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: [{ translateX: -22 }, { translateY: -46 }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapHint: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  mapHintText: {
    color: '#ff5a00',
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
  },
  sheet: {
    flex: 1,
    marginTop: -32,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -10 },
    elevation: 8,
    overflow: 'hidden',
  },
  sheetScroll: {
    flex: 1,
  },
  handle: {
    alignSelf: 'center',
    width: 48,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.12)',
    marginBottom: 20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  heading: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_500Medium',
    marginTop: 4,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(127,127,127,0.15)',
    borderRadius: 14,
    minHeight: 52,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 10,
    flexShrink: 0,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_500Medium',
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
  },
  chipsScroll: {
    marginBottom: 20,
    flexGrow: 0,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: 20,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: '#ffffff',
    flexShrink: 0,
  },
  chipText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
  },
  chipPrimary: {
    backgroundColor: '#ffffff',
  },
  chipPrimaryText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
  },
  recents: {
    gap: 12,
  },
  recentsTitle: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
    opacity: 0.8,
  },
  recentRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    paddingVertical: 6,
  },
  recentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentBody: {
    flex: 1,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  recentMain: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    lineHeight: 20,
  },
  recentSub: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 14,
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(127,127,127,0.08)',
    backgroundColor: '#ffffff',
  },
  primaryBtn: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ff5a00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '700',
  },
  // Search Icon styling
  searchIconOuter: {
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchIconCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  searchIconLine: {
    width: 1.5,
    height: 5,
    transform: [{ rotate: '-45deg' }, { translateY: 3.5 }, { translateX: -3.5 }],
  },
  // Custom Map Pin styling
  pinContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 2,
  },
  pinInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ffffff',
  },
  pinPointer: {
    width: 8,
    height: 12,
    transform: [{ rotate: '45deg' }, { translateY: -4 }, { translateX: -4 }],
    marginTop: -8,
    zIndex: 1,
  },
  pinShadow: {
    width: 20,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(0,0,0,0.15)',
    marginTop: 6,
    zIndex: 0,
  },
});
