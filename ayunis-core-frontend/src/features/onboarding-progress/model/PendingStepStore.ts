import { useSyncExternalStore } from 'react';
import type { OnboardingStepId } from '@/shared/config/onboarding';

const PENDING_KEY = 'getting-started-pending';
const DEFAULT_ORIGIN = '/getting-started';

export interface PendingStep {
  stepId: OnboardingStepId;
  targetPath: string | null;
  originPath: string;
}

class PendingStepStore {
  private readonly listeners = new Set<() => void>();
  private snapshot: PendingStep | null = this.read();

  private read(): PendingStep | null {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as PendingStep;
    } catch {
      return null;
    }
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getSnapshot = (): PendingStep | null => this.snapshot;

  set(
    stepId: OnboardingStepId,
    targetPath: string,
    originPath: string = DEFAULT_ORIGIN,
  ): void {
    this.snapshot = { stepId, targetPath, originPath };
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(this.snapshot));
    this.notify();
  }

  clear(): void {
    this.snapshot = null;
    sessionStorage.removeItem(PENDING_KEY);
    this.notify();
  }
}

const pendingStepStore = new PendingStepStore();

export const setPendingStep = (
  stepId: OnboardingStepId,
  targetPath: string,
  originPath?: string,
): void => pendingStepStore.set(stepId, targetPath, originPath);

export const clearPendingStep = (): void => pendingStepStore.clear();

export function usePendingStep(): PendingStep | null {
  return useSyncExternalStore(
    pendingStepStore.subscribe,
    pendingStepStore.getSnapshot,
  );
}
