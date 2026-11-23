import { activeRunsControllerCancel } from '@ayunis/api-client/endpoints';
import { apiFetch } from '@ayunis/api-client/transport';
import { createAuthenticatedRunEndpoints } from '@ayunis/chat/runs';

export const threadRunEndpoints = createAuthenticatedRunEndpoints(
  apiFetch,
  (threadId) => activeRunsControllerCancel(threadId),
);
