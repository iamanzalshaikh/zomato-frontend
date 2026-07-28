import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { caseOrderKeys } from '@/hooks/queries/caseOrders';
import { orderDetailKeys } from '@/hooks/queries/orderDetail';
import { alertOrderUpdate } from '@/lib/pushNotifications';
import { connectSocket, getSocketInstance } from '@/lib/socketClient';
import { SocketEvents, type OrderSocketPayload } from '@/lib/socketEvents';

const ORDER_EVENTS = [
  SocketEvents.ORDER_CREATED,
  SocketEvents.ORDER_CONFIRMED,
  SocketEvents.ORDER_UPDATED,
  SocketEvents.RIDER_ASSIGNED,
  SocketEvents.ORDER_PICKED_UP,
  SocketEvents.ORDER_DELIVERED,
  SocketEvents.ORDER_CANCELLED,
] as const;

function copyForEvent(event: string, payload: OrderSocketPayload): { title: string; body: string } | null {
  const num = payload.orderNumber ? `#${payload.orderNumber}` : 'your order';
  const pay = String(payload.paymentStatus ?? '').toUpperCase();
  const status = String(payload.orderStatus ?? '').toUpperCase();

  if (pay === 'APPROVED' || (event === SocketEvents.ORDER_CONFIRMED && pay === 'APPROVED')) {
    return {
      title: 'Payment approved',
      body: `${num} payment verified. The store can prepare your order.`,
    };
  }
  if (pay === 'REJECTED' || status === 'CANCELLED') {
    return {
      title: 'Payment update',
      body: `${num} was cancelled or payment was rejected.`,
    };
  }
  if (pay === 'PENDING_VERIFICATION') {
    return {
      title: 'Receipt received',
      body: `${num} receipt is with CASE for verification.`,
    };
  }

  switch (event) {
    case SocketEvents.ORDER_CREATED:
      return {
        title: 'Order placed',
        body: `${num} placed. Waiting for the store to accept.`,
      };
    case SocketEvents.ORDER_CONFIRMED:
      return {
        title: 'Order accepted',
        body: `Store accepted ${num}. Your order is being prepared.`,
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
      return { title: 'Order picked up', body: `${num} is on the way to campus.` };
    case SocketEvents.ORDER_DELIVERED:
      return { title: 'Delivered', body: `${num} was delivered. Enjoy!` };
    case SocketEvents.ORDER_CANCELLED:
      return { title: 'Order cancelled', body: `${num} was cancelled.` };
    case SocketEvents.ORDER_UPDATED:
      return {
        title: 'Order updated',
        body: `${num} status is now ${String(payload.orderStatus ?? 'updated').replace(/_/g, ' ')}.`,
      };
    default:
      return null;
  }
}

function invalidateOrderQueries(qc: ReturnType<typeof useQueryClient>, orderId?: string) {
  // React Query's invalidateQueries matches by key PREFIX by default, so
  // caseOrderKeys.all (['caseOrders']) already covers caseOrderKeys.list()
  // and caseOrderKeys.detail(id); ['orders'] already covers
  // orderDetailKeys.byId(id); ['notifications'] already covers
  // ['notifications','unread-count']. Firing all 8 as separate calls per
  // event didn't invalidate anything extra — it just meant 8 near-simultaneous
  // async calls racing each other over the same handful of actual queries,
  // which is exactly the kind of thing that produces duplicate fetches.
  void qc.invalidateQueries({ queryKey: caseOrderKeys.all });
  void qc.invalidateQueries({ queryKey: ['orders'] });
  void qc.invalidateQueries({ queryKey: ['notifications'] });
  if (orderId) {
    void qc.invalidateQueries({ queryKey: ['order', orderId] });
  }
}

export function useCustomerSocket(enabled = true) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    let alive = true;

    const handlers = ORDER_EVENTS.map((event) => {
      const handler = (payload: OrderSocketPayload) => {
        const orderId = payload.orderId ? String(payload.orderId) : undefined;
        if (__DEV__) {
          console.log('[socket] customer', event, {
            orderId,
            orderStatus: payload.orderStatus,
            paymentStatus: payload.paymentStatus,
          });
        }

        // Optimistic merge so UI drops Upload receipt immediately when paid
        if (orderId) {
          qc.setQueryData(orderDetailKeys.byId(orderId), (prev: any) =>
            prev
              ? {
                  ...prev,
                  orderStatus: payload.orderStatus ?? prev.orderStatus,
                  paymentStatus: payload.paymentStatus ?? prev.paymentStatus,
                  status: payload.orderStatus ?? prev.status,
                  payment: prev.payment
                    ? {
                        ...prev.payment,
                        status: payload.paymentStatus ?? prev.payment.status,
                      }
                    : prev.payment,
                }
              : prev,
          );
          qc.setQueryData(caseOrderKeys.list(), (prev: any) => {
            if (!Array.isArray(prev)) return prev;
            return prev.map((row: any) => {
              const rid = String(row?._id ?? row?.id ?? '');
              if (rid !== orderId) return row;
              return {
                ...row,
                orderStatus: payload.orderStatus ?? row.orderStatus,
                paymentStatus: payload.paymentStatus ?? row.paymentStatus,
                payment: row.payment
                  ? { ...row.payment, status: payload.paymentStatus ?? row.payment.status }
                  : row.payment,
              };
            });
          });
        }

        const copy = copyForEvent(event, payload);
        if (copy) {
          void alertOrderUpdate({
            title: copy.title,
            body: copy.body,
            orderId,
            type:
              event === SocketEvents.ORDER_CREATED
                ? 'customer.order_placed'
                : event === SocketEvents.ORDER_CONFIRMED
                  ? 'customer.order_confirmed'
                  : event === SocketEvents.RIDER_ASSIGNED
                    ? 'customer.rider_assigned'
                    : 'customer.order_update',
          });
        }

        invalidateOrderQueries(qc, orderId);
      };
      return { event, handler };
    });

    (async () => {
      try {
        const s = await connectSocket();
        if (!alive) return;
        // Defensive: guarantee exactly one active listener per event no
        // matter how many times this effect ends up running — clear any
        // prior registration for these exact events first. Without this,
        // any double-invocation of this effect silently stacks listeners,
        // turning one server event into N duplicate query invalidations.
        ORDER_EVENTS.forEach((event) => s.off(event));
        handlers.forEach(({ event, handler }) => s.on(event, handler));
        if (__DEV__) console.log('[socket] customer listeners ready');
      } catch (e) {
        if (__DEV__) console.warn('[socket] customer connect failed', e);
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
