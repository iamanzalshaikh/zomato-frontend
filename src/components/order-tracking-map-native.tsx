import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

import { TrackingMarker } from '@/components/map/tracking-markers';
import type { OrderTrackingMapProps } from '@/components/order-tracking-map-fallback';

type LatLng = { latitude: number; longitude: number };

function isValidCoord(c?: LatLng | null): c is LatLng {
  return (
    !!c &&
    Number.isFinite(c.latitude) &&
    Number.isFinite(c.longitude) &&
    !(c.latitude === 0 && c.longitude === 0)
  );
}

export function OrderTrackingMapNative({
  customer,
  restaurant,
  rider,
  riderHeading,
  routePath,
  height = 280,
  followRider = false,
  orderStatus,
}: OrderTrackingMapProps) {
  const mapRef = useRef<MapView>(null);
  const [userPanned, setUserPanned] = useState(false);

  const points = useMemo(() => {
    const list: LatLng[] = [];
    if (isValidCoord(restaurant)) list.push(restaurant);
    if (isValidCoord(rider)) list.push(rider);
    if (isValidCoord(customer)) list.push(customer);
    return list;
  }, [customer, restaurant, rider]);

  const region = useMemo(() => {
    if (points.length === 0) {
      return {
        latitude: 19.076,
        longitude: 72.8777,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      };
    }
    const lats = points.map((p) => p.latitude);
    const lngs = points.map((p) => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.015, (maxLat - minLat) * 1.8 + 0.01),
      longitudeDelta: Math.max(0.015, (maxLng - minLng) * 1.8 + 0.01),
    };
  }, [points]);

  const routeCoords = useMemo(() => {
    if (routePath && routePath.length >= 2) return routePath;
    const path: LatLng[] = [];
    if (isValidCoord(restaurant)) path.push(restaurant);
    if (isValidCoord(rider)) path.push(rider);
    if (isValidCoord(customer)) path.push(customer);
    return path;
  }, [routePath, customer, restaurant, rider]);

  const shouldFollowRider =
    followRider &&
    isValidCoord(rider) &&
    ['RIDER_ASSIGNED', 'PICKED_UP', 'ON_THE_WAY'].includes(orderStatus ?? '');

  const fitAll = useCallback(() => {
    if (!mapRef.current || points.length === 0) return;
    mapRef.current.fitToCoordinates(points, {
      edgePadding: { top: 56, right: 48, bottom: 48, left: 48 },
      animated: true,
    });
    setUserPanned(false);
  }, [points]);

  useEffect(() => {
    if (points.length === 0) return;
    if (shouldFollowRider && !userPanned && mapRef.current && isValidCoord(rider)) {
      mapRef.current.animateCamera(
        { center: rider, zoom: 15 },
        { duration: 600 },
      );
      return;
    }
    if (!userPanned) {
      const timer = setTimeout(fitAll, 300);
      return () => clearTimeout(timer);
    }
  }, [points, rider, shouldFollowRider, userPanned, fitAll]);

  const mapProvider = Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined;

  if (points.length === 0) {
    return null;
  }

  return (
    <View style={[styles.wrap, { height }]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        provider={mapProvider}
        showsUserLocation={false}
        showsMyLocationButton={false}
        onPanDrag={() => setUserPanned(true)}
        moveOnMarkerPress={false}
      >
        {isValidCoord(restaurant) ? (
          <TrackingMarker kind="restaurant" coordinate={restaurant} zIndex={2} />
        ) : null}
        {isValidCoord(customer) ? (
          <TrackingMarker kind="customer" coordinate={customer} zIndex={2} />
        ) : null}
        {isValidCoord(rider) ? (
          <TrackingMarker kind="rider" coordinate={rider} zIndex={5} heading={riderHeading} />
        ) : null}
        {routeCoords.length >= 2 ? (
          <Polyline coordinates={routeCoords} strokeColor="#4a148c" strokeWidth={5} />
        ) : null}
      </MapView>

      {isValidCoord(rider) ? (
        <View style={styles.riderChip}>
          <Ionicons name="navigate" size={12} color="#ffffff" />
        </View>
      ) : null}

      <Pressable style={styles.recenterBtn} onPress={fitAll} hitSlop={8}>
        <Ionicons name="locate" size={18} color="#1a1c1c" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', borderRadius: 16, overflow: 'hidden', position: 'relative' },
  map: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  recenterBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  riderChip: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,188,212,0.92)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
  },
  riderChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
    marginRight: 6,
  },
});
