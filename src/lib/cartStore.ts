import { fetchCart, type Cart } from '@/services/cart';

type Listener = () => void;

let state: { cart: Cart | null; loading: boolean } = { cart: null, loading: false };
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
}

export function getCartSnapshot() {
  return state;
}

export function subscribeCart(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function refreshCart() {
  try {
    state = { ...state, loading: true };
    emit();
    const cart = await fetchCart();
    state = { cart, loading: false };
    emit();
  } catch {
    state = { ...state, loading: false };
    emit();
  }
}

