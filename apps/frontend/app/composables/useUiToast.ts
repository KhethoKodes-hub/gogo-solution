type ToastVariant = 'success' | 'warning' | 'error';

export type UiToastItem = {
  id: number;
  message: string;
  variant: ToastVariant;
  durationMs: number;
};

function createToast(id: number, message: string, variant: ToastVariant, durationMs = 4200): UiToastItem {
  return {
    id,
    message,
    variant,
    durationMs,
  };
}

export function useUiToast() {
  const items = useState<UiToastItem[]>('ui-toast-items', () => []);
  const nextId = useState<number>('ui-toast-next-id', () => 1);

  const push = (message: string, variant: ToastVariant, durationMs?: number) => {
    const toast = createToast(nextId.value++, message, variant, durationMs);
    items.value = [...items.value, toast];
    return toast.id;
  };

  const remove = (id: number) => {
    items.value = items.value.filter((item) => item.id !== id);
  };

  const clear = () => {
    items.value = [];
  };

  const success = (message: string, durationMs?: number) => push(message, 'success', durationMs);
  const warning = (message: string, durationMs?: number) => push(message, 'warning', durationMs);
  const error = (message: string, durationMs?: number) => push(message, 'error', durationMs);

  return {
    items,
    push,
    remove,
    clear,
    success,
    warning,
    error,
  };
}
