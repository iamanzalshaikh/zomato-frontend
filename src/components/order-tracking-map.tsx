import type { ComponentType } from "react";

import { MapErrorBoundary } from "@/components/map/MapErrorBoundary";
import {
  OrderTrackingMapFallback,
  type OrderTrackingMapProps,
} from "@/components/order-tracking-map-fallback";
import { hasNativeMapsModule } from "@/lib/canUseNativeMaps";

export type { OrderTrackingMapProps };

let NativeOrderMap: ComponentType<OrderTrackingMapProps> | null = null;

if (hasNativeMapsModule()) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    NativeOrderMap =
      require("@/components/order-tracking-map-native").OrderTrackingMapNative;
  } catch {
    NativeOrderMap = null;
  }
}

function hasAnyCoord(props: OrderTrackingMapProps) {
  return [props.customer, props.restaurant, props.rider].some(
    (c) => c && Number.isFinite(c.latitude) && Number.isFinite(c.longitude),
  );
}

export function OrderTrackingMap(props: OrderTrackingMapProps) {
  if (!hasAnyCoord(props) || !NativeOrderMap) {
    return <OrderTrackingMapFallback {...props} />;
  }
  return (
    <MapErrorBoundary height={props.height ?? 280}>
      <NativeOrderMap {...props} />
    </MapErrorBoundary>
  );
}
