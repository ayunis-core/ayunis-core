import { useSyncExternalStore } from 'react';
import type { OnboardingStepId } from '@/entities/onboarding';

const PENDING_KEY = 'getting-started-pending';
const DEFAULT_ORIGIN = '/getting-started';

export interface PendingStep {
  stepId: OnboardingStepId;
  targetPath: string | null;
  originPath: string;
}

/**
 * Transient, per-tab marker for "the user left the checklist mid-step to go
 * somewhere (e.g. /chat) — offer a way back when they land there". This is
 * client-only UI intent, not server state, so it lives in sessionStorage
 * (survives a reload on the target page) rather than React Query or the user
 * record. Completed steps and the hidden flag are persisted on the server.
 *
 * `subscribe`/`getSnapshot` are arrow fields so they keep a stable identity and
 * bound `this` when handed to `useSyncExternalStore`.
 */
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
