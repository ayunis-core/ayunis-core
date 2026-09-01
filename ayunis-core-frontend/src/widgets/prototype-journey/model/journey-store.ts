import { useSyncExternalStore } from 'react';
import type { EntryVariant } from '@/widgets/prototype-journey/model/journey';

interface JourneyControls {
  stepIndex: number;
  variant: EntryVariant;
}

let controls: JourneyControls = { stepIndex: 0, variant: 'single' };
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setJourneyStep(stepIndex: number): void {
  controls = { ...controls, stepIndex };
  emit();
}

export function setJourneyVariant(variant: EntryVariant): void {
  controls = { ...controls, variant };
  emit();
}

export function useJourneyControls(): JourneyControls {
  return useSyncExternalStore(subscribe, () => controls);
}
