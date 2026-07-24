export type OrderPaymentInfo = {
  paymentMethod?: string;
  paymentStatus?: string;
};

export function isOnlinePayment(order: OrderPaymentInfo): boolean {
  return String(order.paymentMethod ?? '').toUpperCase() === 'ONLINE';
}

export function isPaymentCaptured(order: OrderPaymentInfo): boolean {
  return String(order.paymentStatus ?? '').toUpperCase() === 'CAPTURED';
}

export function isPaymentFailed(order: OrderPaymentInfo): boolean {
  return String(order.paymentStatus ?? '').toUpperCase() === 'FAILED';
}

/** Online order not yet paid — show Pay / Retry, hide tracking */
export function needsOnlinePayment(order: OrderPaymentInfo): boolean {
  return isOnlinePayment(order) && !isPaymentCaptured(order);
}

export function canTrackOrder(order: OrderPaymentInfo & { orderStatus?: string }): boolean {
  const status = String(order.orderStatus ?? '').toUpperCase();
  if (status === 'DELIVERED' || status === 'CANCELLED') return false;
  if (needsOnlinePayment(order)) return false;
  return true;
}

export function getPaymentStatusDisplay(order: OrderPaymentInfo) {
  const ps = String(order.paymentStatus ?? 'PENDING').toUpperCase();
  if (isPaymentFailed(order)) {
    return { label: 'Payment failed', tone: 'failed' as const };
  }
  if (needsOnlinePayment(order)) {
    return { label: 'Payment pending', tone: 'pending' as const };
  }
  if (ps === 'CAPTURED') {
    return { label: 'Paid', tone: 'paid' as const };
  }
  if (String(order.paymentMethod ?? '').toUpperCase() === 'COD') {
    return { label: 'Pay on delivery', tone: 'cod' as const };
  }
  return { label: ps.replace(/_/g, ' '), tone: 'neutral' as const };
}
