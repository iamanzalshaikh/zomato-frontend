import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { ThemedView } from '@/components/themed-view';
import { useThemeContext } from '@/context/ThemeContext';
import { useCaseBootstrapQuery, useCasePopularNearYouQuery } from '@/hooks/queries/case';
import { CaseUi } from '@/constants/caseUi';

export default function ExploreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useThemeContext();
  const bootstrapQ = useCaseBootstrapQuery();
  const popularQ = useCasePopularNearYouQuery(null, { limit: 20 });

  const categories = bootstrapQ.data?.categories ?? [];
  const banners = (bootstrapQ.data?.banners ?? []).slice(0, 8);
  const popular = popularQ.data?.items ?? [];

  return (
    <ThemedView style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 36 + Math.max(insets.bottom, 8) }]}>
        <Text style={[styles.title, { color: colors.text }]}>Explore</Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>
          Categories, banners, and popular shops from live campus data.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Categories</Text>
        <View style={styles.rowWrap}>
          {categories.map((c) => (
            <PressableScale
              key={c.id}
              style={styles.categoryChip}
              onPress={() =>
                router.push(`/category/${(c.businessType ?? 'RESTAURANT').toLowerCase()}`)
              }
            >
              <Text style={styles.categoryChipText}>{c.label}</Text>
            </PressableScale>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Live Banners</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hRow}>
          {banners.map((b) => (
            <PressableScale key={b.id} style={styles.bannerCard}>
              <Image source={{ uri: b.imageUrl }} style={styles.bannerImg} contentFit="cover" />
              <View style={styles.bannerOverlay}>
                <Text style={styles.bannerTitle} numberOfLines={1}>{b.title}</Text>
                {b.subtitle ? <Text style={styles.bannerSub} numberOfLines={1}>{b.subtitle}</Text> : null}
              </View>
            </PressableScale>
          ))}
        </ScrollView>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Popular Near You</Text>
        <View style={styles.list}>
          {popular.map((s) => (
            <PressableScale
              key={s.id}
              style={styles.shopRow}
              onPress={() => router.push(`/restaurant/${s.id}`)}
            >
              <Image source={{ uri: s.logo || s.bannerImages?.[0] || undefined }} style={styles.shopImg} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.shopName, { color: colors.text }]} numberOfLines={1}>
                  {s.restaurantName}
                </Text>
                <Text style={[styles.shopMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                  {s.businessType} • {Math.round(s.averageDeliveryTime ?? 25)} min
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={CaseUi.orange} />
            </PressableScale>
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingBottom: 36 },
  title: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 24 },
  sub: { marginTop: 4, fontFamily: 'PlusJakartaSans_500Medium', fontSize: 13 },
  sectionTitle: {
    marginTop: 16,
    marginBottom: 10,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 16,
  },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    backgroundColor: CaseUi.orangeSoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  categoryChipText: { fontFamily: 'PlusJakartaSans_700Bold', color: CaseUi.orangeDeep, fontSize: 12 },
  hRow: { gap: 10, paddingRight: 10 },
  bannerCard: { width: 280, height: 140, borderRadius: 14, overflow: 'hidden' },
  bannerImg: { width: '100%', height: '100%' },
  bannerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  bannerTitle: { color: '#fff', fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14 },
  bannerSub: { color: '#fff', fontFamily: 'PlusJakartaSans_500Medium', fontSize: 11, marginTop: 2 },
  list: { gap: 10 },
  shopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: CaseUi.line,
    backgroundColor: '#fff',
  },
  shopImg: { width: 48, height: 48, borderRadius: 12, backgroundColor: CaseUi.field },
  shopName: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13 },
  shopMeta: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 11, marginTop: 2 },
});
