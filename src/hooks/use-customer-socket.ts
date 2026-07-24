import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { alertOrderUpdate } from '@/lib/pushNotifications';
import { connectSocket, getSocketInstance } from '@/lib/socketClient';
import { SocketEvents, type OrderSocketPayload } from '@/lib/socketEvents';

const ORDER_EVENTS = [
  SocketEvents.ORDER_CREATED,
  SocketEvents.ORDER_CONFIRMED,
  SocketEvents.RIDER_ASSIGNED,
  SocketEvents.ORDER_PICKED_UP,
  SocketEvents.ORDER_DELIVERED,
  SocketEvents.ORDER_CANCELLED,
] as const;

function copyForEvent(event: string, payload: OrderSocketPayload): { title: string; body: string } | null {
  const num = payload.orderNumber ? `#${payload.orderNumber}` : 'your order';
  switch (event) {
    case SocketEvents.ORDER_CREATED:
      return {
        title: 'Order placed',
        body: `${num} placed. Waiting for the restaurant to accept.`,
      };
    case SocketEvents.ORDER_CONFIRMED:
      return {
        title: 'Order accepted',
        body: `Restaurant accepted ${num}. Your food is being prepared.`,
      };
    case SocketEvents.RIDER_ASSIGNED: {
      const rider = payload.riderName ? `${payload.riderName}` : 'A delivery partner';
      const phone = payload.riderMobile ? ` · ${payload.riderMobile}` : '';
      return {
        title: 'Rider assigned',
        body: `${rider} is assigned to ${num}${phone}.`,
      };
    }
    case SocketEvents.ORDER_PICKED_UP:
      return { title: 'Order picked up', body: `${num} has been picked up and is on the way.` };
    case SocketEvents.ORDER_DELIVERED:
      return { title: 'Delivered', body: `${num} was delivered. Enjoy your meal!` };
    case SocketEvents.ORDER_CANCELLED:
      return { title: 'Order cancelled', body: `${num} was cancelled.` };
    default:
      return null;
  }
}

export function useCustomerSocket(enabled = true) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    let alive = true;

    const handlers = ORDER_EVENTS.map((event) => {
      const handler = (payload: OrderSocketPayload) => {
        const copy = copyForEvent(event, payload);
        if (!copy) return;

        void alertOrderUpdate({
          title: copy.title,
          body: copy.body,
          orderId: payload.orderId,
          type:
            event === SocketEvents.ORDER_CREATED
              ? 'customer.order_placed'
              : event === SocketEvents.ORDER_CONFIRMED
                ? 'customer.order_confirmed'
                : event === SocketEvents.RIDER_ASSIGNED
                  ? 'customer.rider_assigned'
                  : 'customer.order_update',
        });

        void qc.invalidateQueries({ queryKey: ['notifications'] });
        void qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
        if (payload.orderId) {
          void qc.invalidateQueries({ queryKey: ['order', payload.orderId] });
        }
      };
      return { event, handler };
    });

    (async () => {
      try {
        const s = await connectSocket();
        if (!alive) return;
        handlers.forEach(({ event, handler }) => s.on(event, handler));
      } catch {
        // REST + push remain fallback
      }
    })();

    return () => {
      alive = false;
      const sock = getSocketInstance();
      if (sock) {
        handlers.forEach(({ event, handler }) => sock.off(event, handler));
      }
    };
  }, [enabled, qc]);
}
