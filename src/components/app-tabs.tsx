import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CaseUi } from '@/constants/caseUi';
import { useCart } from '@/hooks/use-cart';
import { getCartItemCount } from '@/lib/cartDisplay';

const TAB_LABEL_FONT = 'PlusJakartaSans_600SemiBold';

export default function AppTabs() {
  const insets = useSafeAreaInsets();
  const { cart } = useCart();
  const cartCount = getCartItemCount(cart);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: CaseUi.orange,
        tabBarInactiveTintColor: CaseUi.muted,
        tabBarStyle: {
          backgroundColor: CaseUi.white,
          borderTopWidth: 1,
          borderTopColor: CaseUi.line,
          height: 58 + Math.max(insets.bottom, 0),
          paddingBottom: Math.max(insets.bottom, 6),
          paddingTop: 6,
          ...CaseUi.softShadow,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: TAB_LABEL_FONT,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'compass' : 'compass-outline'} size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: CaseUi.orange,
            fontSize: 10,
            fontFamily: TAB_LABEL_FONT,
          },
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'cart' : 'cart-outline'} size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen name="favorites" options={{ href: null }} />
    </Tabs>
  );
}
