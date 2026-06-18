import { useSyncExternalStore } from 'react';

const PENDING_KEY = 'getting-started-pending';
const COMPLETED_KEY = 'getting-started-completed';
const HIDDEN_KEY = 'getting-started-hidden';
const DEFAULT_ORIGIN = '/getting-started';

export interface PendingStep {
  stepId: string;
  targetPath: string | null;
  originPath: string;
}

interface Store<T> {
  get: () => T;
  set: (value: T) => void;
  clear: () => void;
  use: () => T;
}

function createStore<T>(
  storage: Storage,
  key: string,
  parse: (raw: string | null) => T,
  serialize: (value: T) => string,
): Store<T> {
  const listeners = new Set<() => void>();
  let snapshot = parse(storage.getItem(key));

  const refresh = () => {
    snapshot = parse(storage.getItem(key));
    listeners.forEach((l) => l());
  };

  const onStorage = (e: StorageEvent) => {
    if (e.key === key) refresh();
  };

  const subscribe = (cb: () => void) => {
    if (listeners.size === 0) window.addEventListener('storage', onStorage);
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
      if (listeners.size === 0)
        window.removeEventListener('storage', onStorage);
    };
  };

  return {
    get: () => snapshot,
    set: (value) => {
      snapshot = value;
      storage.setItem(key, serialize(value));
      listeners.forEach((l) => l());
    },
    clear: () => {
      snapshot = parse(null);
      storage.removeItem(key);
      listeners.forEach((l) => l());
    },
    use: () => useSyncExternalStore(subscribe, () => snapshot),
  };
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const pending = createStore<PendingStep | null>(
  sessionStorage,
  PENDING_KEY,
  (raw) => safeParse<PendingStep | null>(raw, null),
  (v) => JSON.stringify(v),
);

const completed = createStore<Set<string>>(
  localStorage,
  COMPLETED_KEY,
  (raw) => new Set(safeParse<string[]>(raw, [])),
  (v) => JSON.stringify([...v]),
);

const hidden = createStore<boolean>(
  localStorage,
  HIDDEN_KEY,
  (raw) => raw === 'true',
  (v) => String(v),
);

export const setPendingStep = (
  stepId: string,
  targetPath: string,
  originPath: string = DEFAULT_ORIGIN,
) => pending.set({ stepId, targetPath, originPath });
export const clearPendingStep = () => pending.clear();
export const usePendingStep = () => pending.use();

export const saveCompletedSteps = (next: Set<string>) => completed.set(next);
export const useCompletedSteps = () => completed.use();

export const isGettingStartedHidden = () => hidden.get();
export const hideGettingStarted = () => hidden.set(true);
export const showGettingStarted = () => hidden.clear();
export const useGettingStartedHidden = () => hidden.use();
