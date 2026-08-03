import { useSyncExternalStore } from 'react';

let attachedProjectId: string | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAttachedProjectId(): string | null {
  return useSyncExternalStore(subscribe, () => attachedProjectId);
}

export function setAttachedProject(projectId: string | null) {
  attachedProjectId = projectId;
  listeners.forEach((listener) => listener());
}
