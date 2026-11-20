import {
  getReleaseNotesControllerFindAllQueryKey,
  useReleaseNotesControllerFindAll,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { ReleaseNoteResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export function useReleaseNotes(initialData: ReleaseNoteResponseDto[]) {
  const { data } = useReleaseNotesControllerFindAll({
    query: {
      queryKey: getReleaseNotesControllerFindAllQueryKey(),
      initialData,
    },
  });
  return { releaseNotes: data };
}
