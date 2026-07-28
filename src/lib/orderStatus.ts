import { CaseUi } from '@/constants/caseUi';

export type OrderStatusTone = {
  label: string;
  color: string;
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  hint: string;
};

const STEPS = [
  'PENDING_PAYMENT_VERIFICATION',
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'RIDER_ASSIGNED',
  'PICKED_UP',
  'ON_THE_WAY',
  'DELIVERED',
] as const;

/** Human-readable CASE / classic order status for list + detail. */
export function getOrderStatusDisplay(status?: string): OrderStatusTone {
  const s = String(status ?? 'PENDING').toUpperCase();
  switch (s) {
    case 'PENDING_PAYMENT_VERIFICATION':
      return {
        label: 'Awaiting payment',
        color: '#F59E0B',
        icon: 'card-outline',
        hint: 'Transfer payment and upload your receipt',
      };
    case 'PENDING':
      return {
        label: 'Submitted',
        color: '#F59E0B',
        icon: 'hourglass-outline',
        hint: 'Waiting for the store to accept',
      };
    case 'CONFIRMED':
      return {
        label: 'Accepted',
        color: CaseUi.orange,
        icon: 'checkmark-circle',
        hint: 'Store accepted your order',
      };
    case 'PREPARING':
      return {
        label: 'Preparing',
        color: CaseUi.orange,
        icon: 'restaurant-outline',
        hint: 'Your items are being prepared',
      };
    case 'READY_FOR_PICKUP':
      return {
        label: 'Ready for pickup',
        color: CaseUi.orange,
        icon: 'cube-outline',
        hint: 'Waiting for a rider',
      };
    case 'RIDER_ASSIGNED':
      return {
        label: 'Rider assigned',
        color: CaseUi.orange,
        icon: 'bicycle-outline',
        hint: 'Rider is heading to the store',
      };
    case 'PICKED_UP':
    case 'ON_THE_WAY':
      return {
        label: 'On the way',
        color: CaseUi.orange,
        icon: 'bicycle',
        hint: 'Rider is bringing your order to campus',
      };
    case 'DELIVERED':
      return {
        label: 'Delivered',
        color: CaseUi.success,
        icon: 'checkmark-done-circle',
        hint: 'Order completed',
      };
    case 'CANCELLED':
      return {
        label: 'Cancelled',
        color: CaseUi.danger,
        icon: 'close-circle',
        hint: 'This order was cancelled',
      };
    default:
      return {
        label: s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
        color: CaseUi.muted,
        icon: 'information-circle-outline',
        hint: '',
      };
  }
}

export function isActiveOrderStatus(status?: string) {
  const s = String(status ?? '').toUpperCase();
  return s !== 'DELIVERED' && s !== 'CANCELLED';
}

/** Compact timeline steps for campus tracking (no maps). */
export function getCampusProgressSteps(status?: string): {
  key: string;
  label: string;
  done: boolean;
  current: boolean;
}[] {
  const s = String(status ?? 'PENDING').toUpperCase();
  if (s === 'CANCELLED') {
    return [{ key: 'cancelled', label: 'Cancelled', done: true, current: true }];
  }

  const simplified = [
    { key: 'placed', label: 'Placed', match: ['PENDING_PAYMENT_VERIFICATION', 'PENDING', ...STEPS] },
    { key: 'accepted', label: 'Accepted', match: ['CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'RIDER_ASSIGNED', 'PICKED_UP', 'ON_THE_WAY', 'DELIVERED'] },
    { key: 'preparing', label: 'Preparing', match: ['PREPARING', 'READY_FOR_PICKUP', 'RIDER_ASSIGNED', 'PICKED_UP', 'ON_THE_WAY', 'DELIVERED'] },
    { key: 'delivery', label: 'On campus', match: ['RIDER_ASSIGNED', 'PICKED_UP', 'ON_THE_WAY', 'DELIVERED'] },
    { key: 'done', label: 'Delivered', match: ['DELIVERED'] },
  ];

  let currentIdx = 0;
  simplified.forEach((step, i) => {
    if (step.match.includes(s)) currentIdx = i;
  });
  // Payment pending is still "Placed"
  if (s === 'PENDING_PAYMENT_VERIFICATION') currentIdx = 0;

  return simplified.map((step, i) => ({
    key: step.key,
    label: step.label,
    done: i < currentIdx || s === 'DELIVERED',
    current: i === currentIdx && s !== 'DELIVERED',
  }));
}
