import type { OrderPaymentInfo } from '@/lib/orderPayment';

type BankReceiptOrder = OrderPaymentInfo & {
  orderStatus?: string;
  payment?: { receiptUrls?: string[]; status?: string } | null;
};

function paymentStatusOf(order: BankReceiptOrder) {
  return String(order.paymentStatus ?? order.payment?.status ?? '').toUpperCase();
}

function orderStatusOf(order: BankReceiptOrder) {
  return String(order.orderStatus ?? '').toUpperCase();
}

export function isBankPaymentSettled(order: BankReceiptOrder): boolean {
  const ps = paymentStatusOf(order);
  return ps === 'APPROVED' || ps === 'CAPTURED' || ps === 'PAID';
}

export function hasUploadedBankReceipt(order: BankReceiptOrder): boolean {
  const urls = order.payment?.receiptUrls;
  return Array.isArray(urls) && urls.length > 0;
}

/** True only while customer still needs to upload a receipt. */
export function needsBankReceiptUpload(order: BankReceiptOrder): boolean {
  if (isBankPaymentSettled(order)) return false;
  if (orderStatusOf(order) !== 'PENDING_PAYMENT_VERIFICATION') return false;
  const method = String(order.paymentMethod ?? '').toUpperCase();
  if (method && method !== 'BANK_TRANSFER') return false;
  // Already uploaded — waiting on admin, don't push Upload CTA
  if (hasUploadedBankReceipt(order)) return false;
  return true;
}

/** Waiting for SD admin to verify an uploaded receipt. */
export function isAwaitingBankVerification(order: BankReceiptOrder): boolean {
  if (isBankPaymentSettled(order)) return false;
  return (
    orderStatusOf(order) === 'PENDING_PAYMENT_VERIFICATION' && hasUploadedBankReceipt(order)
  );
}
