import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export type OrderTrackingMapProps = {
  customer?: { latitude: number; longitude: number } | null;
  restaurant?: { latitude: number; longitude: number } | null;
  rider?: { latitude: number; longitude: number } | null;
  riderHeading?: number;
  routePath?: Array<{ latitude: number; longitude: number }>;
  height?: number;
  followRider?: boolean;
  orderStatus?: string;
};

function hasAnyCoord(props: OrderTrackingMapProps) {
  return [props.customer, props.restaurant, props.rider].some(
    (c) => c && Number.isFinite(c.latitude) && Number.isFinite(c.longitude),
  );
}

export function OrderTrackingMapFallback({
  customer,
  restaurant,
  rider,
  height = 280,
}: OrderTrackingMapProps) {
  const riderCoord = rider;
  const message = !hasAnyCoord({ customer, restaurant, rider })
    ? 'Map will appear when delivery location is available.'
    : riderCoord
      ? `Rider at ${riderCoord.latitude.toFixed(4)}, ${riderCoord.longitude.toFixed(4)}. Build the app with "npx expo run:android" for the full map.`
      : 'Live map needs a development build (npx expo run:android). Status and socket updates work below.';

  return (
    <View style={[styles.placeholder, { height }]}>
      <ThemedText themeColor="textSecondary" style={styles.placeholderText}>
        {message}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: 'rgba(228,190,177,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  placeholderText: { textAlign: 'center', fontSize: 13, lineHeight: 18 },
});
