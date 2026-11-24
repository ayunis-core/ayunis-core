import {
  getReleaseNotesControllerFindOneQueryKey,
  useReleaseNotesControllerFindOne,
} from '@ayunis/api-client/endpoints';
import type { ReleaseNoteResponseDto } from '@ayunis/api-client/schemas';

export function useReleaseNote(initialData: ReleaseNoteResponseDto) {
  const { data } = useReleaseNotesControllerFindOne(initialData.id, {
    query: {
      queryKey: getReleaseNotesControllerFindOneQueryKey(initialData.id),
      initialData,
    },
  });
  return { releaseNote: data };
}
