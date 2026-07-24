import { apiFetch } from '@/lib/apiFetch';

export type PaymentOrderResponse = {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  keyId: string | null;
  razorpayOrderId: string | null;
  razorpayAmount: number;
  autoConfirmed?: boolean;
  order?: { _id: string; orderStatus?: string };
};

export async function createPaymentOrder(orderId: string): Promise<PaymentOrderResponse> {
  const body = await apiFetch('/payments/create-order', {
    method: 'POST',
    body: JSON.stringify({ orderId }),
  });
  return (body as any)?.data ?? (body as any);
}

export async function verifyPayment(input: {
  orderId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) {
  const body = await apiFetch('/payments/verify', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return (body as any)?.data ?? (body as any);
}

/** Development-only: confirm ONLINE order without Razorpay SDK */
export async function devConfirmPayment(orderId: string) {
  const body = await apiFetch('/payments/dev-confirm', {
    method: 'POST',
    body: JSON.stringify({ orderId }),
  });
  return (body as any)?.data ?? (body as any);
}

export async function completeOnlinePaymentForOrder(
  orderId: string,
  options?: {
    userEmail?: string;
    userPhone?: string;
    restaurantName?: string;
    amount?: number;
  },
): Promise<{ orderId: string; usedDevConfirm: boolean }> {
  const paymentOrder = await createPaymentOrder(orderId);

  if (paymentOrder.autoConfirmed) {
    return { orderId, usedDevConfirm: false };
  }

  const keyId = paymentOrder.keyId;
  const razorpayOrderId = paymentOrder.razorpayOrderId;

  if (!keyId || !razorpayOrderId) {
    if (__DEV__) {
      await devConfirmPayment(orderId);
      return { orderId, usedDevConfirm: true };
    }
    throw new Error('Online payment is not configured. Try Cash on Delivery.');
  }

  const { openRazorpayCheckout, isRazorpayNativeAvailable } = await import(
    '@/lib/razorpayCheckout'
  );

  if (isRazorpayNativeAvailable()) {
    const result = await openRazorpayCheckout({
      keyId,
      razorpayOrderId,
      amountPaise: paymentOrder.razorpayAmount,
      name: 'QuickBite',
      description: options?.restaurantName
        ? `Order from ${options.restaurantName}`
        : 'Food order',
      prefillEmail: options?.userEmail,
      prefillContact: options?.userPhone,
    });

    if (!result) {
      throw new Error('Payment cancelled');
    }

    await verifyPayment({
      orderId,
      razorpay_order_id: result.razorpay_order_id,
      razorpay_payment_id: result.razorpay_payment_id,
      razorpay_signature: result.razorpay_signature,
    });
    return { orderId, usedDevConfirm: false };
  }

  throw new Error('OPEN_RAZORPAY_SCREEN');
}
