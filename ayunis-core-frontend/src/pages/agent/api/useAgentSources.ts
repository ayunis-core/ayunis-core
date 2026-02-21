import {
  useAgentsControllerAddFileSource,
  useAgentsControllerGetAgentSources,
  useAgentsControllerRemoveSource,
} from '@/shared/api';
import { createEntitySourcesHook } from '@/widgets/knowledge-base-card';

const useAgentSources = createEntitySourcesHook(
  {
    useGetEntitySources: useAgentsControllerGetAgentSources,
    useAddFileSource: useAgentsControllerAddFileSource,
    useRemoveSource: useAgentsControllerRemoveSource,
  },
  {
    queryKeyPrefix: '/agents',
    buildRemoveParams: (entityId, sourceId) => ({
      id: entityId,
      sourceAssignmentId: sourceId,
    }),
  },
);

export default useAgentSources;
