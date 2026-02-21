import {
  useSkillsControllerAddFileSource,
  useSkillsControllerGetSkillSources,
  useSkillsControllerRemoveSource,
} from '@/shared/api/generated/ayunisCoreAPI';
import { createEntitySourcesHook } from '@/widgets/knowledge-base-card';

const useSkillSources = createEntitySourcesHook(
  {
    useGetEntitySources: useSkillsControllerGetSkillSources,
    useAddFileSource: useSkillsControllerAddFileSource,
    useRemoveSource: useSkillsControllerRemoveSource,
  },
  {
    queryKeyPrefix: '/skills',
    buildRemoveParams: (entityId, sourceId) => ({
      id: entityId,
      sourceId,
    }),
  },
);

export default useSkillSources;
