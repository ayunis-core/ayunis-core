import { useCallback, useState } from 'react';

export type WorkspacesViewMode = 'grid' | 'list';

const VIEW_MODE_KEY = 'workspaces_view_mode';

function readViewMode(): WorkspacesViewMode {
  if (typeof window === 'undefined') return 'grid';
  return window.localStorage.getItem(VIEW_MODE_KEY) === 'list'
    ? 'list'
    : 'grid';
}

export function useWorkspacesViewMode() {
  const [viewMode, setViewModeState] =
    useState<WorkspacesViewMode>(readViewMode);

  const setViewMode = useCallback((next: WorkspacesViewMode) => {
    setViewModeState(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(VIEW_MODE_KEY, next);
    }
  }, []);

  return [viewMode, setViewMode] as const;
}
