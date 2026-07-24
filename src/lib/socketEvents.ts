/** Mirrors clone-backend src/types/socket.events.ts */
export const SocketEvents = {
  ORDER_CREATED: 'order_created',
  ORDER_CONFIRMED: 'order_confirmed',
  RIDER_ASSIGNED: 'rider_assigned',
  RIDER_LOCATION_UPDATE: 'rider_location_update',
  ORDER_PICKED_UP: 'order_picked_up',
  ORDER_DELIVERED: 'order_delivered',
  ORDER_COMPLETED: 'order_completed',
  NEW_ORDER: 'new_order',
  ORDER_CANCELLED: 'order_cancelled',
  ORDER_UPDATED: 'order_updated',
} as const;

export const ClientSocketEvents = {
  JOIN_ORDER: 'join_order',
  LEAVE_ORDER: 'leave_order',
} as const;

export type OrderSocketPayload = {
  orderId?: string;
  orderNumber?: string;
  orderStatus?: string;
  paymentStatus?: string;
  restaurantId?: string;
  customerId?: string;
  riderId?: string;
  riderName?: string;
  riderMobile?: string;
  riderCode?: string;
  riderLocation?: { latitude: number; longitude: number; heading?: number };
  etaMinutes?: number;
  estimatedDeliveryTime?: string;
  timestamp?: string;
  [key: string]: unknown;
};
