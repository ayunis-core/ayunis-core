import { SurfaceScope } from '@ayunis/api-client/schemas';
import type { ChatCapabilities } from '@ayunis/chat/surface';

export function outlookChatCapabilities(
  scopes: readonly SurfaceScope[],
): ChatCapabilities {
  const granted = new Set(scopes);
  const chat = granted.has(SurfaceScope.chat);
  return {
    fileUpload: granted.has(SurfaceScope.uploads),
    voice: granted.has(SurfaceScope.voice),
    modelSelection: granted.has(SurfaceScope['models:read']),
    rename: chat,
    delete: chat,
  };
}
