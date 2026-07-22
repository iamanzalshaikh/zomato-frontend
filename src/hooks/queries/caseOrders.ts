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
  type CaseQuoteInput,
  type PlaceCaseOrderInput,
} from '@/services/caseOrders';
import { usePerfQuery } from '@/lib/perf';

export const caseOrderKeys = {
  all: ['caseOrders'] as const,
  list: () => [...caseOrderKeys.all, 'list'] as const,
  detail: (id: string) => [...caseOrderKeys.all, 'detail', id] as const,
  chat: (id: string) => [...caseOrderKeys.all, 'chat', id] as const,
  quote: (payload: unknown) => [...caseOrderKeys.all, 'quote', payload] as const,
};

export function useCaseOrdersQuery() {
  const q = useQuery({
    queryKey: caseOrderKeys.list(),
    queryFn: fetchCaseOrders,
    staleTime: 60_000,
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
    refetchInterval: 15_000,
  });
  usePerfQuery(`CaseOrder(${orderId})`, q.isFetching, q.dataUpdatedAt);
  return q;
}

export function useCaseQuoteQuery(input: CaseQuoteInput | null, enabled = true) {
  return useQuery({
    queryKey: caseOrderKeys.quote(input),
    queryFn: () => fetchCaseQuote(input!),
    enabled: Boolean(enabled && input?.lines?.length),
    staleTime: 20_000,
  });
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

export function useCaseChatQuery(orderId: string) {
  return useQuery({
    queryKey: caseOrderKeys.chat(orderId),
    queryFn: () => fetchCaseOrderChat(orderId),
    enabled: Boolean(orderId),
    refetchInterval: 10_000,
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
