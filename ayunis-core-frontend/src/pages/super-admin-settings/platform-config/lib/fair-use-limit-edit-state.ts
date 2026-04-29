export const MIN_WINDOW_HOURS = 0.01;

export interface FairUseLimitEditState {
  limit: string;
  windowHours: string;
}

interface CurrentFairUseLimit {
  limit: number;
  windowHours: number;
}

export function isValidLimit(value: string): boolean {
  const parsed = Number(value);
  return Number.isFinite(parsed) && Number.isInteger(parsed) && parsed > 0;
}

export function isValidWindowHours(value: string): boolean {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= MIN_WINDOW_HOURS;
}

export function toEditState(
  current: CurrentFairUseLimit | undefined,
): FairUseLimitEditState {
  return {
    limit: String(current?.limit ?? ''),
    windowHours: String(current?.windowHours ?? ''),
  };
}
