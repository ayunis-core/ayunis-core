import { useAcademyQuizControllerGetProgress } from '@/shared/api';

// Per-chapter pass state plus the whole-academy completion date for the
// current user. Drives the passed badges and the completion banner.
export function useAcademyProgress() {
  const { data, isLoading } = useAcademyQuizControllerGetProgress();
  return {
    progress: data,
    isLoading,
  };
}
