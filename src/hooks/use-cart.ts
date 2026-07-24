import { useCartQuery } from '@/hooks/queries/cart';

export function useCart() {
  const q = useCartQuery();
  return { cart: q.data ?? null, loading: q.isLoading || q.isFetching };
}

