type IdleCallbackHandle = {
  cancel: () => void;
};

type IdleRequest = (
  callback: () => void,
  options?: { timeout?: number },
) => number;

type IdleCancel = (id: number) => void;

type IdleGlobal = typeof globalThis & {
  requestIdleCallback?: IdleRequest;
  cancelIdleCallback?: IdleCancel;
};

export function scheduleIdleTask(
  callback: () => void,
  delayMs = 120,
): IdleCallbackHandle {
  const idleGlobal = globalThis as IdleGlobal;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let idleId: number | null = null;
  let cancelled = false;

  timeoutId = setTimeout(() => {
    if (cancelled) return;

    if (typeof idleGlobal.requestIdleCallback === 'function') {
      idleId = idleGlobal.requestIdleCallback(() => {
        if (!cancelled) callback();
      }, { timeout: 300 });
      return;
    }

    callback();
  }, delayMs);

  return {
    cancel: () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (idleId != null && typeof idleGlobal.cancelIdleCallback === 'function') {
        idleGlobal.cancelIdleCallback(idleId);
      }
    },
  };
}
