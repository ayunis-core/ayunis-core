import {
  getReleaseNotesControllerFindOneQueryKey,
  useReleaseNotesControllerFindOne,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { ReleaseNoteResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export function useReleaseNote(initialData: ReleaseNoteResponseDto) {
  const { data } = useReleaseNotesControllerFindOne(initialData.id, {
    query: {
      queryKey: getReleaseNotesControllerFindOneQueryKey(initialData.id),
      initialData,
    },
  });
  return { releaseNote: data };
}
