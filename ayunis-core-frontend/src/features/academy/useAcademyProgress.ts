import { useAcademyProgressControllerGetProgress } from '@/shared/api';

/**
 * Per-chapter confirmation state plus the whole-academy completion date for the
 * current user. Drives the confirmation badges and completion banner.
 *
 * `GET /academy/progress` is add-on gated, so callers that render outside the
 * academy itself must pass `enabled: false` while the add-on is inactive —
 * otherwise the request 403s on every mount.
 */
export function useAcademyProgress(enabled = true) {
  const { data, isLoading } = useAcademyProgressControllerGetProgress({
    query: { enabled },
  });
  return {
    progress: data,
    isLoading,
  };
}
