import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { connectSocket, getSocketInstance, joinOrderRoom, leaveOrderRoom } from '@/lib/socketClient';
import { SocketEvents, type OrderSocketPayload } from '@/lib/socketEvents';
import { orderDetailKeys } from '@/hooks/queries/orderDetail';

const TRACK_EVENTS = [
  SocketEvents.ORDER_UPDATED,
  SocketEvents.ORDER_CONFIRMED,
  SocketEvents.RIDER_ASSIGNED,
  SocketEvents.RIDER_LOCATION_UPDATE,
  SocketEvents.ORDER_PICKED_UP,
  SocketEvents.ORDER_DELIVERED,
  SocketEvents.ORDER_COMPLETED,
  SocketEvents.ORDER_CANCELLED,
] as const;

function mergeTracking(prev: Record<string, unknown> | undefined, payload: OrderSocketPayload) {
  const riderLocation = payload.riderLocation ?? prev?.riderLocation ?? prev?.liveLocation;
  const riderFromSocket =
    payload.riderName || payload.riderMobile
      ? {
          fullName: payload.riderName ?? (prev?.rider as any)?.fullName,
          mobile: payload.riderMobile ?? (prev?.rider as any)?.mobile,
          riderCode: payload.riderCode ?? (prev?.rider as any)?.riderCode,
        }
      : prev?.rider;

  return {
    ...prev,
    orderId: payload.orderId ?? prev?.orderId,
    orderNumber: payload.orderNumber ?? prev?.orderNumber,
    orderStatus: payload.orderStatus ?? prev?.orderStatus,
    status: payload.orderStatus ?? prev?.status,
    paymentStatus: payload.paymentStatus ?? prev?.paymentStatus,
    riderId: payload.riderId ?? prev?.riderId,
    rider: riderFromSocket,
    riderLocation,
    liveLocation: riderLocation ?? prev?.liveLocation,
    etaMinutes: payload.etaMinutes ?? prev?.etaMinutes,
    estimatedDeliveryTime: payload.estimatedDeliveryTime ?? prev?.estimatedDeliveryTime,
    socketLive: true,
    lastSocketAt: payload.timestamp ?? new Date().toISOString(),
  };
}

export function useOrderSocket(orderId: string | undefined) {
  const qc = useQueryClient();
  const joinedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    let alive = true;

    const handlers = TRACK_EVENTS.map((event) => {
      const handler = (payload: OrderSocketPayload) => {
        const pid = String(payload?.orderId ?? '');
        if (pid && pid !== orderId) return;
        qc.setQueryData(orderDetailKeys.track(orderId), (prev: any) => mergeTracking(prev, payload));
        if (event !== SocketEvents.RIDER_LOCATION_UPDATE) {
          void qc.invalidateQueries({ queryKey: orderDetailKeys.byId(orderId) });
        }
      };
      return { event, handler };
    });

    (async () => {
      try {
        const s = await connectSocket();
        if (!alive) return;
        handlers.forEach(({ event, handler }) => s.on(event, handler));
        await joinOrderRoom(orderId);
        if (alive) joinedRef.current = orderId;
      } catch {
        // REST polling remains fallback on track screen
      }
    })();

    return () => {
      alive = false;
      const sock = getSocketInstance();
      if (sock) {
        handlers.forEach(({ event, handler }) => sock.off(event, handler));
      }
      if (joinedRef.current === orderId) {
        leaveOrderRoom(orderId);
        joinedRef.current = null;
      }
    };
  }, [orderId, qc]);
}
