import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  cancelCaseOrder,
  createCaseReview,
  editCaseOrder,
  fetchCaseOrderById,
  fetchCaseOrderChat,
  fetchCaseOrders,
  fetchCaseQuote,
  fetchCaseReorder,
  placeCaseOrder,
  sendCaseOrderChat,
  uploadCaseBankReceipts,
  uploadCaseBankReceiptImage,
  type CaseQuoteInput,
  type PlaceCaseOrderInput,
} from '@/services/caseOrders';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { usePerfQuery } from '@/lib/perf';
import { orderDetailKeys } from '@/hooks/queries/orderDetail';

const TERMINAL_ORDER_STATUSES = new Set(['DELIVERED', 'CANCELLED']);

export const caseOrderKeys = {
  all: ['caseOrders'] as const,
  list: () => [...caseOrderKeys.all, 'list'] as const,
  detail: (id: string) => [...caseOrderKeys.all, 'detail', id] as const,
  chat: (id: string) => [...caseOrderKeys.all, 'chat', id] as const,
  quote: (payload: unknown) => [...caseOrderKeys.all, 'quote', payload] as const,
};

/**
 * Canonical quote payload shape shared by Cart and Checkout. Both screens
 * must always populate every field (with explicit `false`/`undefined`
 * defaults) so an unchanged cart produces an identical cache key across
 * screens instead of forcing a fresh `/public/quote` round-trip on every
 * cart <-> checkout navigation.
 */
export function buildCaseQuoteInput(params: {
  lines: CaseQuoteInput['lines'];
  deliveryPointId?: string | null;
  couponCode?: string;
  useLoyaltyFreeDelivery?: boolean;
  expressDelivery?: boolean;
  userId?: string;
}): CaseQuoteInput {
  return {
    lines: params.lines,
    deliveryPointId: params.deliveryPointId ?? undefined,
    couponCode: params.couponCode?.trim() || undefined,
    useLoyaltyFreeDelivery: params.useLoyaltyFreeDelivery ?? false,
    expressDelivery: params.expressDelivery ?? false,
    userId: params.userId,
  };
}

export function useCaseOrdersQuery(options?: { enabled?: boolean }) {
  // Keep the same query key as useOrderHistoryQuery (CASE mode) so Home/tabs share one fetch.
  // Data is normalized to include `_id` for classic Order UI compatibility.
  const q = useQuery({
    queryKey: caseOrderKeys.list(),
    queryFn: async () => {
      const orders = await fetchCaseOrders();
      return orders.map((o) => ({ ...o, _id: o._id || o.id }));
    },
    enabled: options?.enabled !== false,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  usePerfQuery('CaseOrders', q.isFetching, q.dataUpdatedAt);
  return q;
}

export function useCaseOrderQuery(orderId: string) {
  const q = useQuery({
    queryKey: caseOrderKeys.detail(orderId),
    queryFn: () => fetchCaseOrderById(orderId),
    enabled: Boolean(orderId),
    staleTime: 30_000,
    refetchInterval: (query) => {
      const status = String(
        (query.state.data as { orderStatus?: string; status?: string } | undefined)?.orderStatus ??
          (query.state.data as { status?: string } | undefined)?.status ??
          '',
      ).toUpperCase();
      if (TERMINAL_ORDER_STATUSES.has(status)) return false;
      return 20_000;
    },
  });
  usePerfQuery(`CaseOrder(${orderId})`, q.isFetching, q.dataUpdatedAt);
  return q;
}

/** Debounced quote so tip/coupon keystrokes don't spam `/public/quote`. */
export function useCaseQuoteQuery(input: CaseQuoteInput | null, enabled = true) {
  const debouncedInput = useDebouncedValue(input, 550);
  const q = useQuery({
    queryKey: caseOrderKeys.quote(debouncedInput),
    queryFn: () => fetchCaseQuote(debouncedInput!),
    enabled: Boolean(enabled && debouncedInput?.lines?.length),
    staleTime: 90_000,
    gcTime: 5 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    placeholderData: (previous) => previous,
  });
  usePerfQuery('CaseQuote', q.isFetching, q.dataUpdatedAt);
  return q;
}

export function usePlaceCaseOrderMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PlaceCaseOrderInput) => placeCaseOrder(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: caseOrderKeys.all });
      void qc.invalidateQueries({ queryKey: ['cart'] });
      void qc.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}

export function useCancelCaseOrderMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason?: string }) =>
      cancelCaseOrder(orderId, reason),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: caseOrderKeys.list() });
      void qc.invalidateQueries({ queryKey: caseOrderKeys.detail(vars.orderId) });
    },
  });
}

export function useEditCaseOrderMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      input,
    }: {
      orderId: string;
      input: Parameters<typeof editCaseOrder>[1];
    }) => editCaseOrder(orderId, input),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: caseOrderKeys.detail(vars.orderId) });
      void qc.invalidateQueries({ queryKey: caseOrderKeys.list() });
    },
  });
}

export function useUploadCaseReceiptsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, receiptUrls }: { orderId: string; receiptUrls: string[] }) =>
      uploadCaseBankReceipts(orderId, receiptUrls),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: caseOrderKeys.detail(vars.orderId) });
    },
  });
}

export function useUploadCaseReceiptImageMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      file,
    }: {
      orderId: string;
      file: {
        imageBase64: string;
        mimeType?: string | null;
        uri?: string | null;
        fileName?: string | null;
      };
    }) => uploadCaseBankReceiptImage(orderId, file),
    onSuccess: (data, vars) => {
      if (__DEV__) console.log('[receipt] mutation success', vars.orderId);
      const updated = (data as any)?.order ?? data;
      if (updated) {
        qc.setQueryData(orderDetailKeys.byId(vars.orderId), (prev: any) => ({
          ...(prev ?? {}),
          ...updated,
          paymentStatus: updated.paymentStatus ?? 'PENDING_VERIFICATION',
          payment: updated.payment ?? prev?.payment,
        }));
      }
      void qc.invalidateQueries({ queryKey: caseOrderKeys.detail(vars.orderId) });
      void qc.invalidateQueries({ queryKey: caseOrderKeys.list() });
      void qc.invalidateQueries({ queryKey: orderDetailKeys.byId(vars.orderId) });
    },
    onError: (err: Error, vars) => {
      if (__DEV__) console.warn('[receipt] mutation error', vars.orderId, err.message);
    },
  });
}

export function useCaseChatQuery(orderId: string) {
  return useQuery({
    queryKey: caseOrderKeys.chat(orderId),
    queryFn: () => fetchCaseOrderChat(orderId),
    enabled: Boolean(orderId),
    staleTime: 8_000,
    refetchInterval: 15_000,
  });
}

export function useSendCaseChatMutation(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (message: string) => sendCaseOrderChat(orderId, message),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: caseOrderKeys.chat(orderId) });
    },
  });
}

export function useCaseReorderMutation() {
  return useMutation({
    mutationFn: (orderId: string) => fetchCaseReorder(orderId),
  });
}

export function useCreateCaseReviewMutation() {
  return useMutation({
    mutationFn: createCaseReview,
  });
}
