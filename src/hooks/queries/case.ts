import { useQuery } from '@tanstack/react-query';

import {
  fetchCaseBootstrap,
  fetchCaseDeliveryPoints,
  fetchCaseFaq,
  fetchCaseMerchantMenu,
  fetchCaseMerchants,
  fetchCaseSupport,
  type CaseMerchantsResult,
} from '@/services/case';
import { usePerfQuery } from '@/lib/perf';

export const caseKeys = {
  all: ['case'] as const,
  bootstrap: () => [...caseKeys.all, 'bootstrap'] as const,
  categories: () => [...caseKeys.all, 'categories'] as const,
  deliveryPoints: () => [...caseKeys.all, 'deliveryPoints'] as const,
  menu: (merchantId: string) => [...caseKeys.all, 'menu', merchantId] as const,
  faq: () => [...caseKeys.all, 'faq'] as const,
  support: () => [...caseKeys.all, 'support'] as const,
  merchants: (params: {
    businessType?: string | null;
    search?: string;
    page?: number;
    limit?: number;
  }) => [...caseKeys.all, 'merchants', params] as const,
};

export function useCaseBootstrapQuery() {
  const q = useQuery({
    queryKey: caseKeys.bootstrap(),
    queryFn: fetchCaseBootstrap,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  usePerfQuery('CaseBootstrap', q.isFetching, q.dataUpdatedAt);
  return q;
}

export function useCaseMerchantsQuery(
  businessType: string | null,
  options?: { search?: string; page?: number; limit?: number; enabled?: boolean },
) {
  const limit = options?.limit ?? (businessType ? 40 : 60);
  const q = useQuery<CaseMerchantsResult>({
    queryKey: caseKeys.merchants({
      businessType,
      search: options?.search,
      page: options?.page,
      limit,
    }),
    queryFn: () =>
      fetchCaseMerchants({
        businessType: businessType ?? undefined,
        search: options?.search,
        page: options?.page ?? 1,
        limit,
      }),
    enabled: options?.enabled !== false,
    staleTime: 2 * 60 * 1000,
    gcTime: 8 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
  usePerfQuery(`CaseMerchants(${businessType ?? 'ALL'})`, q.isFetching, q.dataUpdatedAt);
  return q;
}

export function useCaseDeliveryPointsQuery() {
  return useQuery({
    queryKey: caseKeys.deliveryPoints(),
    queryFn: fetchCaseDeliveryPoints,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCaseMerchantMenuQuery(merchantId: string) {
  const q = useQuery({
    queryKey: caseKeys.menu(merchantId),
    queryFn: () => fetchCaseMerchantMenu(merchantId),
    enabled: Boolean(merchantId),
    staleTime: 3 * 60 * 1000,
    gcTime: 12 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
  usePerfQuery(`CaseMenu(${merchantId})`, q.isFetching, q.dataUpdatedAt);
  return q;
}

export function useCaseFaqQuery() {
  return useQuery({
    queryKey: caseKeys.faq(),
    queryFn: fetchCaseFaq,
    staleTime: 10 * 60 * 1000,
  });
}

export function useCaseSupportQuery() {
  return useQuery({
    queryKey: caseKeys.support(),
    queryFn: fetchCaseSupport,
    staleTime: 10 * 60 * 1000,
  });
}
