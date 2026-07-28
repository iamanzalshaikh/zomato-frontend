import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { connectSocket, getSocketInstance } from '@/lib/socketClient';
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

  useEffect(() => {
    if (!orderId) return;
    let alive = true;

    const handlers = TRACK_EVENTS.map((event) => {
      const handler = (payload: OrderSocketPayload) => {
        const pid = String(payload?.orderId ?? '');
        if (pid && pid !== orderId) return;
        qc.setQueryData(orderDetailKeys.track(orderId), (prev: any) => mergeTracking(prev, payload));
        qc.setQueryData(orderDetailKeys.byId(orderId), (prev: any) =>
          prev
            ? {
                ...mergeTracking(prev, payload),
                payment: prev.payment
                  ? { ...prev.payment, status: payload.paymentStatus ?? prev.payment.status }
                  : prev.payment,
              }
            : prev,
        );
        // No invalidateQueries here: the always-mounted useCustomerSocket
        // (tabs layout) already invalidates orderDetailKeys.byId/caseOrderKeys
        // for this exact orderId on the same events, globally, exactly once.
        // This hook can run on top of it on 3 different order-related screens
        // simultaneously (order detail, tracking, bank-transfer) — invalidating
        // here too turned one server event into a 3-4x duplicate refetch storm.
        // The setQueryData merges above already keep this screen's UI in sync
        // instantly; the real refetch still happens via useCustomerSocket.
      };
      return { event, handler };
    });

    (async () => {
      try {
        const s = await connectSocket();
        if (!alive) return;
        // Deliberately no joinOrderRoom() here: every authenticated customer
        // socket is already auto-joined to `user:{userId}` on connect
        // (socket.handlers.ts), and the backend's broadcastOrderEvent always
        // emits to that room for every order event regardless. Also joining
        // `order:{orderId}` made every event arrive twice — once per room —
        // which is exactly the duplicate order_updated/order_confirmed
        // pattern that was doubling the notification/order-list refetch cost.
        handlers.forEach(({ event, handler }) => s.on(event, handler));
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
    };
  }, [orderId, qc]);
}
