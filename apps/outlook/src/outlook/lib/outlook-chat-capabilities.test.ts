import { describe, expect, it } from 'vitest';
import { SurfaceScope } from '@ayunis/api-client/schemas';
import { outlookChatCapabilities } from './outlook-chat-capabilities';

describe(outlookChatCapabilities.name, () => {
  it('enables only the capabilities granted to the current pane session', () => {
    expect(
      outlookChatCapabilities([SurfaceScope.session, SurfaceScope.voice]),
    ).toEqual({
      fileUpload: false,
      voice: true,
      modelSelection: false,
      rename: false,
      delete: false,
    });
  });

  it('keeps web-only actions out of the pane when every Outlook scope is granted', () => {
    expect(outlookChatCapabilities(Object.values(SurfaceScope))).toEqual({
      fileUpload: true,
      voice: true,
      modelSelection: true,
      rename: true,
      delete: true,
    });
  });
});
