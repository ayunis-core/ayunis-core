import { useEffect, useState } from 'react';
import {
  COMPLETED_STEPS_STORAGE_KEY,
  HIDDEN_EVENT,
  HIDDEN_STORAGE_KEY,
} from './lib/constants';

const PENDING_STEP_KEY = 'getting-started-pending-step';
const TARGET_PATH_KEY = 'getting-started-target-path';
const ORIGIN_PATH_KEY = 'getting-started-origin-path';
const UPDATE_EVENT = 'getting-started-storage-update';
const COMPLETED_EVENT = 'getting-started-completed-update';

export interface PendingStep {
  stepId: string;
  targetPath: string | null;
  originPath: string;
}

const DEFAULT_ORIGIN = '/getting-started';

function readPendingStep(): PendingStep | null {
  const stepId = sessionStorage.getItem(PENDING_STEP_KEY);
  if (!stepId) return null;
  return {
    stepId,
    targetPath: sessionStorage.getItem(TARGET_PATH_KEY),
    originPath: sessionStorage.getItem(ORIGIN_PATH_KEY) ?? DEFAULT_ORIGIN,
  };
}

export function setPendingStep(
  stepId: string,
  targetPath: string,
  originPath: string = DEFAULT_ORIGIN,
) {
  sessionStorage.setItem(PENDING_STEP_KEY, stepId);
  sessionStorage.setItem(TARGET_PATH_KEY, targetPath);
  sessionStorage.setItem(ORIGIN_PATH_KEY, originPath);
  window.dispatchEvent(new Event(UPDATE_EVENT));
}

export function clearPendingStep() {
  sessionStorage.removeItem(PENDING_STEP_KEY);
  sessionStorage.removeItem(TARGET_PATH_KEY);
  sessionStorage.removeItem(ORIGIN_PATH_KEY);
  window.dispatchEvent(new Event(UPDATE_EVENT));
}

export function usePendingStep(): PendingStep | null {
  const [value, setValue] = useState<PendingStep | null>(readPendingStep);
  useEffect(() => {
    const handler = () => setValue(readPendingStep());
    window.addEventListener(UPDATE_EVENT, handler);
    return () => window.removeEventListener(UPDATE_EVENT, handler);
  }, []);
  return value;
}

function readCompletedSteps(): Set<string> {
  try {
    const stored = localStorage.getItem(COMPLETED_STEPS_STORAGE_KEY);
    if (stored) return new Set(JSON.parse(stored) as string[]);
  } catch {
    // ignore
  }
  return new Set<string>();
}

export function notifyCompletedStepsChanged() {
  window.dispatchEvent(new Event(COMPLETED_EVENT));
}

export function saveCompletedSteps(completed: Set<string>) {
  localStorage.setItem(
    COMPLETED_STEPS_STORAGE_KEY,
    JSON.stringify([...completed]),
  );
  notifyCompletedStepsChanged();
}

export function useCompletedSteps(): Set<string> {
  const [value, setValue] = useState<Set<string>>(readCompletedSteps);
  useEffect(() => {
    const handler = () => setValue(readCompletedSteps());
    window.addEventListener(COMPLETED_EVENT, handler);
    // Also react to changes from other tabs.
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(COMPLETED_EVENT, handler);
      window.removeEventListener('storage', handler);
    };
  }, []);
  return value;
}

export function isGettingStartedHidden(): boolean {
  return localStorage.getItem(HIDDEN_STORAGE_KEY) === 'true';
}

export function hideGettingStarted() {
  localStorage.setItem(HIDDEN_STORAGE_KEY, 'true');
  window.dispatchEvent(new Event(HIDDEN_EVENT));
}

export function showGettingStarted() {
  localStorage.removeItem(HIDDEN_STORAGE_KEY);
  window.dispatchEvent(new Event(HIDDEN_EVENT));
}

export function useGettingStartedHidden(): boolean {
  const [hidden, setHidden] = useState(() => isGettingStartedHidden());
  useEffect(() => {
    const handler = () => setHidden(isGettingStartedHidden());
    window.addEventListener(HIDDEN_EVENT, handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(HIDDEN_EVENT, handler);
      window.removeEventListener('storage', handler);
    };
  }, []);
  return hidden;
}
