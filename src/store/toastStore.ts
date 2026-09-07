import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  variant: ToastVariant;
  message: string;
  /** Set while the toast plays its exit; it leaves the way it arrived. */
  exiting?: boolean;
}

interface ToastStore {
  toasts: Toast[];
  show: (message: string, variant?: ToastVariant) => void;
  dismiss: (id: string) => void;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  show: (message, variant = 'info') => {
    const id = crypto.randomUUID();
    set({ toasts: [...get().toasts, { id, variant, message }] });
    setTimeout(() => get().dismiss(id), 4000);
  },
  dismiss: (id) =>
    set({
      toasts: get().toasts.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
    }),
  remove: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const showToast = (message: string, variant?: ToastVariant) =>
  useToastStore.getState().show(message, variant);
