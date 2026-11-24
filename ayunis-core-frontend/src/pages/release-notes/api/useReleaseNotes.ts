import {
  getReleaseNotesControllerFindAllQueryKey,
  useReleaseNotesControllerFindAll,
} from '@ayunis/api-client/endpoints';
import type { ReleaseNoteResponseDto } from '@ayunis/api-client/schemas';

export function useReleaseNotes(initialData: ReleaseNoteResponseDto[]) {
  const { data } = useReleaseNotesControllerFindAll({
    query: {
      queryKey: getReleaseNotesControllerFindAllQueryKey(),
      initialData,
    },
  });
  return { releaseNotes: data };
}
