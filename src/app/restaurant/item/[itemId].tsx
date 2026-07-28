import { Redirect, useLocalSearchParams } from 'expo-router';

/** Legacy route — redirect to the CASE product detail screen. */
export default function MenuItemDetailsScreen() {
  const { itemId, restaurantId } = useLocalSearchParams<{
    itemId?: string;
    restaurantId?: string;
  }>();

  if (itemId && restaurantId) {
    return (
      <Redirect
        href={{
          pathname: '/product-detail',
          params: { itemId: String(itemId), restaurantId: String(restaurantId) },
        }}
      />
    );
  }

  return <Redirect href="/(tabs)" />;
}
