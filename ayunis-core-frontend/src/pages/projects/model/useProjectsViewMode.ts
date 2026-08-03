import { useCallback, useState } from 'react';

export type ProjectsViewMode = 'grid' | 'list';

const PROJECTS_VIEW_MODE_KEY = 'projects_view_mode';

function readViewMode(): ProjectsViewMode {
  if (typeof window === 'undefined') return 'grid';
  return window.localStorage.getItem(PROJECTS_VIEW_MODE_KEY) === 'list'
    ? 'list'
    : 'grid';
}

export function useProjectsViewMode() {
  const [viewMode, setViewMode] = useState<ProjectsViewMode>(() =>
    readViewMode(),
  );

  const setMode = useCallback((next: ProjectsViewMode) => {
    setViewMode(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PROJECTS_VIEW_MODE_KEY, next);
    }
  }, []);

  return [viewMode, setMode] as const;
}
