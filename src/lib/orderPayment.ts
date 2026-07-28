export type OrderPaymentInfo = {
  paymentMethod?: string;
  paymentStatus?: string;
  payment?: { status?: string; receiptUrls?: string[] } | null;
};

function effectivePaymentStatus(order: OrderPaymentInfo): string {
  return String(order.paymentStatus ?? order.payment?.status ?? 'PENDING').toUpperCase();
}

export function isOnlinePayment(order: OrderPaymentInfo): boolean {
  return String(order.paymentMethod ?? '').toUpperCase() === 'ONLINE';
}

export function isPaymentCaptured(order: OrderPaymentInfo): boolean {
  const ps = effectivePaymentStatus(order);
  return ps === 'CAPTURED' || ps === 'APPROVED' || ps === 'PAID';
}

export function isPaymentFailed(order: OrderPaymentInfo): boolean {
  return effectivePaymentStatus(order) === 'FAILED' || effectivePaymentStatus(order) === 'REJECTED';
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
  const method = String(order.paymentMethod ?? '').toUpperCase();
  const ps = effectivePaymentStatus(order);
  const hasReceipt =
    Array.isArray(order.payment?.receiptUrls) && order.payment!.receiptUrls!.length > 0;

  if (isPaymentFailed(order) && method !== 'BANK_TRANSFER') {
    return { label: 'Payment failed', tone: 'failed' as const };
  }
  if (needsOnlinePayment(order)) {
    return { label: 'Payment pending', tone: 'pending' as const };
  }
  if (ps === 'CAPTURED' || ps === 'APPROVED' || ps === 'PAID') {
    return { label: 'Paid', tone: 'paid' as const };
  }
  if (method === 'COD') {
    return { label: 'Cash on delivery', tone: 'cod' as const };
  }
  if (method === 'BANK_TRANSFER') {
    if (ps === 'APPROVED' || ps === 'CAPTURED' || ps === 'PAID') {
      return { label: 'Paid', tone: 'paid' as const };
    }
    if (ps === 'REJECTED') {
      return { label: 'Payment rejected', tone: 'failed' as const };
    }
    // Only "verifying" after a receipt exists (or status moved past upload).
    if (hasReceipt || ps === 'PENDING_VERIFICATION') {
      // Legacy: some older orders were created as PENDING_VERIFICATION before upload.
      // Prefer receipt presence when status alone is ambiguous.
      if (!hasReceipt && ps === 'PENDING_VERIFICATION') {
        return { label: 'Receipt pending', tone: 'pending' as const };
      }
      return { label: 'Verifying receipt', tone: 'pending' as const };
    }
    return { label: 'Receipt pending', tone: 'pending' as const };
  }
  return {
    label: ps
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase()),
    tone: 'neutral' as const,
  };
}
