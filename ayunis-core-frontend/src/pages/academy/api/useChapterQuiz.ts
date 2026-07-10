import { useAcademyQuizControllerGetChapterQuiz } from '@/shared/api';

// Fetches a fresh random draw of quiz questions for a chapter. `staleTime: 0`
// so that retrying re-draws a new set of questions.
export function useChapterQuiz(chapterId: string) {
  const { data, isLoading, isError, refetch, isRefetching } =
    useAcademyQuizControllerGetChapterQuiz(chapterId, {
      query: {
        staleTime: 0,
        gcTime: 0,
        refetchOnWindowFocus: false,
      },
    });

  return {
    questions: data ?? [],
    isLoading,
    isError,
    isRefetching,
    refetch,
  };
}
