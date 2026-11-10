import { useCallback, useMemo, useSyncExternalStore } from 'react';

const PREFIX = 'ayunis.prototype.';
const listeners = new Set<() => void>();

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

export function usePrototypeSetting<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
): [T, (next: T) => void] {
  const stored = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  );
  const value = allowed.find((option) => option === stored) ?? fallback;
  const setValue = useCallback(
    (next: T) => {
      try {
        window.localStorage.setItem(PREFIX + key, next);
      } catch {
        return;
      }
      listeners.forEach((listener) => listener());
    },
    [key],
  );
  return [value, setValue];
}

export const SIDEBAR_VARIANTS = [
  { id: 'current', label: 'Aktuell' },
  { id: 'linear', label: 'Posteingang oben' },
  { id: 'rail', label: 'Symbolleiste' },
  { id: 'feed', label: 'Mini-Feed' },
] as const;

export type SidebarVariant = (typeof SIDEBAR_VARIANTS)[number]['id'];

const SIDEBAR_IDS = SIDEBAR_VARIANTS.map((variant) => variant.id);

export function useSidebarVariant() {
  return usePrototypeSetting<SidebarVariant>(
    'sidebar-variant',
    SIDEBAR_IDS,
    'current',
  );
}

const SAMPLE_IDS = ['on', 'off'] as const;

export function useSampleDataSetting(): [boolean, (next: boolean) => void] {
  const [value, setValue] = usePrototypeSetting(
    'sample-data',
    SAMPLE_IDS,
    'on',
  );
  const setBoolean = useCallback(
    (next: boolean) => setValue(next ? 'on' : 'off'),
    [setValue],
  );
  return [value === 'on', setBoolean];
}

export const HOME_VARIANTS = [
  { id: 'current', label: 'Aktuell' },
  { id: 'plinth', label: 'Sockel' },
  { id: 'plinth-brand', label: 'Sockel lila' },
  { id: 'tab', label: 'Lasche' },
  { id: 'tab-2', label: 'Lasche 2' },
  { id: 'tab-bottom', label: 'Lasche unten' },
  { id: 'list', label: 'Liste' },
] as const;

export type HomeVariant = (typeof HOME_VARIANTS)[number]['id'];

const HOME_IDS = HOME_VARIANTS.map((variant) => variant.id);

export function useHomeVariantSetting() {
  return usePrototypeSetting<HomeVariant>(
    'home-variant',
    HOME_IDS,
    'tab-bottom',
  );
}

export const INBOX_VARIANTS = [
  { id: 'list', label: 'Aktuell' },
  { id: 'split', label: 'Geteilt' },
] as const;

export type InboxVariant = (typeof INBOX_VARIANTS)[number]['id'];

const INBOX_IDS = INBOX_VARIANTS.map((variant) => variant.id);

export function useInboxVariant() {
  return usePrototypeSetting<InboxVariant>('inbox-variant', INBOX_IDS, 'split');
}

export const SAMPLE_CATEGORIES = [
  { id: 'failed', label: 'Fehler' },
  { id: 'results', label: 'Routinen' },
  { id: 'news', label: 'Neuigkeiten' },
  { id: 'tasks', label: 'Aufgaben' },
] as const;

export type SampleCategory = (typeof SAMPLE_CATEGORIES)[number]['id'];

const CATEGORY_KEY = 'sample-categories';
const DEFAULT_CATEGORIES: SampleCategory[] = ['results', 'news', 'tasks'];

function parseCategories(raw: string | null): SampleCategory[] {
  if (raw === null) return DEFAULT_CATEGORIES;
  const allowed = SAMPLE_CATEGORIES.map((category) => category.id as string);
  return parseIds(raw).filter((id): id is SampleCategory =>
    allowed.includes(id),
  );
}

export function useSampleCategories(): [
  Set<SampleCategory>,
  (category: SampleCategory) => void,
] {
  const raw = useSyncExternalStore(
    subscribe,
    () => read(CATEGORY_KEY),
    () => null,
  );
  const categories = useMemo(() => new Set(parseCategories(raw)), [raw]);
  const toggle = useCallback((category: SampleCategory) => {
    const next = new Set(parseCategories(read(CATEGORY_KEY)));
    if (next.has(category)) next.delete(category);
    else next.add(category);
    writeRaw(CATEGORY_KEY, JSON.stringify([...next]));
  }, []);
  return [categories, toggle];
}

export const SAMPLE_STATUSES = [
  { id: 'none', label: 'Ruhig' },
  { id: 'running', label: 'Läuft' },
  { id: 'running-many', label: 'Mehrere laufen' },
  { id: 'detected-routine', label: 'Routine erkannt' },
  { id: 'detected-skill', label: 'Fähigkeit erkannt' },
  { id: 'detected-knowledge', label: 'Wissen erkannt' },
] as const;

export type SampleStatus = (typeof SAMPLE_STATUSES)[number]['id'];

const STATUS_IDS = SAMPLE_STATUSES.map((status) => status.id);

export function useSampleStatus() {
  return usePrototypeSetting<SampleStatus>('sample-status', STATUS_IDS, 'none');
}

const ON_OFF = ['on', 'off'] as const;

export function useSampleHasRoutines(): [boolean, (next: boolean) => void] {
  const [value, setValue] = usePrototypeSetting(
    'sample-has-routines',
    ON_OFF,
    'on',
  );
  const setBoolean = useCallback(
    (next: boolean) => setValue(next ? 'on' : 'off'),
    [setValue],
  );
  return [value === 'on', setBoolean];
}

const ARRIVAL_IDS = Array.from({ length: 21 }, (_, index) => String(index));

export function useSampleArrivals(): [number, () => void, () => void] {
  const [value, setValue] = usePrototypeSetting(
    'sample-arrivals',
    ARRIVAL_IDS,
    '0',
  );
  const count = Number(value);
  const add = useCallback(
    () => setValue(String(Math.min(count + 1, 20))),
    [count, setValue],
  );
  const reset = useCallback(() => setValue('0'), [setValue]);
  return [count, add, reset];
}

const SEEN_KEY = 'seen-ids';

function writeRaw(key: string, value: string) {
  try {
    window.localStorage.setItem(PREFIX + key, value);
  } catch {
    return;
  }
  listeners.forEach((listener) => listener());
}

function parseIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === 'string')
      : [];
  } catch {
    return [];
  }
}

export function useSeenIds(): [
  Set<string>,
  (ids: string[]) => void,
  () => void,
] {
  const raw = useSyncExternalStore(
    subscribe,
    () => read(SEEN_KEY),
    () => null,
  );
  const seen = useMemo(() => new Set(parseIds(raw)), [raw]);
  const markSeen = useCallback((ids: string[]) => {
    const next = new Set([...parseIds(read(SEEN_KEY)), ...ids]);
    writeRaw(SEEN_KEY, JSON.stringify([...next]));
  }, []);
  const reset = useCallback(() => writeRaw(SEEN_KEY, '[]'), []);
  return [seen, markSeen, reset];
}

const READ_KEY = 'read-overrides';

function parseOverrides(raw: string | null): Record<string, boolean> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, boolean] => typeof entry[1] === 'boolean',
      ),
    );
  } catch {
    return {};
  }
}

export function useReadOverrides() {
  const raw = useSyncExternalStore(
    subscribe,
    () => read(READ_KEY),
    () => null,
  );
  const overrides = useMemo(() => parseOverrides(raw), [raw]);
  const setUnread = useCallback((id: string, isUnread: boolean) => {
    const next = { ...parseOverrides(read(READ_KEY)), [id]: isUnread };
    writeRaw(READ_KEY, JSON.stringify(next));
  }, []);
  const resolveUnread = useCallback(
    (id: string, fallback: boolean) => overrides[id] ?? fallback,
    [overrides],
  );
  const resetOverrides = useCallback(() => writeRaw(READ_KEY, '{}'), []);
  return { resolveUnread, setUnread, resetOverrides };
}

let switcherOpen = false;
const switcherListeners = new Set<() => void>();

export function useSwitcherOpen(): [boolean, (next: boolean) => void] {
  const isOpen = useSyncExternalStore(
    (listener) => {
      switcherListeners.add(listener);
      return () => switcherListeners.delete(listener);
    },
    () => switcherOpen,
    () => switcherOpen,
  );
  const setOpen = useCallback((next: boolean) => {
    switcherOpen = next;
    switcherListeners.forEach((listener) => listener());
  }, []);
  return [isOpen, setOpen];
}
