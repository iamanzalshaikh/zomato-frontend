import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ThemedView } from "@/components/themed-view";
import { PressableScale } from "@/components/pressable-scale";
import {
  CASE_SHOP_CATEGORIES,
  getCategoryMeta,
  type CaseCategoryId,
} from "@/constants/caseHome";
import { CaseUi as Blinkit } from "@/constants/caseUi";
import { useTabBarHeight } from "@/hooks/use-tab-bar-height";

const SCREEN_WIDTH = Dimensions.get("window").width;
const PAD = 16;
const GAP = 10;
const COL_W = (SCREEN_WIDTH - PAD * 2 - GAP * 3) / 4;

const SUB_TILES: Array<{
  id: CaseCategoryId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  bg: string;
}> = [
  {
    id: "RESTAURANT",
    label: "Campus Grill",
    icon: "flame-outline",
    bg: "#FFE8E0",
  },
  {
    id: "RESTAURANT",
    label: "Hot meals",
    icon: "restaurant-outline",
    bg: "#FFF0E8",
  },
  { id: "RESTAURANT", label: "Snacks", icon: "pizza-outline", bg: "#FFEDE5" },
  { id: "RESTAURANT", label: "Drinks", icon: "cafe-outline", bg: "#FFF4EC" },
  { id: "PHARMACY", label: "Pharmacy", icon: "medkit-outline", bg: "#E8F4FF" },
  { id: "PHARMACY", label: "Vitamins", icon: "fitness-outline", bg: "#EAF6FF" },
  {
    id: "PHARMACY",
    label: "First aid",
    icon: "bandage-outline",
    bg: "#E6F2FF",
  },
  { id: "PHARMACY", label: "Wellness", icon: "leaf-outline", bg: "#EAF8F0" },
  { id: "GROCERY", label: "Fresh Mart", icon: "basket-outline", bg: "#E8F8EE" },
  { id: "GROCERY", label: "Produce", icon: "nutrition-outline", bg: "#ECFAF1" },
  {
    id: "GROCERY",
    label: "Snacks aisle",
    icon: "ice-cream-outline",
    bg: "#F0FBF4",
  },
  { id: "GROCERY", label: "Pantry", icon: "cube-outline", bg: "#EAF7EF" },
  {
    id: "STORE",
    label: "Campus Store",
    icon: "storefront-outline",
    bg: "#F3E8FF",
  },
  { id: "STORE", label: "Stationery", icon: "pencil-outline", bg: "#F5ECFF" },
  { id: "STORE", label: "Tech", icon: "headset-outline", bg: "#F7F0FF" },
  { id: "STORE", label: "Merch", icon: "shirt-outline", bg: "#F2E9FF" },
];

export default function CategoriesScreen() {
  const router = useRouter();
  const tabBarHeight = useTabBarHeight();

  const openCategory = (id: CaseCategoryId) => {
    if (id === "GET_ANYTHING") {
      router.push("/get-anything");
      return;
    }
    router.push({ pathname: "/(tabs)", params: { category: id } });
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <Text style={styles.title}>Categories</Text>
        <Text style={styles.sub}>Shop by campus department</Text>

        <ScrollView
          contentContainerStyle={{ paddingBottom: tabBarHeight + 24 }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.section}>Browse shops</Text>
          <View style={styles.grid}>
            {CASE_SHOP_CATEGORIES.map((id, idx) => {
              const meta = getCategoryMeta(id);
              return (
                <Animated.View key={id} entering={FadeInDown.delay(idx * 30).duration(240)}>
                  <PressableScale onPress={() => openCategory(id)} style={styles.tile}>
                    <View style={[styles.tileInner, { backgroundColor: meta.color }]}>
                      <Ionicons name={meta.icon} size={28} color={Blinkit.ink} />
                    </View>
                    <Text style={styles.tileLabel} numberOfLines={2}>
                      {meta.label}
                    </Text>
                  </PressableScale>
                </Animated.View>
              );
            })}
          </View>

          <Text style={styles.section}>Popular on campus</Text>
          <View style={styles.grid}>
            {SUB_TILES.map((tile, idx) => (
              <Animated.View key={`${tile.label}-${idx}`} entering={FadeInDown.delay(idx * 20).duration(240)}>
                <PressableScale onPress={() => openCategory(tile.id)} style={styles.tile}>
                  <View style={[styles.tileInner, { backgroundColor: tile.bg }]}>
                    <Ionicons name={tile.icon} size={26} color={Blinkit.ink} />
                  </View>
                  <Text style={styles.tileLabel} numberOfLines={2}>
                    {tile.label}
                  </Text>
                </PressableScale>
              </Animated.View>
            ))}
          </View>

          <PressableScale onPress={() => router.push("/get-anything")} style={styles.getAnything}>
            <Ionicons name="sparkles" size={22} color="#FF5A00" />
            <View style={{ flex: 1 }}>
              <Text style={styles.getTitle}>Get Anything</Text>
              <Text style={styles.getSub}>
                Describe what you need — we&apos;ll source it
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Blinkit.muted} />
          </PressableScale>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  safe: { flex: 1, paddingHorizontal: PAD },
  title: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 24,
    color: Blinkit.ink,
    marginTop: 8,
  },
  sub: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 13,
    color: Blinkit.muted,
    marginTop: 4,
    marginBottom: 8,
  },
  section: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 17,
    color: Blinkit.ink,
    marginTop: 20,
    marginBottom: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GAP,
  },
  tile: {
    width: COL_W,
  },
  tileInner: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  tileLabel: {
    marginTop: 6,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 11,
    color: Blinkit.ink,
    textAlign: "center",
    minHeight: 28,
  },
  getAnything: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#FFF4E5",
    borderWidth: 1,
    borderColor: "rgba(255,90,0,0.12)",
  },
  getTitle: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 15,
    color: Blinkit.ink,
  },
  getSub: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12,
    color: Blinkit.muted,
    marginTop: 2,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
});
