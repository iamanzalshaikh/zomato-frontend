import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export type ToastPayload = {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
};

type ToastState = {
  current: ToastPayload | null;
  show: (input: { type: ToastType; message: string; title?: string; duration?: number }) => void;
  dismiss: () => void;
};

let hideTimer: ReturnType<typeof setTimeout> | null = null;

export const useToastStore = create<ToastState>((set, get) => ({
  current: null,
  show: ({ type, message, title, duration = 2800 }) => {
    if (hideTimer) clearTimeout(hideTimer);
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    set({ current: { id, type, message, title } });
    hideTimer = setTimeout(() => {
      if (get().current?.id === id) set({ current: null });
    }, duration);
  },
  dismiss: () => {
    if (hideTimer) clearTimeout(hideTimer);
    set({ current: null });
  },
}));

export const toast = {
  success: (message: string, title = 'Done') =>
    useToastStore.getState().show({ type: 'success', message, title }),
  error: (message: string, title = 'Oops') =>
    useToastStore.getState().show({ type: 'error', message, title }),
  info: (message: string, title?: string) =>
    useToastStore.getState().show({ type: 'info', message, title }),
  warning: (message: string, title = 'Heads up') =>
    useToastStore.getState().show({ type: 'warning', message, title }),
};
