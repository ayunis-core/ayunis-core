import { activeRunsControllerCancel } from '@ayunis/api-client/endpoints';
import { apiFetch } from '@ayunis/api-client/transport';
import { createAuthenticatedRunEndpoints } from '@ayunis/chat/runs';
import type { ChatSurfaceConfig } from '@ayunis/chat/surface';
import { useEmbedded } from '@/shared/contexts/embedded/embeddedContext';

export const threadRunEndpoints = createAuthenticatedRunEndpoints(
  apiFetch,
  (threadId) => activeRunsControllerCancel(threadId),
);

const paneChat: ChatSurfaceConfig = {
  transport: threadRunEndpoints,
  capabilities: {
    fileUpload: true,
    voice: true,
    modelSelection: true,
    rename: true,
    delete: true,
  },
};

const webChat: ChatSurfaceConfig = {
  transport: threadRunEndpoints,
  capabilities: {
    ...paneChat.capabilities,
    audio: true,
    readAloud: true,
    skills: true,
    knowledgeBases: true,
    integrations: true,
  },
};

export function useAppChatSurface(): ChatSurfaceConfig {
  return useEmbedded() ? paneChat : webChat;
}
